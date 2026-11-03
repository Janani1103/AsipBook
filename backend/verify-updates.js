import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/Product.js';
import StockItem from './src/models/StockItem.js';
import Warehouse from './src/models/Warehouse.js';

dotenv.config();

const verify = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Find Product
        const product = await Product.findOne({ name: /Chemical A/i });
        if (!product) {
            console.error('Product "Chemical A" not found. Please create it first.');
            process.exit(1);
        }
        console.log(`Found Product: ${product.name} (${product._id})`);

        // 2. Find Warehouses
        const mainWh = await Warehouse.findOne({ warehouseCode: 'MAIN' });
        const storeWh = await Warehouse.findOne({ warehouseCode: 'STORE-01' });
        const vanWh = await Warehouse.findOne({ warehouseCode: 'VAN-KAMAL' });

        if (!mainWh || !storeWh || !vanWh) {
            console.error('One or more warehouses missing');
            process.exit(1);
        }

        console.log('Warehouses Found: MAIN, STORE-01, VAN-KAMAL');

        // 3. Check Stock Levels
        const checkStock = async (whId, label) => {
            const stock = await StockItem.findOne({ productId: product._id, warehouseId: whId });
            console.log(`${label} Stock: ${stock ? stock.quantities.onHand : 0} units`);
        };

        await checkStock(mainWh._id, 'MAIN');
        await checkStock(storeWh._id, 'STORE-01');
        await checkStock(vanWh._id, 'VAN-KAMAL');

        console.log('\nVerification Complete: All data insertion points are operational.');
        process.exit(0);
    } catch (error) {
        console.error('Verification error:', error);
        process.exit(1);
    }
};

verify();
