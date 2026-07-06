import { useEffect, useState, useRef } from 'react';
import { SohaIcon } from './SohaLogo';

interface ErrorPageProps {
  code: number;
  title: string;
  message: string;
  onRetry?: () => void;
  onGoHome?: () => void;
}

export default function ErrorPages({ code, title, message, onRetry, onGoHome }: ErrorPageProps) {
  const icons: Record<number, string> = {
    404: 'fa-compass',
    500: 'fa-server',
    503: 'fa-wifi',
    408: 'fa-clock',
    403: 'fa-lock',
  };
  const colors: Record<number, string> = {
    404: 'from-amber-500 to-orange-500',
    500: 'from-red-500 to-rose-500',
    503: 'from-blue-500 to-indigo-500',
    408: 'from-yellow-500 to-amber-500',
    403: 'from-purple-500 to-violet-500',
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center px-6 max-w-md">
        <div className={`w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br ${colors[code] || colors[404]} flex items-center justify-center shadow-lg`}>
          <i className={`fas ${icons[code] || 'fa-exclamation-triangle'} text-white text-3xl`}></i>
        </div>

        <div className="text-8xl font-black mb-2" style={{ color: 'var(--text)' }}>{code}</div>

        <h1 className="text-xl font-bold mb-3" style={{ color: 'var(--text)' }}>{title}</h1>

        <p className="mb-8 leading-relaxed" style={{ color: 'var(--text-2)' }}>{message}</p>

        <div className="flex gap-3 justify-center">
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #10b981)' }}
            >
              <i className="fas fa-home ml-2"></i>
              بازگشت به صفحه اصلی
            </button>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
              style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
            >
              <i className="fas fa-redo ml-2"></i>
              تلاش مجدد
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotFoundPage({ onGoHome }: { onGoHome?: () => void }) {
  return (
    <ErrorPages
      code={404}
      title="صفحه یافت نشد"
      message="صفحه‌ای که دنبال آن هستید وجود ندارد یا به آدرس دیگری منتقل شده است."
      onGoHome={onGoHome}
    />
  );
}

export function ServerErrorPage({ onRetry, onGoHome }: { onRetry?: () => void; onGoHome?: () => void }) {
  return (
    <ErrorPages
      code={500}
      title="خطای سرور"
      message="سرور با مشکل مواجه شده است. لطفاً چند لحظه صبر کنید و دوباره تلاش کنید."
      onRetry={onRetry}
      onGoHome={onGoHome}
    />
  );
}

export function NetworkErrorPage({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorPages
      code={503}
      title="ارتباط با سرور برقرار نشد"
      message="اتصال اینترنت خود را بررسی کنید و دوباره تلاش کنید."
      onRetry={onRetry}
    />
  );
}

export function OfflineDetector({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [checking, setChecking] = useState(false);

  const pingServer = async (): Promise<boolean> => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch('/logo.jpg', { method: 'HEAD', cache: 'no-store', signal: ctrl.signal });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;
    let interval: ReturnType<typeof setInterval>;

    const check = async () => {
      if (checking) return;
      const ok = await pingServer();
      if (mounted) setIsOffline(!ok);
    };

    check();
    interval = setInterval(check, 15000);

    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const handleRetry = async () => {
    setChecking(true);
    const ok = await pingServer();
    setIsOffline(!ok);
    setChecking(false);
  };

  if (isOffline) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.98), rgba(6, 11, 22, 0.99))' }}>
        <div className="text-center px-6">
          <div className="relative w-[88px] h-[88px] mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-400/20 to-indigo-500/20 blur-2xl animate-pulse-slow" style={{ transform: 'scale(1.3)' }}></div>
            <SohaIcon size={88} className="shadow-xl ring-1 ring-white/10" />
          </div>
          <div className="space-y-2 mb-8">
            <h2 className="text-2xl font-black text-white tracking-tight">قطع ارتباط</h2>
            <p className="text-gray-400 text-base">اتصال اینترنت خود را بررسی کنید</p>
          </div>
          <button onClick={handleRetry}
            className="px-8 py-3 rounded-xl font-bold text-white text-sm transition-all active:scale-95 mb-6"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #06b6d4)' }}>
            <i className={`fas ${checking ? 'fa-spinner fa-spin' : 'fa-redo'} ml-2`}></i>
            {checking ? 'در حال بررسی...' : 'تلاش مجدد'}
          </button>
          <div className="flex items-center justify-center gap-3 text-gray-600 text-xs">
            <span className="w-12 h-px bg-gradient-to-l from-gray-700/50 to-transparent"></span>
            <span>سرای هنر و اندیشه</span>
            <span className="w-12 h-px bg-gradient-to-r from-gray-700/50 to-transparent"></span>
          </div>
          <style>{`@keyframes pulse-slow { 0%,100% { opacity:0.3; transform:scale(1.3); } 50% { opacity:0.6; transform:scale(1.5); } } .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }`}</style>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function VPNBanner({ isVPN, onDismiss }: { isVPN: boolean; onDismiss: () => void }) {
  if (!isVPN) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] animate-fadeInDown" style={{ maxWidth: '420px', width: 'calc(100% - 32px)' }}>
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg backdrop-blur-xl" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: '1px solid rgba(255,255,255,0.15)' }}>
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 animate-pulse">
          <i className="fas fa-shield-halved text-white text-sm"></i>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-bold leading-tight">VPN خود را خاموش کنید</p>
          <p className="text-white/70 text-[10px] leading-tight mt-0.5">آدرس IP شما غیر از ایران تشخیص داده شد</p>
        </div>
        <button onClick={onDismiss} className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white flex-shrink-0 text-xs hover:bg-white/30 transition-colors">
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
}

export function useVPNDetection() {
  const [isVPN, setIsVPN] = useState(false);
  const [tempDismissed, setTempDismissed] = useState(false);
  const prevVPNRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch('/api/check-ip', { cache: 'no-store', signal: ctrl.signal });
        clearTimeout(timer);
        const data = await res.json();
        if (!mounted) return;
        const code = (data?.countryCode || 'IR').toUpperCase();
        console.log('[VPN] IP:', data?.ip, '| country:', code);
        const vpnDetected = code !== 'IR';
        setIsVPN(vpnDetected);
        setTempDismissed(false);
        localStorage.setItem('soha_vpn_country', code);
      } catch (e) {
        console.warn('[VPN] check failed, assuming online');
        if (mounted) setIsVPN(false);
      }
    };

    check();
    const interval = setInterval(check, 30000);

    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const dismissVPN = () => setTempDismissed(true);

  return { isVPN: isVPN && !tempDismissed, dismissVPN };
}
