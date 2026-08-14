
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// --- Service Worker Registration ---
// APK = نمایش خالص وب: هیچ سرویس‌ورکری ثبت نشود و کش قبلی هم پاک شود —
// تا همیشه تازه‌ترین نسخه وب لود شود و هیچ داده‌ای داخل اپ ذخیره نماند.
// In sandboxed preview environments, absolute paths or certain relative paths can resolve 
// to the tool's domain (e.g., ai.studio) instead of the sandbox origin, causing errors.
const isAppEnv = () => !!(window as any).AndroidBridge;

window.addEventListener('load', () => {
  if (!('serviceWorker' in navigator)) return;
  if (isAppEnv()) {
    navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()));
    try { if ('caches' in window) caches.keys().then(keys => keys.forEach(k => caches.delete(k))); } catch { /* ignore */ }
    return;
  }
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()));
  } else {
    navigator.serviceWorker.register('./service-worker.js', { scope: './' })
      .then(registration => {
        console.log('Service Worker registered successfully:', registration.scope);
      })
      .catch(error => {
        const isOriginError = error.message.includes('origin') || error.name === 'SecurityError';

        if (isOriginError) {
          return;
        }
        console.warn('Service Worker registration failed:', error.message || error);
      });
  }
});
