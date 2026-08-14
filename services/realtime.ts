// اتصال لحظه‌ای WebSocket با سرویس soha-ws (پورت 5001 از طریق nginx /ws)
type RealtimeHandlers = { onDataChanged: (type: string, payload?: any) => void };

let ws: WebSocket | null = null;
let retryDelay = 1000;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let handlers: RealtimeHandlers | null = null;

const getWsUrl = (): string => {
  const base = window.location.origin.replace(/^http/, 'ws');
  return `${base}/ws`;
};

const scheduleReconnect = () => {
  if (!handlers) return;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(connect, retryDelay);
  retryDelay = Math.min(retryDelay * 2, 3000);
};

const connect = () => {
  if (!handlers) return;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  try {
    ws = new WebSocket(getWsUrl());
  } catch {
    scheduleReconnect();
    return;
  }
  ws.onopen = () => { retryDelay = 1000; };
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data as string);
      if (msg.event === 'data-changed' && msg.data?.type && handlers) {
        handlers.onDataChanged(String(msg.data.type), msg.data);
      }
    } catch { /* ignore */ }
  };
  ws.onclose = () => scheduleReconnect();
  ws.onerror = () => {
    try { ws?.close(); } catch { /* ignore */ }
  };
};

/** اتصال مجدد فوری (وقتی اپ به foreground برگشت یا اینترنت وصل شد) */
export const reconnectNow = () => {
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  retryDelay = 1000;
  if (ws) {
    try { if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) return; ws.close(); } catch { /* ignore */ }
  }
  connect();
};

export const startRealtime = (h: RealtimeHandlers) => {
  handlers = h;
  connect();
};

export const stopRealtime = () => {
  handlers = null;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  try { ws?.close(); } catch { /* ignore */ }
  ws = null;
};

export const isRealtimeConnected = (): boolean => !!ws && ws.readyState === WebSocket.OPEN;