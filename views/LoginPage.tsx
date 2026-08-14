
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { User, UserRole } from '../types';
import { getRandomTailwindColor, getInitials } from '../utils/helpers';
import { register, login, completeProfile, sendOtp, verifyOtp, resetPassword } from '../services/api';
import { startOtpAutofill } from '../services/backgroundPlayback';
import { SohaLogo } from '../components/SohaLogo';

interface LoginPageProps {
  onLoginSuccess: (user: User, token?: string) => void;
}

const ADMIN_IDENTITY = {
  name: 'سرای هنر و اندیشه',
  avatar: ''
};

interface ToastItem {
  id: number;
  message: string;
  type: 'error' | 'success' | 'warning';
  exiting?: boolean;
}

let toastIdCounter = 0;

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loginField, setLoginField] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('user');
  const [securityKey, setSecurityKey] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [step, setStep] = useState<'form' | 'otp' | 'password' | 'newPassword' | 'profile' | 'admin' | 'author'>('form');
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [otpCode, setOtpCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpProofToken, setOtpProofToken] = useState<string | null>(null);
  const otpIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  const [mutedWarning, setMutedWarning] = useState(false);
  const [mutedUntil, setMutedUntil] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [showCropModal, setShowCropModal] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarColor = useMemo(() => getRandomTailwindColor(name), [name]);

  const showToast = useCallback((message: string, type: 'error' | 'success' | 'warning' = 'error') => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
  }, []);

  const fieldErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (mode === 'register') {
      if (!name.trim()) errs.name = 'نام خود را وارد کنید';
      if (!phoneNumber.trim()) errs.phoneNumber = 'شماره موبایل را وارد کنید';
      else if (!/^09\d{9}$/.test(phoneNumber)) errs.phoneNumber = 'شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود';
      if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'فرمت ایمیل نامعتبر است';
      if (!password) errs.password = 'رمز عبور را وارد کنید';
      else if (password.length < 4) errs.password = 'رمز عبور باید حداقل ۴ کاراکتر باشد';
      else if (password.length > 50) errs.password = 'رمز عبور حداکثر ۵۰ کاراکتر می‌تواند باشد';
      if (!confirmPassword) errs.confirmPassword = 'تکرار رمز عبور را وارد کنید';
      else if (password !== confirmPassword) errs.confirmPassword = 'رمز عبور مطابقت ندارد';
    }
    return errs;
  }, [mode, name, phoneNumber, email, password, confirmPassword]);

  const isFormValid = useMemo(() => Object.keys(fieldErrors).length === 0, [fieldErrors]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginField.trim()) { showToast('ایمیل یا شماره موبایل را وارد کنید'); return; }
    if (!password) { showToast('رمز عبور را وارد کنید'); return; }
    setError('');
    setIsSubmitting(true);
    try {
      const isEmail = loginField.includes('@');
      const res = await login(isEmail ? loginField : '', isEmail ? '' : loginField, password);
      if (res && res.success) {
        if (res.banned) { showToast('شما از سایت اخراج شده‌اید', 'error'); setIsSubmitting(false); return; }
        if (res.user?.muted) { setMutedWarning(true); setMutedUntil(res.user.mutedUntil); }
        if (res.token) localStorage.setItem('soha_token', res.token);
        showToast('ورود موفقیت‌آمیز!', 'success');
        setTimeout(() => onLoginSuccess({
          id: res.user.id,
          email: res.user.email,
          phoneNumber: res.user.phoneNumber || '',
          name: res.user.name,
          avatar: res.user.avatar,
          role: res.user.role as UserRole,
          interests: res.user.interests || [],
          library: res.user.library,
        }, res.token), 400);
      } else {
        showToast(res?.error || 'ایمیل/شماره موبایل یا رمز عبور اشتباه است');
      }
    } catch (err: any) {
      showToast(err?.message || 'خطا در ورود');
    }
    setIsSubmitting(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, phoneNumber: true, email: true, password: true, confirmPassword: true });
    const errors = Object.entries(fieldErrors);
    if (errors.length > 0) {
      errors.forEach(([_, msg]) => showToast(msg));
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const res = await register(name, email, password, phoneNumber);
      if (res && res.success) {
        if (res.token) localStorage.setItem('soha_token', res.token);
        showToast('ثبت‌نام موفقیت‌آمیز! پروفایل خود را تکمیل کنید', 'success');
        setStep('profile');
      } else {
        showToast(res?.error || 'خطا در ثبت‌نام');
      }
    } catch (err: any) {
      showToast(err?.message || 'خطا در ثبت‌نام');
    }
    setIsSubmitting(false);
  };

  const startOtpTimer = useCallback(() => {
    setOtpTimer(60);
    if (otpIntervalRef.current) clearInterval(otpIntervalRef.current);
    otpIntervalRef.current = setInterval(() => {
      setOtpTimer(prev => {
        if (prev <= 1) {
          if (otpIntervalRef.current) clearInterval(otpIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleSendOtp = async (phone: string, purpose: 'register' | 'forgot') => {
    if (!phone || !/^09\d{9}$/.test(phone)) {
      showToast('شماره موبایل نامعتبر است');
      return;
    }
    if (purpose === 'register') {
      if (!name.trim()) { showToast('نام خود را وارد کنید'); return; }
      if (!password || password.length < 4) { showToast('رمز عبور باید حداقل ۴ کاراکتر باشد'); return; }
      if (!confirmPassword) { showToast('تکرار رمز عبور را وارد کنید'); return; }
      if (password !== confirmPassword) { showToast('رمز عبور و تکرار آن مطابقت ندارند'); return; }
    }
    setError('');
    setIsSubmitting(true);
    try {
      const res = await sendOtp(phone, purpose, purpose === 'register' ? name.trim() : undefined);
      if (res && res.success) {
        showToast('کد تایید ارسال شد', 'success');
        setStep('otp');
        startOtpTimer();
        setTimeout(() => otpInputRef.current?.focus(), 100);
      } else {
        showToast(res?.error || 'خطا در ارسال کد تایید');
      }
    } catch (err: any) {
      showToast(err?.message || 'خطا در ارسال کد تایید');
    }
    setIsSubmitting(false);
  };

  const handleVerifyOtp = async (phone: string, purpose: 'register' | 'forgot') => {
    if (!otpCode || otpCode.length < 4) {
      showToast('کد تایید را وارد کنید');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const res = await verifyOtp(phone, otpCode, purpose);
      if (res && res.success) {
        showToast('کد تایید تأیید شد', 'success');
        setOtpProofToken(res.proofToken);
        if (purpose === 'forgot') {
          setStep('newPassword');
        }
      } else {
        showToast(res?.error || 'کد تایید اشتباه است');
      }
    } catch (err: any) {
      showToast(err?.message || 'خطا در تأیید کد');
    }
    setIsSubmitting(false);
  };

  const handleVerifyOtpAndRegister = async () => {
    if (!otpCode || otpCode.length < 4) {
      showToast('کد تایید را وارد کنید');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const res = await verifyOtp(phoneNumber, otpCode, 'register');
      if (res && res.success) {
        setOtpProofToken(res.proofToken);
        const regRes = await register(name, email, password, phoneNumber, res.proofToken);
        if (regRes && regRes.success) {
          if (regRes.token) localStorage.setItem('soha_token', regRes.token);
          showToast('ثبت‌نام موفقیت‌آمیز!', 'success');
          setStep('profile');
        } else {
          showToast(regRes?.error || 'خطا در ثبت‌نام');
        }
      } else {
        showToast(res?.error || 'کد تایید اشتباه است');
      }
    } catch (err: any) {
      showToast(err?.message || 'خطا در ثبت‌نام');
    }
    setIsSubmitting(false);
  };

  // درج خودکار کد OTP: پیامک که می‌رسد، نسخه اندروید کد را به اینجا پست می‌کند
  useEffect(() => {
    if (step !== 'otp') return;
    try { startOtpAutofill(); } catch { /* ignore */ }
    const onMsg = (e: MessageEvent) => {
      const data = typeof e.data === 'string' ? e.data : '';
      if (!data.startsWith('mahfel-otp-received|')) return;
      const code = (data.split('|')[1] || '').replace(/\D/g, '').slice(0, 4);
      if (code.length < 4) return;
      setOtpCode(code);
      setTimeout(() => {
        if (mode === 'register') handleVerifyOtpAndRegister();
        else handleVerifyOtp(phoneNumber, 'forgot');
      }, 50);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, mode, phoneNumber]);

  // ══ دکمه برگشت موبایل در صفحه ورود: هر استپ یک entry تاریخچه دارد ══
  // (فرم → کد تایید → رمز جدید): back هر مرحله را یک قدم به عقب برمی‌گرداند
  const stepHistoryRef = useRef<{ from: string; to: string }[]>([]);
  const prevStepRef = useRef(step);

  useEffect(() => {
    const prev = prevStepRef.current;
    prevStepRef.current = step;
    if (step === prev) return;
    if (step === 'form') {
      stepHistoryRef.current = [];
      return;
    }
    const isForward = prev === 'form' || (prev === 'otp' && (step === 'newPassword' || step === 'profile'));
    if (isForward) {
      stepHistoryRef.current.push({ from: prev, to: step });
      history.pushState({ sohaStep: step }, '');
    }
  }, [step]);

  useEffect(() => {
    const onPop = () => {
      const h = stepHistoryRef.current;
      if (h.length === 0) return;
      const last = h.pop();
      if (last && last.from) setStep(last.from as any);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleResetPasswordSubmit = async () => {
    if (!password || password.length < 4) {
      showToast('رمز عبور باید حداقل ۴ کاراکتر باشد');
      return;
    }
    if (password !== confirmPassword) {
      showToast('رمز عبور و تکرار آن مطابقت ندارند');
      return;
    }
    if (!otpProofToken) {
      showToast('کد تایید منقضی شده است. مجدداً کد بگیرید');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const res = await resetPassword(phoneNumber, otpProofToken, password);
      if (res && res.success) {
        if (res.token) localStorage.setItem('soha_token', res.token);
        showToast('رمز عبور با موفقیت تغییر کرد', 'success');
        setMode('login');
        setStep('form');
        setPassword('');
        setConfirmPassword('');
        setOtpCode('');
        setOtpProofToken(null);
        if (res.user) {
          onLoginSuccess({
            id: res.user.id,
            email: res.user.email,
            phoneNumber: res.user.phoneNumber || '',
            name: res.user.name,
            avatar: res.user.avatar,
            role: res.user.role as UserRole,
            interests: res.user.interests || [],
            library: res.user.library,
          }, res.token);
        }
      } else {
        showToast(res?.error || 'خطا در تغییر رمز عبور');
      }
    } catch (err: any) {
      showToast(err?.message || 'خطا در تغییر رمز عبور');
    }
    setIsSubmitting(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawImage(reader.result as string);
        setShowCropModal(true);
        setZoom(1);
        setPosition({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startPos.current = { x: clientX - position.x, y: clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({ x: clientX - startPos.current.x, y: clientY - startPos.current.y });
  };

  const stopDragging = () => { isDragging.current = false; };

  const applyCrop = () => {
    const canvas = document.createElement('canvas');
    const outSize = 400;
    canvas.width = outSize;
    canvas.height = outSize;
    const ctx = canvas.getContext('2d');
    if (ctx && imageRef.current) {
      const img = imageRef.current;
      const displaySize = 280;
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      const aspect = naturalWidth / naturalHeight;
      let baseWidth: number, baseHeight: number;
      if (aspect > 1) {
        baseHeight = displaySize;
        baseWidth = displaySize * aspect;
      } else {
        baseWidth = displaySize;
        baseHeight = displaySize / aspect;
      }
      const drawWidth = baseWidth * zoom;
      const drawHeight = baseHeight * zoom;
      ctx.clearRect(0, 0, outSize, outSize);
      ctx.beginPath();
      ctx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2);
      ctx.clip();
      const canvasScale = outSize / displaySize;
      const uiX = (displaySize / 2) + position.x - (drawWidth / 2);
      const uiY = (displaySize / 2) + position.y - (drawHeight / 2);
      ctx.drawImage(img, uiX * canvasScale, uiY * canvasScale, drawWidth * canvasScale, drawHeight * canvasScale);
      setAvatarBase64(canvas.toDataURL('image/jpeg', 0.95));
      setShowCropModal(false);
    }
  };

  const handleProfileSubmit = async () => {
    if (role !== 'admin' && role !== 'author') {
      try {
        const res = await completeProfile({ name, avatar: avatarBase64 || undefined, role });
        if (res) {
          onLoginSuccess({
            id: res.user.id,
            email: res.user.email,
            phoneNumber: res.user.phoneNumber || '',
            name: res.user.name,
            avatar: res.user.avatar,
            role: res.user.role as UserRole,
            interests: res.user.interests || [],
            library: res.user.library,
          }, res.token);
        }
      } catch {}
    } else if (role === 'admin') {
      setAdminUsername('');
      setAdminPassword('');
      setStep('admin');
    } else {
      setStep('author');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUsername !== 'admin' || adminPassword !== 'admin') {
      setError('نام کاربری یا رمز عبور اشتباه است');
      return;
    }
    try {
      const res = await completeProfile({
        name: ADMIN_IDENTITY.name,
        avatar: ADMIN_IDENTITY.avatar,
        role: 'admin',
        securityKey: 'admin123',
      });
      if (res) {
        onLoginSuccess({
          id: res.user.id,
          email: res.user.email,
          phoneNumber: res.user.phoneNumber || '',
          name: res.user.name,
          avatar: res.user.avatar,
          role: res.user.role as UserRole,
          interests: res.user.interests || [],
          library: res.user.library,
        }, res.token);
      }
    } catch {}
  };

  const handleAuthorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityKey) { setError('رمز عبور را وارد کنید'); return; }
    try {
      const res = await completeProfile({ name, avatar: avatarBase64 || undefined, role: 'author', securityKey });
      if (res) {
        onLoginSuccess({
          id: res.user.id,
          email: res.user.email,
          phoneNumber: res.user.phoneNumber || '',
          name: res.user.name,
          avatar: res.user.avatar,
          role: res.user.role as UserRole,
          interests: res.user.interests || [],
          library: res.user.library,
        }, res.token);
      }
    } catch {
      setError('رمز امنیتی اشتباه است');
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-[2000] flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 animate-fadeIn font-sans overflow-y-auto">
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none"></div>

      <div className="fixed top-5 right-5 z-[4000] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} onClick={() => dismissToast(t.id)} className={`pointer-events-auto cursor-pointer px-4 py-3 rounded-2xl text-sm font-bold text-white shadow-2xl max-w-[280px] flex items-center gap-2.5 backdrop-blur-sm border border-white/10 ${
            t.exiting ? 'animate-toastOutRight' : 'animate-toastInRight'
          } ${
            t.type === 'success' ? 'bg-green-500/90 shadow-green-500/30' : t.type === 'warning' ? 'bg-amber-500/90 shadow-amber-500/30' : 'bg-red-500/90 shadow-red-500/30'
          }`} style={{ boxShadow: `0 8px 32px ${t.type === 'success' ? 'rgba(34,197,94,0.35)' : t.type === 'warning' ? 'rgba(245,158,11,0.35)' : 'rgba(239,68,68,0.35)'}` }}>
            <span className="text-base flex-shrink-0">{t.type === 'success' ? '✅' : t.type === 'warning' ? '⚠️' : '❌'}</span>
            <span className="leading-relaxed">{t.message}</span>
          </div>
        ))}
      </div>

      {mutedWarning && (
        <div className="fixed top-5 right-5 z-[3000] bg-orange-500 text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl animate-slideDown max-w-[80vw] text-center border border-white/10" onClick={() => setMutedWarning(false)}>
          شما در حالت سکوت هستید {mutedUntil ? `تا ${new Date(mutedUntil).toLocaleString('fa-IR')}` : ''}
        </div>
      )}

      <div className="w-full max-w-sm z-10 my-4 sm:my-0">
        <div className="flex flex-col items-center mb-6 sm:mb-10 animate-slideInDown">
          <div className="mb-3 sm:mb-5">
            <SohaLogo size={72} />
          </div>
          <h1 className="font-nastaliq font-black text-3xl text-primary tracking-tight" style={{ textShadow: '0 2px 10px rgba(26, 179, 148, 0.3)' }}>
            سرای هنر و اندیشه
          </h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.25em] mt-2">Saraye Honar va Andisheh</p>
        </div>

        <div className="bg-white/95 backdrop-blur-2xl p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] shadow-2xl border border-white/40 animate-slideInUp relative flex flex-col justify-center pb-8 sm:pb-8">

          {step === 'form' && (
            <>
              {/* Mode Tabs */}
              <div className="flex bg-gray-100 rounded-2xl p-1 mb-4 sm:mb-6">
                <button onClick={() => { setMode('login'); setError(''); }} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${mode === 'login' ? 'bg-white text-primary shadow-md' : 'text-gray-400'}`}>
                  ورود
                </button>
                <button onClick={() => { setMode('register'); setError(''); }} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${mode === 'register' ? 'bg-white text-primary shadow-md' : 'text-gray-400'}`}>
                  ثبت‌نام
                </button>
              </div>

              {/* Login Form */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-3 sm:space-y-5 animate-fadeIn">
                  <div className="text-center">
                    <h1 className="text-xl font-black text-gray-800 ">خوش آمدید</h1>
                    <p className="text-xs text-gray-500 mt-1 font-bold">ایمیل یا شماره موبایل و رمز عبور خود را وارد کنید</p>
                  </div>
                  <input type="text" dir="ltr" value={loginField} onChange={(e) => setLoginField(e.target.value)} placeholder="example@email.com / 09123456789"
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-3 sm:px-4 py-3 sm:py-4 text-center text-sm font-bold focus:border-primary transition-all outline-none" />
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-3 sm:px-4 py-3 sm:py-4 pl-12 text-center text-sm font-bold focus:border-primary transition-all outline-none" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors">
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                    </button>
                  </div>
                  {error && <p className="text-red-500 text-[11px] font-black text-center bg-red-50 py-2 rounded-xl">{error}</p>}
                  <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50">
                    {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : 'ورود'}
                  </button>
                  <div className="text-center">
                    <button type="button" onClick={() => { setMode('forgot'); setStep('form'); setError(''); setPassword(''); setPhoneNumber(''); setOtpCode(''); setOtpProofToken(null); }} className="text-primary text-[11px] font-black hover:underline">فراموشی رمز عبور؟</button>
                  </div>
                </form>
              )}

              {/* Register Form */}
              {mode === 'register' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(phoneNumber, 'register'); }} className="space-y-3 sm:space-y-4 animate-fadeIn">
                  <div className="text-center">
                    <h1 className="text-xl font-black text-gray-800 ">ایجاد حساب کاربری</h1>
                    <p className="text-xs text-gray-500 mt-1 font-bold">اطلاعات خود را وارد کنید</p>
                  </div>
                  <div>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(prev => ({ ...prev, name: true }))} placeholder="نام و نام خانوادگی"
                      className={`w-full bg-gray-50 border-2 rounded-2xl px-3 sm:px-4 py-3 sm:py-4 text-center text-sm font-bold transition-all outline-none ${touched.name && fieldErrors.name ? 'border-red-300 bg-red-50/50' : touched.name && !fieldErrors.name ? 'border-green-300' : 'border-gray-100 focus:border-primary'}`} />
                    {touched.name && fieldErrors.name && <p className="text-red-500 text-[10px] font-bold mt-1 text-center">{fieldErrors.name}</p>}
                  </div>
                  <div>
                    <input type="tel" dir="ltr" value={phoneNumber} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 11); setPhoneNumber(val); }} onBlur={() => setTouched(prev => ({ ...prev, phoneNumber: true }))} maxLength={11} placeholder="09123456789"
                      className={`w-full bg-gray-50 border-2 rounded-2xl px-3 sm:px-4 py-3 sm:py-4 text-center text-sm font-bold transition-all outline-none ${touched.phoneNumber && fieldErrors.phoneNumber ? 'border-red-300 bg-red-50/50' : touched.phoneNumber && !fieldErrors.phoneNumber ? 'border-green-300' : 'border-gray-100 focus:border-primary'}`} />
                    {touched.phoneNumber && fieldErrors.phoneNumber && <p className="text-red-500 text-[10px] font-bold mt-1 text-center">{fieldErrors.phoneNumber}</p>}
                  </div>
                  <div>
                    <input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched(prev => ({ ...prev, email: true }))} placeholder="example@email.com (اختیاری)"
                      className={`w-full bg-gray-50 border-2 rounded-2xl px-3 sm:px-4 py-3 sm:py-4 text-center text-sm font-bold transition-all outline-none ${touched.email && fieldErrors.email ? 'border-red-300 bg-red-50/50' : touched.email && !fieldErrors.email ? 'border-green-300' : 'border-gray-100 focus:border-primary'}`} />
                    {touched.email && fieldErrors.email && <p className="text-red-500 text-[10px] font-bold mt-1 text-center">{fieldErrors.email}</p>}
                  </div>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="رمز عبور"
                      className={`w-full bg-gray-50 border-2 rounded-2xl px-3 sm:px-4 py-3 sm:py-4 pl-12 text-center text-sm font-bold transition-all outline-none ${touched.password && fieldErrors.password ? 'border-red-300 bg-red-50/50' : touched.password && !fieldErrors.password ? 'border-green-300' : 'border-gray-100 focus:border-primary'}`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors">
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                    </button>
                    {touched.password && fieldErrors.password && <p className="text-red-500 text-[10px] font-bold mt-1 text-center">{fieldErrors.password}</p>}
                  </div>
                  <div>
                    <input type="password" dir="ltr" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="تکرار رمز عبور"
                      className={`w-full bg-gray-50 border-2 rounded-2xl px-3 sm:px-4 py-3 sm:py-4 text-center text-sm font-bold transition-all outline-none ${touched.confirmPassword && fieldErrors.confirmPassword ? 'border-red-300 bg-red-50/50' : touched.confirmPassword && !fieldErrors.confirmPassword ? 'border-green-300' : 'border-gray-100 focus:border-primary'}`} />
                    {touched.confirmPassword && fieldErrors.confirmPassword && <p className="text-red-500 text-[10px] font-bold mt-1 text-center">{fieldErrors.confirmPassword}</p>}
                  </div>
                  {error && <p className="text-red-500 text-[11px] font-black text-center bg-red-50 py-2 rounded-xl">{error}</p>}
                  <button type="submit" disabled={isSubmitting || !phoneNumber || !/^09\d{9}$/.test(phoneNumber)} className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50">
                    {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : 'دریافت کد تایید'}
                  </button>
                </form>
              )}
            </>
          )}

          {step === 'otp' && (mode === 'register' || mode === 'forgot') && (
            <div className="space-y-4 sm:space-y-5 animate-fadeIn">
              <div className="text-center">
                <button type="button" onClick={() => { setStep('form'); setOtpCode(''); }} className="text-primary text-[10px] font-black mb-4 flex items-center gap-1 mx-auto bg-primary/5 px-4 py-2 rounded-full active:scale-95 transition-all"><i className="fas fa-arrow-right"></i> بازگشت</button>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4 border-2 border-primary/20"><i className="fas fa-shield-alt text-2xl"></i></div>
                <h1 className="text-lg font-black text-gray-800">تأیید شماره موبایل</h1>
                <p className="text-[10px] text-gray-500 mt-1 font-bold">کد ۴ رقمی ارسال شده به <span className="text-primary">{phoneNumber}</span> را وارد کنید</p>
              </div>
              <div>
                <input ref={otpInputRef} type="tel" dir="ltr" value={otpCode} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 4); setOtpCode(val); if (val.length === 4 && mode === 'forgot') handleVerifyOtp(phoneNumber, 'forgot'); }} maxLength={4} placeholder="• • • •"
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-4 text-center text-2xl font-black tracking-[0.5em] text-gray-800 focus:border-primary transition-all outline-none" />
              </div>
              <button type="button" onClick={() => mode === 'register' ? handleVerifyOtpAndRegister() : handleVerifyOtp(phoneNumber, 'forgot')} disabled={isSubmitting || otpCode.length < 4} className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50">
                {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : 'ثبت‌نام نهایی'}
              </button>
              <div className="text-center">
                <button type="button" onClick={() => handleSendOtp(phoneNumber, mode === 'forgot' ? 'forgot' : 'register')} disabled={otpTimer > 0 || isSubmitting} className="text-primary text-[11px] font-black disabled:text-gray-400 disabled:cursor-not-allowed hover:underline">
                  {otpTimer > 0 ? `ارسال مجدد کد (${otpTimer} ثانیه)` : 'ارسال مجدد کد'}
                </button>
              </div>
            </div>
          )}

          {mode === 'forgot' && step === 'form' && (
            <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(phoneNumber, 'forgot'); }} className="space-y-4 sm:space-y-5 animate-fadeIn">
              <div className="text-center">
                <button type="button" onClick={() => { setMode('login'); setStep('form'); setError(''); setPhoneNumber(''); }} className="text-primary text-[10px] font-black mb-4 flex items-center gap-1 mx-auto bg-primary/5 px-4 py-2 rounded-full active:scale-95 transition-all"><i className="fas fa-arrow-right"></i> بازگشت</button>
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mx-auto mb-4 border-2 border-orange-100"><i className="fas fa-key text-2xl"></i></div>
                <h1 className="text-lg font-black text-gray-800">فراموشی رمز عبور</h1>
                <p className="text-[10px] text-gray-500 mt-1 font-bold">شماره موبایل خود را وارد کنید تا کد تایید ارسال شود</p>
              </div>
              <div>
                <input type="tel" dir="ltr" value={phoneNumber} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 11); setPhoneNumber(val); }} maxLength={11} placeholder="09123456789"
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-4 text-center text-sm font-bold focus:border-primary transition-all outline-none" />
              </div>
              {error && <p className="text-red-500 text-[11px] font-black text-center bg-red-50 py-2 rounded-xl">{error}</p>}
              <button type="submit" disabled={isSubmitting || !phoneNumber || !/^09\d{9}$/.test(phoneNumber)} className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50">
                {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : 'ارسال کد تایید'}
              </button>
            </form>
          )}

          {step === 'newPassword' && mode === 'forgot' && (
            <div className="space-y-4 sm:space-y-5 animate-fadeIn">
              <div className="text-center">
                <button type="button" onClick={() => { setStep('otp'); setPassword(''); setConfirmPassword(''); setOtpCode(''); }} className="text-primary text-[10px] font-black mb-4 flex items-center gap-1 mx-auto bg-primary/5 px-4 py-2 rounded-full active:scale-95 transition-all"><i className="fas fa-arrow-right"></i> بازگشت</button>
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto mb-4 border-2 border-green-100"><i className="fas fa-check-circle text-2xl"></i></div>
                <h1 className="text-lg font-black text-gray-800">تغییر رمز عبور</h1>
                <p className="text-[10px] text-gray-500 mt-1 font-bold">شماره موبایل شما تأیید شد. رمز عبور جدید خود را وارد کنید</p>
              </div>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="رمز عبور جدید (حداقل ۴ کاراکتر)"
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-4 pl-12 text-center text-sm font-bold focus:border-primary transition-all outline-none" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors">
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                </button>
              </div>
              <div>
                <input type="password" dir="ltr" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="تکرار رمز عبور جدید"
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-4 text-center text-sm font-bold focus:border-primary transition-all outline-none" />
              </div>
              {error && <p className="text-red-500 text-[11px] font-black text-center bg-red-50 py-2 rounded-xl">{error}</p>}
              <button type="button" onClick={handleResetPasswordSubmit} disabled={isSubmitting} className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50">
                {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : 'تغییر رمز عبور'}
              </button>
            </div>
          )}

          {step === 'profile' && (
            <div className="space-y-3 sm:space-y-5 animate-fadeIn">
              <div className="text-center mb-2">
                <h1 className="text-lg font-black text-gray-800">تکمیل پروفایل</h1>
                <p className="text-[10px] text-gray-400 font-bold mt-1">تصویر و نقش خود را انتخاب کنید</p>
              </div>

              <div className="flex flex-col items-center gap-4">
                {role === 'admin' ? (
                  <div className="flex flex-col items-center animate-fadeIn">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary shadow-xl ring-4 ring-primary/10">
                      <SohaLogo size={96} />
                    </div>
                    <span className="text-primary font-black text-sm mt-3">{ADMIN_IDENTITY.name}</span>
                    <p className="text-[9px] text-gray-400 font-bold mt-1">هویت رسمی مدیریت</p>
                  </div>
                ) : (
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center shadow-2xl border-4 border-white transition-transform group-hover:scale-105"
                      style={{ backgroundColor: avatarBase64 ? 'transparent' : avatarColor }}>
                      {avatarBase64 ? <img src={avatarBase64} className="w-full h-full object-cover" alt="Avatar" /> : <span className="text-white text-3xl font-black">{getInitials(name)}</span>}
                    </div>
                    <div className="absolute bottom-0 right-0 bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white"><i className="fas fa-camera text-[10px]"></i></div>
                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {(['user', 'author', 'admin'] as UserRole[]).map((r) => (
                    <button key={r} type="button" onClick={() => { setRole(r); setError(''); }} className={`py-2 rounded-xl text-[10px] font-black border-2 transition-all ${role === r ? 'bg-primary border-primary text-white shadow-md' : 'bg-white border-gray-100 text-gray-400'}`}>
                      {r === 'user' ? 'کاربر' : r === 'author' ? 'نویسنده' : 'ادمین'}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" onClick={handleProfileSubmit} className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all">
                {role === 'user' ? 'ورود به سرای هنر و اندیشه' : 'مرحله بعد'}
              </button>
            </div>
          )}

          {step === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-6 animate-fadeIn">
              <div className="text-center">
                <button type="button" onClick={() => setStep('profile')} className="text-primary text-[10px] font-black mb-4 flex items-center gap-1 mx-auto bg-primary/5 px-4 py-2 rounded-full active:scale-95 transition-all"><i className="fas fa-arrow-right"></i> بازگشت</button>
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4 border-2 border-red-100"><i className="fas fa-shield-alt text-2xl"></i></div>
                <h1 className="text-lg font-black text-gray-800">ورود به پنل مدیریت</h1>
                <p className="text-[10px] text-gray-500 mt-1 font-bold">نام کاربری و رمز عبور مدیر سیستم را وارد کنید</p>
              </div>
              <input type="text" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} placeholder="نام کاربری"
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-3 sm:px-4 py-3 sm:py-4 text-center text-sm font-bold focus:border-primary outline-none transition-all" />
              <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="رمز عبور"
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-3 sm:px-4 py-3 sm:py-4 text-center text-sm font-bold focus:border-primary outline-none transition-all" />
              {error && <p className="text-red-500 text-[10px] font-black text-center">{error}</p>}
              <button type="submit" className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all">ورود به پنل مدیریت</button>
            </form>
          )}

          {step === 'author' && (
            <form onSubmit={handleAuthorLogin} className="space-y-6 animate-fadeIn">
              <div className="text-center">
                <button type="button" onClick={() => setStep('profile')} className="text-primary text-[10px] font-black mb-4 flex items-center gap-1 mx-auto bg-primary/5 px-4 py-2 rounded-full active:scale-95 transition-all"><i className="fas fa-arrow-right"></i> بازگشت</button>
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4 border-2 border-red-100"><i className="fas fa-shield-alt text-2xl"></i></div>
                <h1 className="text-lg font-black text-gray-800">تایید سطح دسترسی</h1>
                <p className="text-[10px] text-gray-500 mt-1 font-bold">برای نقش <span className="text-primary">نویسنده</span> نیاز به رمز دارید</p>
              </div>
              <input type="password" value={securityKey} onChange={(e) => setSecurityKey(e.target.value)} placeholder="رمز عبور مخصوص"
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-3 sm:px-4 py-3 sm:py-4 text-center font-bold focus:border-primary outline-none" />
              {error && <p className="text-red-500 text-[10px] font-black text-center">{error}</p>}
              <button type="submit" className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all">ورود نهایی</button>
            </form>
          )}
        </div>
      </div>

      {showCropModal && rawImage && (
        <div className="fixed inset-0 z-[3000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-[3.5rem] p-8 flex flex-col items-center shadow-2xl relative">
            <button onClick={() => setShowCropModal(false)} className="absolute top-6 left-6 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 active:scale-90 transition-all z-20"><i className="fas fa-times"></i></button>
            <h3 className="text-lg font-black text-gray-800 mb-8 mt-4">تنظیم تصویر پروفایل</h3>
            <div className="relative w-72 h-72 bg-gray-50 rounded-full overflow-hidden border-4 border-primary/20 cursor-move shadow-inner" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={stopDragging} onMouseLeave={stopDragging} onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={stopDragging}>
              <img ref={imageRef} src={rawImage} alt="Crop Area" className="absolute max-w-none pointer-events-none select-none origin-center" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`, top: '50%', left: '50%', marginTop: '-140px', marginLeft: '-140px', width: '280px', transition: isDragging.current ? 'none' : 'transform 0.1s ease-out' }} />
              <div className="absolute inset-0 border-[30px] border-black/40 pointer-events-none rounded-full"></div>
              <div className="absolute inset-0 border-2 border-primary pointer-events-none rounded-full ring-4 ring-primary/5"></div>
            </div>
            <div className="w-full mt-10 space-y-8">
              <div className="flex items-center gap-5 bg-gray-50 p-4 rounded-2xl">
                <i className="fas fa-search-minus text-gray-300"></i>
                <input type="range" min="1" max="4" step="0.01" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="flex-1 accent-primary h-2 bg-gray-200 rounded-full appearance-none cursor-pointer" />
                <i className="fas fa-search-plus text-gray-300"></i>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowCropModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-sm active:scale-95 transition-all">انصراف</button>
                <button onClick={applyCrop} className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2"><i className="fas fa-check-circle"></i> تایید و برش</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
