import { Router } from 'express';
import User from '../models/User.js';
import { auth, requireAuth, generateToken } from '../middleware/auth.js';
import { isIranianIP, getClientIP } from '../utils/ipCheck.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'نام الزامی است' });
    if (!email || !email.trim()) return res.status(400).json({ error: 'ایمیل الزامی است' });
    if (!password || password.length < 4) return res.status(400).json({ error: 'رمز عبور باید حداقل ۴ کاراکتر باشد' });
    if (!phoneNumber || !/^09\d{9}$/.test(phoneNumber)) return res.status(400).json({ error: 'شماره موبایل نامعتبر است' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'ایمیل نامعتبر است' });

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) return res.status(409).json({ error: 'ایمیل قبلاً ثبت شده است' });

    const existingPhone = await User.findOne({ phoneNumber });
    if (existingPhone) return res.status(409).json({ error: 'شماره موبایل قبلاً ثبت شده است' });

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phoneNumber,
      avatar: generateDefaultAvatar(name),
      role: 'user',
      interests: [],
      library: { podcasts: [], episodes: [], videos: [], books: [], notes: [] },
    });
    await user.save();

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
    const { phoneNumber } = req.body;
    if (!/^09\d{9}$/.test(phoneNumber)) {
      return res.status(400).json({ error: 'شماره موبایل نامعتبر است' });
    }
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    console.log('\n========================================');
    console.log(`  OTP for ${phoneNumber}: ${otp}`);
    console.log('========================================\n');
    res.json({ success: true, message: 'کد تایید ارسال شد' });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

function generateDefaultAvatar(name) {
  const initials = (name || 'ک').charAt(0);
  const colors = [
    ['#f59e0b', '#d97706'], ['#10b981', '#059669'], ['#3b82f6', '#2563eb'],
    ['#8b5cf6', '#7c3aed'], ['#ef4444', '#dc2626'], ['#ec4899', '#db2777'],
    ['#06b6d4', '#0891b2'], ['#14b8a6', '#0d9488'],
  ];
  const idx = ((name || 'ک').charCodeAt(0) || 0) % colors.length;
  const [c1, c2] = colors[idx];
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${c1}"/><stop offset="100%" style="stop-color:${c2}"/></linearGradient></defs><rect width="128" height="128" rx="64" fill="url(#g)"/><text x="64" y="64" font-family="Arial,sans-serif" font-size="52" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${initials}</text></svg>`)}`;
}

router.post('/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    if (!otp || otp.length < 4) {
      return res.status(400).json({ error: 'کد تایید ناقص است' });
    }

    let user = await User.findOne({ phoneNumber });
    if (!user) {
      user = new User({
        phoneNumber,
        name: '',
        avatar: generateDefaultAvatar(''),
        role: 'user',
        interests: [],
        library: { podcasts: [], episodes: [], videos: [], books: [], notes: [] },
      });
      await user.save();
    }

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        interests: user.interests,
        library: user.library,
      },
      isNewUser: !user.name,
    });
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
    if (name !== undefined) req.user.name = name;
    if (avatar !== undefined) req.user.avatar = avatar;
    await req.user.save();
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

export default router;
