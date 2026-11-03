import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Invoice from './src/models/Invoice.js';
import Expense from './src/models/Expense.js';
import Product from './src/models/Product.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    try {
        const startDate = "2026-06-01";
        const endDate = "2026-06-30";
        
        const dateFilter = {};
        if (startDate || endDate) {
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) dateFilter.$lte = new Date(endDate);
        }

        const invoiceFilter = { status: { $nin: ['draft', 'void', 'cancelled'] }, deletedAt: null };
        if (Object.keys(dateFilter).length > 0) {
            invoiceFilter.invoiceDate = dateFilter;
        }

        console.log('Fetching invoices...');
        const invoices = await Invoice.find(invoiceFilter).populate('items.productId');
        console.log(`Found ${invoices.length} invoices`);

        let grossSales = 0;
        let totalDiscounts = 0;
        let totalReturns = 0;
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
        console.log(`Revenue: ${totalRevenue}, COGS: ${cogs}`);

        const expenseFilter = { status: { $ne: 'cancelled' }, deletedAt: null };
        if (Object.keys(dateFilter).length > 0) {
            expenseFilter.date = dateFilter;
        }

        console.log('Fetching expenses...');
        const expensesAgg = await Expense.aggregate([
            { $match: expenseFilter },
            { $group: { _id: '$category', total: { $sum: '$amount' } } },
            { $sort: { total: -1 } }
        ]);
        
        console.log('Aggregated expenses:', expensesAgg);
        
        let totalExpenses = 0;
        const expenseBreakdown = expensesAgg.map(e => {
            totalExpenses += e.total;
            return { _id: e._id || 'Uncategorized', amount: +e.total.toFixed(2) };
        });

        const grossProfit = totalRevenue - cogs;
        const netProfit = grossProfit - totalExpenses;

        console.log({
            grossProfit, netProfit, totalExpenses, expenseBreakdown
        });
        
    } catch (e) {
        console.error("ERROR OCCURRED:");
        console.error(e.stack);
    } finally {
        mongoose.disconnect();
    }
}

run();
