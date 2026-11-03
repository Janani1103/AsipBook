import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
    User, Building2, Phone, Mail, MapPin, ChevronDown, 
    ChevronUp, DollarSign, FileText, CheckCircle2,
    Briefcase
} from 'lucide-react';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { customerFormSchema } from './customerSchemas';
import { useCustomerGroups, useCreateCustomer, useUpdateCustomer } from './useCustomers';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../users/usersApi';

const emptyAddress = {
    label: 'Primary', line1: '', line2: '', city: '', state: '',
    country: 'Sri Lanka', postalCode: '', phone: '',
    deliveryInstructions: '', isDefault: true,
};

export default function CustomerFormModal({ isOpen, onClose, customer = null }) {
    const isEdit = !!customer;
    const [showAdvanced, setShowAdvanced] = useState(false);

    const { data: groupsData } = useCustomerGroups({ isActive: 'true' });
    const { data: usersData } = useQuery({
        queryKey: ['users', 'sales_reps'],
        queryFn: () => usersApi.list({ role: 'sales_rep', isActive: true }),
        staleTime: 5 * 60 * 1000,
    });

    const createMutation = useCreateCustomer();
    const updateMutation = useUpdateCustomer();

    const {
        register, handleSubmit, reset, watch, setValue,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(customerFormSchema),
        defaultValues: {
            customerType: 'individual',
            businessType: 'retailer',
            status: 'active',
            paymentTermsType: 'cod',
            creditDays: 0,
            creditLimit: 0,
            defaultDiscountPercent: 0,
            displayName: '',
            companyName: '',
            primaryContact: {
                name: '',
                phone: '',
                email: '',
            },
            billingAddress: { ...emptyAddress },
            shippingAddresses: [{ ...emptyAddress }],
            contacts: [],
            notes: '',
        },
    });

    const customerType = watch('customerType');
    const paymentType = watch('paymentTermsType');

    useEffect(() => {
        if (isOpen && customer) {
            reset({
                customerType: customer.customerType || 'individual',
                businessType: customer.businessType || 'retailer',
                companyName: customer.companyName || '',
                displayName: customer.displayName || '',
                firstName: customer.firstName || '',
                lastName: customer.lastName || '',
                customerGroupId: customer.customerGroupId?._id || customer.customerGroupId || '',
                taxRegistrationNumber: customer.taxRegistrationNumber || '',
                businessRegistrationNumber: customer.businessRegistrationNumber || '',
                industry: customer.industry || '',
                primaryContact: {
                    name: customer.primaryContact?.name || customer.displayName || '',
                    phone: customer.primaryContact?.phone || '',
                    email: customer.primaryContact?.email || '',
                },
                billingAddress: customer.billingAddress || { ...emptyAddress },
                shippingAddresses: customer.shippingAddresses?.length ? customer.shippingAddresses : [{ ...emptyAddress }],
                contacts: customer.contacts || [],
                assignedSalesRep: customer.assignedSalesRep?._id || customer.assignedSalesRep || '',
                paymentTermsType: customer.paymentTerms?.type || 'cod',
                creditDays: customer.paymentTerms?.creditDays || 0,
                creditLimit: customer.paymentTerms?.creditLimit || 0,
                defaultDiscountPercent: customer.defaultDiscountPercent || 0,
                status: customer.status || 'active',
                notes: customer.notes || '',
            });
            if (customer.paymentTerms?.type === 'credit' || customer.taxRegistrationNumber || customer.businessRegistrationNumber) {
                setShowAdvanced(true);
            } else {
                setShowAdvanced(false);
            }
        } else if (isOpen && !customer) {
            reset({
                customerType: 'individual',
                businessType: 'retailer',
                status: 'active',
                paymentTermsType: 'cod',
                creditDays: 0,
                creditLimit: 0,
                defaultDiscountPercent: 0,
                displayName: '',
                companyName: '',
                primaryContact: {
                    name: '',
                    phone: '',
                    email: '',
                },
                billingAddress: { ...emptyAddress },
                shippingAddresses: [{ ...emptyAddress }],
                contacts: [],
                notes: '',
            });
            setShowAdvanced(false);
        }
    }, [isOpen, customer, reset]);

    const onSubmit = async (data) => {
        const payload = {
            customerType: data.customerType,
            businessType: data.businessType || 'retailer',
            companyName: data.companyName || (data.customerType === 'company' ? data.displayName : undefined),
            displayName: data.displayName.trim(),
            firstName: data.firstName || undefined,
            lastName: data.lastName || undefined,
            customerGroupId: data.customerGroupId || undefined,
            taxRegistrationNumber: data.taxRegistrationNumber || undefined,
            businessRegistrationNumber: data.businessRegistrationNumber || undefined,
            industry: data.industry || undefined,
            primaryContact: {
                name: data.primaryContact?.name || data.displayName.trim(),
                phone: data.primaryContact?.phone || undefined,
                email: data.primaryContact?.email || undefined,
            },
            billingAddress: data.billingAddress?.line1 || data.billingAddress?.city ? data.billingAddress : undefined,
            shippingAddresses: data.shippingAddresses?.filter((a) => a.line1 || a.city),
            contacts: data.contacts?.filter((c) => c.name),
            assignedSalesRep: data.assignedSalesRep || undefined,
            paymentTerms: {
                type: data.paymentTermsType || 'cod',
                creditDays: data.paymentTermsType === 'credit' ? (data.creditDays || 0) : 0,
                creditLimit: data.paymentTermsType === 'credit' ? (data.creditLimit || 0) : 0,
            },
            defaultDiscountPercent: data.defaultDiscountPercent || 0,
            status: data.status || 'active',
            notes: data.notes || undefined,
        };

        try {
            if (isEdit) {
                await updateMutation.mutateAsync({ id: customer._id, data: payload });
            } else {
                await createMutation.mutateAsync(payload);
            }
            onClose();
        } catch { }
    };

    const groupOptions = (groupsData?.data || []).map((g) => ({
        value: g._id,
        label: `${g.name} (${g.code})`,
    }));

    const salesRepOptions = (usersData?.data || []).map((u) => ({
        value: u._id,
        label: `${u.firstName} ${u.lastName || ''}`.trim(),
    }));

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Edit Customer' : 'Add New Customer'}
            size="lg"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
                {/* Form Body with proper padding */}
                <div className="p-6 space-y-5 flex-1">
                    {/* Customer Type Segmented Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
                        <div>
                            <span className="text-sm font-semibold text-gray-900">Customer Category</span>
                            <p className="text-xs text-gray-500">Select whether this customer is an individual or business</p>
                        </div>
                        <div className="inline-flex bg-gray-100 p-1 rounded-lg self-start sm:self-auto border border-gray-200/60">
                            <button
                                type="button"
                                onClick={() => setValue('customerType', 'individual')}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                                    customerType === 'individual'
                                        ? 'bg-white text-gray-900 shadow-xs font-semibold'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <User size={14} className={customerType === 'individual' ? 'text-primary-600' : 'text-gray-400'} />
                                <span>Individual / Retail</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setValue('customerType', 'company')}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                                    customerType === 'company'
                                        ? 'bg-white text-gray-900 shadow-xs font-semibold'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <Building2 size={14} className={customerType === 'company' ? 'text-primary-600' : 'text-gray-400'} />
                                <span>Company / B2B</span>
                            </button>
                        </div>
                    </div>

                    {/* Primary Customer Name */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            {customerType === 'company' ? 'Company Name *' : 'Customer Name *'}
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                {customerType === 'company' ? <Building2 size={16} /> : <User size={16} />}
                            </span>
                            <input
                                type="text"
                                placeholder={customerType === 'company' ? 'e.g. Asip Traders (Pvt) Ltd' : 'e.g. Kamal Perera'}
                                {...register('displayName')}
                                onChange={(e) => {
                                    setValue('displayName', e.target.value);
                                    if (!watch('primaryContact.name')) {
                                        setValue('primaryContact.name', e.target.value);
                                    }
                                    if (customerType === 'company') {
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

                    {/* Contact Info (Phone & Email) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                Phone / Mobile
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                    <Phone size={15} />
                                </span>
                                <input
                                    type="tel"
                                    placeholder="077 123 4567"
                                    {...register('primaryContact.phone')}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                Email Address <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                    <Mail size={15} />
                                </span>
                                <input
                                    type="email"
                                    placeholder="customer@email.com"
                                    {...register('primaryContact.email')}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                />
                            </div>
                            {errors.primaryContact?.email && (
                                <p className="text-xs text-rose-500 mt-1">{errors.primaryContact.email.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Customer Group & City */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                Customer Group
                            </label>
                            <select
                                {...register('customerGroupId')}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                            >
                                <option value="">Standard / General Customer</option>
                                {groupOptions.map(g => (
                                    <option key={g.value} value={g.value}>{g.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                City / Area <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                    <MapPin size={15} />
                                </span>
                                <input
                                    type="text"
                                    placeholder="e.g. Colombo, Kandy"
                                    {...register('billingAddress.city')}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Collapsible Advanced B2B Section */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full py-2.5 px-4 flex items-center justify-between text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition"
                        >
                            <span className="flex items-center gap-2 font-semibold text-primary-700">
                                <Briefcase size={15} />
                                <span>Advanced Business & Credit Details</span>
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
                                {/* Payment & Credit */}
                                <div>
                                    <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5 mb-2">
                                        <DollarSign size={14} className="text-indigo-600" /> Credit & Payment Terms
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[11px] text-gray-600 mb-1">Payment Mode</label>
                                            <select
                                                {...register('paymentTermsType')}
                                                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-primary-500"
                                            >
                                                <option value="cod">Cash on Delivery (COD)</option>
                                                <option value="credit">Credit Account</option>
                                                <option value="advance">Advance Payment</option>
                                            </select>
                                        </div>

                                        {paymentType === 'credit' && (
                                            <>
                                                <div>
                                                    <label className="block text-[11px] text-gray-600 mb-1">Credit Limit (Rs.)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="1000"
                                                        placeholder="50,000"
                                                        {...register('creditLimit')}
                                                        className="w-full px-2.5 py-1.5 text-xs font-semibold border border-gray-300 rounded-md bg-white"
                                                    />
                                                </div>
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
                                            </>
                                        )}

                                        <div>
                                            <label className="block text-[11px] text-gray-600 mb-1">Default Discount (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.5"
                                                placeholder="0%"
                                                {...register('defaultDiscountPercent')}
                                                className="w-full px-2.5 py-1.5 text-xs font-semibold border border-gray-300 rounded-md bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Tax & Business Reg */}
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

                                {/* Street Address & Sales Rep */}
                                <div className="pt-3 border-t border-gray-200">
                                    <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5 mb-2">
                                        <MapPin size={14} className="text-gray-500" /> Registered Street Address
                                    </span>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            placeholder="No. 45, Main Street"
                                            {...register('billingAddress.line1')}
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md bg-white"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="text"
                                                placeholder="Postal Code"
                                                {...register('billingAddress.postalCode')}
                                                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md bg-white"
                                            />
                                            <select
                                                {...register('assignedSalesRep')}
                                                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md bg-white"
                                            >
                                                <option value="">-- Assigned Sales Rep --</option>
                                                {salesRepOptions.map(r => (
                                                    <option key={r.value} value={r.value}>{r.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Status & Notes */}
                                <div className="pt-3 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] text-gray-600 mb-1">Customer Status</label>
                                        <select
                                            {...register('status')}
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md bg-white font-medium"
                                        >
                                            <option value="active">Active</option>
                                            <option value="prospect">Prospect</option>
                                            <option value="on_hold">On Hold</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-600 mb-1">Notes / Remarks</label>
                                        <input
                                            type="text"
                                            placeholder="Special instructions or notes"
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
                        {isEdit ? 'Update Customer' : 'Save Customer'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
