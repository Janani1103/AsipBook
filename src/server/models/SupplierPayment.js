import "server-only";
import mongoose from "mongoose";
import { getNextSequence } from "./Counter.js";

const allocationSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      enum: ["purchase_order", "bill", "supplier_return", "credit_note"],
      required: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    documentNumber: String,
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true },
);

const supplierPaymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    supplierSnapshot: {
      name: String,
      code: String,
    },
    paymentType: {
      type: String,
      enum: ["advance", "payment", "refund", "credit_note"],
      required: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    currency: {
      type: String,
      default: "LKR",
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    method: {
      type: String,
      enum: [
        "cash",
        "cheque",
        "bank_transfer",
        "card",
        "mobile_wallet",
        "other",
      ],
      required: true,
    },
    chequeNumber: String,
    chequeDate: Date,
    chequeStatus: {
      type: String,
      enum: ["pending", "cleared", "bounced"],
    },
    bankName: String,
    transactionReference: String,
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
    },
    allocations: [allocationSchema],
    unallocatedAmount: {
      type: Number,
      default: 0,
    },
    refundType: {
      type: String,
      enum: ["cash", "credit", "replacement"],
    },
    replacementQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    replacementOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
    },
    notes: String,
    receiptImageUrl: String,
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "cleared",
        "bounced",
        "cancelled",
        "refunded",
        "allocated",
      ],
      default: "confirmed",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

supplierPaymentSchema.index({ supplierId: 1, paymentDate: -1 });
supplierPaymentSchema.index({ paymentType: 1, status: 1 });
supplierPaymentSchema.index({ deletedAt: 1, paymentType: 1, paymentDate: 1 });

supplierPaymentSchema.pre("save", async function () {
  if (this.isNew && !this.paymentNumber) {
    const typePrefix = {
      advance: "ADV",
      payment: "SUP",
      refund: "REF",
      credit_note: "CRN",
    };
    this.paymentNumber = `${typePrefix[this.paymentType]}-${await getNextSequence(
      "supplier_payment",
    )}`;
  }

  const allocated = (this.allocations || []).reduce(
    (sum, allocation) => sum + allocation.amount,
    0,
  );
  this.unallocatedAmount = +(this.amount - allocated).toFixed(2);
});

supplierPaymentSchema.pre(/^find/, function (next) {
  if (!this.getOptions || !this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  if (typeof next === "function") next();
});

export default mongoose.models.SupplierPayment ||
  mongoose.model("SupplierPayment", supplierPaymentSchema);
