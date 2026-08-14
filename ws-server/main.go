package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var upgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true },
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type Client struct {
	conn *websocket.Conn
	send chan []byte
}

type Hub struct {
	mu         sync.RWMutex
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
}

type BroadcastMsg struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

func newHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 1024),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("[WS] Client connected. Total: %d", h.clientCount())

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Printf("[WS] Client disconnected. Total: %d", h.clientCount())

		case message := <-h.broadcast:
			h.mu.RLock()
			var toRemove []*Client
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					toRemove = append(toRemove, client)
				}
			}
			h.mu.RUnlock()
			if len(toRemove) > 0 {
				h.mu.Lock()
				for _, client := range toRemove {
					if _, ok := h.clients[client]; ok {
						close(client.send)
						delete(h.clients, client)
					}
				}
				h.mu.Unlock()
			}
		}
	}
}

func (h *Hub) clientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

func (h *Hub) broadcastJSON(event string, data interface{}) {
	msg := BroadcastMsg{Event: event, Data: data}
	payload, err := json.Marshal(msg)
	if err != nil {
		log.Printf("[WS] marshal error: %v", err)
		return
	}
	h.broadcast <- payload
}

// ─── MongoDB Change Streams → realtime data updates ─────────────────────────
// هر تغییری در دیتابیس (توسط هر مسیری، ادمین یا مستقیم) فوراً به همهٔ کلاینت‌ها
// با پِیْلود کامل broadcast می‌شود → آپدیت کسری از ثانیه بدون هیچ fetch اضافه.

var collectionTypes = map[string]string{
	"posts":          "posts",
	"comments":       "comments",
	"videos":         "videos",
	"podcasts":       "podcasts",
	"books":          "books",
	"authors":        "authors",
	"publishedbooks": "publishedBooks",
	"notifications":  "notifications",
}

func objectIDHex(v interface{}) string {
	switch id := v.(type) {
	case primitive.ObjectID:
		return id.Hex()
	case string:
		return id
	default:
		b, err := json.Marshal(v)
		if err != nil {
			return ""
		}
		return string(b)
	}
}

func watchMongo(hub *Hub) {
	uri := "mongodb://127.0.0.1:27017/?directConnection=true"
	for {
		ctx, cancel := context.WithCancel(context.Background())
		client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
		if err != nil {
			log.Printf("[Mongo] connect error: %v", err)
			cancel()
			time.Sleep(3 * time.Second)
			continue
		}
		pingCtx, pingCancel := context.WithTimeout(context.Background(), 5*time.Second)
		err = client.Ping(pingCtx, nil)
		pingCancel()
		if err != nil {
			log.Printf("[Mongo] ping error: %v", err)
			client.Disconnect(context.Background())
			cancel()
			time.Sleep(3 * time.Second)
			continue
		}
		log.Printf("[Mongo] connected, watching change streams")

		collections := make([]string, 0, len(collectionTypes))
		for c := range collectionTypes {
			collections = append(collections, c)
		}
		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: bson.D{
				{Key: "ns.coll", Value: bson.D{{Key: "$in", Value: collections}}},
			}}},
		}
		stream, err := client.Database("soha").Watch(ctx, pipeline,
			options.ChangeStream().SetFullDocument(options.UpdateLookup))
		if err != nil {
			log.Printf("[Mongo] watch error: %v", err)
			client.Disconnect(context.Background())
			cancel()
			time.Sleep(3 * time.Second)
			continue
		}

		for stream.Next(ctx) {
			var change struct {
				OperationType string `bson:"operationType"`
				Ns            struct {
					Coll string `bson:"coll"`
				} `bson:"ns"`
				DocumentKey struct {
					ID interface{} `bson:"_id"`
				} `bson:"documentKey"`
				FullDocument map[string]interface{} `bson:"fullDocument"`
			}
			if err := stream.Decode(&change); err != nil {
				log.Printf("[Mongo] decode error: %v", err)
				continue
			}
			typ, ok := collectionTypes[change.Ns.Coll]
			if !ok {
				continue
			}
			id := objectIDHex(change.DocumentKey.ID)
			var action string
			var item interface{}
			switch change.OperationType {
			case "insert":
				action = "create"
				item = change.FullDocument
			case "update", "replace":
				action = "update"
				item = change.FullDocument
			case "delete":
				action = "delete"
			default:
				continue
			}
			data := map[string]interface{}{"type": typ, "action": action}
			if item != nil {
				data["item"] = item
			}
			if id != "" {
				data["id"] = id
			}
			hub.broadcastJSON("data-changed", data)
			log.Printf("[Mongo] change: %s.%s %s id=%s", change.Ns.Coll, change.OperationType, action, id)
		}
		log.Printf("[Mongo] change stream ended (%v)", stream.Err())
		stream.Close(ctx)
		client.Disconnect(context.Background())
		cancel()
		time.Sleep(2 * time.Second)
	}
}

func wsHandler(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS] upgrade error: %v", err)
		return
	}

	client := &Client{
		conn: conn,
		send: make(chan []byte, 256),
	}
	hub.register <- client

	go client.writePump()
	go client.readPump(hub)
}

func (c *Client) writePump() {
	ticker := time.NewTicker(10 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			c.conn.SetWriteDeadline(time.Now().Add(15 * time.Second))
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(15 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, []byte("ping")); err != nil {
				return
			}
		}
	}
}

func (c *Client) readPump(hub *Hub) {
	defer func() {
		hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(5 * time.Minute))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(5 * time.Minute))
		return nil
	})

	for {
		_, msg, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
		c.conn.SetReadDeadline(time.Now().Add(5 * time.Minute))
		if string(msg) == "ping" {
			c.conn.SetWriteDeadline(time.Now().Add(15 * time.Second))
			c.conn.WriteMessage(websocket.TextMessage, []byte("pong"))
		}
	}
}

func main() {
	hub := newHub()
	go hub.run()
	go watchMongo(hub)

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		wsHandler(hub, w, r)
	})

	http.HandleFunc("/broadcast", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var msg BroadcastMsg
		if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		hub.broadcastJSON(msg.Event, msg.Data)
		log.Printf("[WS] Broadcast: event=%s clients=%d", msg.Event, hub.clientCount())

		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"ok":true}`))
	})

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"ok","clients":%d}`, hub.clientCount())
	})

	http.HandleFunc("/cors", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(200)
			return
		}
		w.Write([]byte("ok"))
	})

	port := ":5001"
	log.Printf("[WS] Soha WebSocket Server (Go + Mongo Change Streams) starting on %s", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatalf("[WS] Server error: %v", err)
	}
}