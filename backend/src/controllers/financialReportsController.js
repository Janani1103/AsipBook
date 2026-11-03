import asyncHandler from 'express-async-handler';
import Invoice from '../models/Invoice.js';
import Expense from '../models/Expense.js';
import Product from '../models/Product.js';
import Payment from '../models/Payment.js';
import FundTransfer from '../models/FundTransfer.js';

export const getProfitAndLoss = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate && startDate !== 'undefined') dateFilter.$gte = new Date(startDate);
    if (endDate && endDate !== 'undefined') dateFilter.$lte = new Date(endDate);

    const invoiceFilter = { status: { $nin: ['draft', 'void', 'cancelled'] }, deletedAt: null };
    if (Object.keys(dateFilter).length > 0) {
        invoiceFilter.invoiceDate = { ...dateFilter };
    }

    const invoices = await Invoice.find(invoiceFilter).populate('items.productId');

    let grossSales = 0;
    let totalDiscounts = 0;
    let totalReturns = 0; // if you have returns
    let cogs = 0;

    invoices.forEach(inv => {
        const disc = inv.totalDiscount || 0;
        const sub = inv.subtotal || 0;
        grossSales += sub;
        totalDiscounts += disc;
        
        inv.items.forEach(item => {
            const purchasePrice = item.productId?.purchasePrice || 0;
            cogs += (item.quantity * purchasePrice);
        });
    });

    const totalRevenue = grossSales - totalDiscounts - totalReturns;

    const expenseFilter = { status: { $ne: 'cancelled' }, deletedAt: null };
    if (Object.keys(dateFilter).length > 0) {
        expenseFilter.date = { ...dateFilter };
    }

    const expensesAgg = await Expense.aggregate([
        { $match: expenseFilter },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } }
    ]);
    
    let totalExpenses = 0;
    const expenseBreakdown = expensesAgg.map(e => {
        totalExpenses += e.total;
        return { _id: e._id || 'Uncategorized', amount: +e.total.toFixed(2) };
    });

    const grossProfit = totalRevenue - cogs;
    const netProfit = grossProfit - totalExpenses;

    const finalGrossSales = Number(grossSales) || 0;
    const finalTotalDiscounts = Number(totalDiscounts) || 0;
    const finalTotalReturns = Number(totalReturns) || 0;
    const finalTotalRevenue = Number(totalRevenue) || 0;
    const finalCogs = Number(cogs) || 0;
    const finalGrossProfit = Number(grossProfit) || 0;
    const finalTotalExpenses = Number(totalExpenses) || 0;
    const finalNetProfit = Number(netProfit) || 0;

    res.json({
        success: true,
        data: {
            revenue: {
                grossSales: +finalGrossSales.toFixed(2),
                totalDiscounts: +finalTotalDiscounts.toFixed(2),
                totalReturns: +finalTotalReturns.toFixed(2),
                totalRevenue: +finalTotalRevenue.toFixed(2),
            },
            cogs: {
                productCosts: +finalCogs.toFixed(2),
                totalCogs: +finalCogs.toFixed(2),
            },
            expenses: {
                breakdown: expenseBreakdown,
                totalExpenses: +finalTotalExpenses.toFixed(2),
            },
            grossProfit: +finalGrossProfit.toFixed(2),
            netProfit: +finalNetProfit.toFixed(2),
        }
    });
});

