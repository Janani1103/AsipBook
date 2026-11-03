import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Eye, Plus, Edit, Trash2, Search, Truck, Phone, 
    Mail, MapPin, Building2, User, Landmark, 
    FileText, CheckCircle2, ShoppingBag, Clock
} from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import SupplierFormModal from '../features/suppliers/SupplierFormModal';
import { useSuppliers, useDeleteSupplier } from '../features/suppliers/useSuppliers';
import { useAuthStore } from '../store/authStore';

const statusVariant = {
    active: 'success',
    inactive: 'default',
    on_hold: 'warning',
    blacklisted: 'danger',
};

const categoryLabels = {
    raw_material: 'Raw Material',
    packaging: 'Packaging',
    services: 'Services',
    equipment: 'Equipment',
    finished_goods: 'Finished Goods',
    multiple: 'Multiple',
};

export default function SuppliersPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canManage = ['admin', 'manager', 'accountant'].includes(user?.role);
    const canDelete = ['admin', 'manager'].includes(user?.role);

    const [filters, setFilters] = useState({
        search: '', category: '', status: '',
        page: 1, limit: 15,
    });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [viewingSupplier, setViewingSupplier] = useState(null);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const { data, isLoading } = useSuppliers(filters);
    const deleteMutation = useDeleteSupplier();

    const suppliers = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    // Quick stats calculation
    const stats = useMemo(() => {
        const activeCount = suppliers.filter(s => s.status === 'active').length;
        const finishedGoodsCount = suppliers.filter(s => s.category === 'finished_goods').length;
        const rawMatCount = suppliers.filter(s => s.category === 'raw_material').length;
        return {
            totalCount: total,
            activeCount,
            finishedGoodsCount,
            rawMatCount,
        };
    }, [suppliers, total]);

    const getInitials = (name) => {
        if (!name) return 'SP';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const columns = [
        {
            key: 'supplier', label: 'Supplier Details',
            render: (r) => {
                const initials = getInitials(r.displayName);
                const isCompany = r.type === 'company';

                return (
                    <div className="flex items-center gap-3 py-1">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                            isCompany ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-sm truncate max-w-[200px]" title={r.displayName}>
                                    {r.displayName}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <span className="font-mono text-[11px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                    {r.supplierCode}
                                </span>
                                <span>•</span>
                                <span className="capitalize text-[11px] text-gray-600">
                                    {isCompany ? 'Company' : 'Individual'}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'category', label: 'Category',
            render: (r) => (
                <Badge variant={r.category === 'finished_goods' ? 'blue' : 'gray'}>
                    {categoryLabels[r.category] || r.category}
                </Badge>
            ),
        },
        {
            key: 'contact', label: 'Contact & Location',
            render: (r) => {
                const phone = r.primaryContact?.phone || r.primaryContact?.mobile;
                const email = r.primaryContact?.email;
                const city = r.billingAddress?.city;
                const contactPerson = r.primaryContact?.name;

                return (
                    <div className="text-xs space-y-1">
                        {phone ? (
                            <div className="flex items-center gap-1.5 text-gray-800 font-medium font-mono">
                                <Phone size={13} className="text-gray-400 shrink-0" />
                                <span>{phone}</span>
                            </div>
                        ) : (
                            <span className="text-gray-400 italic">No phone</span>
                        )}
                        <div className="flex items-center gap-2 text-gray-500 flex-wrap">
                            {contactPerson && (
                                <span className="flex items-center gap-1 text-gray-700 font-medium">
                                    <User size={11} className="text-gray-400 shrink-0" />
                                    <span>{contactPerson}</span>
                                </span>
                            )}
                            {city && (
                                <span className="flex items-center gap-1">
                                    <MapPin size={11} className="text-gray-400 shrink-0" />
                                    <span>{city}</span>
                                </span>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'payment', label: 'Terms & Lead Time',
            render: (r) => {
                const t = r.paymentTerms?.type || 'cod';
                return (
                    <div className="text-xs space-y-0.5">
                        <div>
                            {t === 'credit' && <Badge variant="info">{r.paymentTerms.creditDays || 30}d Credit</Badge>}
                            {t === 'advance' && <Badge variant="warning">Advance</Badge>}
                            {t === 'consignment' && <Badge variant="info">Consignment</Badge>}
                            {t === 'cod' && <Badge variant="gray">COD</Badge>}
                        </div>
                        {r.averageLeadTimeDays > 0 && (
                            <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                <Clock size={11} className="text-gray-400" />
                                <span>{r.averageLeadTimeDays} days lead</span>
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'banking', label: 'Bank Details',
            render: (r) => {
                const b = r.bankDetails;
                if (!b || (!b.accountNumber && !b.bankName)) {
                    return <span className="text-gray-400 text-xs italic">Not on file</span>;
                }
                return (
                    <div className="text-xs">
                        <div className="font-semibold text-gray-800 flex items-center gap-1">
                            <Landmark size={12} className="text-indigo-600" />
                            <span>{b.bankName || 'Bank'}</span>
                        </div>
                        {b.accountNumber && (
                            <div className="font-mono text-[11px] text-gray-600">
                                Acc: {b.accountNumber}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'status', label: 'Status',
            render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge>,
        },
        {
            key: 'actions', label: 'Actions', width: '120px',
            render: (r) => (
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); setViewingSupplier(r); }}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="View Supplier Profile"
                    >
                        <Eye size={15} />
                    </button>
                    {canManage && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setEditing(r); setIsFormOpen(true); }}
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                            title="Edit Supplier"
                        >
                            <Edit size={15} />
                        </button>
                    )}
                    {canDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setDeleting(r); }}
                            className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Supplier"
                        >
                            <Trash2 size={15} />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    const handleDelete = async () => {
        await deleteMutation.mutateAsync(deleting._id);
        setDeleting(null);
    };

    return (
        <div className="space-y-5">
            <PageHeader
                title="Suppliers"
                subtitle="Manage raw material and merchandise vendors, vendor contacts, and banking info."
                breadcrumbs={[{ label: 'Procurement', to: '/purchase-orders' }, { label: 'Suppliers' }]}
                actions={
                    canManage && (
                        <Button variant="primary" onClick={() => { setEditing(null); setIsFormOpen(true); }}>
                            <Plus size={16} className="mr-1.5" /> Add Supplier
                        </Button>
                    )
                }
            />

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <Card className="p-3.5 flex items-center justify-between border-l-4 border-l-primary-500">
                    <div>
                        <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Total Vendors</div>
                        <div className="text-2xl font-black text-gray-900 mt-0.5">{stats.totalCount}</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
                        <Truck size={18} />
                    </div>
                </Card>

                <Card className="p-3.5 flex items-center justify-between border-l-4 border-l-emerald-500">
                    <div>
                        <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Active Suppliers</div>
                        <div className="text-2xl font-black text-emerald-600 mt-0.5">{stats.activeCount}</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <CheckCircle2 size={18} />
                    </div>
                </Card>

                <Card className="p-3.5 flex items-center justify-between border-l-4 border-l-indigo-500">
                    <div>
                        <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Finished Goods</div>
                        <div className="text-2xl font-black text-indigo-600 mt-0.5">{stats.finishedGoodsCount}</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <ShoppingBag size={18} />
                    </div>
                </Card>

                <Card className="p-3.5 flex items-center justify-between border-l-4 border-l-amber-500">
                    <div>
                        <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Raw Material</div>
                        <div className="text-2xl font-black text-amber-600 mt-0.5">{stats.rawMatCount}</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        <Building2 size={18} />
                    </div>
                </Card>
            </div>

            {/* Filter and Search Bar */}
            <Card>
                <div className="p-3.5 border-b border-gray-100 flex flex-wrap gap-2.5 items-center justify-between">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by supplier name, code, phone, or email..."
                            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                        />
                    </div>
                    <div className="flex gap-2">
                        <div className="w-48">
                            <Select
                                placeholder="All Categories"
                                options={Object.entries(categoryLabels).map(([v, l]) => ({ value: v, label: l }))}
                                value={filters.category}
                                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value, page: 1 }))}
                            />
                        </div>
                        <div className="w-36">
                            <Select
                                placeholder="All Statuses"
                                options={[
                                    { value: 'active', label: 'Active' },
                                    { value: 'on_hold', label: 'On Hold' },
                                    { value: 'inactive', label: 'Inactive' },
                                    { value: 'blacklisted', label: 'Blacklisted' },
                                ]}
                                value={filters.status}
                                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
                            />
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500 text-sm">Loading suppliers directory...</div>
                ) : suppliers.length === 0 ? (
                    <EmptyState
                        icon={Truck}
                        title="No suppliers found"
                        description={filters.search || filters.category ? 'Try clearing or adjusting search filters' : 'Add your first supplier to start procurement'}
                        action={canManage && !filters.search && (
                            <Button variant="primary" onClick={() => { setEditing(null); setIsFormOpen(true); }}>
                                <Plus size={16} className="mr-1.5" /> Add Supplier
                            </Button>
                        )}
                    />
                ) : (
                    <>
                        <Table columns={columns} data={suppliers} />
                        <Pagination
                            page={filters.page}
                            totalPages={totalPages}
                            total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
                        />
                    </>
                )}
            </Card>

            {/* Quick & Clean Supplier Form Modal */}
            <SupplierFormModal
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setEditing(null); }}
                supplier={editing}
            />

            {/* Supplier Profile Quick View Modal */}
            {viewingSupplier && (
                <Modal
                    isOpen={!!viewingSupplier}
                    onClose={() => setViewingSupplier(null)}
                    title="Supplier Profile & Banking"
                    size="md"
                >
                    <div className="p-6 space-y-4">
                        {/* Header Banner */}
                        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-indigo-50 border border-emerald-100">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-emerald-200">
                                {getInitials(viewingSupplier.displayName)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-base text-gray-900 truncate">{viewingSupplier.displayName}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="font-mono text-xs font-semibold text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200">
                                        {viewingSupplier.supplierCode}
                                    </span>
                                    <Badge variant={statusVariant[viewingSupplier.status]}>{viewingSupplier.status}</Badge>
                                    <Badge variant="blue">{categoryLabels[viewingSupplier.category] || viewingSupplier.category}</Badge>
                                </div>
                            </div>
                        </div>

                        {/* Bank Details Box */}
                        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                            <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                                <Landmark size={14} className="text-indigo-600" /> Banking Information (For Payments)
                            </span>
                            {viewingSupplier.bankDetails?.accountNumber ? (
                                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                                    <div>
                                        <span className="text-gray-500 block">Bank & Branch</span>
                                        <span className="font-bold text-gray-900">
                                            {viewingSupplier.bankDetails.bankName || 'Bank'} {viewingSupplier.bankDetails.branchName ? `(${viewingSupplier.bankDetails.branchName})` : ''}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block">Account Number</span>
                                        <span className="font-mono font-bold text-indigo-950 text-sm">
                                            {viewingSupplier.bankDetails.accountNumber}
                                        </span>
                                    </div>
                                    {viewingSupplier.bankDetails.accountName && (
                                        <div className="col-span-2">
                                            <span className="text-gray-500 block">Account Name</span>
                                            <span className="font-semibold text-gray-800">
                                                {viewingSupplier.bankDetails.accountName}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-indigo-700 italic">No bank account details recorded yet.</p>
                            )}
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-gray-400 font-semibold block mb-1">Phone Number</span>
                                <span className="font-mono font-bold text-gray-800 text-sm">
                                    {viewingSupplier.primaryContact?.phone || viewingSupplier.primaryContact?.mobile || 'Not provided'}
                                </span>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-gray-400 font-semibold block mb-1">Contact Person</span>
                                <span className="font-semibold text-gray-800 text-sm truncate block">
                                    {viewingSupplier.primaryContact?.name || 'Not provided'}
                                </span>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-gray-400 font-semibold block mb-1">Payment Terms</span>
                                <span className="font-bold text-gray-800 uppercase">
                                    {viewingSupplier.paymentTerms?.type || 'COD'}
                                    {viewingSupplier.paymentTerms?.type === 'credit' && ` (${viewingSupplier.paymentTerms.creditDays || 30} days)`}
                                </span>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-gray-400 font-semibold block mb-1">Lead Time</span>
                                <span className="font-bold text-gray-800">
                                    {viewingSupplier.averageLeadTimeDays ? `${viewingSupplier.averageLeadTimeDays} days` : '7 days (Standard)'}
                                </span>
                            </div>
                        </div>

                        {/* Registered Address */}
                        {(viewingSupplier.billingAddress?.line1 || viewingSupplier.billingAddress?.city) && (
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                                <span className="text-gray-400 font-semibold block mb-1">Supplier Address</span>
                                <span className="text-gray-800 font-medium">
                                    {[viewingSupplier.billingAddress?.line1, viewingSupplier.billingAddress?.city, viewingSupplier.billingAddress?.country]
                                        .filter(Boolean)
                                        .join(', ')}
                                </span>
                            </div>
                        )}

                        {/* Modal Footer Actions */}
                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    setEditing(viewingSupplier);
                                    setViewingSupplier(null);
                                    setIsFormOpen(true);
                                }}
                            >
                                <Edit size={14} className="mr-1" /> Edit Supplier
                            </Button>
                            <Button
                                variant="primary"
                                className="flex-1 bg-primary-600 hover:bg-primary-700"
                                onClick={() => {
                                    navigate('/purchase-orders/new');
                                }}
                            >
                                <ShoppingBag size={14} className="mr-1" /> New Purchase Order
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={handleDelete}
                title="Delete Supplier"
                message={`Delete "${deleting?.displayName}"? This will move supplier to deleted archives.`}
                confirmText="Delete"
                variant="danger"
                loading={deleteMutation.isPending}
            />
        </div>
    );
}
