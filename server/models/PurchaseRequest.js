import mongoose from 'mongoose';

const purchaseRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, default: '' },
    userPhone: { type: String, default: '' },
    orderNumber: { type: String, required: true, unique: true },
    items: [
      {
        title: { type: String, required: true },
        cover: { type: String, default: '' },
        price: { type: String, default: '' },
        quantity: { type: Number, default: 1 },
      },
    ],
    totalPrice: { type: Number, default: 0 },
    cardNumber: { type: String, default: '' },
    transferDate: { type: String, default: '' },
    transferTime: { type: String, default: '' },
    trackingCode: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'confirmed', 'rejected'], default: 'pending' },
    adminNote: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

purchaseRequestSchema.index({ userId: 1, createdAt: -1 });
purchaseRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('PurchaseRequest', purchaseRequestSchema);
