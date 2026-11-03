import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({ role: 'admin' });
        console.log('Admin users found:', users.map(u => u.email));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

check();
