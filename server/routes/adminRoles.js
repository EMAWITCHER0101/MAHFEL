import { Router } from 'express';
import User from '../models/User.js';
import { auth, requireAuth, requireSuperAdmin, requireAdminPermission } from '../middleware/auth.js';

const router = Router();

const ADMIN_PERMISSIONS = [
  { id: 'users', label: 'مدیریت کاربران' },
  { id: 'posts', label: 'مدیریت پست‌ها' },
  { id: 'comments', label: 'مدیریت نظرات' },
  { id: 'analytics', label: 'آمار و تحلیل' },
  { id: 'sales', label: 'آمار فروش' },
  { id: 'videos', label: 'مدیریت ویدیوها' },
  { id: 'podcasts', label: 'مدیریت پادکست‌ها' },
  { id: 'library', label: 'مدیریت کتابخانه' },
  { id: 'notes', label: 'مدیریت یادداشت‌ها' },
  { id: 'authors', label: 'مدیریت نویسندگان' },
  { id: 'versions', label: 'مدیریت نسخه‌ها' },
  { id: 'purchases', label: 'مدیریت خریدها' },
  { id: 'support', label: 'پشتیبانی' },
  { id: 'notifications', label: 'اعلان‌ها' },
  { id: 'settings', label: 'تنظیمات' },
];

// لیست دسترسی‌های موجود
router.get('/permissions', auth, (req, res) => {
  res.json(ADMIN_PERMISSIONS);
});

// درخواست ادمین شدن (هر کاربر عادی)
router.post('/request', auth, requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (['admin', 'superadmin'].includes(user.role)) {
      return res.status(400).json({ error: 'شما قبلاً ادمین هستید' });
    }
    const pending = user.adminRequests?.find(r => r.status === 'pending');
    if (pending) {
      return res.status(400).json({ error: 'درخواست قبلی شما در انتظار بررسی است' });
    }
    if (!user.adminRequests) user.adminRequests = [];
    user.adminRequests.push({
      status: 'pending',
      message: req.body.message || '',
      requestedAt: new Date(),
    });
    await user.save();
    res.json({ success: true, message: 'درخواست شما ثبت شد' });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// لیست درخواست‌ها (فقط superadmin)
router.get('/requests', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const users = await User.find({
      'adminRequests.status': status,
    }).select('name phoneNumber email role adminRequests avatar');
    const requests = [];
    users.forEach(u => {
      u.adminRequests.filter(r => r.status === status).forEach(r => {
        requests.push({
          _id: r._id,
          userId: u._id,
          userName: u.name,
          userPhone: u.phoneNumber,
          userEmail: u.email,
          userAvatar: u.avatar,
          currentRole: u.role,
          message: r.message,
          requestedAt: r.requestedAt,
          status: r.status,
          grantedPermissions: r.grantedPermissions || [],
        });
      });
    });
    requests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// تأیید درخواست + تعیین نقش و دسترسی‌ها (فقط superadmin)
router.post('/requests/:requestId/approve', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { role = 'admin', permissions = [] } = req.body;
    if (!['admin', 'author'].includes(role)) {
      return res.status(400).json({ error: 'نقش معتبر نیست' });
    }
    const user = await User.findOne({ 'adminRequests._id': req.params.requestId });
    if (!user) return res.status(404).json({ error: 'درخواست یافت نشد' });
    const request = user.adminRequests.id(req.params.requestId);
    if (!request) return res.status(404).json({ error: 'درخواست یافت نشد' });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'این درخواست قبلاً بررسی شده' });
    }
    request.status = 'approved';
    request.reviewedAt = new Date();
    request.reviewedBy = req.user._id;
    request.grantedPermissions = role === 'admin' ? permissions : [];
    user.role = role;
    if (role === 'admin') {
      user.adminPermissions = permissions;
    }
    await user.save();
    res.json({ success: true, message: `${user.name || user.phoneNumber} ${role === 'admin' ? 'ادمین' : 'نویسنده'} شد` });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// رد درخواست (فقط superadmin)
router.post('/requests/:requestId/reject', auth, requireSuperAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ 'adminRequests._id': req.params.requestId });
    if (!user) return res.status(404).json({ error: 'درخواست یافت نشد' });
    const request = user.adminRequests.id(req.params.requestId);
    if (!request) return res.status(404).json({ error: 'درخواست یافت نشد' });
    request.status = 'rejected';
    request.reviewedAt = new Date();
    request.reviewedBy = req.user._id;
    await user.save();
    res.json({ success: true, message: 'درخواست رد شد' });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// تغییر نقش کاربر (فقط superadmin)
router.put('/users/:userId/role', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { role, permissions = [] } = req.body;
    if (!['user', 'author', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'نقش معتبر نیست' });
    }
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
    if (user.role === 'superadmin') {
      return res.status(400).json({ error: 'امکان تغییر نقش مدیر سیستم وجود ندارد' });
    }
    user.role = role;
    user.adminPermissions = role === 'admin' ? permissions : [];
    if (role !== 'admin') {
      user.adminPermissions = [];
    }
    await user.save();
    const roleNames = { user: 'کاربر', author: 'نویسنده', admin: 'ادمین' };
    res.json({ success: true, message: `${user.name || user.phoneNumber} به ${roleNames[role]} تغییر یافت` });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// حذف ادمین (برگرداندن به کاربر عادی) — فقط superadmin
router.post('/users/:userId/remove-admin', auth, requireSuperAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
    if (user.role === 'superadmin') {
      return res.status(400).json({ error: 'امکان حذف مدیر سیستم وجود ندارد' });
    }
    user.role = 'user';
    user.adminPermissions = [];
    await user.save();
    res.json({ success: true, message: `${user.name || user.phoneNumber} از ادمین حذف شد` });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// لیست همه ادمین‌ها (فقط superadmin)
router.get('/list', auth, requireSuperAdmin, async (req, res) => {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } })
      .select('name phoneNumber email role adminPermissions avatar createdAt')
      .sort({ role: -1, createdAt: -1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// بررسی وضعیت درخواست کاربر جاری
router.get('/my-request', auth, requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('role adminRequests adminPermissions');
    const pending = user.adminRequests?.find(r => r.status === 'pending');
    const lastReviewed = user.adminRequests?.filter(r => r.status !== 'pending').sort((a, b) => new Date(b.reviewedAt) - new Date(a.requestedAt))[0];
    res.json({
      role: user.role,
      adminPermissions: user.adminPermissions || [],
      pendingRequest: pending || null,
      lastReviewedRequest: lastReviewed || null,
    });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// به‌روزرسانی دسترسی‌های یک ادمین (فقط superadmin)
router.put('/users/:userId/permissions', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { permissions = [] } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
    if (user.role === 'superadmin') {
      return res.status(400).json({ error: 'امکان تغییر دسترسی مدیر سیستم وجود ندارد' });
    }
    user.adminPermissions = permissions;
    await user.save();
    res.json({ success: true, message: `دسترسی‌های ${user.name || user.phoneNumber} به‌روزرسانی شد`, permissions: user.adminPermissions });
  } catch (error) {
    res.status(500).json({ error: 'خطای سرور' });
  }
});

export default router;