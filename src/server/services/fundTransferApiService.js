import "server-only";
import mongoose from "mongoose";
import BankAccount from "../models/BankAccount.js";
import FundTransfer from "../models/FundTransfer.js";

export async function createFundTransfer(req, res) {
  const { fromBankAccountId, toBankAccountId, amount, ...rest } = req.body;

  if (fromBankAccountId === toBankAccountId) {
    res.status(400);
    throw new Error("Source and destination accounts must be different");
  }

  try {
    const fromAccount = await BankAccount.findById(fromBankAccountId);
    const toAccount = await BankAccount.findById(toBankAccountId);

    if (!fromAccount || !toAccount) {
      res.status(404);
      throw new Error("One or both bank accounts not found");
    }

    if (fromAccount.currentBalance < amount) {
      res.status(400);
      throw new Error("Insufficient balance in source account");
    }

    fromAccount.currentBalance -= Number(amount);
    toAccount.currentBalance += Number(amount);

    await fromAccount.save();
    await toAccount.save();

    const transfer = new FundTransfer({
      fromBankAccountId,
      toBankAccountId,
      amount,
      createdBy: req.user._id,
      ...rest,
    });

    await transfer.save();

    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
}

export async function getFundTransfers(_req, res) {
  const transfers = await FundTransfer.find()
    .populate("fromBankAccountId", "accountName bankName category")
    .populate("toBankAccountId", "accountName bankName category")
    .sort({ transferDate: -1 });

  res.json({ success: true, data: transfers });
}

export async function deleteFundTransfer(req, res) {
  try {
    const transfer = await FundTransfer.findById(req.params.id);

    if (!transfer) {
      res.status(404);
      throw new Error("Transfer not found");
    }
    if (transfer.deletedAt) {
      res.status(400);
      throw new Error("Transfer already reversed");
    }

    const fromAccount = await BankAccount.findById(transfer.fromBankAccountId);
    const toAccount = await BankAccount.findById(transfer.toBankAccountId);

    if (fromAccount && toAccount) {
      fromAccount.currentBalance += transfer.amount;
      toAccount.currentBalance -= transfer.amount;

      await fromAccount.save();
      await toAccount.save();
    }

    transfer.deletedAt = new Date();
    await transfer.save();

    res.json({ success: true, message: "Transfer reversed" });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
}
