import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const findSalesRep = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const reps = await User.find({ role: 'sales_rep' });
        console.log(JSON.stringify(reps, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

findSalesRep();
