import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PosSession from './src/models/PosSession.js';
import User from './src/models/User.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    try {
        const user = await User.findOne();
        const session = new PosSession({
            userId: user._id,
            openingBalance: 1000,
            notes: "Test"
        });
        await session.save();
        console.log("Success");
    } catch(err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
}
run();
