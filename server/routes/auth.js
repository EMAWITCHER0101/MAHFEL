import { Router } from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import { auth, requireAuth, generateToken } from '../middleware/auth.js';
import { isIranianIP, getClientIP } from '../utils/ipCheck.js';
import { deleteUserContent } from '../utils/deleteUserContent.js';
import { broadcast } from '../utils/broadcast.js';
import { sendOtpSms } from '../utils/sms.js';

const router = Router();

const otpStore = new Map();
const otpProofStore = new Map();

function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function cleanExpiredOtps() {
  const now = Date.now();
  for (const [phone, entry] of otpStore) {
    if (entry.expiresAt < now) otpStore.delete(phone);
  }
  for (const [token, entry] of otpProofStore) {
    if (entry.expiresAt < now) otpProofStore.delete(token);
  }
}

function genProofToken(phone, purpose) {
  const token = crypto.randomBytes(24).toString('hex');
  otpProofStore.set(token, { phone, purpose, expiresAt: Date.now() + 10 * 60 * 1000 });
  return token;
}

async function propagateProfileToContent(userId, oldName, newName, newAvatar) {
  const sets = { author: newName, authorAvatarUrl: newAvatar };
  await Comment.updateMany({ userId }, { $set: sets });
  await Comment.updateMany({ author: oldName, userId: { $exists: false } }, { $set: sets });
  await Post.updateMany({ userId }, { $set: sets });
  await Post.updateMany({ author: oldName, userId: { $exists: false } }, { $set: sets });
  await Post.updateMany(
    { 'comments.userId': userId },
    { $set: { 'comments.$[c].author': newName, 'comments.$[c].authorAvatarUrl': newAvatar } },
    { arrayFilters: [{ 'c.userId': userId }] }
  );
  await Post.updateMany(
    { 'comments.author': oldName, 'comments.userId': { $exists: false } },
    { $set: { 'comments.$[c].author': newName, 'comments.$[c].authorAvatarUrl': newAvatar } },
    { arrayFilters: [{ 'c.author': oldName, 'c.userId': { $exists: false } }] }
  );
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phoneNumber, otpToken } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'نام الزامی است' });
    if (!password || String(password).length < 4) return res.status(400).json({ error: 'رمز عبور باید حداقل ۴ کاراکتر باشد' });
    if (!phoneNumber || !/^09\d{9}$/.test(String(phoneNumber).trim())) return res.status(400).json({ error: 'شماره موبایل نامعتبر است' });

    const cleanPhone = String(phoneNumber).trim();

    if (!otpToken) {
      return res.status(400).json({ error: 'ابتدا کد تایید شماره موبایل را وارد کنید' });
    }
    const proof = otpProofStore.get(otpToken);
    if (!proof || proof.phone !== cleanPhone || proof.purpose !== 'register' || proof.expiresAt < Date.now()) {
      otpProofStore.delete(otpToken);
      return res.status(400).json({ error: 'کد تایید نامعتبر یا منقضی شده است. مجدداً کد بگیرید' });
    }
    otpProofStore.delete(otpToken);

    const cleanEmail = email ? String(email).trim().toLowerCase() : '';
    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) return res.status(400).json({ error: 'ایمیل نامعتبر است' });
      const existingEmail = await User.findOne({ email: cleanEmail });
      if (existingEmail) return res.status(409).json({ error: 'ایمیل قبلاً ثبت شده است' });
    }

    const existingPhone = await User.findOne({ phoneNumber: cleanPhone });
    if (existingPhone) return res.status(409).json({ error: 'شماره موبایل قبلاً ثبت شده است' });

    const user = new User({
      name: name.trim(),
      email: cleanEmail || undefined,
      password,
      phoneNumber: cleanPhone,
      avatar: generateDefaultAvatar(name),
      role: 'user',
      interests: [],
      library: { podcasts: [], episodes: [], videos: [], books: [], notes: [] },
    });
    await user.save();

    broadcast('data-changed', {
      type: 'users', action: 'create',
      item: { _id: user._id, name: user.name, avatar: user.avatar, role: user.role, createdAt: user.createdAt },
    });

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        interests: user.interests,
        library: user.library,
      },
    });
  } catch (error) {
    console.error('REGISTER ERROR:', error);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, phoneNumber, password } = req.body;
    if (!password) return res.status(400).json({ error: 'رمز عبور الزامی است' });
    if (!email && !phoneNumber) return res.status(400).json({ error: 'ایمیل یا شماره موبایل الزامی است' });

    let user;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
    } else if (phoneNumber) {
      user = await User.findOne({ phoneNumber });
    }
    if (!user || !user.password) return res.status(401).json({ error: 'ایمیل/شماره موبایل یا رمز عبور اشتباه است' });

    if (user.banned) return res.status(403).json({ error: 'شما از سایت اخراج شده‌اید.', banned: true });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'ایمیل/شماره موبایل یا رمز عبور اشتباه است' });

    const token = generateToken(user._id);
    const ip = getClientIP(req);
    const iranian = isIranianIP(ip);
    res.json({
      success: true,
      token,
      isIranianIP: iranian,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        interests: user.interests,
        library: user.library,
        warnings: user.warnings || 0,
        muted: user.muted || false,
        mutedUntil: user.mutedUntil || null,
        mutedReason: user.mutedReason || '',
      },
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/send-otp', async (req, res) => {
  try {
    cleanExpiredOtps();
    const { phoneNumber, purpose, name } = req.body;
    if (!phoneNumber || !/^09\d{9}$/.test(String(phoneNumber).trim())) {
      return res.json({ success: false, error: 'شماره موبایل نامعتبر است' });
    }
    const phone = String(phoneNumber).trim();
    const p = purpose || 'register';

    if (p === 'register') {
      const existing = await User.findOne({ phoneNumber: phone });
      if (existing) return res.json({ success: false, error: 'این شماره موبایل قبلاً ثبت شده است' });
    } else if (p === 'forgot') {
      const existing = await User.findOne({ phoneNumber: phone });
      if (!existing) return res.json({ success: false, error: 'حسابی با این شماره موبایل یافت نشد' });
    }

    const existing = otpStore.get(phone);
    if (existing && existing.nextSendAt > Date.now()) {
      const wait = Math.ceil((existing.nextSendAt - Date.now()) / 1000);
      return res.json({ success: false, error: `لطفاً ${wait} ثانیه صبر کنید` });
    }

    const code = generateOtp();
    otpStore.set(phone, {
      code,
      purpose: p,
      expiresAt: Date.now() + 120000,
      nextSendAt: Date.now() + 60000,
      attempts: 0,
    });

    const smsResult = await sendOtpSms(phone, code, name);
    if (!smsResult || !smsResult.sent) {
      console.error('[SMS FAILED]', phone, smsResult);
      return res.json({ success: false, error: 'خطا در ارسال پیامک. لطفاً دوباره تلاش کنید' });
    }
    res.json({ success: true, message: 'کد تایید ارسال شد' });
  } catch (error) {
    console.error('SEND OTP ERROR:', error);
    res.json({ success: false, error: 'خطای سرور' });
  }
});

