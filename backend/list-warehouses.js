import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Warehouse from './src/models/Warehouse.js';

dotenv.config();

const listWarehouses = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const warehouses = await Warehouse.find({});
        console.log(JSON.stringify(warehouses, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

listWarehouses();
