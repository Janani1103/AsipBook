import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
    Tag, Plus, Trash2, Edit2, Copy, Check, Calendar, 
    Gift, Percent, DollarSign, AlertCircle, Sparkles, Power
} from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { couponsApi } from '../features/coupons/couponsApi';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function CouponsPage() {
    const qc = useQueryClient();

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [copiedCode, setCopiedCode] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        code: '',
        description: '',
        type: 'percentage',
        value: '',
        minPurchaseAmount: '',
        maxDiscountAmount: '',
        usageLimit: '',
        perCustomerLimit: 1,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: '',
        isActive: true,
    });

    const { data: couponsRes, isLoading } = useQuery({
        queryKey: ['coupons', { search, type: typeFilter, isActive: statusFilter }],
        queryFn: () => couponsApi.list({
            search: search || undefined,
            type: typeFilter || undefined,
            isActive: statusFilter ? statusFilter === 'active' : undefined,
        }),
    });

    const coupons = couponsRes?.data || [];

    const createMutation = useMutation({
        mutationFn: couponsApi.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['coupons'] });
            toast.success('Coupon created successfully!');
            handleCloseModal();
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to create coupon'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => couponsApi.update(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['coupons'] });
            toast.success('Coupon updated successfully!');
            handleCloseModal();
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to update coupon'),
    });

    const deleteMutation = useMutation({
        mutationFn: couponsApi.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['coupons'] });
            toast.success('Coupon deleted');
            setDeletingId(null);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete coupon'),
    });

    const handleOpenCreate = () => {
        setEditingCoupon(null);
        setFormData({
            code: '',
            description: '',
            type: 'percentage',
            value: '',
            minPurchaseAmount: '',
            maxDiscountAmount: '',
            usageLimit: '',
            perCustomerLimit: 1,
            validFrom: new Date().toISOString().split('T')[0],
            validUntil: '',
            isActive: true,
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (coupon) => {
        setEditingCoupon(coupon);
        setFormData({
            code: coupon.code,
            description: coupon.description || '',
            type: coupon.type,
            value: coupon.value,
            minPurchaseAmount: coupon.minPurchaseAmount || '',
            maxDiscountAmount: coupon.maxDiscountAmount || '',
            usageLimit: coupon.usageLimit || '',
            perCustomerLimit: coupon.perCustomerLimit ?? 1,
            validFrom: coupon.validFrom ? coupon.validFrom.split('T')[0] : '',
            validUntil: coupon.validUntil ? coupon.validUntil.split('T')[0] : '',
            isActive: coupon.isActive ?? true,
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCoupon(null);
    };

    const generateRandomCode = () => {
        const prefix = formData.type === 'gift_card' ? 'GIFT' : (formData.type === 'percentage' ? 'SALE' : 'PROMO');
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        setFormData((prev) => ({ ...prev, code: `${prefix}-${randomStr}` }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.code.trim()) {
            toast.error('Coupon code is required');
            return;
        }
        if (!formData.value || +formData.value <= 0) {
            toast.error('A valid discount value is required');
            return;
        }

        const payload = {
            code: formData.code.trim().toUpperCase(),
            description: formData.description?.trim(),
            type: formData.type,
            value: Number(formData.value),
            minPurchaseAmount: formData.minPurchaseAmount ? Number(formData.minPurchaseAmount) : 0,
            maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : undefined,
            usageLimit: formData.usageLimit ? Number(formData.usageLimit) : undefined,
            perCustomerLimit: formData.perCustomerLimit ? Number(formData.perCustomerLimit) : 1,
            validFrom: formData.validFrom || new Date().toISOString(),
            validUntil: formData.validUntil || undefined,
            isActive: Boolean(formData.isActive),
        };

        if (editingCoupon) {
            updateMutation.mutate({ id: editingCoupon._id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        toast.success(`Copied "${code}" to clipboard!`);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const handleToggleStatus = (coupon) => {
        updateMutation.mutate({
            id: coupon._id,
            data: { isActive: !coupon.isActive },
        });
    };

    // Calculate quick stats
    const totalCoupons = coupons.length;
    const activeCoupons = coupons.filter(c => c.isActive).length;
    const totalRedeemed = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);
    const giftCardsCount = coupons.filter(c => c.type === 'gift_card').length;

    const columns = [
        {
            key: 'code', label: 'Coupon Code',
            render: (coupon) => (
                <div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleCopyCode(coupon.code)}
                            className="font-mono font-bold text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-0.5 rounded border border-gray-200 flex items-center gap-1.5 transition-colors group"
                            title="Click to copy code"
                        >
                            <span>{coupon.code}</span>
                            {copiedCode === coupon.code ? (
                                <Check size={12} className="text-emerald-600" />
                            ) : (
                                <Copy size={12} className="text-gray-400 group-hover:text-gray-600" />
                            )}
                        </button>
                    </div>
                    {coupon.description && (
                        <div className="text-xs text-gray-500 mt-0.5">{coupon.description}</div>
                    )}
                </div>
            ),
        },
        {
            key: 'type', label: 'Type',
            render: (coupon) => {
                if (coupon.type === 'percentage') {
                    return (
                        <Badge variant="blue" className="flex items-center gap-1 w-max">
                            <Percent size={12} /> Percentage
                        </Badge>
                    );
                }
                if (coupon.type === 'fixed') {
                    return (
                        <Badge variant="purple" className="flex items-center gap-1 w-max">
                            <DollarSign size={12} /> Fixed Amount
                        </Badge>
                    );
                }
                return (
                    <Badge variant="success" className="flex items-center gap-1 w-max">
                        <Gift size={12} /> Gift Card
                    </Badge>
                );
            },
        },
        {
            key: 'value', label: 'Discount Value',
            render: (coupon) => (
                <span className="font-extrabold text-sm text-gray-900">
                    {coupon.type === 'percentage'
                        ? `${coupon.value}% OFF`
                        : formatCurrency(coupon.value)}
                </span>
            ),
        },
        {
            key: 'usage', label: 'Usage',
            render: (coupon) => {
                const isLimitReached = coupon.usageLimit && coupon.usedCount >= coupon.usageLimit;
                return (
                    <div className="text-xs">
                        <span className="font-bold text-gray-800">{coupon.usedCount || 0}</span>
                        <span className="text-gray-400"> / </span>
                        <span className="text-gray-600">
                            {coupon.usageLimit ? `${coupon.usageLimit} max` : 'Unlimited'}
                        </span>
                        {isLimitReached && (
                            <span className="text-[10px] text-rose-600 font-semibold block">Limit reached</span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'limits', label: 'Min Spend / Cap',
            render: (coupon) => (
                <div className="text-xs space-y-0.5">
                    <div>
                        <span className="text-gray-400">Min: </span>
                        <span className="font-medium text-gray-700">
                            {coupon.minPurchaseAmount > 0 ? formatCurrency(coupon.minPurchaseAmount) : 'None'}
                        </span>
                    </div>
                    {coupon.maxDiscountAmount > 0 && (
                        <div>
                            <span className="text-gray-400">Max Cap: </span>
                            <span className="font-medium text-gray-700">
                                {formatCurrency(coupon.maxDiscountAmount)}
                            </span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'validity', label: 'Validity',
            render: (coupon) => {
                const isExpired = coupon.validUntil && new Date(coupon.validUntil) < new Date();
                return (
                    <div className="text-xs space-y-0.5">
                        <div className="text-gray-600 flex items-center gap-1">
                            <Calendar size={12} className="text-gray-400" />
                            {coupon.validUntil ? formatDate(coupon.validUntil) : 'No expiry'}
                        </div>
                        {isExpired && (
                            <span className="text-[10px] text-rose-600 font-semibold block flex items-center gap-0.5">
                                <AlertCircle size={10} /> Expired
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'status', label: 'Status',
            render: (coupon) => (
                <button
                    type="button"
                    onClick={() => handleToggleStatus(coupon)}
                    className="group cursor-pointer"
                    title={`Click to ${coupon.isActive ? 'deactivate' : 'activate'}`}
                >
                    {coupon.isActive ? (
                        <Badge variant="success" className="group-hover:opacity-80">Active</Badge>
                    ) : (
                        <Badge variant="gray" className="group-hover:opacity-80">Inactive</Badge>
                    )}
                </button>
            ),
        },
        {
            key: 'actions', label: 'Actions', width: '90px',
            render: (coupon) => (
                <div className="flex items-center justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(coupon)}
                        title="Edit Coupon"
                    >
                        <Edit2 size={14} className="text-gray-500 hover:text-primary-600" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingId(coupon._id)}
                        title="Delete Coupon"
                    >
                        <Trash2 size={14} className="text-gray-500 hover:text-rose-600" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Coupons & Vouchers"
                subtitle="Create promotional codes, vouchers, and gift cards for discounts at POS and Online Sales."
                breadcrumbs={[
                    { label: 'Sales', to: '/sales-orders' },
                    { label: 'Coupons & Vouchers' },
                ]}
                actions={
                    <Button variant="primary" onClick={handleOpenCreate}>
                        <Plus size={16} className="mr-1" /> Create Coupon
                    </Button>
                }
            />

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 flex items-center justify-between border-l-4 border-l-primary-500">
                    <div>
                        <div className="text-xs text-gray-500 font-semibold uppercase">Total Promos</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{totalCoupons}</div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
                        <Tag size={20} />
                    </div>
                </Card>
                <Card className="p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
                    <div>
                        <div className="text-xs text-gray-500 font-semibold uppercase">Active Coupons</div>
                        <div className="text-2xl font-bold text-emerald-600 mt-1">{activeCoupons}</div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <Check size={20} />
                    </div>
                </Card>
                <Card className="p-4 flex items-center justify-between border-l-4 border-l-amber-500">
                    <div>
                        <div className="text-xs text-gray-500 font-semibold uppercase">Total Redemptions</div>
                        <div className="text-2xl font-bold text-amber-600 mt-1">{totalRedeemed}</div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        <Sparkles size={20} />
                    </div>
                </Card>
                <Card className="p-4 flex items-center justify-between border-l-4 border-l-indigo-500">
                    <div>
                        <div className="text-xs text-gray-500 font-semibold uppercase">Gift Cards</div>
                        <div className="text-2xl font-bold text-indigo-600 mt-1">{giftCardsCount}</div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <Gift size={20} />
                    </div>
                </Card>
            </div>

            {/* Filter and Search Bar */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="w-full sm:w-72">
                        <Input
                            placeholder="Search by code or description..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                            <option value="">All Types</option>
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed">Fixed Amount (LKR)</option>
                            <option value="gift_card">Gift Card</option>
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Coupons Table */}
            <Card>
                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading coupons...</div>
                ) : coupons.length === 0 ? (
                    <EmptyState
                        icon={Tag}
                        title="No Coupons Found"
                        description="Create your first discount coupon or promotional voucher to reward customers."
                        action={
                            <Button variant="primary" onClick={handleOpenCreate}>
                                <Plus size={16} className="mr-1" /> Create Coupon
                            </Button>
                        }
                    />
                ) : (
                    <Table columns={columns} data={coupons} />
                )}
            </Card>

            {/* Create / Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingCoupon ? 'Edit Coupon / Voucher' : 'Create New Coupon / Voucher'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    {/* Form Body with standard padding */}
                    <div className="p-6 space-y-4 flex-1">
                        {/* Code & Quick Generator */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                Coupon Code *
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="e.g. SUMMER25, FESTIVE500"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono uppercase font-bold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                    required
                                    autoFocus
                                />
                                <Button type="button" variant="outline" size="sm" onClick={generateRandomCode} className="shrink-0">
                                    <Sparkles size={14} className="mr-1.5 text-amber-500" /> Auto Generate
                                </Button>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                Promo Title / Description <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Sinhala & Tamil New Year Special Discount"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                            />
                        </div>

                        {/* Type and Discount Value */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                    Discount Type *
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium transition"
                                >
                                    <option value="percentage">Percentage Discount (%)</option>
                                    <option value="fixed">Fixed Amount Discount (Rs.)</option>
                                    <option value="gift_card">Gift Card Voucher (Rs.)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                    {formData.type === 'percentage' ? 'Discount Percentage (%) *' : 'Discount / Card Amount (Rs.) *'}
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={formData.type === 'percentage' ? '100' : undefined}
                                    placeholder={formData.type === 'percentage' ? 'e.g. 15' : 'e.g. 1000'}
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white transition"
                                    required
                                />
                            </div>
                        </div>

                        {/* Spending limits & Caps */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                    Min Purchase Amount (Rs.) <span className="text-gray-400 font-normal">(0 = None)</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="0 = No minimum spend"
                                    value={formData.minPurchaseAmount}
                                    onChange={(e) => setFormData({ ...formData, minPurchaseAmount: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                />
                            </div>

                            {formData.type === 'percentage' ? (
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                        Max Discount Cap (Rs.) <span className="text-gray-400 font-normal">(Optional)</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        placeholder="Optional max discount limit"
                                        value={formData.maxDiscountAmount}
                                        onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                    />
                                </div>
                            ) : (
                                <div className="hidden sm:block" />
                            )}
                        </div>

                        {/* Usage Limits */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                    Total Usage Limit <span className="text-gray-400 font-normal">(Blank = Unlimited)</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    placeholder="Leave empty for unlimited"
                                    value={formData.usageLimit}
                                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                    Per Customer Limit
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={formData.perCustomerLimit}
                                    onChange={(e) => setFormData({ ...formData, perCustomerLimit: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                />
                            </div>
                        </div>

                        {/* Validity Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                    Valid From
                                </label>
                                <input
                                    type="date"
                                    value={formData.validFrom}
                                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                    Valid Until (Expiry Date)
                                </label>
                                <input
                                    type="date"
                                    value={formData.validUntil}
                                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                />
                            </div>
                        </div>

                        {/* Active toggle */}
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
                            />
                            <label htmlFor="isActive" className="text-xs font-semibold text-gray-700 cursor-pointer select-none">
                                Active & ready for checkout redemption
                            </label>
                        </div>
                    </div>

                    {/* Modal Footer with solid border and background */}
                    <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex justify-end gap-2.5 rounded-b-lg">
                        <Button type="button" variant="outline" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={createMutation.isPending || updateMutation.isPending}
                            className="px-5"
                        >
                            {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!deletingId}
                title="Delete Coupon"
                message="Are you sure you want to permanently delete this coupon code? This cannot be undone."
                confirmLabel="Delete"
                confirmVariant="danger"
                isLoading={deleteMutation.isPending}
                onConfirm={() => deleteMutation.mutate(deletingId)}
                onCancel={() => setDeletingId(null)}
            />
        </div>
    );
}

