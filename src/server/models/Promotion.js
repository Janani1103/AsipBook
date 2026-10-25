import "server-only";
import mongoose from "mongoose";

const promotionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Promotion name is required"],
      trim: true,
    },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: ["buy_x_get_y", "percentage_discount", "fixed_discount", "bundle_offer", "tiered_discount"],
      required: [true, "Promotion type is required"],
    },
    buyProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    buyCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    buyQuantity: { type: Number, default: 1, min: 1 },
    getProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    getCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    getQuantity: { type: Number, default: 1, min: 1 },
    discountPercent: { type: Number, min: 0, max: 100 },
    discountValue: { type: Number, min: 0 },
    bundleItems: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: { type: Number, default: 1 }
    }],
    bundlePrice: { type: Number, min: 0 },
    tiers: [{
      minAmount: { type: Number, min: 0 },
      discountPercent: { type: Number, min: 0, max: 100 }
    }],
    minPurchaseAmount: { type: Number, default: 0, min: 0 },
    maxDiscountAmount: { type: Number, min: 0 },
    promoCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    requiredPaymentMethod: { type: String, enum: ["cash", "card", "any"], default: "any" },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    validFrom: { type: Date, required: [true, "Valid from date is required"] },
    validUntil: { type: Date, required: [true, "Valid until date is required"] },
    applicableTo: {
      type: String,
      enum: ["all", "products", "categories"],
      default: "all",
    },
    applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    customerGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "CustomerGroup" }],
    status: {
      type: String,
      enum: ["active", "inactive", "expired", "disabled"],
      default: "active",
    },
    priority: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

promotionSchema.index({ status: 1, validFrom: 1, validUntil: 1 });
promotionSchema.index({ type: 1, priority: -1 });

promotionSchema.pre(/^find/, function () {
  if (!this.getOptions().includeDeleted) this.where({ deletedAt: null });
});

promotionSchema.methods.isValid = function () {
  const now = new Date();
  return (
    this.status === "active" &&
    now >= this.validFrom &&
    now <= this.validUntil
  );
};

promotionSchema.methods.isApplicableTo = function (productId, categoryId) {
  if (this.applicableTo === "all") return true;
  if (this.applicableTo === "products" && productId) {
    return this.applicableProducts.includes(productId);
  }
  if (this.applicableTo === "categories" && categoryId) {
    return this.applicableCategories.includes(categoryId);
  }
  return false;
};

export default mongoose.models.Promotion || mongoose.model("Promotion", promotionSchema);
