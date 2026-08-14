import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import PublishedBook from '../models/PublishedBook.js';
import PushSubscription from '../models/PushSubscription.js';
import { broadcast } from './broadcast.js';

/** حذف کامل محتوای یک کاربر: پست‌ها، کامنت‌ها + ریپلای‌های آن‌ها، آثار منتشرشده و اشتراک‌های push */
export async function deleteUserContent(userId) {
  // پست‌های کاربر
  const postIds = (await Post.find({ userId }).select('_id')).map(p => String(p._id));
  await Post.deleteMany({ userId });
  if (postIds.length) {
    broadcast('data-changed', { type: 'posts', action: 'ids-delete', ids: postIds });
  }

  // کامنت‌های توکار کاربر + ریپلای‌هایی که به کامنت‌های او زده شده‌اند
  const affected = await Post.find({ 'comments.userId': userId }).select('_id comments').lean();
  if (affected.length) {
    const myCommentIds = [];
    affected.forEach(p => (p.comments || []).forEach(c => {
      if (c.userId && String(c.userId) === String(userId)) myCommentIds.push(String(c._id));
    }));
    await Post.updateMany({ 'comments.userId': userId }, {
      $pull: { comments: { $or: [{ userId }, { replyTo: { $in: myCommentIds } }] } },
    });
    const fresh = await Post.find({ _id: { $in: affected.map(a => a._id) } });
    fresh.forEach(p => broadcast('data-changed', { type: 'posts', action: 'update', item: p.toObject() }));
  }

  // کامنت‌های مستقل (پادکست/ویدیو/کتاب) + ریپلای‌ها
  const myComments = await Comment.find({ userId }).select('_id').lean();
  const myIds = myComments.map(c => c._id);
  const replyIds = await Comment.find({ parentId: { $in: myIds } }).select('_id').lean();
  const commentIds = [...myComments, ...replyIds].map(c => String(c._id));
  await Comment.deleteMany({ $or: [{ userId }, { parentId: { $in: myIds } }] });
  if (commentIds.length) {
    broadcast('data-changed', { type: 'comments', action: 'ids-delete', ids: commentIds });
  }

  // آثار منتشرشده/یادداشت‌های نویسنده
  const bookIds = (await PublishedBook.find({ authorId: userId }).select('_id')).map(b => String(b._id));
  await PublishedBook.deleteMany({ authorId: userId });
  if (bookIds.length) {
    broadcast('data-changed', { type: 'publishedBooks', action: 'ids-delete', ids: bookIds });
  }

  // اشتراک‌های push کاربر
  await PushSubscription.deleteMany({ userId }).catch(() => {});
  return { postIds, commentIds, bookIds };
}

export default deleteUserContent;