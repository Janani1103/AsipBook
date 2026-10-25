import "server-only";
import SupplierPayment from "../models/SupplierPayment.js";
import Supplier from "../models/Supplier.js";
import { updateSupplierFinancials } from "./supplierLedgerService.js";

export const getSupplierPayments = async (supplierId, options = {}) => {
  const { startDate, endDate, paymentType } = options;

  const filter = { supplierId, deletedAt: null };
  if (startDate || endDate) {
    filter.paymentDate = {};
    if (startDate) filter.paymentDate.$gte = new Date(startDate);
    if (endDate) filter.paymentDate.$lte = new Date(endDate);
  }
  if (paymentType) {
    filter.paymentType = paymentType;
  }

  const payments = await SupplierPayment.find(filter)
    .sort({ paymentDate: -1 })
    .lean();

  return payments;
};

export const createSupplierPayment = async (data) => {
  const {
    supplierId,
    paymentType,
    amount,
    method,
    allocations,
    refundType,
    replacementQuantity,
    bankAccountId,
    ...rest
  } = data;

  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    throw new Error("Supplier not found");
  }

  const BankAccount = (await import("../models/BankAccount.js")).default;
  const { getOrCreateCashAccount } = await import("./cashAccountService.js");

  let targetAccountId = bankAccountId;
  if (method === "cash" && !targetAccountId) {
    const cashAccount = await getOrCreateCashAccount();
    if (cashAccount) targetAccountId = cashAccount._id;
  }

  const payment = await SupplierPayment.create({
    supplierId,
    supplierSnapshot: {
      name: supplier.displayName,
      code: supplier.supplierCode,
    },
    paymentType,
    amount,
    method,
    allocations,
    refundType,
    replacementQuantity,
    bankAccountId: targetAccountId,
    ...rest,
  });

  if (targetAccountId) {
    const acc = await BankAccount.findById(targetAccountId);
    if (acc) {
      const change = paymentType === "refund" ? amount : -amount;
      acc.currentBalance = +(Number(acc.currentBalance || 0) + change).toFixed(2);
      await acc.save();
    }
  }

  await updateSupplierFinancials(supplierId);

  return payment;
};

export const updateSupplierPayment = async (id, data) => {
  const payment = await SupplierPayment.findById(id);
  if (!payment) {
    throw new Error("Supplier payment not found");
  }

  if (payment.status === "cleared" || payment.status === "allocated") {
    throw new Error("Cannot update a cleared or allocated payment");
  }

  Object.assign(payment, data);
  await payment.save();

  await updateSupplierFinancials(payment.supplierId);

  return payment;
};

export const deleteSupplierPayment = async (id) => {
  const payment = await SupplierPayment.findById(id);
  if (!payment) {
    throw new Error("Supplier payment not found");
  }

  if (payment.status === "cleared" || payment.status === "allocated") {
    throw new Error("Cannot delete a cleared or allocated payment");
  }

  payment.deletedAt = new Date();
  await payment.save();

  if (payment.bankAccountId) {
    const BankAccount = (await import("../models/BankAccount.js")).default;
    const acc = await BankAccount.findById(payment.bankAccountId);
    if (acc) {
      // Reversing: if it was refund, debit it back (-amount); if payment, credit it back (+amount)
      const reverseChange = payment.paymentType === "refund" ? -payment.amount : payment.amount;
      acc.currentBalance = +(Number(acc.currentBalance || 0) + reverseChange).toFixed(2);
      await acc.save();
    }
  }

  await updateSupplierFinancials(payment.supplierId);

  return payment;
};

export const allocatePayment = async (paymentId, allocations) => {
  const payment = await SupplierPayment.findById(paymentId);
  if (!payment) {
    throw new Error("Supplier payment not found");
  }

  if (payment.status !== "confirmed") {
    throw new Error("Payment must be confirmed before allocation");
  }

  const totalAllocation = allocations.reduce((sum, a) => sum + a.amount, 0);
  if (totalAllocation > payment.amount) {
    throw new Error("Allocation amount exceeds payment amount");
  }

  payment.allocations = allocations;
  payment.status = "allocated";
  await payment.save();

  await updateSupplierFinancials(payment.supplierId);

  return payment;
};

export const getUnallocatedAdvances = async (supplierId) => {
  const advances = await SupplierPayment.find({
    supplierId,
    paymentType: "advance",
    status: "confirmed",
    unallocatedAmount: { $gt: 0 },
    deletedAt: null,
  }).sort({ paymentDate: -1 });

  return advances;
};
