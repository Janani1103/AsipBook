import asyncHandler from 'express-async-handler';
import Customer from '../models/Customer.js';

export const createCustomer = asyncHandler(async (req, res) => {
    // Clean up empty string ID fields
    const payload = { ...req.body, createdBy: req.user._id };
    if (!payload.customerGroupId) delete payload.customerGroupId;
    if (!payload.assignedSalesRep) delete payload.assignedSalesRep;

    const customer = await Customer.create(payload);
    const populated = await Customer.findById(customer._id)
        .populate('customerGroupId', 'name code color')
        .populate('assignedSalesRep', 'firstName lastName');
    res.status(201).json({ success: true, data: populated });
});

export const getCustomers = asyncHandler(async (req, res) => {
    const {
        search, customerGroupId, status, assignedSalesRep,
        onCreditHold, isOverdue,
        page = 1, limit = 20,
        sortBy = 'createdAt', sortOrder = 'desc',
    } = req.query;

    const filter = {};

    if (search) {
        filter.$or = [
            { displayName: { $regex: search, $options: 'i' } },
            { companyName: { $regex: search, $options: 'i' } },
            { customerCode: { $regex: search, $options: 'i' } },
            { 'primaryContact.phone': { $regex: search, $options: 'i' } },
        ];
    }
    if (customerGroupId) filter.customerGroupId = customerGroupId;
    if (status) filter.status = status;
    if (assignedSalesRep) filter.assignedSalesRep = assignedSalesRep;
    if (onCreditHold !== undefined) filter['creditStatus.onCreditHold'] = onCreditHold === 'true';
    if (isOverdue !== undefined) filter['creditStatus.isOverdue'] = isOverdue === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [customers, total] = await Promise.all([
        Customer.find(filter)
            .populate('customerGroupId', 'name code color')
            .populate('assignedSalesRep', 'firstName lastName')
            .sort(sortObj)
            .skip(skip)
            .limit(Number(limit)),
        Customer.countDocuments(filter),
    ]);

    res.json({
        success: true,
        count: customers.length,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        data: customers,
    });
});

export const getCustomerById = asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id)
        .populate('customerGroupId', 'name code color defaultDiscountPercent')
        .populate('assignedSalesRep', 'firstName lastName email phone')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName');

    if (!customer) { res.status(404); throw new Error('Customer not found'); }
    res.json({ success: true, data: customer });
});

export const updateCustomer = asyncHandler(async (req, res) => {
    const payload = { ...req.body, updatedBy: req.user._id };
    if (payload.customerGroupId === '') payload.customerGroupId = null;
    if (payload.assignedSalesRep === '') payload.assignedSalesRep = null;

    const customer = await Customer.findByIdAndUpdate(req.params.id, payload, {
        new: true, runValidators: true,
    })
        .populate('customerGroupId', 'name code color')
        .populate('assignedSalesRep', 'firstName lastName');

    if (!customer) { res.status(404); throw new Error('Customer not found'); }
    res.json({ success: true, data: customer });
});

export const deleteCustomer = asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id);
    if (!customer) { res.status(404); throw new Error('Customer not found'); }
    customer.deletedAt = new Date();
    customer.status = 'inactive';
    await customer.save();
    res.json({ success: true, message: 'Customer deleted' });
});

// Toggle credit hold
export const toggleCreditHold = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const customer = await Customer.findById(req.params.id);
    if (!customer) { res.status(404); throw new Error('Customer not found'); }

    customer.creditStatus.onCreditHold = !customer.creditStatus.onCreditHold;
    customer.creditStatus.creditHoldReason = customer.creditStatus.onCreditHold ? reason : null;
    await customer.save();

    res.json({
        success: true,
        message: customer.creditStatus.onCreditHold ? 'Customer placed on credit hold' : 'Credit hold removed',
        data: customer,
    });
});