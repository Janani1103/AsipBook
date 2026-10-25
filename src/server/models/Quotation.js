import "server-only";
import mongoose from "mongoose";
import { getNextSequence } from "./Counter.js";

const addressSnapshotSchema = new mongoose.Schema(
  {
    label: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    phone: String,
  },
  { _id: false },
);

const lineItemSchema = new mongoose.Schema({
  lineNumber: Number,
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variationId: mongoose.Schema.Types.ObjectId,
  productCode: { type: String, trim: true },
  productName: { type: String, trim: true },
  description: { type: String, trim: true },
  orderedQuantity: { type: Number, required: true, min: 0.01 },
  unitOfMeasure: { type: String, trim: true },
  listPrice: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  discountAmount: { type: Number, default: 0, min: 0 },
  taxRate: { type: Number, default: 0, min: 0 },
  taxAmount: { type: Number, default: 0, min: 0 },
  taxable: { type: Boolean, default: true },
  lineSubtotal: { type: Number, default: 0 },
  lineDiscount: { type: Number, default: 0 },
  lineTax: { type: Number, default: 0 },
  lineTotal: { type: Number, default: 0 },
  notes: { type: String, trim: true },
});

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: { type: String, unique: true, trim: true, uppercase: true },
    source: {
      type: String,
      enum: ["direct", "field_rep", "phone", "whatsapp", "email", "website"],
      default: "direct",
    },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: [true, "Customer is required"] },
    sourceWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
    sourceWarehouseSnapshot: { name: String, warehouseCode: String },
    customerSnapshot: { name: String, code: String, taxRegistrationNumber: String, contactName: String, phone: String },
    billingAddress: addressSnapshotSchema,
    shippingAddress: addressSnapshotSchema,
    shippingAddressLabel: { type: String, trim: true },
    salesRepId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    quotationDate: { type: Date, default: Date.now },
    validUntil: { type: Date, required: [true, "Valid until date is required"] },
    currency: { type: String, default: "LKR" },
    items: [lineItemSchema],
    subtotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    roundingAdjustment: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    orderDiscount: { type: { type: String, enum: ["percentage", "fixed"] }, value: { type: Number, default: 0 }, amount: { type: Number, default: 0 }, reason: String },
    paymentTerms: { type: { type: String, enum: ["advance", "cod", "credit"] }, creditDays: Number, dueDate: Date },
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected", "expired", "converted"],
      default: "draft",
    },
    acceptedAt: Date,
    rejectedAt: Date,
    rejectedReason: String,
    convertedToSalesOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "SalesOrder" },
    convertedAt: Date,
    customerNotes: { type: String, trim: true },
    internalNotes: { type: String, trim: true },
    specialInstructions: { type: String, trim: true },
    priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

quotationSchema.index({ sourceWarehouseId: 1, status: 1 });
quotationSchema.index({ customerId: 1, quotationDate: -1 });
quotationSchema.index({ status: 1, quotationDate: -1 });
quotationSchema.index({ salesRepId: 1, quotationDate: -1 });
quotationSchema.index({ validUntil: 1, status: 1 });
quotationSchema.index({ quotationDate: -1 });

quotationSchema.pre("save", async function () {
  if (this.isNew && !this.quotationNumber) this.quotationNumber = `QT-${await getNextSequence("quotation")}`;
  if (this.isNew && !this.validUntil) {
    const validUntil = new Date(this.quotationDate);
    validUntil.setDate(validUntil.getDate() + 30);
    this.validUntil = validUntil;
  }
  this.items.forEach((item, index) => {
    item.lineNumber = index + 1;
    item.lineSubtotal = +(item.orderedQuantity * item.unitPrice).toFixed(2);
    item.lineDiscount = +(item.lineSubtotal * (item.discountPercent || 0) / 100 + (item.discountAmount || 0)).toFixed(2);
    const taxable = item.lineSubtotal - item.lineDiscount;
    item.lineTax = item.taxable ? +(taxable * (item.taxRate || 0) / 100).toFixed(2) : 0;
    item.taxAmount = item.lineTax;
    item.lineTotal = +(taxable + item.lineTax).toFixed(2);
  });
  this.subtotal = +this.items.reduce((sum, item) => sum + item.lineSubtotal, 0).toFixed(2);
  this.totalDiscount = +this.items.reduce((sum, item) => sum + item.lineDiscount, 0).toFixed(2);
  this.totalTax = +this.items.reduce((sum, item) => sum + item.lineTax, 0).toFixed(2);
  let orderLevelDiscount = 0;
  if (this.orderDiscount?.type === "percentage") orderLevelDiscount = +((this.subtotal - this.totalDiscount) * (this.orderDiscount.value || 0) / 100).toFixed(2);
  else if (this.orderDiscount?.type === "fixed") orderLevelDiscount = this.orderDiscount.value || 0;
  if (this.orderDiscount) this.orderDiscount.amount = orderLevelDiscount;
  this.grandTotal = +(this.subtotal - this.totalDiscount - orderLevelDiscount + this.totalTax + (this.shippingCost || 0) + (this.otherCharges || 0) + (this.roundingAdjustment || 0)).toFixed(2);
  if (this.paymentTerms?.type === "credit" && this.paymentTerms.creditDays && !this.paymentTerms.dueDate) {
    const due = new Date(this.quotationDate);
    due.setDate(due.getDate() + this.paymentTerms.creditDays);
    this.paymentTerms.dueDate = due;
  }
});

quotationSchema.pre(/^find/, function (next) {
  if (!this.getOptions || !this.getOptions().includeDeleted) this.where({ deletedAt: null });
  if (typeof next === "function") next();
});

export default mongoose.models.Quotation || mongoose.model("Quotation", quotationSchema);
