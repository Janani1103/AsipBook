import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import FundTransfer from '../models/FundTransfer.js';
import BankAccount from '../models/BankAccount.js';
import { withOptionalTransaction } from '../utils/transactionHelper.js';

export const createFundTransfer = asyncHandler(async (req, res) => {
    const { fromBankAccountId, toBankAccountId, amount, ...rest } = req.body;

    if (fromBankAccountId === toBankAccountId) {
        res.status(400);
        throw new Error('Source and destination accounts must be different');
    }

    let transfer;

    await withOptionalTransaction(async (session) => {
        const fromAccount = await BankAccount.findById(fromBankAccountId).session(session || null);
        const toAccount = await BankAccount.findById(toBankAccountId).session(session || null);

        if (!fromAccount || !toAccount) {
            throw new Error('One or both bank accounts not found');
        }

        if (fromAccount.currentBalance < amount) {
            throw new Error('Insufficient balance in source account');
        }

        // Update balances
        fromAccount.currentBalance -= Number(amount);
        toAccount.currentBalance += Number(amount);

        await fromAccount.save({ session: session || undefined });
        await toAccount.save({ session: session || undefined });

        transfer = new FundTransfer({
            fromBankAccountId,
            toBankAccountId,
            amount,
            createdBy: req.user._id,
            ...rest
        });

        await transfer.save({ session: session || undefined });
    });

    res.status(201).json({ success: true, data: transfer });
});

export const getFundTransfers = asyncHandler(async (req, res) => {
    const transfers = await FundTransfer.find()
        .populate('fromBankAccountId', 'accountName bankName category')
        .populate('toBankAccountId', 'accountName bankName category')
        .sort({ transferDate: -1 });
    res.json({ success: true, data: transfers });
});

export const deleteFundTransfer = asyncHandler(async (req, res) => {
    await withOptionalTransaction(async (session) => {
        const transfer = await FundTransfer.findById(req.params.id).session(session || null);
        if (!transfer) throw new Error('Transfer not found');
        if (transfer.deletedAt) throw new Error('Transfer already reversed');

        const fromAccount = await BankAccount.findById(transfer.fromBankAccountId).session(session || null);
        const toAccount = await BankAccount.findById(transfer.toBankAccountId).session(session || null);

        if (fromAccount && toAccount) {
            // Reverse the balances
            fromAccount.currentBalance += transfer.amount;
            toAccount.currentBalance -= transfer.amount;
            await fromAccount.save({ session: session || undefined });
            await toAccount.save({ session: session || undefined });
        }

        transfer.deletedAt = new Date();
        await transfer.save({ session: session || undefined });
    });
    res.json({ success: true, message: 'Transfer reversed' });
});
