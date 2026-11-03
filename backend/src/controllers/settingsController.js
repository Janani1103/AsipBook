import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import CompanySettings from '../models/CompanySettings.js';

/**
 * GET /api/settings/company
 * Get the company settings (creates a default one if it doesn't exist)
 */
export const getCompanySettings = asyncHandler(async (req, res) => {
    let settings = await CompanySettings.findOne();

    if (!settings) {
        settings = await CompanySettings.create({});
    }

    res.status(200).json({ success: true, data: settings });
});

/**
 * PUT /api/settings/company
 * Update the company settings
 */
export const updateCompanySettings = asyncHandler(async (req, res) => {
    let settings = await CompanySettings.findOne();

    if (!settings) {
        settings = new CompanySettings();
    }

    const fields = [
        'companyName', 'address', 'phone', 'email', 'website',
        'taxRegistrationNumber', 'companyRegNumber', 'receiptFooterMessage',
        'logoUrl', 'companySealUrl', 'hrSignatureUrl', 'managerSignatureUrl',
        'tagline', 'systemSubtitle', 'payrollSettings', 'posSettings',
        'loyaltySettings', 'inventorySettings', 'systemSettings'
    ];

    fields.forEach((f) => {
        if (req.body[f] !== undefined) {
            if (typeof req.body[f] === 'object' && !Array.isArray(req.body[f]) && req.body[f] !== null) {
                const currentObj = settings[f] ? (settings[f].toObject ? settings[f].toObject() : settings[f]) : {};
                settings[f] = { ...currentObj, ...req.body[f] };
            } else {
                settings[f] = req.body[f];
            }
        }
    });

    const updatedSettings = await settings.save();
    res.status(200).json({ success: true, data: updatedSettings });
});

/**
 * GET /api/settings/backup/export
 * Download 1-Click Database JSON Backup
 */
export const exportDatabaseBackup = asyncHandler(async (req, res) => {
    const settings = await CompanySettings.findOne().lean();

    const getModelData = async (name, limit = 5000) => {
        try {
            if (mongoose.models[name]) {
                return await mongoose.models[name].find().lean().limit(limit);
            }
            return [];
        } catch {
            return [];
        }
    };

    const [products, warehouses, employees, departments, customers, suppliers] = await Promise.all([
        getModelData('Product'),
        getModelData('Warehouse', 100),
        getModelData('Employee', 1000),
        getModelData('Department', 100),
        getModelData('Customer', 5000),
        getModelData('Supplier', 1000),
    ]);

    const backupData = {
        exportedAt: new Date().toISOString(),
        system: 'ASIP ERP Business Management System',
        version: '2.0',
        company: settings?.companyName || 'ASIPBOOK',
        recordCounts: {
            products: products.length,
            warehouses: warehouses.length,
            employees: employees.length,
            departments: departments.length,
            customers: customers.length,
            suppliers: suppliers.length,
        },
        records: {
            settings,
            products,
            warehouses,
            employees,
            departments,
            customers,
            suppliers,
        }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="ASIP_ERP_Backup_${new Date().toISOString().slice(0, 10)}.json"`);
    res.status(200).send(JSON.stringify(backupData, null, 2));
});
