import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isIranianIP, getClientIP } from '../utils/ipCheck.js';

export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const ip = getClientIP(req);
    req.clientIP = ip;
    req.isIranianIP = isIranianIP(ip);
    
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      req.user = null;
      return next();
    }
    if (user.muted && user.mutedUntil && new Date() > user.mutedUntil) {
      user.muted = false;
      user.mutedUntil = null;
      user.mutedReason = '';
      await user.save();
    }
    req.user = user;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

export const requireAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'احراز هویت لازم است' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'کاربر یافت نشد' });
    if (user.banned) return res.status(403).json({ error: 'شما از سایت اخراج شده‌اید.', banned: true });

    if (user.muted && user.mutedUntil && new Date() > user.mutedUntil) {
      user.muted = false;
      user.mutedUntil = null;
      user.mutedReason = '';
      await user.save();
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'توکن نامعتبر است' });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'احراز هویت لازم است' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    next();
  };
};

export const requireSuperAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'احراز هویت لازم است' });
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'فقط مدیر سیستم دسترسی دارد' });
  }
  next();
};

export const requireAdminPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'احراز هویت لازم است' });
    if (req.user.role === 'superadmin') return next();
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    if (!req.user.adminPermissions || !req.user.adminPermissions.includes(permission)) {
      return res.status(403).json({ error: `دسترسی «${permission}» ندارید` });
    }
    next();
  };
};

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};
