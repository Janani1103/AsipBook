import "server-only";
import mongoose from "mongoose";

const promoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Promo code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Promo name is required"],
      trim: true,
    },
    description: { type: String, trim: true },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: [true, "Discount type is required"],
    },
    discountValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: 0,
    },
    minPurchaseAmount: { type: Number, default: 0, min: 0 },
    maxDiscountAmount: { type: Number, min: 0 },
    usageLimit: { type: Number, default: null },
    usageCount: { type: Number, default: 0 },
    userLimit: { type: Number, default: 1, min: 1 },
    validFrom: { type: Date, required: [true, "Valid from date is required"] },
    validUntil: { type: Date, required: [true, "Valid until date is required"] },
    applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    applicableCustomers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Customer" }],
    customerGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "CustomerGroup" }],
    applicableTo: {
      type: String,
      enum: ["all", "products", "categories", "customers", "customer_groups"],
      default: "all",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "expired", "disabled"],
      default: "active",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

promoCodeSchema.index({ code: 1 });
promoCodeSchema.index({ status: 1, validFrom: 1, validUntil: 1 });
promoCodeSchema.index({ applicableTo: 1 });

promoCodeSchema.pre(/^find/, function () {
  if (!this.getOptions().includeDeleted) this.where({ deletedAt: null });
});

promoCodeSchema.methods.isValid = function () {
  const now = new Date();
  return (
    this.status === "active" &&
    now >= this.validFrom &&
    now <= this.validUntil &&
    (this.usageLimit === null || this.usageCount < this.usageLimit)
  );
};

promoCodeSchema.methods.canBeUsedBy = function (customerId) {
  if (this.applicableTo === "all") return true;
  if (this.applicableTo === "customers" && customerId) {
    return this.applicableCustomers.includes(customerId);
  }
  return false;
};

export default mongoose.models.PromoCode || mongoose.model("PromoCode", promoCodeSchema);
