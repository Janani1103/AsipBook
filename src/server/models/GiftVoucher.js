import "server-only";
import mongoose from "mongoose";

const giftVoucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Voucher code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Voucher name is required"],
      trim: true,
    },
    description: { type: String, trim: true },
    value: {
      type: Number,
      required: [true, "Voucher value is required"],
      min: 0,
    },
    currency: { type: String, default: "LKR" },
    type: {
      type: String,
      enum: ["fixed", "percentage"],
      default: "fixed",
    },
    minPurchaseAmount: { type: Number, default: 0, min: 0 },
    validFrom: { type: Date, required: [true, "Valid from date is required"] },
    validUntil: { type: Date, required: [true, "Valid until date is required"] },
    singleUse: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["active", "inactive", "expired", "used", "disabled"],
      default: "active",
    },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    usedAt: Date,
    usedInOrder: { type: mongoose.Schema.Types.ObjectId, ref: "SalesOrder" },
    issuedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    issuedAt: Date,
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

giftVoucherSchema.index({ code: 1 });
giftVoucherSchema.index({ status: 1, validFrom: 1, validUntil: 1 });
giftVoucherSchema.index({ issuedTo: 1 });

giftVoucherSchema.pre(/^find/, function () {
  if (!this.getOptions().includeDeleted) this.where({ deletedAt: null });
});

giftVoucherSchema.methods.isValid = function () {
  const now = new Date();
  return (
    this.status === "active" &&
    now >= this.validFrom &&
    now <= this.validUntil &&
    (!this.singleUse || !this.usedAt)
  );
};

giftVoucherSchema.methods.markAsUsed = function (customerId, orderId) {
  this.status = "used";
  this.usedBy = customerId;
  this.usedAt = new Date();
  this.usedInOrder = orderId;
};

export default mongoose.models.GiftVoucher || mongoose.model("GiftVoucher", giftVoucherSchema);
