import "server-only";
import Supplier from "../models/Supplier.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import SupplierReturn from "../models/SupplierReturn.js";
import SupplierPayment from "../models/SupplierPayment.js";
import GoodsReceiptNote from "../models/GoodsReceiptNote.js";

export const getSupplierLedger = async (supplierId, options = {}) => {
  const { startDate, endDate, limit = 100 } = options;

  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    throw new Error("Supplier not found");
  }

  const transactions = [];

  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.$or = [
      { poDate: {} },
      { returnDate: {} },
      { paymentDate: {} },
      { receiptDate: {} },
    ];
    if (startDate) {
      dateFilter.$or.forEach((filter) => {
        Object.values(filter)[0].$gte = new Date(startDate);
      });
    }
    if (endDate) {
      dateFilter.$or.forEach((filter) => {
        Object.values(filter)[0].$lte = new Date(endDate);
      });
    }
  }

  const purchaseOrders = await PurchaseOrder.find({
    supplierId,
    status: { $in: ["approved", "sent", "partially_received", "fully_received", "closed"] },
    ...dateFilter,
  })
    .sort({ poDate: -1 })
    .limit(limit);

  purchaseOrders.forEach((po) => {
    transactions.push({
      type: "purchase",
      date: po.poDate,
      reference: po.poNumber,
      referenceId: po._id,
      description: `Purchase Order - ${po.poNumber}`,
      debit: po.grandTotal,
      credit: 0,
      balance: 0,
      status: po.status,
    });
  });

  const supplierReturns = await SupplierReturn.find({
    supplierId,
    status: { $in: ["approved", "sent", "credit_received"] },
    ...dateFilter,
  })
    .sort({ returnDate: -1 })
    .limit(limit);

  supplierReturns.forEach((sr) => {
    transactions.push({
      type: "return",
      date: sr.returnDate,
      reference: sr.returnNumber,
      referenceId: sr._id,
      description: `Supplier Return - ${sr.returnNumber}`,
      debit: 0,
      credit: sr.totalReturnValue,
      balance: 0,
      refundType: sr.refundType,
      status: sr.status,
    });
  });

  const supplierPayments = await SupplierPayment.find({
    supplierId,
    status: { $ne: "cancelled" },
    ...dateFilter,
  })
    .sort({ paymentDate: -1 })
    .limit(limit);

  supplierPayments.forEach((sp) => {
    let debit = 0;
    let credit = 0;

    if (sp.paymentType === "advance") {
      credit = sp.amount;
    } else if (sp.paymentType === "payment") {
      credit = sp.amount;
    } else if (sp.paymentType === "refund") {
      debit = sp.amount;
    } else if (sp.paymentType === "credit_note") {
      credit = sp.amount;
    }

    transactions.push({
      type: sp.paymentType,
      date: sp.paymentDate,
      reference: sp.paymentNumber,
      referenceId: sp._id,
      description: `${sp.paymentType.replace("_", " ").toUpperCase()} - ${sp.paymentNumber}`,
      debit,
      credit,
      balance: 0,
      method: sp.method,
      status: sp.status,
    });
  });

  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  let runningBalance = supplier.financials?.openingBalance || 0;
  transactions.reverse().forEach((transaction) => {
    runningBalance = runningBalance + transaction.debit - transaction.credit;
    transaction.balance = runningBalance;
  });
  transactions.reverse();

  const summary = {
    openingBalance: supplier.financials?.openingBalance || 0,
    totalPurchases: purchaseOrders.reduce((sum, po) => sum + po.grandTotal, 0),
    totalReturns: supplierReturns.reduce((sum, sr) => sum + sr.totalReturnValue, 0),
    totalPayments: supplierPayments
      .filter((sp) => sp.paymentType === "payment")
      .reduce((sum, sp) => sum + sp.amount, 0),
    totalAdvances: supplierPayments
      .filter((sp) => sp.paymentType === "advance")
      .reduce((sum, sp) => sum + sp.amount, 0),
    totalRefunds: supplierPayments
      .filter((sp) => sp.paymentType === "refund")
      .reduce((sum, sp) => sum + sp.amount, 0),
    outstandingBalance: supplier.financials?.outstandingBalance || 0,
    creditBalance: supplier.financials?.creditBalance || 0,
    advanceBalance: supplier.financials?.advanceBalance || 0,
  };

  return {
    supplier: {
      id: supplier._id,
      code: supplier.supplierCode,
      name: supplier.displayName,
      companyName: supplier.companyName,
    },
    transactions,
    summary,
  };
};

export const updateSupplierFinancials = async (supplierId) => {
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    throw new Error("Supplier not found");
  }

  const purchaseOrders = await PurchaseOrder.find({
    supplierId,
    status: { $in: ["approved", "sent", "partially_received", "fully_received", "closed"] },
  });

  const supplierReturns = await SupplierReturn.find({
    supplierId,
    status: { $in: ["approved", "sent", "credit_received"] },
  });

  const supplierPayments = await SupplierPayment.find({
    supplierId,
    status: { $ne: "cancelled" },
  });

  const totalPurchases = purchaseOrders.reduce((sum, po) => sum + po.grandTotal, 0);
  const totalReturns = supplierReturns.reduce((sum, sr) => sum + sr.totalReturnValue, 0);
  const totalPayments = supplierPayments
    .filter((sp) => sp.paymentType === "payment")
    .reduce((sum, sp) => sum + sp.amount, 0);
  const totalAdvances = supplierPayments
    .filter((sp) => sp.paymentType === "advance")
    .reduce((sum, sp) => sum + sp.amount, 0);
  const totalRefunds = supplierPayments
    .filter((sp) => sp.paymentType === "refund")
    .reduce((sum, sp) => sum + sp.amount, 0);

  const outstandingBalance = totalPurchases - totalReturns - totalPayments - totalRefunds;
  const creditBalance = supplierReturns
    .filter((sr) => sr.refundType === "credit")
    .reduce((sum, sr) => sum + sr.creditNoteAmount, 0);
  const advanceBalance = totalAdvances - (totalPurchases - totalPayments - totalRefunds);

  supplier.financials = {
    openingBalance: supplier.financials?.openingBalance || 0,
    totalPurchases,
    totalReturns,
    totalPayments,
    totalAdvances,
    totalRefunds,
    creditBalance,
    advanceBalance: Math.max(0, advanceBalance),
    outstandingBalance: Math.max(0, outstandingBalance),
    lastTransactionDate: new Date(),
  };

  await supplier.save();

  return supplier.financials;
};

export const getSupplierStatement = async (supplierId, options = {}) => {
  const { startDate, endDate } = options;

  const ledger = await getSupplierLedger(supplierId, { startDate, endDate });

  const statement = {
    supplier: ledger.supplier,
    period: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
    openingBalance: ledger.summary.openingBalance,
    transactions: ledger.transactions,
    closingBalance: ledger.summary.outstandingBalance,
    summary: ledger.summary,
  };

  return statement;
};
