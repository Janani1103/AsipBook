import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Warehouse from './src/models/Warehouse.js';

dotenv.config();

const setup = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Create Store Warehouse
        let store = await Warehouse.findOne({ warehouseCode: 'STORE-01' });
        if (!store) {
            store = await Warehouse.create({
                warehouseCode: 'STORE-01',
                name: 'Retail Store - Colombo',
                type: 'branch',
                address: { city: 'Colombo', country: 'Sri Lanka' },
                isActive: true
            });
            console.log('Store Warehouse created: STORE-01');
        } else {
            console.log('Store Warehouse already exists');
        }

        // 2. Create Sales Rep User
        let rep = await User.findOne({ email: 'kamal@example.com' });
        if (!rep) {
            rep = await User.create({
                firstName: 'Kamal',
                lastName: 'Perera',
                email: 'kamal@example.com',
                password: 'password123',
                role: 'sales_rep',
                isActive: true
            });
            console.log('Sales Rep created: kamal@example.com');
        } else {
            console.log('Sales Rep already exists');
        }

        // 3. Create Van Warehouse for the Rep
        let van = await Warehouse.findOne({ warehouseCode: 'VAN-KAMAL' });
        if (!van) {
            van = await Warehouse.create({
                warehouseCode: 'VAN-KAMAL',
                name: "Kamal's Delivery Van",
                type: 'virtual',
                warehouseManager: rep._id,
                address: { city: 'Colombo', country: 'Sri Lanka' },
                isActive: true
            });
            console.log('Van Warehouse created: VAN-KAMAL');
        } else {
            console.log('Van Warehouse already exists');
        }

        console.log('Manufacturing flow infrastructure setup complete!');
        process.exit(0);
    } catch (error) {
        console.error('Setup error:', error);
        process.exit(1);
    }
};

setup();