export const getCashBook = asyncHandler(async (req, res) => {
    const { startDate, endDate, bankAccountId } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const paymentFilter = {
        deletedAt: null,
        paymentDate: { $gte: start, $lte: end },
        status: { $in: ['confirmed', 'cleared', 'pending'] }
    };
    if (bankAccountId) paymentFilter.bankAccountId = bankAccountId;

    const expenseFilter = {
        deletedAt: null,
        date: { $gte: start, $lte: end },
        status: { $ne: 'cancelled' }
    };
    if (bankAccountId) expenseFilter.bankAccountId = bankAccountId;

    const transferFilter = {
        deletedAt: null,
        transferDate: { $gte: start, $lte: end }
    };

    const [payments, expenses, transfers] = await Promise.all([
        Payment.find(paymentFilter)
            .populate('customerId', 'name businessName displayName')
            .populate('supplierId', 'name companyName displayName')
            .populate('bankAccountId', 'accountName bankName')
            .lean(),
        Expense.find(expenseFilter)
            .populate('bankAccountId', 'accountName bankName')
            .populate('createdBy', 'firstName lastName')
            .lean(),
        FundTransfer.find(transferFilter)
            .populate('fromBankAccountId', 'accountName bankName')
            .populate('toBankAccountId', 'accountName bankName')
            .lean(),
    ]);

    const txList = [];

    payments.forEach(p => {
        const isReceived = p.direction === 'received';
        const partyName = p.partyName || p.customerId?.businessName || p.customerId?.displayName || p.customerId?.name || p.supplierId?.companyName || p.supplierId?.displayName || p.supplierId?.name || (isReceived ? 'Customer Collection' : 'Supplier Payment');
        txList.push({
            id: p._id,
            date: p.paymentDate,
            ref: p.paymentNumber || (isReceived ? 'REC' : 'PAY'),
            sourceType: 'payment',
            direction: isReceived ? 'in' : 'out',
            category: isReceived ? 'Customer Collection' : 'Supplier Disbursement',
            party: partyName,
            account: p.bankAccountId ? `${p.bankAccountId.accountName} (${p.bankAccountId.bankName})` : (p.method === 'cash' ? 'Main Cash Drawer' : p.method.toUpperCase()),
            method: p.method,
            moneyIn: isReceived ? p.amount : 0,
            moneyOut: !isReceived ? p.amount : 0,
            notes: p.notes || (p.chequeNumber ? `Cheque #${p.chequeNumber}` : p.transactionReference || ''),
        });
    });

    expenses.forEach(e => {
        txList.push({
            id: e._id,
            date: e.date,
            ref: e.expenseNumber || 'EXP',
            sourceType: 'expense',
            direction: 'out',
            category: `Expense: ${e.category}`,
            party: e.description || e.category,
            account: e.bankAccountId ? `${e.bankAccountId.accountName} (${e.bankAccountId.bankName})` : (e.isPettyCash ? 'Petty Cash' : 'Cash Drawer'),
            method: e.paymentMethod,
            moneyIn: 0,
            moneyOut: e.amount,
            notes: e.description || (e.reference ? `Ref: ${e.reference}` : ''),
            receiptUrl: e.receiptUrl,
            approvalStatus: e.approvalStatus || 'approved'
        });
    });

    transfers.forEach(t => {
        if (!bankAccountId || t.toBankAccountId?._id?.toString() === bankAccountId) {
            txList.push({
                id: `${t._id}-in`,
                date: t.transferDate || t.createdAt,
                ref: t.transferNumber || 'TRF',
                sourceType: 'transfer',
                direction: 'in',
                category: 'Fund Transfer In',
                party: `From ${t.fromBankAccountId?.accountName || 'Account'}`,
                account: t.toBankAccountId?.accountName || 'To Account',
                method: 'bank_transfer',
                moneyIn: t.amount,
                moneyOut: 0,
                notes: t.notes || (t.reference ? `Ref: ${t.reference}` : ''),
            });
        }
        if (!bankAccountId || t.fromBankAccountId?._id?.toString() === bankAccountId) {
            txList.push({
                id: `${t._id}-out`,
                date: t.transferDate || t.createdAt,
                ref: t.transferNumber || 'TRF',
                sourceType: 'transfer',
                direction: 'out',
                category: 'Fund Transfer Out',
                party: `To ${t.toBankAccountId?.accountName || 'Account'}`,
                account: t.fromBankAccountId?.accountName || 'From Account',
                method: 'bank_transfer',
                moneyIn: 0,
                moneyOut: t.amount,
                notes: t.notes || (t.reference ? `Ref: ${t.reference}` : ''),
            });
        }
    });

    txList.sort((a, b) => new Date(a.date) - new Date(b.date));

    let running = 0;
    let totalIn = 0;
    let totalOut = 0;
    txList.forEach(item => {
        running += (item.moneyIn - item.moneyOut);
        totalIn += item.moneyIn;
        totalOut += item.moneyOut;
        item.runningBalance = +running.toFixed(2);
    });

    res.json({
        success: true,
        data: {
            period: { startDate: start, endDate: end },
            summary: {
                totalIn: +totalIn.toFixed(2),
                totalOut: +totalOut.toFixed(2),
                netCashFlow: +(totalIn - totalOut).toFixed(2),
                transactionCount: txList.length
            },
            transactions: txList.reverse()
        }
    });
});
