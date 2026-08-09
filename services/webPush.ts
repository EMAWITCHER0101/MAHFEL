import { getPushPublicKey, subscribeToPush, unsubscribeFromPush } from './api';

const PUSH_KEY = 'soha_push_enabled';

export const isPushSecureContext = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext === true;
};

export const getPushEnabled = (): boolean => {
  try {
    return localStorage.getItem(PUSH_KEY) === '1';
  } catch { return false; }
};

const setPushEnabled = (v: boolean) => {
  try {
    if (v) localStorage.setItem(PUSH_KEY, '1');
    else localStorage.removeItem(PUSH_KEY);
  } catch { /* ignore */ }
};

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  try {
    if (!('serviceWorker' in navigator)) return null;
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch { return null; }
};

export const enableWebPush = async (): Promise<boolean> => {
  try {
    if (!isPushSecureContext() || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushEnabled(false);
      return false;
    }
    const publicKey = await getPushPublicKey();
    if (!publicKey) {
      setPushEnabled(false);
      return false;
    }

    let reg = await registerServiceWorker();
    if (!reg) {
      setPushEnabled(false);
      return false;
    }
    if (!reg.active) {
      await new Promise<void>((resolve) => {
        const check = () => (reg?.active ? resolve() : setTimeout(check, 200));
        check();
      });
      reg = (await navigator.serviceWorker.getRegistration()) || reg;
    }

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushEnabled(false);
        return false;
      }
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const ok = await subscribeToPush(subscription);
    setPushEnabled(ok);
    return ok;
  } catch {
    setPushEnabled(false);
    return false;
  }
};

export const disableWebPush = async (): Promise<boolean> => {
  try {
    if (!('serviceWorker' in navigator)) { setPushEnabled(false); return true; }
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = registration ? await registration.pushManager.getSubscription() : null;
    if (subscription) {
      await unsubscribeFromPush(subscription);
      await subscription.unsubscribe();
    }
    setPushEnabled(false);
    return true;
  } catch {
    setPushEnabled(false);
    return true;
  }
};

export const toggleWebPush = async (): Promise<boolean> => {
  if (getPushEnabled()) return disableWebPush();
  return enableWebPush();
};

export const syncWebPushSubscription = async (): Promise<void> => {
  try {
    if (!isPushSecureContext() || !('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await subscribeToPush(subscription);
  } catch { /* ignore */ }
};