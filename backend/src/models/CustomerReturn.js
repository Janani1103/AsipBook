import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const returnItemSchema = new mongoose.Schema({
    lineNumber: Number,

    // What's being returned
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productCode: String,
    productName: String,

    // Source reference
    salesOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },
    salesOrderLineId: mongoose.Schema.Types.ObjectId,
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },

    quantityReturned: { type: Number, required: true, min: 0.01 },
    unitOfMeasure: String,
    unitPrice: { type: Number, required: true }, // what was sold at

    reason: {
        type: String,
        enum: [
            'damaged_on_arrival', 'defective', 'wrong_item',
            'not_as_described', 'expired', 'overshipped',
            'customer_changed_mind', 'late_delivery', 'other',
        ],
        required: true,
    },
    reasonDescription: String,

    // Condition on receipt
    condition: {
        type: String,
        enum: ['pending_inspection', 'resellable', 'repairable', 'damaged', 'expired', 'missing'],
        default: 'pending_inspection',
    },

    // Disposition: what to do with it
    disposition: {
        type: String,
        enum: ['pending', 'restock', 'repair', 'scrap', 'return_to_supplier', 'refund_only_no_return'],
        default: 'pending',
    },

    // Financial
    refundable: { type: Boolean, default: true },
    refundAmount: { type: Number, default: 0 }, // can differ from unitPrice × qty if partial
    restockingFeePercent: { type: Number, default: 0 },
    restockingFee: { type: Number, default: 0 },

    // Stock handling
    stockMovementId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockMovement' },
    restockedAt: Date,
    restockedToWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },

    // Repair reference (if disposition is 'repair')
    repairOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'RepairOrder' },

    // Damage register reference
    damageRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'DamageRecord' },

    photos: [String],
    inspectionNotes: String,
}, { _id: true });

const customerReturnSchema = new mongoose.Schema({
    rmaNumber: { type: String, unique: true, trim: true, uppercase: true },

    // Customer
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerSnapshot: {
        name: String, code: String, phone: String,
    },

    // Source
    salesOrderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' }],
    invoiceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],

    // Dates
    requestDate: { type: Date, default: Date.now },
    receivedDate: Date,
    completedDate: Date,

    // Items
    items: [returnItemSchema],

    // Totals
    totalReturnValue: { type: Number, default: 0 },
    totalRefundAmount: { type: Number, default: 0 },
    totalRestockingFees: { type: Number, default: 0 },
    netRefundAmount: { type: Number, default: 0 },

    // Status
    status: {
        type: String,
        enum: [
            'draft', 'approved', 'awaiting_return',
            'received', 'inspecting', 'processed',
            'completed', 'rejected', 'cancelled',
        ],
        default: 'draft',
    },

    // Processing
    returnToWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Refund tracking
    refundMethod: {
        type: String,
        enum: ['pending', 'cash_refund', 'bank_refund', 'credit_note', 'invoice_adjustment', 'none'],
        default: 'pending',
    },
    creditNoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditNote' },
    refundPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },

    // Approval
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectionReason: String,
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: Date,

    customerNotes: String,
    internalNotes: String,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

customerReturnSchema.index({ customerId: 1, requestDate: -1 });
customerReturnSchema.index({ status: 1 });

customerReturnSchema.pre('save', async function () {
    if (this.isNew && !this.rmaNumber) {
        const seq = await getNextSequence('rma');
        this.rmaNumber = `RMA-${seq}`;
    }

    // Calculate line totals
    this.items.forEach((item, idx) => {
        item.lineNumber = idx + 1;
        const lineValue = item.quantityReturned * item.unitPrice;
        item.restockingFee = +(lineValue * (item.restockingFeePercent || 0) / 100).toFixed(2);
        if (!item.refundAmount || item.refundAmount === 0) {
            item.refundAmount = item.refundable
                ? +(lineValue - item.restockingFee).toFixed(2)
                : 0;
        }
    });

    this.totalReturnValue = +this.items.reduce(
        (s, i) => s + (i.quantityReturned * i.unitPrice), 0
    ).toFixed(2);
    this.totalRefundAmount = +this.items.reduce((s, i) => s + (i.refundAmount || 0), 0).toFixed(2);
    this.totalRestockingFees = +this.items.reduce((s, i) => s + (i.restockingFee || 0), 0).toFixed(2);
    this.netRefundAmount = this.totalRefundAmount;
});

customerReturnSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const CustomerReturn = mongoose.model('CustomerReturn', customerReturnSchema);
export default CustomerReturn;