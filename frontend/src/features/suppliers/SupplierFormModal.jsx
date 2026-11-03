import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
    Truck, Building2, User, Phone, Mail, MapPin, 
    ChevronDown, ChevronUp, Landmark, FileText, 
    Clock, CheckCircle2, DollarSign
} from 'lucide-react';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { supplierFormSchema } from './supplierSchemas';
import { useCreateSupplier, useUpdateSupplier } from './useSuppliers';

const categoryOptions = [
    { value: 'finished_goods', label: 'Finished Goods (Resale)' },
    { value: 'raw_material', label: 'Raw Material' },
    { value: 'packaging', label: 'Packaging' },
    { value: 'equipment', label: 'Equipment & Machinery' },
    { value: 'services', label: 'Services' },
    { value: 'multiple', label: 'Multiple / General' },
];

export default function SupplierFormModal({ isOpen, onClose, supplier = null }) {
    const isEdit = !!supplier;
    const [showAdvanced, setShowAdvanced] = useState(false);

    const createMutation = useCreateSupplier();
    const updateMutation = useUpdateSupplier();

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
        resolver: zodResolver(supplierFormSchema),
        defaultValues: {
            type: 'company',
            companyName: '',
            displayName: '',
            category: 'finished_goods',
            paymentTermsType: 'cod',
            creditDays: 30,
            creditLimit: 0,
            status: 'active',
            averageLeadTimeDays: 7,
            primaryContact: {
                name: '',
                phone: '',
                email: '',
            },
            billingAddress: {
                line1: '',
                city: '',
                country: 'Sri Lanka',
            },
            bankName: '',
            branchName: '',
            accountNumber: '',
            accountName: '',
            swiftCode: '',
            taxRegistrationNumber: '',
            businessRegistrationNumber: '',
            notes: '',
        },
    });

    const supplierType = watch('type');
    const paymentType = watch('paymentTermsType');

    useEffect(() => {
        if (isOpen && supplier) {
            reset({
                type: supplier.type || 'company',
                companyName: supplier.companyName || '',
                displayName: supplier.displayName || '',
                firstName: supplier.firstName || '',
                lastName: supplier.lastName || '',
                category: supplier.category || 'finished_goods',
                taxRegistrationNumber: supplier.taxRegistrationNumber || '',
                businessRegistrationNumber: supplier.businessRegistrationNumber || '',
                primaryContact: {
                    name: supplier.primaryContact?.name || '',
                    phone: supplier.primaryContact?.phone || supplier.primaryContact?.mobile || '',
                    email: supplier.primaryContact?.email || '',
                },
                billingAddress: {
                    line1: supplier.billingAddress?.line1 || '',
                    city: supplier.billingAddress?.city || '',
                    country: supplier.billingAddress?.country || 'Sri Lanka',
                },
                paymentTermsType: supplier.paymentTerms?.type || 'cod',
                creditDays: supplier.paymentTerms?.creditDays || 30,
                creditLimit: supplier.paymentTerms?.creditLimit || 0,
                bankName: supplier.bankDetails?.bankName || '',
                branchName: supplier.bankDetails?.branchName || '',
                accountNumber: supplier.bankDetails?.accountNumber || '',
                accountName: supplier.bankDetails?.accountName || '',
                swiftCode: supplier.bankDetails?.swiftCode || '',
                averageLeadTimeDays: supplier.averageLeadTimeDays || 7,
                status: supplier.status || 'active',
                notes: supplier.notes || '',
            });
            // Auto expand if editing a supplier with banking or credit info
            if (supplier.bankDetails?.accountNumber || supplier.paymentTerms?.type === 'credit' || supplier.taxRegistrationNumber) {
                setShowAdvanced(true);
            } else {
                setShowAdvanced(false);
            }
        } else if (isOpen && !supplier) {
            reset({
                type: 'company',
                companyName: '',
                displayName: '',
                category: 'finished_goods',
                paymentTermsType: 'cod',
                creditDays: 30,
                creditLimit: 0,
                status: 'active',
                averageLeadTimeDays: 7,
                primaryContact: {
                    name: '',
                    phone: '',
                    email: '',
                },
                billingAddress: {
                    line1: '',
                    city: '',
                    country: 'Sri Lanka',
                },
                bankName: '',
                branchName: '',
                accountNumber: '',
                accountName: '',
                swiftCode: '',
                taxRegistrationNumber: '',
                businessRegistrationNumber: '',
                notes: '',
            });
            setShowAdvanced(false);
        }
    }, [isOpen, supplier, reset]);

    const onSubmit = async (data) => {
        const payload = {
            type: data.type,
            companyName: data.companyName || (data.type === 'company' ? data.displayName : undefined),
            displayName: data.displayName.trim(),
            firstName: data.firstName || undefined,
            lastName: data.lastName || undefined,
            category: data.category,
            taxRegistrationNumber: data.taxRegistrationNumber || undefined,
            businessRegistrationNumber: data.businessRegistrationNumber || undefined,
            primaryContact: {
                name: data.primaryContact?.name || undefined,
                phone: data.primaryContact?.phone || undefined,
                email: data.primaryContact?.email || undefined,
            },
            billingAddress: data.billingAddress?.line1 || data.billingAddress?.city ? data.billingAddress : undefined,
            paymentTerms: {
                type: data.paymentTermsType || 'cod',
                creditDays: data.paymentTermsType === 'credit' ? (data.creditDays || 0) : 0,
                creditLimit: data.paymentTermsType === 'credit' ? (data.creditLimit || 0) : 0,
            },
            bankDetails: (data.bankName || data.accountNumber) ? {
                bankName: data.bankName || undefined,
                branchName: data.branchName || undefined,
                accountNumber: data.accountNumber || undefined,
                accountName: data.accountName || undefined,
                swiftCode: data.swiftCode || undefined,
            } : undefined,
            averageLeadTimeDays: data.averageLeadTimeDays || undefined,
            status: data.status || 'active',
            notes: data.notes || undefined,
        };

        try {
            if (isEdit) {
                await updateMutation.mutateAsync({ id: supplier._id, data: payload });
            } else {
                await createMutation.mutateAsync(payload);
            }
            onClose();
        } catch { }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? `Edit Supplier — ${supplier?.supplierCode || ''}` : 'Add New Supplier'}
            size="lg"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
                {/* Form Body with standard padding */}
                <div className="p-6 space-y-5 flex-1">
                    {/* Supplier Category / Type Selector */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
                        <div>
                            <span className="text-sm font-semibold text-gray-900">Supplier Type</span>
                            <p className="text-xs text-gray-500">Corporate company vendor or individual supplier</p>
                        </div>
                        <div className="inline-flex bg-gray-100 p-1 rounded-lg self-start sm:self-auto border border-gray-200/60">
                            <button
                                type="button"
                                onClick={() => setValue('type', 'company')}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                                    supplierType === 'company'
                                        ? 'bg-white text-gray-900 shadow-xs font-semibold'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <Building2 size={14} className={supplierType === 'company' ? 'text-primary-600' : 'text-gray-400'} />
                                <span>Company / Vendor</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setValue('type', 'individual')}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                                    supplierType === 'individual'
                                        ? 'bg-white text-gray-900 shadow-xs font-semibold'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <User size={14} className={supplierType === 'individual' ? 'text-primary-600' : 'text-gray-400'} />
                                <span>Individual</span>
                            </button>
                        </div>
                    </div>

                    {/* Primary Supplier Name */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Supplier / Company Name *
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                {supplierType === 'company' ? <Building2 size={16} /> : <User size={16} />}
                            </span>
                            <input
                                type="text"
                                placeholder={supplierType === 'company' ? 'e.g. Lanka Paper Mills (Pvt) Ltd' : 'e.g. Sunimal Dias'}
                                {...register('displayName')}
                                onChange={(e) => {
                                    setValue('displayName', e.target.value);
                                    if (supplierType === 'company') {
                                        setValue('companyName', e.target.value);
                                    }
                                }}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                                autoFocus
                            />
                        </div>
                        {errors.displayName && (
                            <p className="text-xs text-rose-500 mt-1">{errors.displayName.message}</p>
                        )}
                    </div>

                    {/* Phone & Contact Person */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                Phone / Mobile Number
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                    <Phone size={15} />
                                </span>
                                <input
                                    type="tel"
                                    placeholder="011 234 5678"
                                    {...register('primaryContact.phone')}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                Contact Person Name <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                    <User size={15} />
                                </span>
                                <input
                                    type="text"
                                    placeholder="e.g. Mr. Bandara (Sales Mgr)"
                                    {...register('primaryContact.name')}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Category & City */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                Supply Category *
                            </label>
                            <select
                                {...register('category')}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition font-medium"
                            >
                                {categoryOptions.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                City / Address <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                    <MapPin size={15} />
                                </span>
                                <input
                                    type="text"
                                    placeholder="e.g. Colombo 10, Kaduwela"
                                    {...register('billingAddress.city')}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Supplier Email <span className="text-gray-400 font-normal">(For Purchase Orders - Optional)</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                <Mail size={15} />
                            </span>
                            <input
                                type="email"
                                placeholder="orders@supplier.com"
                                {...register('primaryContact.email')}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                            />
                        </div>
                        {errors.primaryContact?.email && (
                            <p className="text-xs text-rose-500 mt-1">{errors.primaryContact.email.message}</p>
                        )}
                    </div>

                    {/* Collapsible Advanced Section: Banking & Credit Terms */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full py-2.5 px-4 flex items-center justify-between text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition"
                        >
                            <span className="flex items-center gap-2 font-semibold text-primary-700">
                                <Landmark size={15} />
                                <span>Banking, Payment Terms & Tax Details</span>
                            </span>
                            {showAdvanced ? (
                                <span className="flex items-center gap-1 text-gray-400 text-xs">
                                    Hide <ChevronUp size={15} />
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-gray-400 text-xs">
                                    Show <ChevronDown size={15} />
                                </span>
                            )}
                        </button>

                        {showAdvanced && (
                            <div className="p-4 mt-3 bg-gray-50/80 rounded-lg border border-gray-200 space-y-4">
                                {/* Bank Account Information */}
                                <div>
                                    <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5 mb-2">
                                        <Landmark size={14} className="text-indigo-600" /> Supplier Bank Account (For Transfers / Cheques)
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] text-gray-600 mb-1">Bank Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Commercial Bank / Sampath"
                                                {...register('bankName')}
                                                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] text-gray-600 mb-1">Branch Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Colombo Fort / Nugegoda"
                                                {...register('branchName')}
                                                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] text-gray-600 mb-1">Account Number</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 10002849102"
                                                {...register('accountNumber')}
                                                className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-gray-300 rounded-md bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] text-gray-600 mb-1">Account Beneficiary Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Lanka Paper Mills Ltd"
                                                {...register('accountName')}
                                                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Terms */}
                                <div className="pt-3 border-t border-gray-200">
                                    <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5 mb-2">
                                        <DollarSign size={14} className="text-indigo-600" /> Purchasing & Credit Terms
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[11px] text-gray-600 mb-1">Terms</label>
                                            <select
                                                {...register('paymentTermsType')}
                                                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md bg-white font-medium"
                                            >
                                                <option value="cod">Cash on Delivery (COD)</option>
                                                <option value="credit">Credit Purchase</option>
                                                <option value="advance">Advance Payment</option>
                                                <option value="consignment">Consignment</option>
                                            </select>
                                        </div>

                                        {paymentType === 'credit' && (
                                            <>
                                                <div>
                                                    <label className="block text-[11px] text-gray-600 mb-1">Credit Days</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder="30"
                                                        {...register('creditDays')}
                                                        className="w-full px-2.5 py-1.5 text-xs font-semibold border border-gray-300 rounded-md bg-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] text-gray-600 mb-1">Credit Limit (Rs.)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="1000"
                                                        placeholder="0 = Unlimited"
                                                        {...register('creditLimit')}
                                                        className="w-full px-2.5 py-1.5 text-xs font-semibold border border-gray-300 rounded-md bg-white"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <div>
                                            <label className="block text-[11px] text-gray-600 mb-1">Lead Time (Days)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="7"
                                                {...register('averageLeadTimeDays')}
                                                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Tax & Business Registrations */}
                                <div className="pt-3 border-t border-gray-200">
                                    <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5 mb-2">
                                        <FileText size={14} className="text-gray-500" /> Business Registrations
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] text-gray-600 mb-1">VAT / Tax Number</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 104829102-7000"
                                                {...register('taxRegistrationNumber')}
                                                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] text-gray-600 mb-1">BR Number (Business Reg)</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. PV-84920"
                                                {...register('businessRegistrationNumber')}
                                                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Status & Notes */}
                                <div className="pt-3 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] text-gray-600 mb-1">Status</label>
                                        <select
                                            {...register('status')}
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md bg-white font-medium"
                                        >
                                            <option value="active">Active</option>
                                            <option value="on_hold">On Hold</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="blacklisted">Blacklisted</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-600 mb-1">Notes / Terms</label>
                                        <input
                                            type="text"
                                            placeholder="Special vendor terms or notes"
                                            {...register('notes')}
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer with solid border and background */}
                <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex justify-end gap-2.5 rounded-b-lg">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" loading={isPending} className="px-5">
                        <CheckCircle2 size={16} className="mr-1.5" />
                        {isEdit ? 'Update Supplier' : 'Save Supplier'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
