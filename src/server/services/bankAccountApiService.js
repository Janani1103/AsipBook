import "server-only";
import BankAccount from "../models/BankAccount.js";
import Expense from "../models/Expense.js";
import Payment from "../models/Payment.js";
import SupplierPayment from "../models/SupplierPayment.js";
import FundTransfer from "../models/FundTransfer.js";

import { getOrCreateCashAccount } from "./cashAccountService.js";

export async function createBankAccount(req, res) {
  const account = await BankAccount.create({
    ...req.body,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: account });
}

export async function getBankAccounts(req, res) {
  await getOrCreateCashAccount().catch(() => null);

  const { category, isActive } = req.query;
  const filter = {};

  if (category) filter.category = category;
  if (isActive) filter.isActive = isActive === "true";

  const accounts = await BankAccount.find(filter).sort({ accountName: 1 });
  res.json({ success: true, data: accounts });
}

export async function getBankAccountById(req, res) {
  const account = await BankAccount.findById(req.params.id);
  if (!account) {
    res.status(404);
    throw new Error("Account not found");
  }
  res.json({ success: true, data: account });
}

export async function updateBankAccount(req, res) {
  const account = await BankAccount.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!account) {
    res.status(404);
    throw new Error("Account not found");
  }
  res.json({ success: true, data: account });
}

export async function deleteBankAccount(req, res) {
  const account = await BankAccount.findById(req.params.id);
  if (!account) {
    res.status(404);
    throw new Error("Account not found");
  }

  await account.deleteOne();
  res.json({ success: true, message: "Account deleted" });
}

export async function getBankAccountTransactions(req, res) {
  const accountId = req.params.id;
  const account = await BankAccount.findById(accountId);
  if (!account) {
    res.status(404);
    throw new Error("Bank account not found");
  }

  const { startDate, endDate, type, search } = req.query || {};

  const [expenses, customerPayments, supplierPayments, transfersOut, transfersIn] = await Promise.all([
    Expense.find({ bankAccountId: accountId, deletedAt: null, status: "paid" }),
    Payment.find({ bankAccountId: accountId, deletedAt: null }),
    SupplierPayment.find({ bankAccountId: accountId, deletedAt: null }),
    FundTransfer.find({ fromBankAccountId: accountId, deletedAt: null, status: "completed" }).populate(
      "toBankAccountId",
      "accountName bankName accountNumber"
    ),
    FundTransfer.find({ toBankAccountId: accountId, deletedAt: null, status: "completed" }).populate(
      "fromBankAccountId",
      "accountName bankName accountNumber"
    ),
  ]);

  const transactions = [];

  expenses.forEach((exp) => {
    transactions.push({
      id: exp._id,
      date: exp.date,
      type: exp.category === "Salary" ? "Salary Disbursal" : `Expense (${exp.category})`,
      category: "expense",
      direction: "debit",
      amount: exp.amount,
      reference: exp.reference || exp.expenseNumber,
      description: exp.description || `Expense: ${exp.category}`,
      paymentMethod: exp.paymentMethod || "bank_transfer",
      partyName: exp.category === "Salary" ? "Staff Salaries" : "General Expense",
    });
  });

  customerPayments.forEach((pay) => {
    const isReceived = pay.direction === "received";
    transactions.push({
      id: pay._id,
      date: pay.paymentDate || pay.createdAt,
      type: isReceived ? "Customer Payment" : "Refund / Paid Out",
      category: "payment",
      direction: isReceived ? "credit" : "debit",
      amount: pay.amount,
      reference: pay.paymentNumber || pay.transactionReference || pay.chequeNumber,
      description:
        pay.notes ||
        (isReceived
          ? `Receipt from ${pay.partyName || "Customer"}`
          : `Payment to ${pay.partyName || "Party"}`),
      paymentMethod: pay.method || "bank_transfer",
      partyName: pay.partyName || "Customer",
    });
  });

  supplierPayments.forEach((sp) => {
    const isRefund = sp.paymentType === "refund";
    transactions.push({
      id: sp._id,
      date: sp.paymentDate || sp.createdAt,
      type: isRefund ? "Supplier Refund" : "Supplier Payment",
      category: "supplier_payment",
      direction: isRefund ? "credit" : "debit",
      amount: sp.amount,
      reference: sp.paymentNumber || sp.transactionReference || sp.chequeNumber,
      description:
        sp.notes ||
        `${isRefund ? "Refund from" : "Payment to"} ${sp.supplierSnapshot?.name || "Supplier"}`,
      paymentMethod: sp.method || "bank_transfer",
      partyName: sp.supplierSnapshot?.name || "Supplier",
    });
  });

  transfersOut.forEach((trf) => {
    transactions.push({
      id: trf._id,
      date: trf.transferDate || trf.createdAt,
      type: "Fund Transfer (Out)",
      category: "transfer",
      direction: "debit",
      amount: trf.amount,
      reference: trf.transferNumber || trf.reference,
      description: `Transfer to ${trf.toBankAccountId?.bankName || "Account"} (${trf.toBankAccountId?.accountName || ""})`,
      paymentMethod: "bank_transfer",
      partyName: trf.toBankAccountId?.accountName || "Internal Account",
    });
  });

  transfersIn.forEach((trf) => {
    transactions.push({
      id: trf._id,
      date: trf.transferDate || trf.createdAt,
      type: "Fund Transfer (In)",
      category: "transfer",
      direction: "credit",
      amount: trf.amount,
      reference: trf.transferNumber || trf.reference,
      description: `Transfer from ${trf.fromBankAccountId?.bankName || "Account"} (${trf.fromBankAccountId?.accountName || ""})`,
      paymentMethod: "bank_transfer",
      partyName: trf.fromBankAccountId?.accountName || "Internal Account",
    });
  });

  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  const totalCredits = transactions
    .filter((t) => t.direction === "credit")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = transactions
    .filter((t) => t.direction === "debit")
    .reduce((sum, t) => sum + t.amount, 0);

  const initialOpeningBalance = +(
    Number(account.currentBalance || 0) - (totalCredits - totalDebits)
  ).toFixed(2);

  let currentRun = initialOpeningBalance;
  transactions.forEach((t) => {
    if (t.direction === "credit") {
      currentRun += t.amount;
    } else {
      currentRun -= t.amount;
    }
    t.runningBalance = +currentRun.toFixed(2);
  });

  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  let filtered = transactions;
  if (type === "credit") filtered = filtered.filter((t) => t.direction === "credit");
  if (type === "debit") filtered = filtered.filter((t) => t.direction === "debit");
  if (startDate) filtered = filtered.filter((t) => new Date(t.date) >= new Date(startDate));
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter((t) => new Date(t.date) <= end);
  }
  if (search) {
    const term = search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.reference?.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term) ||
        t.partyName?.toLowerCase().includes(term) ||
        t.type?.toLowerCase().includes(term)
    );
  }

  res.json({
    success: true,
    data: {
      account,
      openingBalance: initialOpeningBalance,
      currentBalance: account.currentBalance,
      totalCredits,
      totalDebits,
      netMovement: +(totalCredits - totalDebits).toFixed(2),
      transactionCount: transactions.length,
      transactions: filtered,
    },
  });
}
