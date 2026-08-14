import { Router } from 'express';
import Setting from '../models/Setting.js';
import Notification from '../models/Notification.js';
import { auth, requireRole } from '../middleware/auth.js';
import { broadcast } from '../utils/broadcast.js';

const router = Router();

const CHAT_KEY = 'community_chat';

async function getChatSettings() {
  const doc = await Setting.findOne({ key: CHAT_KEY });
  return doc?.value || { chatEnabled: true, chatMessage: '' };
}

// وضعیت چت محفل (عمومی)
router.get('/settings', async (req, res) => {
  try {
    res.json(await getChatSettings());
  } catch (e) {
    console.error('GET COMMUNITY SETTINGS ERROR', e);
    res.status(500).json({ error: 'خطا در دریافت وضعیت چت' });
  }
});

// باز/بسته کردن چت محفل (ادمین)
router.put('/settings', auth, requireRole('admin'), async (req, res) => {
  try {
    const { chatEnabled, chatMessage } = req.body;
    const value = { chatEnabled: !!chatEnabled, chatMessage: chatMessage || '' };
    await Setting.findOneAndUpdate({ key: CHAT_KEY }, { key: CHAT_KEY, value }, { upsert: true });

    // اعلان به همه کاربران
    try {
      await Notification.create({
        title: chatEnabled ? '💬 چت محفل باز شد' : '🔒 چت محفل بسته شد',
        body: chatEnabled ? 'ادمین چت محفل را باز کرد — می‌توانید پیام بفرستید' : (chatMessage || 'ادمین چت محفل را بسته است — فعلاً فقط می‌توانید پیام‌ها را ببینید'),
        type: 'community',
        link: '',
      });
      broadcast('data-changed', { type: 'notifications', action: 'create' });
    } catch (e) {
      console.error('COMMUNITY NOTIFY ERROR', e);
    }

    broadcast('data-changed', { type: 'community-settings', action: 'update', item: value });
    res.json(value);
  } catch (e) {
    console.error('UPDATE COMMUNITY SETTINGS ERROR', e);
    res.status(500).json({ error: 'خطا در ذخیره وضعیت چت' });
  }
});

export default router;
