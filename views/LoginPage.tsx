
import React, { useState, useMemo, useRef } from 'react';
import { User, UserRole } from '../types';
import { getRandomTailwindColor, getInitials } from '../utils/helpers';
import { register, login, completeProfile } from '../services/api';
import { SohaLogo } from '../components/SohaLogo';

interface LoginPageProps {
  onLoginSuccess: (user: User, token?: string) => void;
}

const ADMIN_IDENTITY = {
  name: 'سرای هنر و اندیشه',
  avatar: ''
};

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
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
  const [step, setStep] = useState<'form' | 'profile' | 'admin' | 'author'>('form');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vpnWarning, setVpnWarning] = useState(false);
  const [mutedWarning, setMutedWarning] = useState(false);
  const [mutedUntil, setMutedUntil] = useState<string | null>(null);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginField.trim() || !password) {
      setError('ایمیل/شماره موبایل و رمز عبور را وارد کنید');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const isEmail = loginField.includes('@');
      const res = await login(isEmail ? loginField : '', isEmail ? '' : loginField, password);
      if (res && res.success) {
        if (res.banned) { setError('شما از سایت اخراج شده‌اید.'); return; }
        if (res.isIranianIP === false) {
          setVpnWarning(true);
        }
        if (res.user?.muted) {
          setMutedWarning(true);
          setMutedUntil(res.user.mutedUntil);
        }
        if (res.token) localStorage.setItem('soha_token', res.token);
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
      } else {
        setError(res?.error || 'ایمیل/شماره موبایل یا رمز عبور اشتباه است');
      }
    } catch (err: any) {
      setError(err?.message || 'خطا در ورود');
    }
    setIsSubmitting(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('نام خود را وارد کنید'); return; }
    if (!phoneNumber.trim() || !/^09\d{9}$/.test(phoneNumber)) { setError('شماره موبایل نامعتبر است'); return; }
    if (!email.trim()) { setError('ایمیل را وارد کنید'); return; }
    if (!password || password.length < 4) { setError('رمز عبور باید حداقل ۴ کاراکتر باشد'); return; }
    if (password !== confirmPassword) { setError('رمز عبور مطابقت ندارد'); return; }
    setError('');
    setIsSubmitting(true);
    try {
      const res = await register(name, email, password, phoneNumber);
      if (res && res.success) {
        if (res.token) localStorage.setItem('soha_token', res.token);
        setStep('profile');
      } else {
        setError(res?.error || 'خطا در ثبت‌نام');
      }
    } catch (err: any) {
      setError(err?.message || 'خطا در ثبت‌نام');
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

      {vpnWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[3000] bg-amber-500 text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl animate-slideDown max-w-sm text-center" onClick={() => setVpnWarning(false)}>
          ⚠️ لطفاً VPN خود را خاموش کنید
        </div>
      )}

      {mutedWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[3000] bg-orange-500 text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl animate-slideDown max-w-sm text-center" onClick={() => setMutedWarning(false)}>
          🔇 شما در حالت سکوت هستید {mutedUntil ? `تا ${new Date(mutedUntil).toLocaleString('fa-IR')}` : ''}
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
                    <h1 className="text-xl font-black text-gray-800 font-nastaliq">خوش آمدید</h1>
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
                </form>
              )}

              {/* Register Form */}
              {mode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3 sm:space-y-4 animate-fadeIn">
                  <div className="text-center">
                    <h1 className="text-xl font-black text-gray-800 font-nastaliq">ایجاد حساب کاربری</h1>
                    <p className="text-xs text-gray-500 mt-1 font-bold">اطلاعات خود را وارد کنید</p>
                  </div>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="نام و نام خانوادگی"
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-3 sm:px-4 py-3 sm:py-4 text-center text-sm font-bold focus:border-primary transition-all outline-none" />
                  <input type="tel" dir="ltr" value={phoneNumber} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 11); setPhoneNumber(val); }} maxLength={11} placeholder="09123456789"
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-3 sm:px-4 py-3 sm:py-4 text-center text-sm font-bold focus:border-primary transition-all outline-none" />
                  <input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com"
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-3 sm:px-4 py-3 sm:py-4 text-center text-sm font-bold focus:border-primary transition-all outline-none" />
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="رمز عبور"
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-3 sm:px-4 py-3 sm:py-4 pl-12 text-center text-sm font-bold focus:border-primary transition-all outline-none" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors">
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                    </button>
                  </div>
                  <input type="password" dir="ltr" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="تکرار رمز عبور"
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-3 sm:px-4 py-3 sm:py-4 text-center text-sm font-bold focus:border-primary transition-all outline-none" />
                  {error && <p className="text-red-500 text-[11px] font-black text-center bg-red-50 py-2 rounded-xl">{error}</p>}
                  <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50">
                    {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : 'ثبت‌نام'}
                  </button>
                </form>
              )}
            </>
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