function generateDefaultAvatar(name) {
  const safeName = (name && name.trim()) || 'ک';
  const initials = safeName.charAt(0) || 'ک';
  const colors = [
    ['#f59e0b', '#d97706'], ['#10b981', '#059669'], ['#3b82f6', '#2563eb'],
    ['#8b5cf6', '#7c3aed'], ['#ef4444', '#dc2626'], ['#ec4899', '#db2777'],
    ['#06b6d4', '#0891b2'], ['#14b8a6', '#0d9488'],
  ];
  const idx = (safeName.charCodeAt(0) || 0) % colors.length;
  const pair = colors[idx] || ['#3b82f6', '#2563eb'];
  const [c1, c2] = pair;
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${c1}"/><stop offset="100%" style="stop-color:${c2}"/></linearGradient></defs><rect width="128" height="128" rx="64" fill="url(#g)"/><text x="64" y="64" font-family="Arial,sans-serif" font-size="52" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${initials}</text></svg>`)}`;
}

router.post('/verify-otp', async (req, res) => {
  try {
    cleanExpiredOtps();
    const { phoneNumber, otp, purpose } = req.body;
    if (!phoneNumber || !/^09\d{9}$/.test(String(phoneNumber).trim())) {
      return res.json({ success: false, error: 'شماره موبایل نامعتبر است' });
    }
    if (!otp || String(otp).length < 4) {
      return res.json({ success: false, error: 'کد تایید ناقص است' });
    }

    const phone = String(phoneNumber).trim();
    const p = purpose || 'register';

    const stored = otpStore.get(phone);
    const isDevBypass = !process.env.SMSIR_API_KEY && String(otp) === '0000';

    if (!isDevBypass) {
      if (!stored) {
        return res.json({ success: false, error: 'ابتدا کد تایید را دریافت کنید' });
      }
      if (stored.expiresAt < Date.now()) {
        otpStore.delete(phone);
        return res.json({ success: false, error: 'کد تایید منقضی شده است' });
      }
      if (stored.purpose !== p) {
        return res.json({ success: false, error: 'کد تایید مربوط به این عملیات نیست' });
      }
      if (String(otp) !== stored.code) {
        stored.attempts++;
        if (stored.attempts >= 5) {
          otpStore.delete(phone);
          return res.json({ success: false, error: 'تعداد تلاش‌ها بیش از حد مجاز است. مجدداً کد بگیرید' });
        }
        return res.json({ success: false, error: 'کد تایید اشتباه است' });
      }
    }

    otpStore.delete(phone);

    if (p === 'register') {
      const existing = await User.findOne({ phoneNumber: phone });
      if (existing) return res.json({ success: false, error: 'این شماره موبایل قبلاً ثبت شده است' });
      const proofToken = genProofToken(phone, 'register');
      return res.json({ success: true, proofToken });
    }

    if (p === 'forgot') {
      const existing = await User.findOne({ phoneNumber: phone });
      if (!existing) return res.json({ success: false, error: 'حسابی با این شماره موبایل یافت نشد' });
      const proofToken = genProofToken(phone, 'forgot');
      return res.json({ success: true, proofToken });
    }

    if (!purpose) {
      let user = await User.findOne({ phoneNumber: phone });
      if (!user) {
        user = new User({
          phoneNumber: phone,
          name: '',
          avatar: generateDefaultAvatar(''),
          role: 'user',
          interests: [],
          library: { podcasts: [], episodes: [], videos: [], books: [], notes: [] },
        });
        await user.save();
      }
      const token = generateToken(user._id);
      return res.json({
        success: true, token,
        user: { id: user._id, phoneNumber: user.phoneNumber, name: user.name, avatar: user.avatar, role: user.role, interests: user.interests, library: user.library },
        isNewUser: !user.name,
      });
    }

    res.status(400).json({ error: 'purpose نامعتبر است' });
  } catch (error) {
    console.error('VERIFY OTP ERROR:', error);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/complete-profile', requireAuth, async (req, res) => {
  try {
    const { name, avatar, role, securityKey } = req.body;

    if (role === 'admin') {
      const correctKey = process.env.ADMIN_SECURITY_KEY || 'admin123';
      if (securityKey !== correctKey) {
        return res.status(403).json({ error: 'رمز امنیتی اشتباه است' });
      }
    }

    if (role === 'author') {
      const correctKey = process.env.AUTHOR_SECURITY_KEY || '1234';
      if (securityKey !== correctKey) {
        return res.status(403).json({ error: 'رمز امنیتی اشتباه است' });
      }
    }

    req.user.name = name || req.user.name;
    if (avatar) req.user.avatar = avatar;
    if (role) req.user.role = role;
    if (securityKey) req.user.securityKey = securityKey;
    await req.user.save();

    const token = generateToken(req.user._id);
    res.json({
      success: true,
      token,
      user: {
        id: req.user._id,
        phoneNumber: req.user.phoneNumber,
        name: req.user.name,
        avatar: req.user.avatar,
        role: req.user.role,
        interests: req.user.interests,
        library: req.user.library,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/interests', requireAuth, async (req, res) => {
  try {
    const { interests } = req.body;
    req.user.interests = interests;
    await req.user.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const ip = getClientIP(req);
  const iranian = isIranianIP(ip);
  res.json({
    isIranianIP: iranian,
    user: {
      id: req.user._id,
      email: req.user.email,
      phoneNumber: req.user.phoneNumber,
      name: req.user.name,
      avatar: req.user.avatar,
      role: req.user.role,
      interests: req.user.interests,
      library: req.user.library,
      warnings: req.user.warnings || 0,
      banned: req.user.banned || false,
      muted: req.user.muted || false,
      mutedUntil: req.user.mutedUntil || null,
      mutedReason: req.user.mutedReason || '',
    },
  });
});

// حذف کامل حساب خود + تمام پیام‌ها و محتوای کاربر
router.delete('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    await User.findByIdAndDelete(userId);
    await deleteUserContent(userId);
    broadcast('data-changed', { type: 'users', action: 'delete', id: String(userId) });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.put('/library', requireAuth, async (req, res) => {
  try {
    req.user.library = { ...req.user.library, ...req.body };
    await req.user.save();
    res.json({ success: true, library: req.user.library });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const oldName = req.user.name;
    if (name !== undefined) req.user.name = name;
    if (avatar !== undefined) req.user.avatar = avatar;
    await req.user.save();
    const userId = req.user._id;
    const newName = req.user.name;
    const newAvatar = req.user.avatar || '';
    await propagateProfileToContent(userId, oldName, newName, newAvatar);
    res.json({
      success: true,
      user: {
        id: req.user._id,
        phoneNumber: req.user.phoneNumber,
        name: req.user.name,
        avatar: req.user.avatar,
        role: req.user.role,
        interests: req.user.interests,
        library: req.user.library,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.put('/muted', requireAuth, async (req, res) => {
  try {
    if (req.user.muted && req.user.mutedUntil && new Date() > req.user.mutedUntil) {
      req.user.muted = false;
      req.user.mutedUntil = null;
      req.user.mutedReason = '';
      await req.user.save();
    }
    res.json({
      muted: req.user.muted || false,
      mutedUntil: req.user.mutedUntil || null,
      mutedReason: req.user.mutedReason || '',
    });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    cleanExpiredOtps();
    const { phoneNumber, otpToken, newPassword } = req.body;
    if (!phoneNumber || !/^09\d{9}$/.test(String(phoneNumber).trim())) {
      return res.json({ success: false, error: 'شماره موبایل نامعتبر است' });
    }
    if (!newPassword || String(newPassword).length < 4) {
      return res.json({ success: false, error: 'رمز عبور باید حداقل ۴ کاراکتر باشد' });
    }
    if (!otpToken) {
      return res.json({ success: false, error: 'ابتدا کد تایید را وارد کنید' });
    }

    const phone = String(phoneNumber).trim();
    const proof = otpProofStore.get(otpToken);
    if (!proof || proof.phone !== phone || proof.purpose !== 'forgot' || proof.expiresAt < Date.now()) {
      otpProofStore.delete(otpToken);
      return res.json({ success: false, error: 'کد تایید نامعتبر یا منقضی شده است. مجدداً کد بگیرید' });
    }
    otpProofStore.delete(otpToken);

    const user = await User.findOne({ phoneNumber: phone });
    if (!user) return res.json({ success: false, error: 'حسابی با این شماره موبایل یافت نشد' });

    user.password = newPassword;
    await user.save();

    const token = generateToken(user._id);
    res.json({
      success: true,
      message: 'رمز عبور با موفقیت تغییر کرد',
      token,
      user: {
        id: user._id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        interests: user.interests,
        library: user.library,
      },
    });
  } catch (error) {
    console.error('RESET PASSWORD ERROR:', error);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

export default router;
