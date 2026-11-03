import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const repairOrderSchema = new mongoose.Schema({
    repairNumber: { type: String, unique: true, trim: true, uppercase: true },

    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productCode: String,
    productName: String,
    quantity: { type: Number, required: true, min: 1 },

    // Source
    sourceType: { type: String, enum: ['customer_return', 'warehouse_damage', 'manual'], default: 'manual' },
    customerReturnId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerReturn' },

    issueDescription: { type: String, required: true },
    diagnosis: String,

    // Costs (simplified — just totals, not detailed parts)
    estimatedLaborHours: { type: Number, default: 0 },
    estimatedCost: { type: Number, default: 0 },
    actualLaborHours: { type: Number, default: 0 },
    actualLaborCost: { type: Number, default: 0 },
    actualPartsCost: { type: Number, default: 0 },
    totalActualCost: { type: Number, default: 0 },

    status: {
        type: String,
        enum: [
            'pending', 'in_progress', 'awaiting_parts',
            'completed_fixed', 'completed_unfixable',
            'cancelled',
        ],
        default: 'pending',
    },

    // Disposition after repair
    disposition: {
        type: String,
        enum: ['pending', 'return_to_stock', 'return_to_customer', 'scrap'],
        default: 'pending',
    },

    // Timeline
    assignedTechnicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startedAt: Date,
    completedAt: Date,

    // Stock impact after repair (if returning to stock)
    stockMovementId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockMovement' },
    returnedToWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },

    notes: String,
    internalNotes: String,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

repairOrderSchema.index({ status: 1, createdAt: -1 });
repairOrderSchema.index({ productId: 1 });

repairOrderSchema.pre('save', async function () {
    if (this.isNew && !this.repairNumber) {
        const seq = await getNextSequence('repair');
        this.repairNumber = `REP-${seq}`;
    }
    this.totalActualCost = +((this.actualLaborCost || 0) + (this.actualPartsCost || 0)).toFixed(2);
});

repairOrderSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const RepairOrder = mongoose.model('RepairOrder', repairOrderSchema);
export default RepairOrder;