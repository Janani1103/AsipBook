import "server-only";
import BankAccount from "../models/BankAccount.js";
import Expense from "../models/Expense.js";
import PosSession from "../models/PosSession.js";
import "../models/User.js";

import { getOrCreateCashAccount } from "./cashAccountService.js";

export async function createExpense(req, res) {
  const expense = new Expense({
    ...req.body,
    createdBy: req.user._id,
  });

  if (expense.paymentMethod === "cash") {
    let cashAccount;
    if (req.body.bankAccountId) {
      cashAccount = await BankAccount.findById(req.body.bankAccountId);
    }
    if (!cashAccount) {
      cashAccount = await getOrCreateCashAccount();
    }

    if (cashAccount) {
      expense.bankAccountId = cashAccount._id;
      cashAccount.currentBalance = +(
        Number(cashAccount.currentBalance || 0) - expense.amount
      ).toFixed(2);
      await cashAccount.save();
    }
  } else {
    let bankAccount;
    if (req.body.bankAccountId) {
      bankAccount = await BankAccount.findById(req.body.bankAccountId);
    } else {
      bankAccount = await BankAccount.findOne({
        category: "payment",
        isActive: true,
      });
    }

    if (bankAccount) {
      expense.bankAccountId = bankAccount._id;
      bankAccount.currentBalance = +(
        Number(bankAccount.currentBalance || 0) - expense.amount
      ).toFixed(2);
      await bankAccount.save();
    }
  }

  if (expense.paymentMethod === "cash") {
    const activeSession = await PosSession.findOne({
      userId: req.user._id,
      status: "open",
    });

    if (activeSession) {
      expense.posSessionId = activeSession._id;
      activeSession.cashExpenses += expense.amount;
      await activeSession.save();
    }
  }

  await expense.save();
  res.status(201).json({ success: true, data: expense });
}

export async function getExpenses(req, res) {
  const {
    category,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = req.query;
  const filter = {};

  if (category) {
    filter.category = category;
  }
  if (startDate || endDate) {
    filter.date = {};

    if (startDate) {
      filter.date.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.date.$lte = new Date(endDate);
    }
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("createdBy", "firstName lastName")
      .populate("bankAccountId", "accountName bankName accountNumber category"),
    Expense.countDocuments(filter),
  ]);

  res.json({
    success: true,
    count: expenses.length,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data: expenses,
  });
}

export async function getExpenseById(req, res) {
  const expense = await Expense.findById(req.params.id)
    .populate("bankAccountId", "accountName bankName accountNumber branchName category")
    .populate("createdBy", "firstName lastName email")
    .populate("updatedBy", "firstName lastName email");

  if (!expense || expense.deletedAt) {
    res.status(404);
    throw new Error("Expense not found");
  }

  res.json({ success: true, data: expense });
}

export async function updateExpense(req, res) {
  const expense = await Expense.findById(req.params.id);

  if (!expense || expense.deletedAt) {
    res.status(404);
    throw new Error("Expense not found");
  }

  const oldAmount = Number(expense.amount || 0);
  const oldBankAccountId = expense.bankAccountId?.toString();
  const oldPaymentMethod = expense.paymentMethod;

  const {
    date,
    category,
    amount,
    paymentMethod,
    bankAccountId,
    reference,
    description,
    status,
  } = req.body;

  const newAmount = amount !== undefined ? Number(amount) : oldAmount;
  const newPaymentMethod = paymentMethod || oldPaymentMethod;
  let newBankAccountId = bankAccountId !== undefined ? bankAccountId : oldBankAccountId;

  // 1. Revert previous bank/cash balance if old expense was paid
  if (expense.status === "paid" && oldAmount > 0 && oldBankAccountId) {
    const oldAccount = await BankAccount.findById(oldBankAccountId);
    if (oldAccount) {
      oldAccount.currentBalance = +(
        Number(oldAccount.currentBalance || 0) + oldAmount
      ).toFixed(2);
      await oldAccount.save();
    }
  }

  // 2. Resolve new bank/cash account
  if (newPaymentMethod === "cash") {
    let cashAccount;
    if (newBankAccountId) {
      cashAccount = await BankAccount.findById(newBankAccountId);
    }
    if (!cashAccount) {
      cashAccount = await getOrCreateCashAccount();
    }
    if (cashAccount) {
      newBankAccountId = cashAccount._id;
    }
  } else if (!newBankAccountId) {
    const paymentAccount = await BankAccount.findOne({
      category: "payment",
      isActive: true,
    });
    if (paymentAccount) {
      newBankAccountId = paymentAccount._id;
    }
  }

  // 3. Apply new balance reduction if new status is paid
  const targetStatus = status || expense.status || "paid";
  if (targetStatus === "paid" && newAmount > 0 && newBankAccountId) {
    const targetAccount = await BankAccount.findById(newBankAccountId);
    if (targetAccount) {
      targetAccount.currentBalance = +(
        Number(targetAccount.currentBalance || 0) - newAmount
      ).toFixed(2);
      await targetAccount.save();
    }
  }

  // 4. Update expense fields
  if (date !== undefined) expense.date = new Date(date);
  if (category !== undefined) expense.category = category;
  if (amount !== undefined) expense.amount = newAmount;
  if (paymentMethod !== undefined) expense.paymentMethod = newPaymentMethod;
  expense.bankAccountId = newBankAccountId || undefined;
  if (reference !== undefined) expense.reference = reference;
  if (description !== undefined) expense.description = description;
  if (status !== undefined) expense.status = targetStatus;
  expense.updatedBy = req.user._id;

  await expense.save();

  const populated = await Expense.findById(expense._id)
    .populate("bankAccountId", "accountName bankName accountNumber branchName category")
    .populate("createdBy", "firstName lastName email")
    .populate("updatedBy", "firstName lastName email");

  res.json({ success: true, data: populated });
}

export async function deleteExpense(req, res) {
  const expense = await Expense.findById(req.params.id);

  if (!expense) {
    res.status(404);
    throw new Error("Expense not found");
  }

  if (expense.bankAccountId) {
    const bankAccount = await BankAccount.findById(expense.bankAccountId);

    if (bankAccount) {
      bankAccount.currentBalance = +(
        bankAccount.currentBalance + expense.amount
      ).toFixed(2);
      await bankAccount.save();
    }
  }

  if (expense.paymentMethod === "cash" && expense.posSessionId) {
    const session = await PosSession.findById(expense.posSessionId);

    if (session && session.status === "open") {
      session.cashExpenses -= expense.amount;
      await session.save();
    }
  }

  expense.deletedAt = new Date();
  await expense.save();

  res.json({ success: true, message: "Expense deleted" });
}

export async function getExpenseCategories(req, res) {
  const categories = await Expense.distinct("category", { deletedAt: null });
  res.json({ success: true, data: categories.filter(Boolean).sort() });
}
