# بخش ۱۴: وب‌سوکت و استقرار — تحلیل ws-server و deploy

## فهرست مطالب
- [مقدمه](#مقدمه)
- [سرور وب‌سوکت (Go)](#سرور-وب‌سوکت)
  - [ساختار کلی](#ساختار-کلی)
  - [Hub — مدیریت کلاینت‌ها](#hub)
  - [MongoDB Change Stream](#change-stream)
  - [وب‌سوکت هدلر](#ws-handler)
  - [Write Pump و Read Pump](#pumps)
  - [HTTP Endpoints](#http-endpoints)
  - [پروتکل پیام‌ها](#protocol)
- [سرویس realtime در فرانت‌اند](#realtime-service)
  - [اتصال وب‌سوکت](#ws-connection)
  - [پردازش تغییرات](#data-changes)
  - [اتصال مجدد](#reconnection)
- [سیستم استقرار (Deploy)](#deploy)
  - [deploy-fe-only-quick.js](#deploy-fe-only)
  - [مراحل استقرار](#deploy-steps)
  - [مدیریت محیط](#env-management)
  - [بررسی سلامت سیستم](#health-check)
- [آرشیو اسکریپت‌های deploy](#deploy-archive)
- [اتصال به App.tsx](#اتصال-به-apptx)

---

## مقدمه

اپلیکیشن «محفل» از سه لایه ارتباطی استفاده می‌کند:
1. **HTTP REST:** درخواست‌های عادی API
2. **WebSocket:** به‌روزرسانی real-time
3. **MongoDB Change Stream:** تشخیص تغییرات دیتابیس

سرور وب‌سوکت با زبان **Go** نوشته شده و از **Gorilla WebSocket** و **MongoDB Go Driver** استفاده می‌کند.

---

## سرور وب‌سوکت (Go)

### ساختار کلی

**مسیر فایل:** `ws-server/main.go` — ۳۵۴ سطر

```
ws-server/
├── main.go      — سرور اصلی
├── go.mod       — وابستگی‌ها
└── go.sum       — هش وابستگی‌ها
```

#### واردات

```go
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
```

#### WebSocket Upgrader

```go
var upgrader = websocket.Upgrader{
    CheckOrigin:     func(r *http.Request) bool { return true },  // CORS باز
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
}
```

**نکته امنیتی:** `CheckOrigin` همیشه `true` برمی‌گرداند — این یعنی هر دامنه‌ای می‌تواند متصل شود. در محیط production باید محدود شود.

---

### Hub — مدیریت کلاینت‌ها

```go
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
```

**Hub** مرکز مدیریت تمام اتصالات وب‌سوکت است:

- **clients:** نقشه تمام کلاینت‌های متصل
- **broadcast:** کانال ارسال پیام به همه
- **register:** کانال ثبت کلاینت جدید
- **unregister:** کانال حذف کلاینت قطع شده
- **mu:** Mutex برای ایمنی concurrent

#### حلقه اصلی Hub

```go
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

        case message := <-h.broadcast:
            h.mu.RLock()
            var toRemove []*Client
            for client := range h.clients {
                select {
                case client.send <- message:
                default:
                    // بافر پر → کلاینت حذف می‌شود
                    toRemove = append(toRemove, client)
                }
            }
            h.mu.RUnlock()
            // حذف کلاینت‌هایی که بافرشان پر بود
            if len(toRemove) > 0 {
                h.mu.Lock()
                for _, client := range toRemove {
                    close(client.send)
                    delete(h.clients, client)
                }
                h.mu.Unlock()
            }
        }
    }
}
```

**نکته مهم:** اگر بافر `send` یک کلاینت پر باشد (۲۵۶ پیام)، آن کلاینت حذف می‌شود. این از کندی سرور جلوگیری می‌کند.

#### broadcastJSON

```go
func (h *Hub) broadcastJSON(event string, data interface{}) {
    msg := BroadcastMsg{Event: event, Data: data}
    payload, err := json.Marshal(msg)
    if err != nil { return }
    h.broadcast <- payload
}
```

---

### MongoDB Change Stream

#### هدف
تشخیص خودکار تغییرات دیتابیس و broadcast آن‌ها به تمام کلاینت‌ها.

#### نگاشت کلکشن‌ها

```go
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
```

#### تابع watchMongo

```go
func watchMongo(hub *Hub) {
    uri := "mongodb://127.0.0.1:27017/?directConnection=true"
    for {
        // اتصال به MongoDB
        client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
        // ...

        // ایجاد Change Stream
        pipeline := mongo.Pipeline{
            {{Key: "$match", Value: bson.D{
                {Key: "ns.coll", Value: bson.D{{Key: "$in", Value: collections}}},
            }}},
        }
        stream, err := client.Database("soha").Watch(ctx, pipeline,
            options.ChangeStream().SetFullDocument(options.UpdateLookup))

        // پردازش تغییرات
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
            stream.Decode(&change)

            // تبدیل نوع عملیات
            switch change.OperationType {
            case "insert":
                action = "create"
                item = change.FullDocument
            case "update", "replace":
                action = "update"
                item = change.FullDocument
            case "delete":
                action = "delete"
            }

            // broadcast به همه کلاینت‌ها
            hub.broadcastJSON("data-changed", data)
        }
    }
}
```

**مراحل:**
1. اتصال به MongoDB با `directConnection=true`
2. ایجاد Pipeline برای فیلتر کلکشن‌ها
3. Watch Change Stream با `UpdateLookup` (برگرداندن سند کامل)
4. برای هر تغییر، پیام JSON ایجاد و broadcast می‌شود
5. اگر اتصال قطع شد، بعد از ۳ ثانیه مجدداً تلاش می‌شود

---

### وب‌سوکت هدلر

```go
func wsHandler(hub *Hub, w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil { return }

    client := &Client{
        conn: conn,
        send: make(chan []byte, 256),
    }
    hub.register <- client

    go client.writePump()
    go client.readPump(hub)
}
```

**مراحل:**
1. ارتقای اتصال HTTP به WebSocket
2. ایجاد `Client` با بافر ۲۵۶ پیام
3. ثبت کلاینت در Hub
4. شروع `writePump` (ارسال پیام‌ها)
5. شروع `readPump` (دریافت پیام‌ها)

---

### Write Pump و Read Pump

#### Write Pump

```go
func (c *Client) writePump() {
    ticker := time.NewTicker(10 * time.Second)  // Ping هر ۱۰ ثانیه
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
            c.conn.WriteMessage(websocket.TextMessage, message)
        case <-ticker.C:
            c.conn.SetWriteDeadline(time.Now().Add(15 * time.Second))
            c.conn.WriteMessage(websocket.PingMessage, []byte("ping"))
        }
    }
}
```

**وظایف:**
- ارسال پیام‌های موجود در بافر `send`
- ارسال Ping هر ۱۰ ثانیه برای زنده نگه‌داشتن اتصال
- Deadlines: Write ۱۵ ثانیه

#### Read Pump

```go
func (c *Client) readPump(hub *Hub) {
    defer func() {
        hub.unregister <- c
        c.conn.Close()
    }()

    c.conn.SetReadLimit(512)           // حداکثر ۵۰۰ بایت
    c.conn.SetReadDeadline(time.Now().Add(5 * time.Minute))
    c.conn.SetPongHandler(func(string) error {
        c.conn.SetReadDeadline(time.Now().Add(5 * time.Minute))
        return nil
    })

    for {
        _, msg, err := c.conn.ReadMessage()
        if err != nil { break }
        c.conn.SetReadDeadline(time.Now().Add(5 * time.Minute))
        if string(msg) == "ping" {
            c.conn.WriteMessage(websocket.TextMessage, []byte("pong"))
        }
    }
}
```

**وظایف:**
- خواندن پیام‌های کلاینت (فقط `ping` پردازش می‌شود)
- Deadlines: Read ۵ دقیقه
- پاسخ به Ping با Pong

---

### HTTP Endpoints

```go
func main() {
    hub := newHub()
    go hub.run()
    go watchMongo(hub)

    http.HandleFunc("/ws", wsHandler)           // اتصال وب‌سوکت
    http.HandleFunc("/broadcast", broadcastHandler)  // broadcast دستی
    http.HandleFunc("/health", healthHandler)    // بررسی سلامت
    http.HandleFunc("/cors", corsHandler)        // CORS preflight

    port := ":5001"
    http.ListenAndServe(port, nil)
}
```

| Endpoint | Method | توضیح |
|----------|--------|--------|
| `/ws` | GET (Upgrade) | اتصال وب‌سوکت |
| `/broadcast` | POST | broadcast پیام به همه کلاینت‌ها |
| `/health` | GET | بررسی سلامت و تعداد کلاینت‌ها |
| `/cors` | OPTIONS | CORS preflight |

#### broadcastHandler

```go
http.HandleFunc("/broadcast", func(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    var msg BroadcastMsg
    json.NewDecoder(r.Body).Decode(&msg)
    hub.broadcastJSON(msg.Event, msg.Data)
    w.Write([]byte(`{"ok":true}`))
})
```

سرور Node.js می‌تواند از طریق HTTP POST به `/broadcast` پیام broadcast کند.

---

### پروتکل پیام‌ها

#### ساختار پیام

```go
type BroadcastMsg struct {
    Event string      `json:"event"`
    Data  interface{} `json:"data"`
}
```

#### نمونه پیام

```json
{
  "event": "data-changed",
  "data": {
    "type": "posts",
    "action": "create",
    "item": {
      "_id": "...",
      "author": "علی",
      "text": "سلام دنیا!",
      "isoDate": "2024-01-15T10:30:00Z"
    }
  }
}
```

#### انواع رویدادها

| type | action | توضیح |
|------|--------|--------|
| `posts` | `create` | پست جدید |
| `posts` | `update` | ویرایش پست |
| `posts` | `delete` | حذف پست |
| `comments` | `create` | نظر جدید |
| `videos` | `create` | ویدیوی جدید |
| `podcasts` | `create` | پادکست جدید |
| `notifications` | `create` | نوتیفیکیشن جدید |

---

## سرویس realtime در فرانت‌اند

### اتصال وب‌سوکت

**مسیر فایل:** `services/realtime.ts`

```typescript
export const startRealtime = (config: {
  onDataChanged: (type: string, payload: any) => void;
}) => {
  const ws = new WebSocket('wss://app.soha-sima.ir:5001/ws');
  
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.event === 'data-changed') {
      config.onDataChanged(msg.data.type, msg.data);
    }
  };

  ws.onclose = () => {
    // اتصال مجدد بعد از ۳ ثانیه
    setTimeout(() => startRealtime(config), 3000);
  };
};
```

### پردازش تغییرات در App.tsx

```typescript
// App.tsx - خط ۶۰۹
const applyRealtimePayload = useCallback((type: string, payload: any) => {
  const action = payload?.action;

  if (type === 'posts') {
    if (action === 'create') setPosts(prev => [payload.item, ...prev]);
    if (action === 'update') setPosts(prev => prev.map(p => 
      key(p) === key(payload.item) ? { ...p, ...payload.item } : p
    ));
    if (action === 'delete') setPosts(prev => 
      prev.filter(p => key(p) !== payload.id)
    );
  }

  if (type === 'comments') {
    // مشابه posts
  }

  // سایر انواع...
}, [refreshAllData, notifyDisplay]);
```

### اتصال مجدد

```typescript
// App.tsx - خط ۷۰۵
useEffect(() => {
  const start = async () => {
    const { startRealtime } = await import('./services/realtime');
    startRealtime({ onDataChanged: applyRealtimePayload });
  };
  start();

  const onVisible = () => {
    if (!document.hidden) {
      import('./services/realtime').then(m => m.reconnectNow());
      refreshComments();
    }
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onOnline);
}, [refreshComments]);
```

** strategies:**
- هنگام `visibilitychange` → اتصال مجدد
- هنگام `online` → اتصال مجدد
- پس از `onclose` → اتصال مجدد بعد از ۳ ثانیه

---

## سیستم استقرار (Deploy)

### deploy-fe-only-quick.js

**مسیر فایل:** `deploy/deploy-fe-only-quick.js` — ۸۰ سطر

#### هدف
اسکریپت استقرار سریع فرانت‌اند روی سرور از طریق SSH.

#### تنظیمات

```javascript
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const HOST = process.env.SSH_HOST;
const PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;
```

#### توابع SSH

```javascript
function ssh(cmd, timeout) {
  timeout = timeout || 30000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT')); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
        let o = '';
        s.on('data', d => { o += d; process.stdout.write(d); });
        s.stderr.on('data', d => { o += d; process.stderr.write(d); });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).connect({host: HOST, port: PORT, username: USER, password: PASS});
  });
}
```

#### تابع آپلود فایل

```javascript
function uploadFile(lp, rp) {
  return new Promise((resolve, reject) => {
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        const r = fs.createReadStream(lp);
        const w = sftp.createWriteStream(rp);
        w.on('close', () => { c.end(); resolve(); });
        r.pipe(w);
      });
    }).connect({host: HOST, port: PORT, username: USER, password: PASS});
  });
}
```

#### مراحل استقرار

```javascript
(async () => {
  // 1. توقف فرانت‌اند
  await ssh('systemctl stop soha-frontend 2>/dev/null || true');

  // 2. آپلود و استخراج فایل‌ها
  await ssh('rm -rf /opt/soha/.next');
  await ssh('mkdir -p /opt/soha/.next/standalone');
  await uploadFile('E:\\temp\\soha-fe.tar.gz', '/tmp/soha-fe.tar.gz');
  await ssh('tar -xzf /tmp/soha-fe.tar.gz -C /opt/soha/.next/standalone');
  // آپلود static و public

  // 3. شروع فرانت‌اند
  await ssh('systemctl start soha-frontend');

  // 4. بررسی سلامت
  const status = await ssh('systemctl is-active soha-frontend');
  const httpCode = await ssh("curl -s http://localhost:3000/ -o /dev/null -w '%{http_code}'");
})();
```

### مراحل استقرار

| مرحله | دستور | توضیح |
|--------|-------|--------|
| ۱ | `systemctl stop soha-frontend` | توقف سرویس |
| ۲ | `rm -rf /opt/soha/.next` | پاکسازی نسخه قبلی |
| ۳ | `mkdir -p /opt/soha/.next/standalone` | ایجاد فولدر |
| ۴ | `uploadFile(fe.tar.gz)` | آپلود فایل اصلی |
| ۵ | `tar -xzf` | استخراج فایل |
| ۶ | `uploadFile(static.tar.gz)` | آپلود فایل‌های استاتیک |
| ۷ | `uploadFile(public.tar.gz)` | آپلود فایل‌های public |
| ۸ | `systemctl start soha-frontend` | شروع سرویس |
| ۹ | `curl localhost:3000` | بررسی HTTP |

---

### مدیریت محیط

فایل `.env.deploy`:

```bash
SSH_HOST=87.248.145.44
SSH_PORT=9011
SSH_USER=root
SSH_PASS=***
```

---

### بررسی سلامت سیستم

```javascript
console.log('Frontend:', (await ssh('systemctl is-active soha-frontend')).trim());
console.log('HTTP:', (await ssh("curl -s http://localhost:3000/ -o /dev/null -w '%{http_code}'")).trim());
```

---

## آرشیو اسکریپت‌های deploy

فولدر `deploy/` بیش از ۱۰۰ اسکریپت استقرار دارد:

| اسکریپت | هدف |
|----------|------|
| `deploy-fe-only-quick.js` | استقرار سریع فرانت‌اند |
| `deploy-fe-only.js` | استقرار فرانت‌اند با کش |
| `deploy-full.js` | استقرار کامل (فرانت + بک‌اند) |
| `deploy-backend-ai.js` | استقرار بک‌اند با AI |
| `deploy-go-ws.js` | استقرار سرور وب‌سوکت Go |
| `deploy-push-backend.js` | استقرار سیستم push |
| `deploy-community.js` | استقرار بخش محفل |
| `deploy-auth.js` | استقرار سیستم احراز هویت |
| `deploy-admin.js` | استقرار پنل ادمین |
| `deploy-nginx-cachefix.js` | رفع مشکل کش Nginx |
| `check-services.js` | بررسی وضعیت سرویس‌ها |
| `check-ssl.js` | بررسی گواهی SSL |
| `check-backend.js` | بررسی بک‌اند |
| `diag-*.js` | اسکریپت‌های عیب‌یابی |

---

## اتصال به App.tsx

### نحوه استفاده از WebSocket

```typescript
// App.tsx - خط ۷۰۵-۷۳۱
useEffect(() => {
  let realtimeStarted = false;
  const start = async () => {
    const { startRealtime } = await import('./services/realtime');
    startRealtime({ 
      onDataChanged: (type: any, payload: any) => { 
        applyRealtimePayload(type, payload); 
      } 
    });
    realtimeStarted = true;
  };
  start();
  // ...
}, [refreshComments]);
```

### جریان کامل Real-time

1. **سرور Go:** MongoDB Change Stream تغییر را تشخیص می‌دهد
2. **سرور Go:** پیام JSON را broadcast می‌کند
3. **مرورگر:** WebSocket onmessage دریافت می‌کند
4. **services/realtime.ts:** رویداد `data-changed` پردازش می‌شود
5. **App.tsx:** `applyRealtimePayload` state را به‌روز می‌کند
6. **React:** کامپوننت‌ها مجدداً رندر می‌شوند

### اتصال سرور Node.js به WebSocket

سرور Node.js می‌تواند از طریق HTTP POST به `/broadcast` پیام ارسال کند:

```javascript
// server/utils/broadcast.js
import axios from 'axios';

export const broadcast = (event, data) => {
  axios.post('http://localhost:5001/broadcast', { event, data })
    .catch(() => {});
};
```

این تابع در تمام مسیرهای API استفاده می‌شود:
```javascript
// posts.js
broadcast('data-changed', { type: 'posts', action: 'create', item: post.toObject() });

// comments.js
broadcast('data-changed', { type: 'comments', action: 'create', item: comment });
```
