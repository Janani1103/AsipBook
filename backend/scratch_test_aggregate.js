import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Invoice from './src/models/Invoice.js';
import Bill from './src/models/Bill.js';
import Payment from './src/models/Payment.js';
import Expense from './src/models/Expense.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');

        const start = new Date('2026-06-01T00:00:00.000Z');
        const end = new Date('2026-06-30T23:59:59.999Z');

        console.log('Start:', start.toISOString());
        console.log('End:', end.toISOString());

        const bills = await Bill.aggregate([
            { $match: { deletedAt: null, billDate: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$grandTotal' } } },
        ]);
        console.log('Bills Aggregation result:', JSON.stringify(bills));

        const generalExpenses = await Expense.aggregate([
            { $match: { deletedAt: null, status: { $ne: 'cancelled' }, date: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        console.log('General Expenses Aggregation result:', JSON.stringify(generalExpenses));

        const paymentsPaid = await Payment.aggregate([
            { $match: { deletedAt: null, direction: 'paid', paymentDate: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        console.log('Payments Paid (to suppliers) Aggregation result:', JSON.stringify(paymentsPaid));

        const generalExpensesPaid = await Expense.aggregate([
            { $match: { deletedAt: null, status: 'paid', date: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        console.log('General Expenses Paid Aggregation result:', JSON.stringify(generalExpensesPaid));

        const billsTotal = bills[0]?.total || 0;
        const generalExpensesTotal = generalExpenses[0]?.total || 0;
        const expensesTotal = billsTotal + generalExpensesTotal;

        const paymentsPaidTotal = paymentsPaid[0]?.total || 0;
        const generalExpensesPaidTotal = generalExpensesPaid[0]?.total || 0;
        const paidTotal = paymentsPaidTotal + generalExpensesPaidTotal;

        console.log(`\nFinal Totals for P&L:\n- Total Expenses: ${expensesTotal}\n- Total Cash Paid: ${paidTotal}`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
