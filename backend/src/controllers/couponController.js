import asyncHandler from 'express-async-handler';
import Coupon from '../models/Coupon.js';

/**
 * Validate and compute discount for a coupon code
 * POST /api/coupons/validate
 * Body: { code, customerId, cartTotal }
 */
export const validateCoupon = asyncHandler(async (req, res) => {
    const { code, customerId, cartTotal = 0 } = req.body;

    if (!code) {
        res.status(400);
        throw new Error('Coupon code is required');
    }

    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (!coupon || !coupon.isActive) {
        return res.status(400).json({
            success: false,
            valid: false,
            message: 'Invalid or inactive coupon code',
        });
    }

    const now = new Date();

    // Check Start Date
    if (coupon.startDate && new Date(coupon.startDate) > now) {
        return res.status(400).json({
            success: false,
            valid: false,
            message: `This coupon will be active from ${new Date(coupon.startDate).toLocaleDateString()}`,
        });
    }

    // Check Expiry Date
    if (coupon.expiryDate && new Date(coupon.expiryDate) < now) {
        return res.status(400).json({
            success: false,
            valid: false,
            message: 'This coupon has expired',
        });
    }

    // Check Overall Usage Limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return res.status(400).json({
            success: false,
            valid: false,
            message: 'Coupon usage limit has been reached',
        });
    }

    // Check Per-Customer Limit
    if (customerId && coupon.perCustomerLimit) {
        const customerUses = coupon.usedBy.filter(
            (u) => u.customerId && u.customerId.toString() === customerId.toString()
        ).length;

        if (customerUses >= coupon.perCustomerLimit) {
            return res.status(400).json({
                success: false,
                valid: false,
                message: `You have already used this coupon the maximum allowed times (${coupon.perCustomerLimit})`,
            });
        }
    }

    // Check Minimum Purchase Amount
    const total = Number(cartTotal) || 0;
    if (coupon.minPurchaseAmount > 0 && total < coupon.minPurchaseAmount) {
        return res.status(400).json({
            success: false,
            valid: false,
            message: `Minimum bill total of Rs. ${coupon.minPurchaseAmount.toLocaleString()} required to use this coupon`,
        });
    }

    // Calculate Discount
    let discountAmount = 0;
    if (coupon.type === 'percentage') {
        discountAmount = (total * coupon.value) / 100;
        if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
            discountAmount = coupon.maxDiscountAmount;
        }
    } else {
        // fixed or gift_card
        discountAmount = Math.min(total, coupon.value);
    }

    discountAmount = Math.round(discountAmount * 100) / 100;

    res.json({
        success: true,
        valid: true,
        data: {
            _id: coupon._id,
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            discountAmount,
            description: coupon.description,
            minPurchaseAmount: coupon.minPurchaseAmount,
            maxDiscountAmount: coupon.maxDiscountAmount,
        },
    });
});

/**
 * List all coupons
 * GET /api/coupons
 */
export const getCoupons = asyncHandler(async (req, res) => {
    const { search, type, status, page = 1, limit = 50 } = req.query;

    const query = {};
    if (search) {
        query.code = { $regex: search, $options: 'i' };
    }
    if (type) {
        query.type = type;
    }
    if (status === 'active') {
        query.isActive = true;
    } else if (status === 'inactive') {
        query.isActive = false;
    }

    const total = await Coupon.countDocuments(query);
    const coupons = await Coupon.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('createdBy', 'firstName lastName');

    res.json({
        success: true,
        data: coupons,
        pagination: {
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
            limit: Number(limit),
        },
    });
});

/**
 * Create a new coupon / voucher
 * POST /api/coupons
 */
export const createCoupon = asyncHandler(async (req, res) => {
    const {
        code,
        type = 'fixed',
        value,
        description,
        minPurchaseAmount = 0,
        maxDiscountAmount,
        startDate,
        expiryDate,
        usageLimit,
        perCustomerLimit = 1,
        isActive = true,
    } = req.body;

    if (!code || value === undefined) {
        res.status(400);
        throw new Error('Code and discount value are required');
    }

    const existing = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
        res.status(400);
        throw new Error('A coupon with this code already exists');
    }

    const coupon = await Coupon.create({
        code: code.trim().toUpperCase(),
        type,
        value: Number(value),
        description,
        minPurchaseAmount: Number(minPurchaseAmount) || 0,
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        perCustomerLimit: Number(perCustomerLimit) || 1,
        isActive,
        createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: coupon });
});

/**
 * Update coupon
 * PUT /api/coupons/:id
 */
export const updateCoupon = asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
        res.status(404);
        throw new Error('Coupon not found');
    }

    if (req.body.code && req.body.code.trim().toUpperCase() !== coupon.code) {
        const duplicate = await Coupon.findOne({ code: req.body.code.trim().toUpperCase() });
        if (duplicate) {
            res.status(400);
            throw new Error('A coupon with this code already exists');
        }
        coupon.code = req.body.code.trim().toUpperCase();
    }

    if (req.body.type !== undefined) coupon.type = req.body.type;
    if (req.body.value !== undefined) coupon.value = Number(req.body.value);
    if (req.body.description !== undefined) coupon.description = req.body.description;
    if (req.body.minPurchaseAmount !== undefined) coupon.minPurchaseAmount = Number(req.body.minPurchaseAmount) || 0;
    if (req.body.maxDiscountAmount !== undefined) coupon.maxDiscountAmount = req.body.maxDiscountAmount ? Number(req.body.maxDiscountAmount) : undefined;
    if (req.body.startDate !== undefined) coupon.startDate = req.body.startDate ? new Date(req.body.startDate) : undefined;
    if (req.body.expiryDate !== undefined) coupon.expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : undefined;
    if (req.body.usageLimit !== undefined) coupon.usageLimit = req.body.usageLimit ? Number(req.body.usageLimit) : null;
    if (req.body.perCustomerLimit !== undefined) coupon.perCustomerLimit = Number(req.body.perCustomerLimit) || 1;
    if (req.body.isActive !== undefined) coupon.isActive = req.body.isActive;

    await coupon.save();
    res.json({ success: true, data: coupon });
});

/**
 * Delete / deactivate coupon
 * DELETE /api/coupons/:id
 */
export const deleteCoupon = asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
        res.status(404);
        throw new Error('Coupon not found');
    }

    await coupon.deleteOne();
    res.json({ success: true, message: 'Coupon removed successfully' });
});

