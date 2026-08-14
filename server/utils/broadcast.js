import http from 'http';

// اطلاع‌رسانی لحظه‌ای به کلاینت‌ها از طریق سرویس WebSocket (پورت 5001)
export const broadcast = (event, data) => {
  const payload = JSON.stringify({ event, data });
  const req = http.request({
    host: '127.0.0.1',
    port: 5001,
    path: '/broadcast',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    timeout: 1500,
  }, (res) => {
    res.resume();
  });
  req.on('error', () => {});
  req.on('timeout', () => req.destroy());
  req.end(payload);
};