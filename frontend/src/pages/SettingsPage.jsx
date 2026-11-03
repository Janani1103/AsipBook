import React, { useEffect, useState, useRef } from 'react';
import {
    Settings, Save, Upload, Trash2, Image as ImageIcon, CheckCircle2,
    Building2, Users, Receipt, Database, ShieldCheck, Clock,
    Download, RefreshCw, FileText, Stamp, Award, AlertTriangle,
    Coins, Printer, Store, Check, Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCompanySettings, useUpdateCompanySettings } from '../features/settings/useSettings';
import { settingsApi } from '../features/settings/settingsApi';
import { useWarehouses } from '../features/warehouses/useWarehouses';
import Button from '../components/ui/Button';

export default function SettingsPage() {
    const { data: settingsRes, isLoading } = useCompanySettings();
    const updateSettings = useUpdateCompanySettings();
    const { data: warehousesRes } = useWarehouses();
    const warehouses = warehousesRes?.data || [];

    const logoInputRef = useRef(null);
    const sealInputRef = useRef(null);
    const hrSignInputRef = useRef(null);
    const mgtSignInputRef = useRef(null);

    const [activeTab, setActiveTab] = useState('company');
    const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);

    const [formData, setFormData] = useState({
        // Company & Brand
        companyName: '',
        companyRegNumber: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        taxRegistrationNumber: '',
        logoUrl: '',
        companySealUrl: '',
        hrSignatureUrl: '',
        managerSignatureUrl: '',
        tagline: 'Books, Office Stationery & Retail Distribution',
        systemSubtitle: 'Smart wholesale inventory, POS, and financial management.',

        // HR & Payroll Policies
        payrollSettings: {
            epfEmployeeRate: 8,
            epfEmployerRate: 12,
            etfEmployerRate: 3,
            epfEmployerRegNo: 'C/89412',
            standardDailyHours: 8.0,
            normalOtMultiplier: 1.5,
            holidayOtMultiplier: 2.0,
            lateGraceMinutes: 15,
        },

        // POS & Receipt Rules
        posSettings: {
            receiptPaperSize: '80mm',
            autoPrintReceipt: true,
            showCashierName: true,
            showCustomerLoyalty: true,
            showTaxBreakdown: false,
            receiptHeaderMessage: 'WELCOME TO ASIPBOOK',
        },
        receiptFooterMessage: 'THANK YOU FOR YOUR BUSINESS!\nPLEASE VISIT AGAIN.',

        // Loyalty Settings
        loyaltySettings: {
            enabled: true,
            pointsPer100Spent: 1,
            redemptionRatePerPoint: 1,
            minPointsToRedeem: 10,
        },

        // Inventory Settings
        inventorySettings: {
            lowStockThreshold: 5,
            preventNegativeStock: true,
            defaultWarehouseId: '',
        },

        // System Settings
        systemSettings: {
            sessionTimeoutMinutes: 60,
            currencySymbol: 'LKR',
        },
    });

    useEffect(() => {
        if (settingsRes?.data) {
            const s = settingsRes.data;
            setFormData({
                companyName: s.companyName || 'ASIPBOOK (PVT) LTD',
                companyRegNumber: s.companyRegNumber || 'PV-89412',
                address: s.address || 'No. 124, High Level Road, Colombo, Sri Lanka',
                phone: s.phone || '+94 11 285 4567',
                email: s.email || 'info@asip.lk',
                website: s.website || 'www.asip.lk',
                taxRegistrationNumber: s.taxRegistrationNumber || '104598210-7000',
                receiptFooterMessage: s.receiptFooterMessage || 'THANK YOU FOR YOUR BUSINESS!\nPLEASE VISIT AGAIN.',
                logoUrl: s.logoUrl || '/asipbook-logo.png',
                companySealUrl: s.companySealUrl || '',
                hrSignatureUrl: s.hrSignatureUrl || '',
                managerSignatureUrl: s.managerSignatureUrl || '',
                tagline: s.tagline || 'Books, Office Stationery & Retail Distribution',
                systemSubtitle: s.systemSubtitle || 'Smart wholesale inventory, POS, and financial management.',

                payrollSettings: {
                    epfEmployeeRate: s.payrollSettings?.epfEmployeeRate ?? 8,
                    epfEmployerRate: s.payrollSettings?.epfEmployerRate ?? 12,
                    etfEmployerRate: s.payrollSettings?.etfEmployerRate ?? 3,
                    epfEmployerRegNo: s.payrollSettings?.epfEmployerRegNo || 'C/89412',
                    standardDailyHours: s.payrollSettings?.standardDailyHours ?? 8.0,
                    normalOtMultiplier: s.payrollSettings?.normalOtMultiplier ?? 1.5,
                    holidayOtMultiplier: s.payrollSettings?.holidayOtMultiplier ?? 2.0,
                    lateGraceMinutes: s.payrollSettings?.lateGraceMinutes ?? 15,
                },

                posSettings: {
                    receiptPaperSize: s.posSettings?.receiptPaperSize || '80mm',
                    autoPrintReceipt: s.posSettings?.autoPrintReceipt ?? true,
                    showCashierName: s.posSettings?.showCashierName ?? true,
                    showCustomerLoyalty: s.posSettings?.showCustomerLoyalty ?? true,
                    showTaxBreakdown: s.posSettings?.showTaxBreakdown ?? false,
                    receiptHeaderMessage: s.posSettings?.receiptHeaderMessage || 'WELCOME TO ASIPBOOK',
                },

                loyaltySettings: {
                    enabled: s.loyaltySettings?.enabled ?? true,
                    pointsPer100Spent: s.loyaltySettings?.pointsPer100Spent ?? 1,
                    redemptionRatePerPoint: s.loyaltySettings?.redemptionRatePerPoint ?? 1,
                    minPointsToRedeem: s.loyaltySettings?.minPointsToRedeem ?? 10,
                },

                inventorySettings: {
                    lowStockThreshold: s.inventorySettings?.lowStockThreshold ?? 5,
                    preventNegativeStock: s.inventorySettings?.preventNegativeStock ?? true,
                    defaultWarehouseId: s.inventorySettings?.defaultWarehouseId || (warehouses[0]?._id || ''),
                },

                systemSettings: {
                    sessionTimeoutMinutes: s.systemSettings?.sessionTimeoutMinutes ?? 60,
                    currencySymbol: s.systemSettings?.currencySymbol || 'LKR',
                },
            });
        }
    }, [settingsRes, warehouses]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNestedChange = (group, field, value) => {
        setFormData(prev => ({
            ...prev,
            [group]: {
                ...prev[group],
                [field]: value
            }
        }));
    };

    const handleImageUpload = (field, setterName) => (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file (PNG, JPG, SVG, WebP)');
            return;
        }

        if (file.size > 3 * 1024 * 1024) {
            toast.error('Image size must be less than 3MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64Url = ev.target.result;
            setFormData(prev => ({ ...prev, [field]: base64Url }));
            // Also store in localStorage for offline payslip rendering
            if (field === 'hrSignatureUrl') localStorage.setItem('asip_hr_sign', base64Url);
            if (field === 'managerSignatureUrl') localStorage.setItem('asip_mgt_sign', base64Url);
            if (field === 'companySealUrl') localStorage.setItem('asip_company_seal', base64Url);

            toast.success('Image selected! Click "Save Settings" to persist.');
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        try {
            await updateSettings.mutateAsync(formData);
            toast.success('All system settings saved successfully!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update settings');
        }
    };

    const handleDownloadBackup = async () => {
        try {
            setIsDownloadingBackup(true);
            const blob = await settingsApi.downloadBackup();
            const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/json' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `ASIP_ERP_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('1-Click Database backup downloaded');
        } catch (err) {
            toast.error('Failed to export backup. Ensure you have administrator privileges.');
        } finally {
            setIsDownloadingBackup(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="text-gray-500 font-medium animate-pulse flex items-center gap-2">
                    <RefreshCw size={18} className="animate-spin text-indigo-600" />
                    Loading enterprise system settings...
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'company', label: 'Company & Brand', icon: Building2 },
        { id: 'hr', label: 'HR & Payroll Policies', icon: Users },
        { id: 'pos', label: 'POS, Receipts & Loyalty', icon: Receipt },
        { id: 'inventory', label: 'Inventory & System', icon: Database },
    ];

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 pb-20">
            {/* Header with Quick Save */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
                        <Settings className="text-indigo-600 w-7 h-7" />
                        System Configuration & Settings
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Enterprise configuration for corporate brand identity, statutory HR policies, POS receipts, and system administration.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="primary"
                    onClick={handleSubmit}
                    loading={updateSettings.isPending}
                    className="shadow-sm"
                >
                    <Save size={16} className="mr-1.5" /> Save All Changes
                </Button>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex border-b border-gray-200 gap-2 sm:gap-4 overflow-x-auto">
                {tabs.map((t) => {
                    const Icon = t.icon;
                    const isActive = activeTab === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setActiveTab(t.id)}
                            className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
                                isActive
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <Icon size={16} className={isActive ? 'text-indigo-600' : 'text-gray-400'} />
                            <span>{t.label}</span>
                        </button>
                    );
                })}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* ========================================================================= */}
                {/* TAB 1: COMPANY & BRAND PROFILE                                            */}
                {/* ========================================================================= */}
                {activeTab === 'company' && (
                    <div className="space-y-6">
                        {/* Company Logo & Seal Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <ImageIcon size={18} className="text-indigo-600" />
                                Brand Logo & Corporate Rubber Stamp Seal
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Brand Logo Box */}
                                <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200 space-y-3 text-center">
                                    <span className="text-xs font-bold text-gray-700 block uppercase tracking-wider">Company Logo</span>
                                    <div className="h-28 bg-white border border-dashed border-gray-300 rounded-lg flex items-center justify-center p-3 overflow-hidden">
                                        {formData.logoUrl ? (
                                            <img src={formData.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <span className="text-xs text-gray-400">No logo uploaded</span>
                                        )}
                                    </div>
                                    <div className="flex justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => logoInputRef.current?.click()}
                                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                                        >
                                            <Upload size={13} /> Upload Logo
                                        </button>
                                        {formData.logoUrl && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData(p => ({ ...p, logoUrl: '' }))}
                                                className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload('logoUrl')} />
                                </div>

                                {/* Official Rubber Stamp Seal Box */}
                                <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200 space-y-3 text-center">
                                    <span className="text-xs font-bold text-gray-700 block uppercase tracking-wider">Official Company Seal (Stamp)</span>
                                    <div className="h-28 bg-white border border-dashed border-gray-300 rounded-lg flex items-center justify-center p-2 overflow-hidden">
                                        {formData.companySealUrl ? (
                                            <img src={formData.companySealUrl} alt="Seal" className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <div className="w-20 h-20 rounded-full border-2 border-dashed border-red-600 flex flex-col items-center justify-center text-red-600 text-[8px] font-bold">
                                                <span>★ ASIPBOOK ★</span>
                                                <span className="text-[7px]">PV-89412</span>
                                                <span className="border-t border-b border-red-500 py-0.5 mt-0.5">DEFAULT</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => sealInputRef.current?.click()}
                                            className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                                        >
                                            <Stamp size={13} /> Upload Seal PNG
                                        </button>
                                        {formData.companySealUrl && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData(p => ({ ...p, companySealUrl: '' }))}
                                                className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                    <input ref={sealInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload('companySealUrl')} />
                                </div>
                            </div>
                        </div>

                        {/* Legal & Brand Identification */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Building2 size={18} className="text-indigo-600" />
                                Legal Company Entity & Registration
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Company Legal Name *</label>
                                    <input
                                        type="text"
                                        name="companyName"
                                        required
                                        value={formData.companyName}
                                        onChange={handleChange}
                                        placeholder="e.g. ASIPBOOK (PVT) LTD"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-semibold"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Company Reg No (ROC / PV) *</label>
                                    <input
                                        type="text"
                                        name="companyRegNumber"
                                        value={formData.companyRegNumber}
                                        onChange={handleChange}
                                        placeholder="e.g. PV-89412"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Tax / VAT Registration (TIN) *</label>
                                    <input
                                        type="text"
                                        name="taxRegistrationNumber"
                                        value={formData.taxRegistrationNumber}
                                        onChange={handleChange}
                                        placeholder="e.g. 104598210-7000"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Corporate Tagline</label>
                                    <input
                                        type="text"
                                        name="tagline"
                                        value={formData.tagline}
                                        onChange={handleChange}
                                        placeholder="e.g. Books, Office Stationery & Retail Distribution"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block font-semibold text-gray-700 mb-1">System Subtitle (Shown on Login Hero)</label>
                                    <input
                                        type="text"
                                        name="systemSubtitle"
                                        value={formData.systemSubtitle}
                                        onChange={handleChange}
                                        placeholder="Smart wholesale inventory, POS, and financial management."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Head Office Contacts */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <FileText size={18} className="text-indigo-600" />
                                Head Office Location & Official Contacts
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div className="md:col-span-2">
                                    <label className="block font-semibold text-gray-700 mb-1">Head Office Address *</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="e.g. No. 124, High Level Road, Colombo, Sri Lanka"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Official Telephone</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="+94 11 285 4567"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Official Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="info@asip.lk"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block font-semibold text-gray-700 mb-1">Company Website</label>
                                    <input
                                        type="text"
                                        name="website"
                                        value={formData.website}
                                        onChange={handleChange}
                                        placeholder="www.asip.lk"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* TAB 2: HR, PAYROLL & ATTENDANCE POLICIES                                  */}
                {/* ========================================================================= */}
                {activeTab === 'hr' && (
                    <div className="space-y-6">
                        {/* Statutory Central Bank Remittance Rates */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <ShieldCheck size={18} className="text-emerald-600" />
                                    Central Bank EPF & ETF Statutory Remittance Rates
                                </h2>
                                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                                    CBSL Standard: 8% + 12% + 3% = 23%
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1">
                                    <label className="block font-bold text-gray-700">Employee EPF Deduction (%)</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="50"
                                        value={formData.payrollSettings.epfEmployeeRate}
                                        onChange={(e) => handleNestedChange('payrollSettings', 'epfEmployeeRate', Number(e.target.value))}
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg font-mono font-bold text-sm bg-white"
                                    />
                                    <p className="text-[10px] text-gray-400">Deducted from employee basic pay.</p>
                                </div>

                                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1">
                                    <label className="block font-bold text-gray-700">Employer EPF Contribution (%)</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="50"
                                        value={formData.payrollSettings.epfEmployerRate}
                                        onChange={(e) => handleNestedChange('payrollSettings', 'epfEmployerRate', Number(e.target.value))}
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg font-mono font-bold text-sm bg-white"
                                    />
                                    <p className="text-[10px] text-gray-400">Company direct cost remitted to CBSL.</p>
                                </div>

                                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1">
                                    <label className="block font-bold text-gray-700">Employer ETF Contribution (%)</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="20"
                                        value={formData.payrollSettings.etfEmployerRate}
                                        onChange={(e) => handleNestedChange('payrollSettings', 'etfEmployerRate', Number(e.target.value))}
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg font-mono font-bold text-sm bg-white"
                                    />
                                    <p className="text-[10px] text-gray-400">Remitted to Employees' Trust Fund.</p>
                                </div>

                                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1">
                                    <label className="block font-bold text-gray-700">Employer EPF Reg No (CBSL)</label>
                                    <input
                                        type="text"
                                        value={formData.payrollSettings.epfEmployerRegNo}
                                        onChange={(e) => handleNestedChange('payrollSettings', 'epfEmployerRegNo', e.target.value)}
                                        placeholder="e.g. C/89412"
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg font-mono font-bold text-sm bg-white"
                                    />
                                    <p className="text-[10px] text-gray-400">Official CBSL Employer Code.</p>
                                </div>
                            </div>
                        </div>

                        {/* Overtime & Working Duty Rules */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Clock size={18} className="text-indigo-600" />
                                Working Hours, Overtime & Punctuality Policy
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Standard Daily Hours (h)</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="4"
                                        max="12"
                                        value={formData.payrollSettings.standardDailyHours}
                                        onChange={(e) => handleNestedChange('payrollSettings', 'standardDailyHours', Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-0.5">Regular full-day shift duration.</p>
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Normal Day OT Multiplier</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="1"
                                        max="3"
                                        value={formData.payrollSettings.normalOtMultiplier}
                                        onChange={(e) => handleNestedChange('payrollSettings', 'normalOtMultiplier', Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-0.5">Default 1.5× hourly rate.</p>
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Poya / Holiday OT Multiplier</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="1"
                                        max="4"
                                        value={formData.payrollSettings.holidayOtMultiplier}
                                        onChange={(e) => handleNestedChange('payrollSettings', 'holidayOtMultiplier', Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-0.5">Default 2.0× hourly rate.</p>
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Late Grace Tolerance (min)</label>
                                    <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        max="60"
                                        value={formData.payrollSettings.lateGraceMinutes}
                                        onChange={(e) => handleNestedChange('payrollSettings', 'lateGraceMinutes', Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-0.5">Tolerance before marked 'Late'.</p>
                                </div>
                            </div>
                        </div>

                        {/* E-Signatures Upload Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <PenTool size={18} className="text-indigo-600" />
                                Official E-Signatures for Payslips & Master Pay Sheets
                            </h2>
                            <p className="text-xs text-gray-500">
                                Upload authentic transparent PNG signatures. These will automatically appear on Payslips and Master Payroll Vouchers when Digital Signatures are toggled ON.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* HR Executive Signature */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center space-y-2">
                                    <span className="text-xs font-bold text-gray-700 block uppercase">HR Executive (Prepared By) Signature</span>
                                    <div className="h-20 bg-white border border-dashed border-gray-300 rounded-lg flex items-center justify-center p-2">
                                        {formData.hrSignatureUrl ? (
                                            <img src={formData.hrSignatureUrl} alt="HR Sign" className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">Using official calligraphic system signature</span>
                                        )}
                                    </div>
                                    <div className="flex justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => hrSignInputRef.current?.click()}
                                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                                        >
                                            <Upload size={13} /> Upload PNG
                                        </button>
                                        {formData.hrSignatureUrl && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData(p => ({ ...p, hrSignatureUrl: '' }));
                                                    localStorage.removeItem('asip_hr_sign');
                                                }}
                                                className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                    <input ref={hrSignInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload('hrSignatureUrl')} />
                                </div>

                                {/* Manager Signature */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center space-y-2">
                                    <span className="text-xs font-bold text-gray-700 block uppercase">Managing Director (Authorized Signatory) Signature</span>
                                    <div className="h-20 bg-white border border-dashed border-gray-300 rounded-lg flex items-center justify-center p-2">
                                        {formData.managerSignatureUrl ? (
                                            <img src={formData.managerSignatureUrl} alt="Manager Sign" className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">Using official calligraphic system signature</span>
                                        )}
                                    </div>
                                    <div className="flex justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => mgtSignInputRef.current?.click()}
                                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                                        >
                                            <Upload size={13} /> Upload PNG
                                        </button>
                                        {formData.managerSignatureUrl && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData(p => ({ ...p, managerSignatureUrl: '' }));
                                                    localStorage.removeItem('asip_mgt_sign');
                                                }}
                                                className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                    <input ref={mgtSignInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload('managerSignatureUrl')} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* TAB 3: POS, RECEIPTS & CUSTOMER LOYALTY                                   */}
                {/* ========================================================================= */}
                {activeTab === 'pos' && (
                    <div className="space-y-6">
                        {/* Thermal Receipt & Printing Options */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Printer size={18} className="text-indigo-600" />
                                POS Thermal Receipt & Printer Settings
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Receipt Paper Format</label>
                                    <select
                                        value={formData.posSettings.receiptPaperSize}
                                        onChange={(e) => handleNestedChange('posSettings', 'receiptPaperSize', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium bg-white"
                                    >
                                        <option value="80mm">Thermal 80mm (Standard POS Roll)</option>
                                        <option value="58mm">Thermal 58mm (Compact Mobile POS)</option>
                                        <option value="a4">Standard A4 Full Page Invoice</option>
                                    </select>
                                    <p className="text-[10px] text-gray-400 mt-1">Determines CSS width and layout of printable bills.</p>
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Receipt Header Welcome Line</label>
                                    <input
                                        type="text"
                                        value={formData.posSettings.receiptHeaderMessage}
                                        onChange={(e) => handleNestedChange('posSettings', 'receiptHeaderMessage', e.target.value)}
                                        placeholder="WELCOME TO ASIPBOOK"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Centered below logo on thermal slip.</p>
                                </div>

                                <div className="space-y-2.5 md:col-span-2 pt-2 border-t border-gray-100">
                                    <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-800">
                                        <input
                                            type="checkbox"
                                            checked={formData.posSettings.autoPrintReceipt}
                                            onChange={(e) => handleNestedChange('posSettings', 'autoPrintReceipt', e.target.checked)}
                                            className="w-4 h-4 text-indigo-600 rounded"
                                        />
                                        <span>Auto-trigger print dialog immediately upon checkout / cash payment</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-800">
                                        <input
                                            type="checkbox"
                                            checked={formData.posSettings.showCashierName}
                                            onChange={(e) => handleNestedChange('posSettings', 'showCashierName', e.target.checked)}
                                            className="w-4 h-4 text-indigo-600 rounded"
                                        />
                                        <span>Show Cashier Name and Shift ID on thermal slip</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-800">
                                        <input
                                            type="checkbox"
                                            checked={formData.posSettings.showCustomerLoyalty}
                                            onChange={(e) => handleNestedChange('posSettings', 'showCustomerLoyalty', e.target.checked)}
                                            className="w-4 h-4 text-indigo-600 rounded"
                                        />
                                        <span>Print Customer Loyalty Points Earned & Available Balance</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-800">
                                        <input
                                            type="checkbox"
                                            checked={formData.posSettings.showTaxBreakdown}
                                            onChange={(e) => handleNestedChange('posSettings', 'showTaxBreakdown', e.target.checked)}
                                            className="w-4 h-4 text-indigo-600 rounded"
                                        />
                                        <span>Print detailed VAT / Tax breakdown table on receipt</span>
                                    </label>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block font-semibold text-gray-700 mb-1">Receipt Footer Message</label>
                                    <textarea
                                        name="receiptFooterMessage"
                                        rows={3}
                                        value={formData.receiptFooterMessage}
                                        onChange={handleChange}
                                        placeholder="THANK YOU FOR YOUR BUSINESS!&#10;PLEASE VISIT AGAIN."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-0.5">Printed at the bottom of customer receipts.</p>
                                </div>
                            </div>
                        </div>

                        {/* Customer Loyalty Points Program */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <Coins size={18} className="text-amber-500" />
                                    Customer Loyalty Points Program
                                </h2>
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={formData.loyaltySettings.enabled}
                                        onChange={(e) => handleNestedChange('loyaltySettings', 'enabled', e.target.checked)}
                                        className="w-4 h-4 text-amber-500 rounded"
                                    />
                                    <span>Enable Loyalty Program</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                                    <label className="block font-bold text-gray-700 mb-1">Points Earned per LKR 100 Spent</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        disabled={!formData.loyaltySettings.enabled}
                                        value={formData.loyaltySettings.pointsPer100Spent}
                                        onChange={(e) => handleNestedChange('loyaltySettings', 'pointsPer100Spent', Number(e.target.value))}
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg font-mono font-bold text-sm bg-white disabled:bg-gray-100"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">e.g. 1 point for every LKR 100 bill.</p>
                                </div>

                                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                                    <label className="block font-bold text-gray-700 mb-1">Redemption Value per Point (LKR)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        disabled={!formData.loyaltySettings.enabled}
                                        value={formData.loyaltySettings.redemptionRatePerPoint}
                                        onChange={(e) => handleNestedChange('loyaltySettings', 'redemptionRatePerPoint', Number(e.target.value))}
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg font-mono font-bold text-sm bg-white disabled:bg-gray-100"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">e.g. 1 point = LKR 1.00 discount.</p>
                                </div>

                                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                                    <label className="block font-bold text-gray-700 mb-1">Minimum Points to Redeem</label>
                                    <input
                                        type="number"
                                        min="1"
                                        disabled={!formData.loyaltySettings.enabled}
                                        value={formData.loyaltySettings.minPointsToRedeem}
                                        onChange={(e) => handleNestedChange('loyaltySettings', 'minPointsToRedeem', Number(e.target.value))}
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg font-mono font-bold text-sm bg-white disabled:bg-gray-100"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Threshold before points can be spent.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* TAB 4: INVENTORY, WAREHOUSE & SYSTEM ADMIN                                */}
                {/* ========================================================================= */}
                {activeTab === 'inventory' && (
                    <div className="space-y-6">
                        {/* Inventory & Warehouse Rules */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Store size={18} className="text-indigo-600" />
                                Inventory, Stock Thresholds & Warehousing Rules
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Low Stock Alert Threshold (Units)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.inventorySettings.lowStockThreshold}
                                        onChange={(e) => handleNestedChange('inventorySettings', 'lowStockThreshold', Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono font-bold text-sm"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Triggers low stock badge and restock notification when inventory drops below this quantity.</p>
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Default Warehouse for New Orders</label>
                                    <select
                                        value={formData.inventorySettings.defaultWarehouseId}
                                        onChange={(e) => handleNestedChange('inventorySettings', 'defaultWarehouseId', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium bg-white"
                                    >
                                        <option value="">Select Primary Warehouse...</option>
                                        {warehouses.map((w) => (
                                            <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-gray-400 mt-1">Auto-selected on POS checkout, Purchase Orders, and GRN receipts.</p>
                                </div>

                                <div className="md:col-span-2 pt-2 border-t border-gray-100">
                                    <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-800">
                                        <input
                                            type="checkbox"
                                            checked={formData.inventorySettings.preventNegativeStock}
                                            onChange={(e) => handleNestedChange('inventorySettings', 'preventNegativeStock', e.target.checked)}
                                            className="w-4 h-4 text-indigo-600 rounded"
                                        />
                                        <span>Block Negative Stock Sales (Prevent sales orders and POS transactions when stock is zero)</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* System Security & Localization */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <ShieldCheck size={18} className="text-indigo-600" />
                                System Security & Currency Localization
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Default Operating Currency</label>
                                    <input
                                        type="text"
                                        value={formData.systemSettings.currencySymbol}
                                        onChange={(e) => handleNestedChange('systemSettings', 'currencySymbol', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono font-bold"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Primary currency symbol across all ledgers.</p>
                                </div>

                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">User Inactivity Session Timeout (Minutes)</label>
                                    <input
                                        type="number"
                                        min="15"
                                        max="720"
                                        value={formData.systemSettings.sessionTimeoutMinutes}
                                        onChange={(e) => handleNestedChange('systemSettings', 'sessionTimeoutMinutes', Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono font-bold"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Automatically logs out inactive users for security.</p>
                                </div>
                            </div>
                        </div>

                        {/* Enterprise 1-Click Database Backup */}
                        <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-2xl p-6 text-white space-y-3 shadow-md">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-base font-bold flex items-center gap-2">
                                        <Database size={18} className="text-amber-400" />
                                        1-Click Enterprise Database Backup & Snapshot
                                    </h3>
                                    <p className="text-xs text-indigo-200 max-w-xl mt-1">
                                        Download a secure JSON archive containing all Products, Stock, Employees, Departments, Warehouses, Customers, and System Settings for offline disaster recovery.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDownloadBackup}
                                    disabled={isDownloadingBackup}
                                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shrink-0 shadow"
                                >
                                    {isDownloadingBackup ? (
                                        <RefreshCw size={14} className="animate-spin" />
                                    ) : (
                                        <Download size={14} />
                                    )}
                                    <span>Download Database Backup</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bottom Global Save Bar */}
                <div className="pt-4 border-t border-gray-200 flex justify-end">
                    <Button
                        type="submit"
                        variant="primary"
                        loading={updateSettings.isPending}
                        className="shadow-sm px-6"
                    >
                        <Save size={16} className="mr-1.5" /> Save All Settings
                    </Button>
                </div>
            </form>
        </div>
    );
}
