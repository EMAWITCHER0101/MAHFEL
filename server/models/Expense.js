import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, default: '' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1 });

export default mongoose.model('Expense', expenseSchema);
