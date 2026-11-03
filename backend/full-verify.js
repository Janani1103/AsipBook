import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/Product.js';
import Warehouse from './src/models/Warehouse.js';
import StockItem from './src/models/StockItem.js';

dotenv.config();

const fullVerify = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('--- DATABASE STATUS ---');

        const products = await Product.find({ deletedAt: null });
        console.log(`\nProducts (${products.length}):`);
        products.forEach(p => console.log(`- ${p.name} [${p.productCode}] (${p._id})`));

        const warehouses = await Warehouse.find({ deletedAt: null });
        console.log(`\nWarehouses (${warehouses.length}):`);
        warehouses.forEach(w => console.log(`- ${w.name} [${w.warehouseCode}] (${w._id})`));

        console.log('\n--- STOCK SUMMARY ---');
        const stockItems = await StockItem.find();
        for (const si of stockItems) {
            const p = products.find(prod => prod._id.toString() === si.productId.toString());
            const w = warehouses.find(wh => wh._id.toString() === si.warehouseId.toString());
            console.log(`- ${p?.name || 'Unknown Product'} in ${w?.name || 'Unknown Warehouse'}: ${si.quantities.onHand} on hand`);
        }

        console.log('\nVerification Complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fullVerify();
