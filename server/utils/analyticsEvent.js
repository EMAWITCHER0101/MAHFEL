import AnalyticsEvent from '../models/AnalyticsEvent.js';

export function trackEvent(event, refType = '', refId = null, refTitle = '', req = null, meta = {}) {
  const identifier = req?.user
    ? req.user._id || req.user.id || ''
    : req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.socket?.remoteAddress || '';
  const userId = req?.user?._id || req?.user?.id || null;
  AnalyticsEvent.create({
    event,
    refType,
    refId: refId === null || refId === undefined ? null : String(refId),
    refTitle: typeof refTitle === 'string' ? refTitle.slice(0, 300) : '',
    userId,
    identifier: String(identifier || 'anonymous'),
    meta,
  }).catch(err => console.error('AnalyticsEvent write failed:', err?.message));
}