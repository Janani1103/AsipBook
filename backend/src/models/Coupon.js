import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Coupon code is required'],
        unique: true,
        uppercase: true,
        trim: true,
    },
    type: {
        type: String,
        enum: ['percentage', 'fixed', 'gift_card'],
        default: 'fixed',
    },
    value: {
        type: Number,
        required: [true, 'Coupon discount value is required'],
        min: 0,
    },
    description: {
        type: String,
        trim: true,
    },
    minPurchaseAmount: {
        type: Number,
        default: 0,
        min: 0,
    },
    maxDiscountAmount: {
        type: Number,
        min: 0,
    },
    startDate: {
        type: Date,
    },
    expiryDate: {
        type: Date,
    },
    usageLimit: {
        type: Number,
        default: null,
    },
    usedCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    perCustomerLimit: {
        type: Number,
        default: 1,
        min: 1,
    },
    usedBy: [
        {
            customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
            usedAt: { type: Date, default: Date.now },
            orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },
            discountAmount: { type: Number, default: 0 },
        }
    ],
    isActive: {
        type: Boolean,
        default: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, { timestamps: true });

// Check index on code
couponSchema.index({ code: 1 });

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;

