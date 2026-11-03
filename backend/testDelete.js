import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PosSession from './src/models/PosSession.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    try {
        await PosSession.deleteMany({ status: 'open' });
        console.log("Deleted open sessions");
    } catch(err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
}
run();
