import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const fixAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOneAndUpdate(
            { email: 'admin@admin.com' },
            { role: 'admin', isActive: true },
            { new: true }
        );

        if (user) {
            console.log('✓ Updated successfully!');
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('Is Active:', user.isActive);
        } else {
            console.log('User not found!');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
};

fixAdmin();
