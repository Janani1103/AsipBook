import mongoose from 'mongoose';

const companySettingsSchema = new mongoose.Schema({
    companyName: { type: String, default: 'ASIPBOOK (PVT) LTD', trim: true },
    address: { type: String, default: 'No. 124, High Level Road, Colombo, Sri Lanka', trim: true },
    phone: { type: String, default: '+94 11 285 4567', trim: true },
    email: { type: String, default: 'info@asip.lk', trim: true },
    website: { type: String, default: 'www.asip.lk', trim: true },
    taxRegistrationNumber: { type: String, default: '104598210-7000', trim: true },
    companyRegNumber: { type: String, default: 'PV-89412', trim: true },
    receiptFooterMessage: { type: String, default: 'THANK YOU FOR YOUR BUSINESS!\nPLEASE VISIT AGAIN.', trim: true },
    logoUrl: { type: String, default: '/asipbook-logo.png' },
    companySealUrl: { type: String, default: '' },
    hrSignatureUrl: { type: String, default: '' },
    managerSignatureUrl: { type: String, default: '' },
    tagline: { type: String, default: 'Books, Office Stationery & Retail Distribution', trim: true },
    systemSubtitle: { type: String, default: 'Smart wholesale inventory, POS, and financial management.', trim: true },

    // HR & Payroll Policies
    payrollSettings: {
        epfEmployeeRate: { type: Number, default: 8 },
        epfEmployerRate: { type: Number, default: 12 },
        etfEmployerRate: { type: Number, default: 3 },
        epfEmployerRegNo: { type: String, default: 'C/89412', trim: true },
        standardDailyHours: { type: Number, default: 8.0 },
        normalOtMultiplier: { type: Number, default: 1.5 },
        holidayOtMultiplier: { type: Number, default: 2.0 },
        lateGraceMinutes: { type: Number, default: 15 },
    },

    // POS & Receipt Rules
    posSettings: {
        receiptPaperSize: { type: String, default: '80mm' },
        autoPrintReceipt: { type: Boolean, default: true },
        showCashierName: { type: Boolean, default: true },
        showCustomerLoyalty: { type: Boolean, default: true },
        showTaxBreakdown: { type: Boolean, default: false },
        receiptHeaderMessage: { type: String, default: 'WELCOME TO ASIPBOOK', trim: true },
    },

    // Loyalty Program
    loyaltySettings: {
        enabled: { type: Boolean, default: true },
        pointsPer100Spent: { type: Number, default: 1 },
        redemptionRatePerPoint: { type: Number, default: 1 },
        minPointsToRedeem: { type: Number, default: 10 },
    },

    // Inventory Rules
    inventorySettings: {
        lowStockThreshold: { type: Number, default: 5 },
        preventNegativeStock: { type: Boolean, default: true },
        defaultWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    },

    // System Settings
    systemSettings: {
        sessionTimeoutMinutes: { type: Number, default: 60 },
        currencySymbol: { type: String, default: 'LKR', trim: true },
    },
}, { timestamps: true });

const CompanySettings = mongoose.model('CompanySettings', companySettingsSchema);
export default CompanySettings;
