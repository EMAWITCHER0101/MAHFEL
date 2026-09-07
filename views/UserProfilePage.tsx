
import React, { useState, useEffect } from 'react';
import { User, Podcast, Video, Post, PublishedBook } from '../types';
import { toPersianDigits } from '../utils/helpers';
import { getPosts, updateProfile } from '../services/api';
import { getPushEnabled, isPushSecureContext, toggleWebPush, syncWebPushSubscription, getAppNotifEnabled,
  setAppNotifEnabled } from '../services/webPush';
import ConfirmToast from '../components/ConfirmToast';

const PushToggleButton = () => {
    const [enabled, setEnabled] = useState(getAppNotifEnabled());
    const [busy, setBusy] = useState(false);

    useEffect(() => { setEnabled(getAppNotifEnabled()); }, []);

    const handleClick = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const next = !enabled;
            setAppNotifEnabled(next);
            setEnabled(next);
            if (next) {
                await toggleWebPush().catch(() => {});
                const on = getPushEnabled();
                setEnabled(on || next);
            } else {
                await toggleWebPush().catch(() => {});
                setEnabled(false);
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <button onClick={handleClick} disabled={busy}
            className="w-full text-right p-4 rounded-3xl hover:bg-gray-50 transition-colors flex items-center gap-4 bg-white border border-gray-100 shadow-sm group">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                <i className={`fas ${enabled ? 'fa-bell' : 'fa-bell-slash'} text-sm`}></i>
            </div>
            <div className="flex-1">
                <span className="font-black text-gray-700 text-sm">نوتیفیکیشن‌ها</span>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">{enabled ? 'فعال — نوتیفیکیشن‌ها برای شما نمایش داده می‌شود' : 'غیرفعال — نوتیفیکیشن‌ها نمایش داده نمی‌شود'}</p>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${enabled ? 'left-0.5' : 'left-[22px]'}`}></div>
            </div>
        </button>
    );
};

