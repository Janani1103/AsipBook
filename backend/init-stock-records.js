import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './src/models/Product.js';
import Warehouse from './src/models/Warehouse.js';
import StockItem from './src/models/StockItem.js';

dotenv.config();

const fixStock = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const products = await Product.find({ deletedAt: null });
        const defaultWh = await Warehouse.findOne({ isDefault: true }) || await Warehouse.findOne();

        if (!defaultWh) {
            console.error('No warehouse found. Create a warehouse first.');
            process.exit(1);
        }

        console.log(`Initializing 0-stock records for ${products.length} products in warehouse: ${defaultWh.name}`);

        for (const product of products) {
            const existing = await StockItem.findOne({ productId: product._id, warehouseId: defaultWh._id });
            if (!existing) {
                await StockItem.create({
                    productId: product._id,
                    warehouseId: defaultWh._id,
                    productCode: product.productCode,
                    productName: product.name,
                    unitOfMeasure: product.unitOfMeasure,
                    quantities: { onHand: 0, reserved: 0, available: 0 },
                    totalValue: 0
                });
                console.log(`Added stock record for: ${product.name}`);
            }
        }

        console.log('Stock initialization complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing stock:', error);
        process.exit(1);
    }
};

fixStock();
