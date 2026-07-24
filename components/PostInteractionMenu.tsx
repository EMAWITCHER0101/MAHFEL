import React, { useState } from 'react';
import type { Post } from '../types';

interface PostInteractionMenuProps {
    post: Post | null;
    isVisible: boolean;
    onClose: () => void;
    onDelete: (postId: number) => void;
    onReply: (post: Post) => void;
}

const MenuItem: React.FC<{ icon: string; label: string; onClick: () => void; isDestructive?: boolean }> = ({ icon, label, onClick, isDestructive = false }) => (
    <button onClick={onClick} className={`w-full text-right p-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-4 text-base ${isDestructive ? 'text-red-600' : 'text-text-primary'}`}>
        <i className={`${icon} w-6 text-center text-lg`}></i>
        <span className="font-semibold">{label}</span>
    </button>
);

const PostInteractionMenu: React.FC<PostInteractionMenuProps> = ({ post, isVisible, onClose, onDelete, onReply }) => {
    const [menuToast, setMenuToast] = useState('');
    if (!isVisible || !post) return null;
    
    const showMenuToast = (msg: string) => {
        setMenuToast(msg);
        setTimeout(() => setMenuToast(''), 2500);
    };

    const handleAction = (action: () => void) => {
        action();
        onClose();
    };

    const handleDelete = () => {
        if (window.confirm('آیا از حذف این پست اطمینان دارید؟ این عمل قابل بازگشت نیست.')) {
            onDelete(post.id);
        }
    };
    
    const handleCopy = async () => {
        if (!post.text) {
            showMenuToast('این پست متنی برای کپی کردن ندارد.');
            return;
        }
        try {
            await navigator.clipboard.writeText(String(post.text));
            showMenuToast('متن با موفقیت کپی شد.');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            showMenuToast('خطا در کپی کردن متن.');
        }
    };
    
    const handleShare = async () => {
        const shareUrl = (window.location.origin && window.location.origin !== 'null') 
            ? window.location.origin 
            : 'https://soha.app';

        const shareData: ShareData = {
            title: `پست از ${post.author} در سرای هنر و اندیشه`,
            url: shareUrl,
        };
        if (post.text) {
            shareData.text = post.text;
        }

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                showMenuToast('اشتراک‌گذاری در این مرورگر پشتیبانی نمی‌شود.');
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-[1000] flex items-end animate-fadeIn" onClick={onClose}>
            <div 
                className="w-full bg-card-bg rounded-t-2xl p-2 pb-4 animate-slideInFromBottom"
                onClick={e => e.stopPropagation()}
            >
                <div className="w-10 h-1.5 bg-gray-300 rounded-full mx-auto mb-3"></div>
                <div className="space-y-1">
                    <MenuItem icon="fas fa-reply" label="پاسخ" onClick={() => handleAction(() => onReply(post))} />
                    <MenuItem icon="fas fa-copy" label="کپی کردن متن" onClick={() => handleAction(handleCopy)} />
                    <MenuItem icon="fas fa-share-alt" label="اشتراک‌گذاری" onClick={() => handleAction(handleShare)} />
                    <MenuItem icon="fas fa-trash-alt" label="حذف" onClick={() => handleAction(handleDelete)} isDestructive />
                </div>
            </div>
            {menuToast && (
                <div className="fixed top-5 right-5 z-[2000] bg-gray-900/90 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold animate-toastIn flex items-center gap-2 border border-white/10 max-w-[80vw]">
                    <i className="fas fa-info-circle text-primary text-sm"></i>
                    {menuToast}
                </div>
            )}
        </div>
    );
};

export default PostInteractionMenu;
