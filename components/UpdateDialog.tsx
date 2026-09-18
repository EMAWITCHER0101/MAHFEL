import React, { useEffect, useRef, useState } from 'react';
import type { AppUpdateInfo } from '../services/api';
import { downloadAndInstallApk, isDesktop, desktopOpenExternal } from '../services/backgroundPlayback';

interface UpdateDialogProps {
  update: AppUpdateInfo;
  isMobile: boolean;
  onClose: () => void;
}

const guideText = [
  '۱. برای نصب نسخه جدید، ابتدا نسخه قبلی را از گوشی حذف کنید (اگر نصب با خطای «امضای متفاوت» مواجه شد).',
  '۲. سپس نسخه جدید را نصب کنید.',
  '۳. حساب و اطلاعات شما روی سرور محفوظ است و حذف اپلیکیشن به آن آسیب نمی‌زند.',
].join('\n');

export default function UpdateDialog({ update, isMobile, onClose }: UpdateDialogProps) {
  const [phase, setPhase] = useState<'ask' | 'downloading' | 'done'>('ask');
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);

  const handleDismiss = () => {
    const version = isMobile ? update.apkVersion : update.desktopVersion;
    if (version) {
      localStorage.setItem(isMobile ? 'update_dismissed_apk' : 'update_dismissed_desktop', version);
    }
    onClose();
  };

  useEffect(() => {
    mountedRef.current = true;
    const onProgress = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (!mountedRef.current) return;
      if (detail.error) {
        setError(detail.error);
        setPhase('ask');
        return;
      }
      if (typeof detail.percent === 'number') {
        setPercent(Math.min(100, Math.round(detail.percent)));
      }
    };
    window.addEventListener('mahfel-apk-progress', onProgress);
    return () => {
      mountedRef.current = false;
      window.removeEventListener('mahfel-apk-progress', onProgress);
    };
  }, []);

  const startDownload = () => {
    if (isMobile) {
      setPhase('downloading');
      setError('');
      setPercent(0);
      const started = downloadAndInstallApk(update.apkUrl || '');
      if (!started) {
        setError('شروع دانلود ممکن نشد. لینک مستقیم دانلود: ' + (update.apkUrl || ''));
        setPhase('ask');
      }
    } else {
      const ok = desktopOpenExternal(update.desktopUrl || '');
      if (!ok) window.open(update.desktopUrl, '_blank');
    }
  };

  const versionLabel = isMobile ? update.apkVersion : update.desktopVersion;
  const message = isMobile ? update.apkMessage : update.desktopMessage;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', direction: 'rtl', fontFamily: 'inherit',
    }}>
      <div style={{
        width: 'min(92vw, 420px)', maxHeight: '88vh', overflowY: 'auto',
        background: '#16161d', border: '1px solid #2a2a35', borderRadius: 16, padding: 20,
        color: '#eee', boxShadow: '0 10px 40px rgba(0,0,0,.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 26 }}>📦</span>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {isMobile ? 'نسخه جدید محفل (اندروید) آماده است' : 'نسخه جدید محفل (دسکتاپ) آماده است'}
          </h2>
        </div>

        <div style={{ fontSize: 13, color: '#9aa0b5', marginBottom: 10 }}>
          نسخه نصب‌شده شما: {isMobile ? 'اندروید' : 'دسکتاپ'} {isMobile ? '' : ''} — نسخه جدید: {versionLabel || '؟'}
        </div>

        {message && (
          <div style={{ background: '#20202a', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 12 }}>
            {message}
          </div>
        )}

        {phase === 'downloading' && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
              <span>در حال دانلود نسخه جدید...</span>
              <span>{percent}٪</span>
            </div>
            <div style={{ background: '#2a2a35', borderRadius: 8, height: 10, overflow: 'hidden' }}>
              <div style={{ width: `${percent}%`, height: '100%', background: '#7c5cff', transition: 'width .3s' }} />
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: '#3a1f22', color: '#ff8f8f', borderRadius: 10, padding: 10, fontSize: 12.5, marginBottom: 12, whiteSpace: 'pre-wrap' }}>
            {error}
          </div>
        )}

        {phase !== 'downloading' && (
          <details style={{ marginBottom: 12 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: '#7c9cff' }}>راهنمای نصب نسخه جدید</summary>
            <pre style={{
              whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 12.5, lineHeight: 2,
              background: '#1d1d26', borderRadius: 10, padding: 10, marginTop: 8, color: '#b9bdcf',
            }}>
              {guideText}
            </pre>
          </details>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          {phase !== 'downloading' && (
            <button onClick={startDownload} style={{
              flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: '#7c5cff', color: '#fff', fontSize: 14, fontWeight: 600,
            }}>
              {isMobile ? 'دانلود و نصب' : 'دانلود نسخه دسکتاپ'}
            </button>
          )}
          <button onClick={handleDismiss} style={{
            flex: phase !== 'downloading' ? 0 : 1, padding: '11px 18px', borderRadius: 10, border: '1px solid #3a3a48',
            cursor: 'pointer', background: 'transparent', color: '#c9ccdb', fontSize: 13.5,
          }}>
            {phase === 'downloading' ? 'پس‌زمینه' : 'بعداً'}
          </button>
        </div>
        {phase === 'downloading' && (
          <div style={{ fontSize: 11.5, color: '#8a8fa3', marginTop: 10, lineHeight: 1.8 }}>
            بعد از دانلود، فقط یک‌بار دکمه «نصب» را لمس کنید؛ نسخه جدید خودکار جایگزین نسخه قبلی می‌شود.
          </div>
        )}
      </div>
    </div>
  );
}
