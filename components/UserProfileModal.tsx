import React, { useState, useEffect } from 'react';
import { getUserById, PublicUserProfile } from '../services/api';
import { toPersianDigits, formatPersianDate } from '../utils/helpers';

interface UserProfileModalProps {
  userId?: string | null;
  name?: string;
  avatar?: string;
  onClose: () => void;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: 'ادمین', color: '#7c5cff' },
  author: { label: 'نویسنده', color: '#10b981' },
  user: { label: 'کاربر', color: '#2e86c1' },
};

const UserProfileModal: React.FC<UserProfileModalProps> = ({ userId, name, avatar, onClose }) => {
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    setLoading(true);
    getUserById(userId).then(p => {
      if (alive) { setProfile(p); setLoading(false); }
    }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [userId]);

  const displayName = profile?.name || name || 'کاربر';
  const displayAvatar = profile?.avatar || avatar || '';
  const role = profile?.role || 'user';
  const roleInfo = ROLE_LABELS[role] || ROLE_LABELS.user;

  const initials = (displayName || '؟').charAt(0);

  return (
    <div className="fixed inset-0 z-[9000] bg-black/60 backdrop-blur-md flex items-end sm:items-center sm:justify-center p-0 sm:p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full max-w-sm p-6 animate-slideInUp" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
              {displayAvatar ? <img src={displayAvatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white font-black text-lg">{initials}</div>}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-gray-800">{displayName}</h3>
                <span className="px-2 py-0.5 rounded-full text-[8px] font-black text-white" style={{ background: roleInfo.color }}>{roleInfo.label}</span>
              </div>
              {profile?.banned && <span className="text-[9px] font-black text-red-500"><i className="fas fa-ban ml-1"></i>از محفل اخراج شده</span>}
              {!profile?.banned && profile?.muted && <span className="text-[9px] font-black text-amber-500"><i className="fas fa-volume-xmark ml-1"></i>در حالت سکوت</span>}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-all active:scale-90">
            <i className="fas fa-times text-[11px]"></i>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400 text-xs font-black gap-2">
            <i className="fas fa-spinner fa-spin"></i> در حال دریافت پروفایل…
          </div>
        ) : (
          <div className="space-y-2">
            {/* Info rows */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3.5 py-2.5">
              <i className="fas fa-calendar-day w-4 text-center text-[11px] text-gray-400"></i>
              <span className="text-[10px] font-black text-gray-600">عضویت در محفل</span>
              <span className="mr-auto text-[10px] font-black text-gray-400">{profile?.createdAt ? formatPersianDate(profile.createdAt) : '—'}</span>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3.5 py-2.5">
              <i className="fas fa-comments w-4 text-center text-[11px] text-gray-400"></i>
              <span className="text-[10px] font-black text-gray-600">پیام‌ها</span>
              <span className="mr-auto text-[10px] font-black text-gray-400">{toPersianDigits((profile?.postCount || 0) + (profile?.commentCount || 0))} پیام</span>
            </div>
            {profile && (profile.warnings || 0) > 0 && (
              <div className="flex items-center gap-3 bg-amber-50 rounded-xl px-3.5 py-2.5">
                <i className="fas fa-triangle-exclamation w-4 text-center text-[11px] text-amber-500"></i>
                <span className="text-[10px] font-black text-amber-600">اخطارها</span>
                <span className="mr-auto text-[10px] font-black text-amber-500">{toPersianDigits(profile.warnings || 0)} از ۳</span>
              </div>
            )}
            {!userId && (
              <p className="text-[9px] text-gray-300 text-center pt-1">این پیام قدیمی است و کاربر آن یافت نشد</p>
            )}
          </div>
        )}

        <button onClick={onClose} className="w-full mt-5 py-3 rounded-2xl text-[11px] font-black text-white transition-all active:scale-95 shadow-lg" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
          بستن
        </button>
      </div>
    </div>
  );
};

export default UserProfileModal;