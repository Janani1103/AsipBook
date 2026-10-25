import "server-only";
import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    initialValue: { type: Number, required: true, min: 0 },
    currentBalance: { type: Number, required: true, min: 0 },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    assignedCustomerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

voucherSchema.index({ code: 1 });
voucherSchema.index({ expiryDate: 1 });
voucherSchema.index({ isActive: 1 });

export default mongoose.models.Voucher || mongoose.model("Voucher", voucherSchema);
