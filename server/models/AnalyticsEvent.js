import mongoose from 'mongoose';

const analyticsEventSchema = new mongoose.Schema({
  event: { type: String, required: true, index: true },
  refType: { type: String, default: '' },
  refId: { type: mongoose.Schema.Types.Mixed, default: null },
  refTitle: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
  identifier: { type: String, default: '' },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, suppressReservedKeysWarning: true });

analyticsEventSchema.index({ event: 1, createdAt: -1 });
analyticsEventSchema.index({ refType: 1, refId: 1, createdAt: -1 });

export default mongoose.model('AnalyticsEvent', analyticsEventSchema);