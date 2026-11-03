import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Eye, Plus, Search, Edit, Trash2, Users, AlertTriangle, 
    Ban, CheckCircle, Phone, Mail, MapPin, Building2, User, 
    DollarSign, Star, ShoppingCart, ShieldAlert, FileText, ArrowRight
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
import CustomerFormModal from '../features/customers/CustomerFormModal';
import {
    useCustomers, useCustomerGroups, useDeleteCustomer, useToggleCreditHold,
} from '../features/customers/useCustomers';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/formatters';

const statusVariant = {
    active: 'success',
    inactive: 'default',
    prospect: 'info',
    on_hold: 'warning',
    blacklisted: 'danger',
};

const tierColors = {
    bronze: 'bg-amber-50 text-amber-800 border-amber-200',
    silver: 'bg-slate-100 text-slate-800 border-slate-300',
    gold: 'bg-yellow-50 text-yellow-800 border-yellow-300',
    platinum: 'bg-indigo-50 text-indigo-800 border-indigo-200',
};

export default function CustomersPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canManage = ['admin', 'manager', 'sales_manager', 'sales_rep'].includes(user?.role);
    const canDelete = ['admin', 'manager'].includes(user?.role);
    const canHoldCredit = ['admin', 'manager', 'accountant'].includes(user?.role);

    const [filters, setFilters] = useState({
        search: '', customerGroupId: '', status: '',
        page: 1, limit: 15,
    });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [viewingCustomer, setViewingCustomer] = useState(null);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [togglingHold, setTogglingHold] = useState(null);
    const [holdReason, setHoldReason] = useState('');

    const { data, isLoading } = useCustomers(filters);
    const { data: groupsData } = useCustomerGroups();
    const deleteMutation = useDeleteCustomer();
    const holdMutation = useToggleCreditHold();

    const customers = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const groupOptions = (groupsData?.data || []).map((g) => ({ value: g._id, label: g.name }));

    // Compute quick dashboard stats
    const stats = useMemo(() => {
        const totalOutstanding = customers.reduce((sum, c) => sum + (c.creditStatus?.currentBalance || 0), 0);
        const totalLoyaltyPts = customers.reduce((sum, c) => sum + (c.loyalty?.points || 0), 0);
        const onHoldCount = customers.filter(c => c.creditStatus?.onCreditHold).length;
        return {
            totalCount: total,
            totalOutstanding,
            totalLoyaltyPts,
            onHoldCount,
        };
    }, [customers, total]);

    const getInitials = (name) => {
        if (!name) return 'C';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const columns = [
        {
            key: 'customer', label: 'Customer Details',
            render: (r) => {
                const initials = getInitials(r.displayName);
                const isCompany = r.customerType === 'company';
                const tier = r.loyalty?.tier || 'bronze';
                const tierStyle = tierColors[tier] || tierColors.bronze;

                return (
                    <div className="flex items-center gap-3 py-1">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                            isCompany ? 'bg-indigo-100 text-indigo-700' : 'bg-primary-100 text-primary-700'
                        }`}>
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-sm truncate max-w-[200px]" title={r.displayName}>
                                    {r.displayName}
                                </span>
                                {r.creditStatus?.onCreditHold && (
                                    <span title={`On credit hold: ${r.creditStatus.creditHoldReason || 'No reason'}`}>
                                        <Ban size={14} className="text-rose-500 shrink-0" />
                                    </span>
                                )}
                                {r.creditStatus?.isOverdue && (
                                    <span title="Overdue balance">
                                        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                                <span className="font-mono text-[11px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                    {r.customerCode}
                                </span>
                                <span>•</span>
                                <span className="capitalize text-[11px]">
                                    {isCompany ? 'Company' : 'Individual'}
                                </span>
                                <span>•</span>
                                <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded border inline-flex items-center gap-1 ${tierStyle}`}>
                                    ⭐ {r.loyalty?.points || 0} pts
                                </span>
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'contact', label: 'Contact & Location',
            render: (r) => {
                const phone = r.primaryContact?.phone || r.primaryContact?.mobile;
                const email = r.primaryContact?.email;
                const city = r.billingAddress?.city;

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
                            {city && (
                                <span className="flex items-center gap-1">
                                    <MapPin size={11} className="text-gray-400 shrink-0" />
                                    <span>{city}</span>
                                </span>
                            )}
                            {email && (
                                <span className="flex items-center gap-1 truncate max-w-[150px]" title={email}>
                                    <Mail size={11} className="text-gray-400 shrink-0" />
                                    <span>{email}</span>
                                </span>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'group', label: 'Group / Segment',
            render: (r) =>
                r.customerGroupId ? (
                    <span
                        className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold text-white shadow-2xs"
                        style={{ backgroundColor: r.customerGroupId.color || '#4f46e5' }}
                    >
                        {r.customerGroupId.name}
                    </span>
                ) : (
                    <span className="text-gray-400 text-xs italic">General</span>
                ),
        },
        {
            key: 'creditTerms', label: 'Payment Terms',
            render: (r) => {
                const t = r.paymentTerms?.type || 'cod';
                if (t === 'credit') {
                    return (
                        <div className="text-xs">
                            <Badge variant="blue" className="font-bold">
                                Credit ({r.paymentTerms.creditDays || 0} days)
                            </Badge>
                            {r.paymentTerms.creditLimit > 0 && (
                                <div className="text-[10px] text-gray-500 mt-0.5">
                                    Limit: {formatCurrency(r.paymentTerms.creditLimit)}
                                </div>
                            )}
                        </div>
                    );
                }
                if (t === 'advance') return <Badge variant="warning">Advance</Badge>;
                return <Badge variant="gray">COD (Cash on Delivery)</Badge>;
            },
        },
        {
            key: 'creditStatus', label: 'Outstanding Balance',
            render: (r) => {
                const bal = r.creditStatus?.currentBalance || 0;
                if (bal === 0) return <span className="text-emerald-600 font-medium text-xs">Clear (0.00)</span>;
                return (
                    <div>
                        <div className={`text-xs font-bold ${r.creditStatus?.isOverdue ? 'text-rose-600 font-extrabold' : 'text-gray-900'}`}>
                            {formatCurrency(bal)}
                        </div>
                        {r.creditStatus?.isOverdue && (
                            <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
                                Overdue
                            </span>
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
            key: 'actions', label: 'Actions', width: '130px',
            render: (r) => (
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); setViewingCustomer(r); }}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="View Customer Profile"
                    >
                        <Eye size={15} />
                    </button>
                    {canManage && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setEditing(r); setIsFormOpen(true); }}
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                            title="Edit Customer"
                        >
                            <Edit size={15} />
                        </button>
                    )}
                    {canHoldCredit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setTogglingHold(r); setHoldReason(''); }}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                            title={r.creditStatus?.onCreditHold ? 'Remove credit hold' : 'Place on credit hold'}
                        >
                            {r.creditStatus?.onCreditHold ? (
                                <CheckCircle size={15} className="text-emerald-600" />
                            ) : (
                                <Ban size={15} className="text-gray-400 hover:text-rose-600" />
                            )}
                        </button>
                    )}
                    {canDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setDeleting(r); }}
                            className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Customer"
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

    const handleToggleHold = async () => {
        await holdMutation.mutateAsync({ id: togglingHold._id, reason: holdReason });
        setTogglingHold(null);
    };

    const handleClose = () => {
        setIsFormOpen(false); setEditing(null);
    };

    return (
        <div className="space-y-5">
            <PageHeader
                title="Customers"
                subtitle="Manage retail buyers, wholesale distributors, and corporate credit customers."
                breadcrumbs={[{ label: 'Sales', to: '/sales-orders' }, { label: 'Customers' }]}
                actions={
                    canManage && (
                        <Button variant="primary" onClick={() => { setEditing(null); setIsFormOpen(true); }}>
                            <Plus size={16} className="mr-1.5" /> Add Customer
                        </Button>
                    )
                }
            />

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <Card className="p-3.5 flex items-center justify-between border-l-4 border-l-primary-500">
                    <div>
                        <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Total Customers</div>
                        <div className="text-2xl font-black text-gray-900 mt-0.5">{stats.totalCount}</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
                        <Users size={18} />
                    </div>
                </Card>

                <Card className="p-3.5 flex items-center justify-between border-l-4 border-l-rose-500">
                    <div>
                        <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Total Outstanding</div>
                        <div className="text-xl font-black text-rose-600 mt-0.5">{formatCurrency(stats.totalOutstanding)}</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                        <DollarSign size={18} />
                    </div>
                </Card>

                <Card className="p-3.5 flex items-center justify-between border-l-4 border-l-amber-500">
                    <div>
                        <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Loyalty Points Active</div>
                        <div className="text-xl font-black text-amber-600 mt-0.5">{stats.totalLoyaltyPts.toLocaleString()} pts</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        <Star size={18} />
                    </div>
                </Card>

                <Card className="p-3.5 flex items-center justify-between border-l-4 border-l-slate-400">
                    <div>
                        <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Credit Holds</div>
                        <div className={`text-2xl font-black mt-0.5 ${stats.onHoldCount > 0 ? 'text-rose-600' : 'text-gray-700'}`}>
                            {stats.onHoldCount}
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center font-bold">
                        <Ban size={18} />
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
                            placeholder="Search by customer name, code, phone, or email..."
                            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                        />
                    </div>
                    <div className="flex gap-2">
                        <div className="w-44">
                            <Select
                                placeholder="All Groups"
                                options={groupOptions}
                                value={filters.customerGroupId}
                                onChange={(e) => setFilters((f) => ({ ...f, customerGroupId: e.target.value, page: 1 }))}
                            />
                        </div>
                        <div className="w-36">
                            <Select
                                placeholder="All Statuses"
                                options={[
                                    { value: 'active', label: 'Active' },
                                    { value: 'prospect', label: 'Prospect' },
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
                    <div className="py-16 text-center text-gray-500 text-sm">Loading customer directory...</div>
                ) : customers.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No customers found"
                        description={filters.search || filters.status ? 'Try clearing or adjusting search filters' : 'Add your first customer to get started'}
                        action={canManage && !filters.search && (
                            <Button variant="primary" onClick={() => { setEditing(null); setIsFormOpen(true); }}>
                                <Plus size={16} className="mr-1.5" /> Add Customer
                            </Button>
                        )}
                    />
                ) : (
                    <>
                        <Table columns={columns} data={customers} />
                        <Pagination
                            page={filters.page}
                            totalPages={totalPages}
                            total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
                        />
                    </>
                )}
            </Card>

            {/* Quick & Clean Customer Form Modal */}
            <CustomerFormModal isOpen={isFormOpen} onClose={handleClose} customer={editing} />

            {/* Customer Detail Profile Modal (Quick View) */}
            {viewingCustomer && (
                <Modal
                    isOpen={!!viewingCustomer}
                    onClose={() => setViewingCustomer(null)}
                    title="Customer Profile"
                    size="md"
                >
                    <div className="p-6 space-y-4">
                        {/* Header Banner */}
                        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-primary-50 to-indigo-50 border border-primary-100">
                            <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-primary-200">
                                {getInitials(viewingCustomer.displayName)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-base text-gray-900 truncate">{viewingCustomer.displayName}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="font-mono text-xs font-semibold text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200">
                                        {viewingCustomer.customerCode}
                                    </span>
                                    <Badge variant={statusVariant[viewingCustomer.status]}>{viewingCustomer.status}</Badge>
                                </div>
                            </div>
                        </div>

                        {/* Loyalty & Rewards Box */}
                        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex justify-between items-center">
                            <div>
                                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Loyalty Rewards</span>
                                <div className="text-base font-black text-amber-950 mt-0.5">
                                    {viewingCustomer.loyalty?.points || 0} Points Available
                                </div>
                            </div>
                            <span className="uppercase text-xs font-extrabold px-2.5 py-1 rounded-lg bg-amber-500 text-white shadow-xs">
                                {viewingCustomer.loyalty?.tier || 'Bronze'} Member
                            </span>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-gray-400 font-semibold block mb-1">Phone / Mobile</span>
                                <span className="font-mono font-bold text-gray-800 text-sm">
                                    {viewingCustomer.primaryContact?.phone || 'Not provided'}
                                </span>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-gray-400 font-semibold block mb-1">Email Address</span>
                                <span className="font-medium text-gray-800 truncate block">
                                    {viewingCustomer.primaryContact?.email || 'Not provided'}
                                </span>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-gray-400 font-semibold block mb-1">Current Outstanding</span>
                                <span className={`font-bold text-sm ${viewingCustomer.creditStatus?.currentBalance > 0 ? 'text-rose-600' : 'text-gray-800'}`}>
                                    {formatCurrency(viewingCustomer.creditStatus?.currentBalance || 0)}
                                </span>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-gray-400 font-semibold block mb-1">Credit Limit</span>
                                <span className="font-bold text-gray-800 text-sm">
                                    {viewingCustomer.paymentTerms?.type === 'credit'
                                        ? formatCurrency(viewingCustomer.paymentTerms.creditLimit || 0)
                                        : 'N/A (Cash / COD)'}
                                </span>
                            </div>
                        </div>

                        {/* Address */}
                        {(viewingCustomer.billingAddress?.line1 || viewingCustomer.billingAddress?.city) && (
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                                <span className="text-gray-400 font-semibold block mb-1">Registered Address</span>
                                <span className="text-gray-800 font-medium">
                                    {[viewingCustomer.billingAddress?.line1, viewingCustomer.billingAddress?.city, viewingCustomer.billingAddress?.country]
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
                                    setEditing(viewingCustomer);
                                    setViewingCustomer(null);
                                    setIsFormOpen(true);
                                }}
                            >
                                <Edit size={14} className="mr-1" /> Edit Profile
                            </Button>
                            <Button
                                variant="primary"
                                className="flex-1 bg-primary-600 hover:bg-primary-700"
                                onClick={() => {
                                    navigate('/pos');
                                }}
                            >
                                <ShoppingCart size={14} className="mr-1" /> Go to POS Sale
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
                title="Delete Customer"
                message={`Delete "${deleting?.displayName}"? This will move customer to deleted archives.`}
                confirmText="Delete"
                variant="danger"
                loading={deleteMutation.isPending}
            />

            {/* Credit Hold Toggle Dialog */}
            <ConfirmDialog
                isOpen={!!togglingHold}
                onClose={() => setTogglingHold(null)}
                onConfirm={handleToggleHold}
                title={togglingHold?.creditStatus?.onCreditHold ? 'Remove Credit Hold' : 'Place on Credit Hold'}
                message={
                    togglingHold?.creditStatus?.onCreditHold
                        ? `Remove credit hold for "${togglingHold?.displayName}"? They will be able to place orders again.`
                        : (
                            <div>
                                <p className="mb-3 text-xs text-gray-600">Place "{togglingHold?.displayName}" on credit hold? They won't be able to buy on credit.</p>
                                <input
                                    type="text"
                                    placeholder="Enter reason for credit hold..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                                    value={holdReason}
                                    onChange={(e) => setHoldReason(e.target.value)}
                                />
                            </div>
                        )
                }
                confirmText={togglingHold?.creditStatus?.onCreditHold ? 'Remove Hold' : 'Place Hold'}
                variant={togglingHold?.creditStatus?.onCreditHold ? 'primary' : 'danger'}
                loading={holdMutation.isPending}
            />
        </div>
    );
}
