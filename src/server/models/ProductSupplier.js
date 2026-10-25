import "server-only";
import mongoose from "mongoose";

const productSupplierSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productCode: { type: String, trim: true },
    productName: { type: String, trim: true },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    supplierCode: { type: String, trim: true },
    supplierName: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false },
    buyingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: { type: String, default: "LKR" },
    minimumOrderQuantity: { type: Number, default: 1, min: 0 },
    leadTimeDays: { type: Number, default: 7, min: 0 },
    supplierSku: { type: String, trim: true },
    supplierBarcode: { type: String, trim: true },
    lastPurchaseDate: Date,
    lastPurchasePrice: { type: Number, min: 0 },
    averagePurchasePrice: { type: Number, default: 0, min: 0 },
    purchaseCount: { type: Number, default: 0, min: 0 },
    totalPurchasedQuantity: { type: Number, default: 0, min: 0 },
    returnPolicy: {
      returnable: { type: Boolean, default: true },
      returnPeriodDays: { type: Number, default: 7, min: 0 },
      conditions: { type: String, trim: true },
    },
    qualityRating: { type: Number, default: 0, min: 0, max: 5 },
    notes: { type: String, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ["active", "inactive", "discontinued"],
      default: "active",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

productSupplierSchema.index({ productId: 1, supplierId: 1 }, { unique: true });
productSupplierSchema.index({ supplierId: 1, status: 1 });
productSupplierSchema.index({ productId: 1, isPrimary: 1 });
productSupplierSchema.index({ status: 1 });

productSupplierSchema.pre(/^find/, function (next) {
  if (!this.getOptions || !this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  if (typeof next === "function") next();
});

export default mongoose.models.ProductSupplier ||
  mongoose.model("ProductSupplier", productSupplierSchema);
