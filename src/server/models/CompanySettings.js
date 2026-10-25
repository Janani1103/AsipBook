import "server-only";
import mongoose from "mongoose";

const companySettingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: "YOUR COMPANY NAME", trim: true },
    address: { type: String, default: "YOUR STREET, CITY", trim: true },
    phone: { type: String, default: "+94 11 XXX XXXX", trim: true },
    email: { type: String, trim: true },
    website: { type: String, trim: true },
    taxRegistrationNumber: { type: String, trim: true },
    logo: { type: String, trim: true },
    ownerSeal: { type: String, trim: true },
    ownerSignature: { type: String, trim: true },
    receiptFooterMessage: {
      type: String,
      default: "THANK YOU FOR YOUR BUSINESS!\nPLEASE VISIT AGAIN.",
      trim: true,
    },
    businessType: {
      type: String,
      enum: ["general_retail", "bakery", "food", "beverage", "mixed"],
      default: "general_retail",
    },
    features: {
      batchTracking: { type: Boolean, default: false },
      expiryTracking: { type: Boolean, default: false },
      multipleSuppliers: { type: Boolean, default: false },
      supplierReturns: { type: Boolean, default: false },
      advancePayments: { type: Boolean, default: false },
      fefoStockSelection: { type: Boolean, default: false },
    },
    lastInvoiceAgingDate: { type: String, default: null },
  },
  { timestamps: true },
);

const CompanySettings =
  mongoose.models.CompanySettings || mongoose.model("CompanySettings", companySettingsSchema);

export default CompanySettings;
