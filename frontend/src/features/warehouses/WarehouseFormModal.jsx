import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Building2, Sliders, CheckCircle2, ShieldAlert } from 'lucide-react';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { warehouseFormSchema } from './warehouseSchemas';
import { useCreateWarehouse, useUpdateWarehouse } from './useWarehouses';
import { usersApi } from '../users/usersApi';

const defaultValues = {
    type: 'branch',
    address: { country: 'Sri Lanka' },
    capabilities: { canShipDirectly: true, canReceiveGoods: true },
    zones: [{ code: 'STG', name: 'Storage', type: 'storage', isActive: true }],
    pickingStrategy: 'FIFO',
    allowNegativeStock: false,
    isActive: true,
    isDefault: false,
    assignedRep: '',
};

export default function WarehouseFormModal({ isOpen, onClose, warehouse = null }) {
    const isEdit = !!warehouse;
    const [activeTab, setActiveTab] = useState('general');
    const createMutation = useCreateWarehouse();
    const updateMutation = useUpdateWarehouse();

    const { data: usersData } = useQuery({
        queryKey: ['users', 'managers'],
        queryFn: () => usersApi.list({ isActive: true, limit: 100 }),
        staleTime: 5 * 60 * 1000,
    });

    const { register, handleSubmit, reset, control, formState: { errors } } = useForm({
        resolver: zodResolver(warehouseFormSchema),
        defaultValues,
    });

    const { fields: zoneFields, append, remove } = useFieldArray({ control, name: 'zones' });

    useEffect(() => {
        if (isOpen && warehouse) {
            setActiveTab('general');
            reset({
                warehouseCode: warehouse.warehouseCode,
                name: warehouse.name,
                type: warehouse.type,
                address: warehouse.address || { country: 'Sri Lanka' },
                phone: warehouse.phone || '',
                email: warehouse.email || '',
                warehouseManager: warehouse.warehouseManager?._id || warehouse.warehouseManager || '',
                assignedRep: warehouse.assignedRep?._id || warehouse.assignedRep || '',
                capabilities: warehouse.capabilities || {},
                zones: warehouse.zones?.length ? warehouse.zones : defaultValues.zones,
                pickingStrategy: warehouse.settings?.pickingStrategy || 'FIFO',
                allowNegativeStock: warehouse.settings?.allowNegativeStock || false,
                isActive: warehouse.isActive,
                isDefault: warehouse.isDefault,
            });
        } else if (isOpen) {
            setActiveTab('general');
            reset(defaultValues);
        }
    }, [isOpen, warehouse, reset]);

    const onSubmit = async (data) => {
        const payload = {
            warehouseCode: data.warehouseCode.toUpperCase(),
            name: data.name,
            type: data.type,
            address: data.address,
            phone: data.phone || undefined,
            email: data.email || undefined,
            warehouseManager: data.warehouseManager || undefined,
            assignedRep: data.assignedRep || undefined,
            capabilities: data.capabilities,
            zones: data.zones?.filter((z) => z.name),
            settings: {
                pickingStrategy: data.pickingStrategy,
                allowNegativeStock: data.allowNegativeStock,
            },
            isActive: data.isActive,
            isDefault: data.isDefault,
        };

        try {
            if (isEdit) await updateMutation.mutateAsync({ id: warehouse._id, data: payload });
            else await createMutation.mutateAsync(payload);
            onClose();
        } catch { }
    };

    const onError = (formErrors) => {
        if (formErrors.warehouseCode || formErrors.name || formErrors.type || formErrors.email) {
            setActiveTab('general');
        } else if (formErrors.zones) {
            setActiveTab('logistics');
        }
    };

    const managerOptions = (usersData?.data || [])
        .filter((u) => ['admin', 'manager', 'warehouse_staff'].includes(u.role))
        .map((u) => ({ value: u._id, label: `${u.firstName} ${u.lastName} (${u.role})` }));

    const repOptions = (usersData?.data || [])
        .filter((u) => ['sales_rep', 'manager'].includes(u.role))
        .map((u) => ({ value: u._id, label: `${u.firstName} ${u.lastName} (${u.role})` }));

    const isLoading = createMutation.isPending || updateMutation.isPending;

    const hasGeneralErrors = !!(errors.warehouseCode || errors.name || errors.type || errors.email || errors.phone);
    const hasLogisticsErrors = !!(errors.zones);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? `Edit Warehouse — ${warehouse?.warehouseCode}` : 'New Warehouse'}
            size="lg"
        >
            <form onSubmit={handleSubmit(onSubmit, onError)} className="flex flex-col flex-1 min-h-0">
                {/* Tabs Header */}
                <div className="flex border-b border-gray-200 px-6 bg-gray-50/70 pt-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('general')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer ${
                            activeTab === 'general'
                                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-xs'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/60 rounded-t-lg'
                        }`}
                    >
                        <Building2 size={16} />
                        <span>Basic Details & Location</span>
                        {hasGeneralErrors && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Errors in this tab" />
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('logistics')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer ${
                            activeTab === 'logistics'
                                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-xs'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/60 rounded-t-lg'
                        }`}
                    >
                        <Sliders size={16} />
                        <span>Logistics, Zones & Rules</span>
                        {hasLogisticsErrors && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Errors in this tab" />
                        )}
                    </button>
                </div>

                {/* Tab Content Body */}
                <div className="p-6 space-y-4 overflow-y-auto max-h-[62vh]">
                    {/* TAB 1: GENERAL & LOCATION */}
                    {activeTab === 'general' && (
                        <div className="space-y-4">
                            {/* Primary Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Input
                                    label="Warehouse Code"
                                    placeholder="e.g. MAIN, WH-01"
                                    required
                                    error={errors.warehouseCode?.message}
                                    {...register('warehouseCode')}
                                />
                                <Input
                                    label="Warehouse / Branch Name"
                                    placeholder="e.g. Colombo Central Store"
                                    required
                                    error={errors.name?.message}
                                    {...register('name')}
                                />
                                <Select
                                    label="Warehouse Type"
                                    required
                                    options={[
                                        { value: 'main', label: 'Main Warehouse' },
                                        { value: 'branch', label: 'Branch / Outlet' },
                                        { value: 'van', label: 'Van / Mobile Stock' },
                                        { value: 'transit', label: 'In Transit' },
                                        { value: 'virtual', label: 'Virtual Store' },
                                        { value: 'quarantine', label: 'Quarantine' },
                                        { value: 'scrap', label: 'Scrap / Damage' },
                                    ]}
                                    {...register('type')}
                                />
                            </div>

                            {/* Contact & Location */}
                            <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5 space-y-3">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                                    <span>Location & Contact</span>
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="md:col-span-2">
                                        <Input
                                            label="Address"
                                            placeholder="Street address / Location"
                                            {...register('address.line1')}
                                        />
                                    </div>
                                    <Input
                                        label="City"
                                        placeholder="e.g. Kandy, Colombo"
                                        {...register('address.city')}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Input
                                        label="Phone Number"
                                        placeholder="e.g. 011-2345678"
                                        {...register('phone')}
                                    />
                                    <Input
                                        label="Email"
                                        type="email"
                                        placeholder="store@example.com"
                                        error={errors.email?.message}
                                        {...register('email')}
                                    />
                                </div>
                            </div>

                            {/* Staff Assignment */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Select
                                    label="Warehouse Manager (Optional)"
                                    placeholder="-- Unassigned --"
                                    options={managerOptions}
                                    {...register('warehouseManager')}
                                />
                                <Select
                                    label="Assigned Sales Rep (Optional)"
                                    placeholder="-- None --"
                                    options={repOptions}
                                    {...register('assignedRep')}
                                />
                            </div>

                            {/* Status Flags */}
                            <div className="pt-2 flex flex-wrap gap-4 border-t border-gray-200">
                                <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                        {...register('isActive')}
                                    />
                                    <span className="font-medium">Active Warehouse</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                        {...register('isDefault')}
                                    />
                                    <span className="font-medium">Default Warehouse (Primary for sales/billing)</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: LOGISTICS, ZONES & RULES */}
                    {activeTab === 'logistics' && (
                        <div className="space-y-4">
                            {/* Capabilities */}
                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
                                    Warehouse Capabilities
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    <label className="flex items-center gap-2.5 p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50/70 cursor-pointer transition text-sm">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                            {...register('capabilities.canShipDirectly')}
                                        />
                                        <span>Can ship directly to customers</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50/70 cursor-pointer transition text-sm">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                            {...register('capabilities.canReceiveGoods')}
                                        />
                                        <span>Can receive goods from suppliers</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50/70 cursor-pointer transition text-sm">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                            {...register('capabilities.temperatureControlled')}
                                        />
                                        <span>Temperature controlled room</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50/70 cursor-pointer transition text-sm">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                            {...register('capabilities.hasRefrigeration')}
                                        />
                                        <span>Has refrigeration / deep freezer</span>
                                    </label>
                                </div>
                            </div>

                            {/* Inventory & Picking Rules */}
                            <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5 space-y-3">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                                    Inventory Picking & Dispatch Strategy
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                                    <Select
                                        label="Picking Strategy"
                                        options={[
                                            { value: 'FIFO', label: 'FIFO (First In, First Out)' },
                                            { value: 'FEFO', label: 'FEFO (First Expiry, First Out - Recommended for FMCG)' },
                                            { value: 'LIFO', label: 'LIFO (Last In, First Out)' },
                                        ]}
                                        {...register('pickingStrategy')}
                                    />
                                    <div className="pt-5">
                                        <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                                {...register('allowNegativeStock')}
                                            />
                                            <span className="font-medium text-amber-900">Allow negative stock balance</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Address Info */}
                            <div className="grid grid-cols-2 gap-3">
                                <Input label="Postal Code" placeholder="Optional" {...register('address.postalCode')} />
                                <Input label="Country" defaultValue="Sri Lanka" {...register('address.country')} />
                            </div>

                            {/* Storage Zones */}
                            <div className="border border-gray-200 rounded-xl p-3.5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-800">Storage Zones (Bins / Racks)</h4>
                                        <p className="text-xs text-gray-500">Configure dedicated storage areas inside this warehouse</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => append({ code: '', name: '', type: 'storage', isActive: true })}
                                    >
                                        <Plus size={14} className="mr-1" /> Add Zone
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {zoneFields.map((field, idx) => (
                                        <div key={field.id} className="flex gap-2 items-start border border-gray-200/90 rounded-lg p-2 bg-white shadow-2xs">
                                            <div className="w-24">
                                                <Input placeholder="Code" {...register(`zones.${idx}.code`)} />
                                            </div>
                                            <div className="flex-1">
                                                <Input
                                                    placeholder="Zone name (e.g. Main Rack, Cold Box)"
                                                    error={errors.zones?.[idx]?.name?.message}
                                                    {...register(`zones.${idx}.name`)}
                                                />
                                            </div>
                                            <div className="w-36">
                                                <Select
                                                    options={[
                                                        { value: 'receiving', label: 'Receiving' },
                                                        { value: 'storage', label: 'Storage' },
                                                        { value: 'picking', label: 'Picking' },
                                                        { value: 'packing', label: 'Packing' },
                                                        { value: 'dispatch', label: 'Dispatch' },
                                                        { value: 'returns', label: 'Returns' },
                                                        { value: 'quarantine', label: 'Quarantine' },
                                                    ]}
                                                    {...register(`zones.${idx}.type`)}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => remove(idx)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded mt-0.5 transition cursor-pointer"
                                                title="Delete zone"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    ))}
                                    {zoneFields.length === 0 && (
                                        <p className="text-xs text-gray-400 italic py-1">No zones defined. Single default storage zone will be used.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-200 bg-gray-50/90">
                    <div className="text-xs text-gray-500">
                        {activeTab === 'general' ? (
                            <span>Tip: Advanced rules & zones are in the next tab</span>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setActiveTab('general')}
                                className="text-indigo-600 hover:underline font-medium cursor-pointer"
                            >
                                ← Back to Basic Details
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" loading={isLoading}>
                            {isEdit ? 'Update Warehouse' : 'Create Warehouse'}
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
