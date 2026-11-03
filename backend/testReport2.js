import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Invoice from './src/models/Invoice.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    try {
        const startDate = "undefined";
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);

        await Invoice.find({ invoiceDate: dateFilter });
        console.log("Success");
    } catch(err) {
        console.error(err.message);
    } finally {
        mongoose.disconnect();
    }
}
run();