interface UserProfilePageProps {
  onClose: () => void;
  onLogout: () => void;
  user: User;
  allPodcasts: Podcast[];
  allVideos: Video[];
  onPlayPodcast: (podcast: Podcast, episodeIndex: number) => void;
  onPlayVideo: (video: Video) => void;
  onEditPost?: (post: Post) => void;
  onDeletePost?: (postId: number) => void;
  onUpdateUser?: (user: User) => void;
  onOpenAdmin?: () => void;
  myNotes?: PublishedBook[];
  onSaveNote?: (data: { title: string; content: string; isDraft: boolean }) => Promise<PublishedBook | null>;
  onUpdateNote?: (id: string, data: { title: string; content: string; isDraft?: boolean }) => Promise<PublishedBook | null>;
  onDeleteNote?: (id: string) => Promise<boolean>;
  onRepostToMahfel?: (note: PublishedBook) => Promise<void> | void;
  viewAuthor?: { name: string; avatar?: string; authorId?: string } | null;
  authorNotes?: PublishedBook[];
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({ onClose, onLogout, user, allPodcasts, allVideos, onPlayPodcast, onPlayVideo, onEditPost, onDeletePost, onUpdateUser, onOpenAdmin, myNotes, onSaveNote, onUpdateNote, onDeleteNote, onRepostToMahfel, viewAuthor, authorNotes }) => {
    const [view, setView] = useState<'main' | 'library' | 'myPosts' | 'editProfile'>('main');
    const [myPosts, setMyPosts] = useState<Post[]>([]);
    const [editName, setEditName] = useState(user.name);
    const [editPhone, setEditPhone] = useState(user.phoneNumber);
    const [editAvatar, setEditAvatar] = useState(user.avatar || '');
    const [isSaving, setIsSaving] = useState(false);
    const [composerNote, setComposerNote] = useState<{ open: boolean; note?: PublishedBook }>({ open: false });
  const [confirmDeleteNote, setConfirmDeleteNote] = useState<PublishedBook | null>(null);
    const [pushUnsupported, setPushUnsupported] = useState(false);

    useEffect(() => { if (!isPushSecureContext()) setPushUnsupported(true); }, []);

    useEffect(() => { setView('main'); }, [viewAuthor]);
    
    const maskedPhoneNumber = user.phoneNumber 
      ? `${user.phoneNumber.substring(0, 4)}****${user.phoneNumber.substring(8)}`
      : 'شماره ثبت نشده';

    const libraryPodcasts = allPodcasts.filter(p => user.library?.podcasts?.includes(p.id));
    const libraryVideos = allVideos.filter(v => user.library?.videos?.includes(v.id));
    const libraryNotesCount = user.library?.notes?.length || 0;
    const totalLibraryItems = libraryPodcasts.length + libraryVideos.length + libraryNotesCount;

    const isAuthor = user.role === 'author' || user.role === 'admin';

    useEffect(() => {
        if (view === 'myPosts') {
            getPosts().then(allPosts => {
                setMyPosts(allPosts.filter((p: Post) => p.author === user.name));
            });
        }
    }, [view, user.name]);

    return (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-end sm:items-center sm:justify-center p-0 sm:p-4 backdrop-blur-md animate-fadeIn" onClick={onClose}>
            <div 
              className="bg-white rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl w-full max-w-md flex flex-col animate-slideInUp h-[85vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0 bg-white">
                    <div className="flex items-center gap-2">
                        {view !== 'main' && (
                            <button onClick={() => setView('main')} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 ml-2">
                                <i className="fas fa-arrow-right"></i>
                            </button>
                        )}
                        <h2 className="font-black text-gray-800">{viewAuthor ? `پروفایل ${viewAuthor.name}` : view === 'main' ? 'پروفایل من' : view === 'library' ? 'کتابخانه من' : view === 'editProfile' ? 'ویرایش پروفایل' : 'یادداشت‌های من'}</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-300 text-2xl w-8 h-8 rounded-full hover:bg-gray-100">&times;</button>
                </header>
                
                <main className="flex-grow overflow-y-auto no-scrollbar pb-10">
                    {viewAuthor ? (
                        <>
                            <div className="flex flex-col items-center py-8 bg-white border-b border-gray-50 mb-6">
                                <div className="w-24 h-24 rounded-[2rem] bg-primary flex items-center justify-center text-white text-5xl font-bold mb-4 overflow-hidden border-4 border-white shadow-xl rotate-3">
                                    {viewAuthor.avatar ? <img src={viewAuthor.avatar} className="w-full h-full object-cover" /> : <i className="fas fa-user"></i>}
                                </div>
                                <p className="text-lg font-black text-gray-800">{viewAuthor.name}</p>
                                <div className="mt-4">
                                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20">
                                        ✍️ نویسنده سرای هنر و اندیشه
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 space-y-3 pb-4">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-black text-primary text-[10px] uppercase tracking-widest border-r-4 border-primary pr-3">یادداشت‌های عمومی ({toPersianDigits(authorNotes?.length || 0)})</h4>
                                </div>
                                {(authorNotes || []).length === 0 ? (
                                    <div className="text-center py-12 text-gray-300">
                                        <i className="fas fa-feather-alt text-4xl mb-3" />
                                        <p className="text-[10px] font-bold">این نویسنده هنوز یادداشتی منتشر نکرده است</p>
                                    </div>
                                ) : (authorNotes || []).map(note => (
                                    <div key={note.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                        <span className="text-[11px] font-black text-gray-700 block mb-1">{note.title}</span>
                                        <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-2 text-right mb-2">{note.description?.replace(/<[^>]*>/g, '') || '...'}</p>
                                        <div className="flex items-center gap-3 text-[9px] text-gray-300 font-bold">
                                            {note.date && <span><i className="fas fa-calendar-alt text-gray-200 ml-1" />{note.date}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : view === 'main' ? (
                        <>
                            <div className="flex flex-col items-center py-8 bg-white border-b border-gray-50 mb-6">
                                <div className="w-24 h-24 rounded-[2rem] bg-primary flex items-center justify-center text-white text-5xl font-bold mb-4 overflow-hidden border-4 border-white shadow-xl rotate-3">
                                    {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <i className="fas fa-user"></i>}
                                </div>
                                <p className="text-lg font-black text-gray-800">{user.name}</p>
                                <p className="text-xs font-bold text-gray-400 mt-1" dir="ltr">{maskedPhoneNumber}</p>
                                {user.email && <p className="text-[10px] font-bold text-gray-400 mt-1">{user.email}</p>}
                                <div className="mt-4 flex items-center gap-2 flex-wrap justify-center">
                                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20">
                                        {user.role === 'superadmin' ? '⚡ مدیر سیستم EMAD CH' : user.role === 'admin' ? '🛡️ مدیر سیستم' : user.role === 'author' ? '✍️ نویسنده سرای هنر و اندیشه' : '👤 مخاطب همراه'}
                                    </div>
                                    {(user.warnings || 0) > 0 && !user.banned && (
                                        <div className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black border border-amber-200">
                                            ⚠️ {toPersianDigits(user.warnings || 0)} اخطار
                                        </div>
                                    )}
                                    {user.banned && (
                                        <div className="bg-red-50 text-red-500 px-3 py-1 rounded-full text-[10px] font-black border border-red-200">
                                            🚫 مسدود شده
                                        </div>
                                    )}
                                    {user.muted && (
                                        <div className="bg-orange-50 text-orange-500 px-3 py-1 rounded-full text-[10px] font-black border border-orange-200">
                                            🔇 در حالت سکوت
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="px-6 space-y-3">
                                
                                <button onClick={() => setView('library')} className="w-full text-right p-4 rounded-3xl hover:bg-gray-50 transition-colors flex items-center gap-4 bg-white border border-gray-100 shadow-sm group">
                                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <i className="fas fa-bookmark text-sm"></i>
                                    </div>
                                    <div className="flex-1">
                                        <span className="font-black text-gray-700 text-sm">کتابخانه من</span>
                                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">{toPersianDigits(totalLibraryItems)} مورد ذخیره شده</p>
                                    </div>
                                    <i className="fas fa-chevron-left text-gray-200"></i>
                                </button>

                                <PushToggleButton /> {pushUnsupported && (
                                    <p className="text-[9px] text-gray-400 font-bold px-2 -mt-2">برای دریافت اعلان، سایت باید روی HTTPS باز شود</p>
                                )}

                                {user && (
                                    <button onClick={() => setView('myPosts')} className="w-full text-right p-4 rounded-3xl hover:bg-gray-50 transition-colors flex items-center gap-4 bg-white border border-gray-100 shadow-sm group">
                                        <div className="w-10 h-10 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                            <i className="fas fa-pen-fancy text-sm"></i>
                                        </div>
                                        <div className="flex-1">
                                            <span className="font-black text-gray-700 text-sm">یادداشت‌های من</span>
                                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">مدیریت پست‌ها و یادداشت‌ها</p>
                                        </div>
                                        <i className="fas fa-chevron-left text-gray-200"></i>
                                    </button>
                                )}

                                <button onClick={() => setView('editProfile')} className="w-full text-right p-4 rounded-3xl hover:bg-gray-50 transition-colors flex items-center gap-4 bg-white border border-gray-100 shadow-sm group">
                                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <i className="fas fa-cog text-sm"></i>
                                    </div>
                                    <div className="flex-1">
                                        <span className="font-black text-gray-700 text-sm">تنظیمات حساب</span>
                                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">ویرایش پروفایل</p>
                                    </div>
                                    <i className="fas fa-chevron-left text-gray-200"></i>
                                </button>

                                {['admin', 'superadmin'].includes(user.role) && (
                                    <button onClick={onOpenAdmin} className="w-full text-right p-4 rounded-3xl hover:bg-gray-50 transition-colors flex items-center gap-4 bg-white border border-gray-100 shadow-sm group">
                                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                            <i className="fas fa-chart-pie text-sm"></i>
                                        </div>
                                        <div className="flex-1">
                                            <span className="font-black text-gray-700 text-sm">داشبورد مدیریت</span>
                                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">مدیریت سایت، کاربران و محتوا</p>
                                        </div>
                                        <i className="fas fa-chevron-left text-gray-200"></i>
                                    </button>
                                )}
                            </div>
                        </>
                    ) : view === 'myPosts' ? (
                        <div className="p-6 space-y-4 animate-fadeIn">
                            {user && (
                                <button onClick={() => setComposerNote({ open: true, note: undefined })} className="w-full py-3 rounded-2xl text-[11px] font-black text-white transition-all active:scale-95 shadow-lg bg-gradient-to-l from-primary to-secondary flex items-center justify-center gap-2 mb-4">
                                    <i className="fas fa-pen-nib" /> نوشتن یادداشت جدید
                                </button>
                            )}

                            {/* My Notes (PublishedBook type=note) */}
                            {myNotes && myNotes.length > 0 && (
                                <div className="mb-2">
                                    <h4 className="font-black text-primary text-[10px] uppercase tracking-widest border-r-4 border-primary pr-3 mb-3">یادداشت‌های نشر ({toPersianDigits(myNotes.length)})</h4>
                                    <div className="space-y-3">
                                        {myNotes.map(note => (
                                            <div key={note.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-black text-gray-700">{note.title}</span>
                                                    {note.isDraft ? (
                                                        <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">پیش‌نویس</span>
                                                    ) : note.pendingApproval ? (
                                                        <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">در انتظار تأیید مدیر</span>
                                                    ) : (
                                                        <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">منتشر شده</span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-2 mb-3 text-right">{note.description?.replace(/<[^>]*>/g, '') || '...'}</p>
                                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                                                    {note.isDraft && onUpdateNote && (
                                                        <button onClick={() => onUpdateNote(String(note.id), { title: note.title || '', content: note.contentHtml || note.description || '', isDraft: false })} className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 transition-colors px-2 py-1 rounded-lg flex-1 justify-center">
                                                            <i className="fas fa-send" /> انتشار
                                                        </button>
                                                    )}
                                                    <button onClick={() => setComposerNote({ open: true, note })} className="flex items-center gap-1 text-[10px] font-bold text-primary hover:bg-primary/5 transition-colors px-2 py-1 rounded-lg flex-1 justify-center">
                                                        <i className="fas fa-edit" /> ویرایش
                                                    </button>
                                                    <button onClick={() => setConfirmDeleteNote(note)} className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:bg-red-50 transition-colors px-2 py-1 rounded-lg flex-1 justify-center">
                                                        <i className="fas fa-trash" /> حذف
                                                    </button>
                                                    {!note.isDraft && onRepostToMahfel && (
                                                        <button onClick={() => onRepostToMahfel(note)} className="flex items-center gap-1 text-[10px] font-bold text-secondary hover:bg-secondary/10 transition-colors px-2 py-1 rounded-lg flex-1 justify-center">
                                                            <i className="fas fa-paper-plane" /> بازنشر در محفل
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-black text-secondary text-[10px] uppercase tracking-widest border-r-4 border-secondary pr-3">پست‌های محفل من ({toPersianDigits(myPosts.length)})</h4>
                            </div>
                            {myPosts.length === 0 ? (
                                <div className="text-center py-12 text-gray-300">
                                    <i className="fas fa-pen-fancy text-4xl mb-3" />
                                    <p className="text-[10px] font-bold">هنوز یادداشتی ننوشته‌اید</p>
                                </div>
                            ) : myPosts.map(post => (
                                <div key={post.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[9px] text-gray-400 font-bold">{post.date}</span>
                                        {post.isEdited && <span className="text-[8px] text-gray-300 font-bold">ویرایش شده</span>}
                                    </div>
                                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">{post.text}</p>
                                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                                        <span><i className="fas fa-heart text-red-300 ml-1" />{toPersianDigits(post.likes)}</span>
                                        <span><i className="fas fa-comment text-gray-300 ml-1" />{toPersianDigits(post.comments.length)}</span>
                                    </div>
                                    {(onEditPost || onDeletePost) && (
                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                                            {onEditPost && (
                                                <button onClick={() => onEditPost(post)} className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary-dark transition-colors px-2 py-1 rounded-lg hover:bg-primary/5">
                                                    <i className="fas fa-edit" /> ویرایش
                                                </button>
                                            )}
                                            {onDeletePost && (
                                                <button onClick={() => { if (confirm('آیا از حذف این پست مطمئن هستید؟')) onDeletePost(post.id); }} className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
                                                    <i className="fas fa-trash" /> حذف
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : view === 'editProfile' ? (
                        <div className="p-6 space-y-6 animate-fadeIn">
                            <div className="flex flex-col items-center py-4">
                                <label className="relative w-24 h-24 rounded-[2rem] cursor-pointer group overflow-hidden border-4 border-white shadow-xl rotate-3">
                                    {editAvatar ? (
                                        <img src={editAvatar} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-primary flex items-center justify-center text-white text-4xl font-bold">
                                            <i className="fas fa-user"></i>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[2rem]">
                                        <i className="fas fa-camera text-white text-lg"></i>
                                    </div>
                                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                            const img = new Image();
                                            img.onload = () => {
                                                const canvas = document.createElement('canvas');
                                                canvas.width = 256; canvas.height = 256;
                                                const ctx = canvas.getContext('2d')!;
                                                const m = Math.min(img.width, img.height);
                                                ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, 256, 256);
                                                setEditAvatar(canvas.toDataURL('image/jpeg', 0.8));
                                            };
                                            img.src = ev.target?.result as string;
                                        };
                                        reader.readAsDataURL(file);
                                    }} />
                                </label>
                                <p className="text-[10px] text-gray-400 mt-3 font-bold">برای تغییر آواتار کلیک کنید</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-black text-gray-500 mb-2">نام و نام خانوادگی</label>
                                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                                        className="w-full px-4 py-3 rounded-2xl text-sm font-bold bg-gray-50 border-2 border-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="نام خود را وارد کنید" dir="rtl" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-gray-500 mb-2">شماره تماس</label>
                                    <input type="text" value={editPhone} readOnly
                                        className="w-full px-4 py-3 rounded-2xl text-sm font-bold font-mono bg-gray-100 border-2 border-gray-100 text-gray-400 cursor-not-allowed"
                                        dir="ltr" />
                                    <p className="text-[9px] text-gray-300 mt-1 font-bold">شماره تماس قابل تغییر نیست</p>
                                </div>
                                {user.email && (
                                    <div>
                                        <label className="block text-[11px] font-black text-gray-500 mb-2">ایمیل</label>
                                        <input type="text" value={user.email} readOnly
                                            className="w-full px-4 py-3 rounded-2xl text-sm font-bold bg-gray-100 border-2 border-gray-100 text-gray-400 cursor-not-allowed" />
                                        <p className="text-[9px] text-gray-300 mt-1 font-bold">ایمیل قابل تغییر نیست</p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-[11px] font-black text-gray-500 mb-2">نقش</label>
                                    <input type="text" value={user.role === 'admin' ? 'مدیر سیستم 🛡️' : user.role === 'author' ? 'نویسنده ✍️' : 'مخاطب 👤'} readOnly
                                        className="w-full px-4 py-3 rounded-2xl text-sm font-bold bg-gray-100 border-2 border-gray-100 text-gray-400 cursor-not-allowed" />
                                </div>
                            </div>

                            <button onClick={async () => {
                                if (!editName.trim() || !onUpdateUser) return;
                                setIsSaving(true);
                                try {
                                    await updateProfile({ name: editName.trim(), avatar: editAvatar });
                                } catch {}
                                onUpdateUser({ ...user, name: editName.trim(), avatar: editAvatar });
                                setIsSaving(false);
                                setView('main');
                            }} disabled={!editName.trim() || isSaving}
                                className="w-full py-4 rounded-3xl text-white text-sm font-black transition-all active:scale-95 disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                                {isSaving ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check ml-2" /> ذخیره تغییرات</>}
                            </button>
                        </div>
                    ) : (
                        <div className="p-6 space-y-6 animate-fadeIn">
                             <section>
                                <h4 className="font-black text-primary text-[10px] uppercase tracking-widest mb-4 border-r-4 border-primary pr-3">صوت‌های ذخیره شده ({toPersianDigits(libraryPodcasts.length)})</h4>
                                <div className="space-y-3">
                                    {libraryPodcasts.length > 0 ? libraryPodcasts.map(pod => (
                                        <div key={pod.id} onClick={() => onPlayPodcast(pod, 0)} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 active:scale-95 transition-all">
                                            <img src={pod.cover} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-black text-gray-800 truncate">{pod.title}</p>
                                                <p className="text-[9px] text-gray-400 font-bold mt-1">سال {toPersianDigits(pod.year)} • {toPersianDigits(pod.episodes.length)} جلسه</p>
                                            </div>
                                            <i className="fas fa-play text-primary text-xs ml-2"></i>
                                        </div>
                                    )) : <p className="text-center py-6 text-gray-300 text-[10px] font-black italic">موردی در کتابخانه نیست</p>}
                                </div>
                             </section>

                             <section>
                                <h4 className="font-black text-secondary text-[10px] uppercase tracking-widest mb-4 border-r-4 border-secondary pr-3">ویدیوهای ذخیره شده ({toPersianDigits(libraryVideos.length)})</h4>
                                <div className="space-y-3">
                                    {libraryVideos.length > 0 ? libraryVideos.map(vid => (
                                        <div key={vid.id} onClick={() => onPlayVideo(vid)} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 active:scale-95 transition-all">
                                            <img src={vid.thumbnailUrl} className="w-20 aspect-video rounded-xl object-cover shadow-sm" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-black text-gray-800 truncate">{vid.title}</p>
                                                <p className="text-[9px] text-gray-400 font-bold mt-1">{vid.uploadDate}</p>
                                            </div>
                                            <i className="fas fa-play text-secondary text-xs ml-2"></i>
                                        </div>
                                    )) : <p className="text-center py-6 text-gray-300 text-[10px] font-black italic">موردی در کتابخانه نیست</p>}
                                </div>
                             </section>
                        </div>
                    )}
                </main>

                <footer className="flex-shrink-0 p-6 border-t border-gray-100 bg-white">
                    <button 
                        onClick={onLogout}
                        className="w-full bg-red-500/10 text-red-600 font-black py-4 px-5 rounded-3xl hover:bg-red-500/20 transition-all active:scale-95 text-xs flex items-center justify-center gap-2"
                    >
                        <i className="fas fa-sign-out-alt"></i>
                        خروج از حساب کاربری
                    </button>
                </footer>

                {composerNote.open && (
                    <NoteComposer
                        note={composerNote.note}
                        onSave={onSaveNote}
                        onUpdate={onUpdateNote}
                        onDelete={onDeleteNote}
                        onRequestDelete={(n) => { setComposerNote({ open: false }); setConfirmDeleteNote(n); }}
                        onClose={() => setComposerNote({ open: false })}
                    />
                )}
            </div>

            <ConfirmToast
                open={!!confirmDeleteNote}
                message={confirmDeleteNote ? `یادداشت «${String(confirmDeleteNote.title || 'بدون عنوان')}» حذف شود؟` : ''}
                onConfirm={async () => {
                    if (!confirmDeleteNote) return;
                    if (await onDeleteNote?.(String(confirmDeleteNote.id))) {
                        setConfirmDeleteNote(null);
                        setComposerNote({ open: false });
                    }
                }}
                onCancel={() => setConfirmDeleteNote(null)}
            />
        </div>
    );
};

const NoteComposer: React.FC<{
    note?: PublishedBook;
    onSave?: (data: { title: string; content: string; isDraft: boolean }) => Promise<PublishedBook | null>;
    onUpdate?: (id: string, data: { title: string; content: string; isDraft?: boolean }) => Promise<PublishedBook | null>;
    onDelete?: (id: string) => Promise<boolean>;
    onRequestDelete?: (note: PublishedBook) => void;
    onClose: () => void;
}> = ({ note, onSave, onUpdate, onDelete, onRequestDelete, onClose }) => {
    const [title, setTitle] = useState(note?.title || '');
    const [content, setContent] = useState(note?.contentHtml || note?.description || '');
    const [saving, setSaving] = useState(false);

    return (
        <div className="fixed inset-0 bg-black/60 z-[1100] flex items-end sm:items-center sm:justify-center p-0 sm:p-4 backdrop-blur-md animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl w-full max-w-md p-6 animate-slideInUp" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h4 className="font-black text-gray-800 text-sm">{note ? 'ویرایش یادداشت' : 'یادداشت جدید'}</h4>
                    <button onClick={onClose} className="text-gray-300 text-2xl w-8 h-8 rounded-full hover:bg-gray-100">&times;</button>
                </div>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان یادداشت" className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs font-bold text-gray-700 outline-none focus:border-primary transition-colors mb-3" />
                <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="متن یادداشت..." rows={8} className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs font-medium text-gray-700 outline-none focus:border-primary transition-colors resize-none leading-6 mb-4" />
                <div className="flex gap-2">
                    <button onClick={async () => {
                        if (!title.trim() || !content.trim() || saving) return;
                        setSaving(true);
                        if (note && onUpdate) {
                            await onUpdate(String(note.id), { title, content, isDraft: true });
                        } else {
                            await onSave?.({ title, content, isDraft: true });
                        }
                        setSaving(false);
                        onClose();
                    }} disabled={!title.trim() || !content.trim() || saving} className="flex-1 py-3 rounded-2xl text-[11px] font-black text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-30">
                        <i className="fas fa-lock ml-1.5 text-[9px]" /> ذخیره پیش‌نویس
                    </button>
                    <button onClick={async () => {
                        if (!title.trim() || !content.trim() || saving) return;
                        setSaving(true);
                        if (note && onUpdate) {
                            await onUpdate(String(note.id), { title, content, isDraft: false });
                        } else {
                            await onSave?.({ title, content, isDraft: false });
                        }
                        setSaving(false);
                        onClose();
                    }} disabled={!title.trim() || !content.trim() || saving} className="flex-1 py-3 rounded-2xl text-[11px] font-black text-white bg-gradient-to-l from-primary to-secondary hover:opacity-90 transition-all active:scale-95 disabled:opacity-30 shadow-lg">
                        <i className="fas fa-paper-plane ml-1.5 text-[9px]" /> انتشار در صفحه نشر
                    </button>
                </div>
                {note && onDelete && (
                    <button onClick={() => { if (note) onRequestDelete?.(note); }} className="w-full mt-3 py-2.5 rounded-2xl text-[10px] font-black text-red-500 bg-red-50 hover:bg-red-100 transition-all active:scale-95">
                        <i className="fas fa-trash ml-1.5" /> حذف یادداشت
                    </button>
                )}
            </div>
        </div>
    );
};

export default UserProfilePage;
