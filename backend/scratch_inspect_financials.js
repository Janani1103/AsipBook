import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Invoice from './src/models/Invoice.js';
import Bill from './src/models/Bill.js';
import Payment from './src/models/Payment.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');

        const invoices = await Invoice.find({});
        console.log(`\n--- Invoices (${invoices.length}) ---`);
        invoices.forEach(i => {
            console.log(`Inv: ${i.invoiceNumber}, Date: ${i.invoiceDate.toISOString()}, Total: ${i.grandTotal}, PaymentStatus: ${i.paymentStatus}, Status: ${i.status}, Deleted: ${i.deletedAt}`);
        });

        const bills = await Bill.find({});
        console.log(`\n--- Bills (${bills.length}) ---`);
        bills.forEach(b => {
            console.log(`Bill: ${b.billNumber}, Date: ${b.billDate.toISOString()}, Total: ${b.grandTotal}, Status: ${b.status}, Deleted: ${b.deletedAt}`);
        });

        const payments = await Payment.find({});
        console.log(`\n--- Payments (${payments.length}) ---`);
        payments.forEach(p => {
            console.log(`Pay: ${p.paymentNumber}, Date: ${p.paymentDate.toISOString()}, Direction: ${p.direction}, Amount: ${p.amount}, Status: ${p.status}, Deleted: ${p.deletedAt}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
