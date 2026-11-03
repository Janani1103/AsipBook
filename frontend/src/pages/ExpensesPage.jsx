import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Receipt, Search, Filter, X, Image as ImageIcon, CheckCircle2, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ExpenseFormModal from '../features/expenses/ExpenseFormModal';
import { expensesApi } from '../features/expenses/expensesApi';

export default function ExpensesPage() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [deletingExpense, setDeletingExpense] = useState(null);
    const [previewReceipt, setPreviewReceipt] = useState(null);
    const queryClient = useQueryClient();

    // Filters
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        category: '',
        approvalStatus: '',
        page: 1,
        limit: 50,
    });

    const { data: expensesData, isLoading } = useQuery({
        queryKey: ['expenses', filters],
        queryFn: () => expensesApi.list({
            ...filters,
            startDate: filters.startDate || undefined,
            endDate: filters.endDate || undefined,
            category: filters.category || undefined,
        }),
    });

    const { data: categoriesData } = useQuery({
        queryKey: ['expense-categories'],
        queryFn: expensesApi.getCategories,
        staleTime: 30000,
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, approvalStatus }) => expensesApi.updateStatus(id, { approvalStatus }),
        onSuccess: (_, vars) => {
            toast.success(`Expense ${vars.approvalStatus === 'approved' ? 'approved' : 'rejected'}`);
            queryClient.invalidateQueries(['expenses']);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Action failed')
    });

    const deleteMutation = useMutation({
        mutationFn: expensesApi.delete,
        onSuccess: () => {
            toast.success('Expense deleted');
            queryClient.invalidateQueries(['expenses']);
            queryClient.invalidateQueries(['pos-sessions', 'active']);
            setDeletingExpense(null);
        },
    });

    const expenses = expensesData?.data || [];
    const total = expensesData?.total || 0;
    const allCategories = categoriesData?.data || [];

    const formatCurrency = (val) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(val);

    const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);

    const clearFilters = () => {
        setFilters({ startDate: '', endDate: '', category: '', page: 1, limit: 50 });
    };

    const hasFilters = filters.startDate || filters.endDate || filters.category;

    const columns = [
        { key: 'expenseNumber', label: 'Expense #', render: (row) => <span className="font-mono text-xs font-bold text-gray-800">{row.expenseNumber}</span> },
        { key: 'date', label: 'Date', render: (row) => new Date(row.date).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: '2-digit' }) },
        {
            key: 'category', label: 'Category',
            render: (row) => (
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 cursor-pointer hover:bg-indigo-100 transition"
                        onClick={() => setFilters(f => ({ ...f, category: row.category }))}
                        title="Filter by this category"
                    >
                        {row.category}
                    </span>
                    {row.isPettyCash && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Petty Cash
                        </span>
                    )}
                </div>
            )
        },
        { key: 'amount', label: 'Amount', render: (row) => <span className="font-bold text-red-600 font-mono">{formatCurrency(row.amount)}</span> },
        { key: 'paymentMethod', label: 'Payment', render: (row) => <Badge className="uppercase text-[10px]">{row.paymentMethod.replace('_', ' ')}</Badge> },
        {
            key: 'receipt', label: 'Receipt Slip',
            render: (row) => row.receiptUrl ? (
                <button
                    type="button"
                    onClick={() => setPreviewReceipt(row)}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer bg-indigo-50 px-2 py-1 rounded-md border border-indigo-200 hover:bg-indigo-100 transition"
                    title="Click to view attached receipt slip"
                >
                    <ImageIcon size={13} /> View Slip
                </button>
            ) : <span className="text-gray-300 text-xs">—</span>
        },
        {
            key: 'approvalStatus', label: 'Approval',
            render: (row) => {
                const st = row.approvalStatus || 'approved';
                if (st === 'approved') return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"><CheckCircle2 size={12} /> Approved</span>;
                if (st === 'rejected') return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200"><XCircle size={12} /> Rejected</span>;
                return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200"><Clock size={12} /> Pending</span>;
            }
        },
        { key: 'description', label: 'Description', render: (row) => <span className="text-xs text-gray-500">{row.description || row.reference || '—'}</span> },
        {
            key: 'actions',
            label: 'Actions',
            width: '110px',
            render: (row) => (
                <div className="flex items-center gap-1">
                    {row.approvalStatus === 'pending_approval' && (
                        <>
                            <button
                                type="button"
                                onClick={() => statusMutation.mutate({ id: row._id, approvalStatus: 'approved' })}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                title="Approve this expense"
                            >
                                <CheckCircle2 size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => statusMutation.mutate({ id: row._id, approvalStatus: 'rejected' })}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                title="Reject this expense"
                            >
                                <XCircle size={16} />
                            </button>
                        </>
                    )}
                    <button onClick={() => setDeletingExpense(row)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer" title="Delete expense">
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div>
            <PageHeader
                title="Expenses"
                description="Track operating expenses and cash drawer payouts"
                actions={
                    <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                        <Plus size={16} className="mr-1.5" /> Record Expense
                    </Button>
                }
            />

            {/* Summary Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-xl border p-4">
                    <p className="text-xs text-gray-500 font-medium">Showing Expenses</p>
                    <p className="text-2xl font-black text-gray-800">{expenses.length}</p>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <p className="text-xs text-gray-500 font-medium">Total Records</p>
                    <p className="text-2xl font-black text-gray-800">{total}</p>
                </div>
                <div className="bg-red-50 rounded-xl border border-red-100 p-4">
                    <p className="text-xs text-red-600 font-medium">Total Amount (shown)</p>
                    <p className="text-2xl font-black text-red-700">{formatCurrency(totalAmount)}</p>
                </div>
            </div>

            <Card>
                {/* Filters */}
                <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3 items-end">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-600">From Date</label>
                        <input
                            type="date"
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                            value={filters.startDate}
                            onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value, page: 1 }))}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-600">To Date</label>
                        <input
                            type="date"
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                            value={filters.endDate}
                            onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value, page: 1 }))}
                        />
                    </div>
                    <div className="flex flex-col gap-1 min-w-[180px]">
                        <label className="text-xs font-medium text-gray-600">Category</label>
                        <select
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 bg-white"
                            value={filters.category}
                            onChange={(e) => setFilters(f => ({ ...f, category: e.target.value, page: 1 }))}
                        >
                            <option value="">All Categories</option>
                            {allCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    {hasFilters && (
                        <Button variant="outline" size="sm" onClick={clearFilters} className="h-[38px] mt-auto flex items-center gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
                            <X size={14} /> Clear Filters
                        </Button>
                    )}
                    <div className="ml-auto mt-auto">
                        <Button variant="outline" size="sm" onClick={() => setFilters(f => ({
                            ...f,
                            startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                            endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
                        }))} className="h-[38px] text-xs">
                            This Month
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-12 text-center text-gray-500">Loading expenses...</div>
                ) : expenses.length === 0 ? (
                    <EmptyState
                        icon={Receipt}
                        title="No expenses found"
                        description={hasFilters ? 'Try adjusting your filters' : 'Record your first operating expense or cash payout.'}
                        action={!hasFilters && <Button variant="primary" onClick={() => setIsFormOpen(true)}><Plus size={16} className="mr-1.5" /> Record Expense</Button>}
                    />
                ) : (
                    <Table columns={columns} data={expenses} />
                )}
            </Card>

            {/* Receipt Slip Preview Modal */}
            {previewReceipt && (
                <Modal
                    isOpen={!!previewReceipt}
                    onClose={() => setPreviewReceipt(null)}
                    title={`Receipt Voucher: ${previewReceipt.expenseNumber} (${previewReceipt.category})`}
                    size="lg"
                >
                    <div className="p-4 space-y-4">
                        <div className="flex justify-between items-center text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border">
                            <div>
                                <span className="font-semibold text-gray-700">Amount:</span> <strong className="text-red-600 font-mono text-sm">{formatCurrency(previewReceipt.amount)}</strong>
                            </div>
                            <div>
                                <span className="font-semibold text-gray-700">Date:</span> {new Date(previewReceipt.date).toLocaleDateString('en-LK')}
                            </div>
                            <div>
                                <span className="font-semibold text-gray-700">Payee / Ref:</span> {previewReceipt.description || previewReceipt.reference || '—'}
                            </div>
                        </div>

                        <div className="flex justify-center bg-gray-900/5 p-4 rounded-xl border border-gray-200 max-h-[70vh] overflow-auto">
                            <img
                                src={previewReceipt.receiptUrl}
                                alt="Expense Receipt"
                                className="max-w-full h-auto object-contain rounded-lg shadow-md"
                            />
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t">
                            <a
                                href={previewReceipt.receiptUrl}
                                download={`Receipt_${previewReceipt.expenseNumber}.png`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
                            >
                                Download Image
                            </a>
                            <Button variant="outline" onClick={() => setPreviewReceipt(null)}>Close</Button>
                        </div>
                    </div>
                </Modal>
            )}

            <ExpenseFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />

            <ConfirmDialog
                isOpen={!!deletingExpense}
                onClose={() => setDeletingExpense(null)}
                onConfirm={() => deleteMutation.mutate(deletingExpense._id)}
                title="Delete Expense"
                message="Are you sure you want to delete this expense? If it was a cash expense, it will be refunded to the active cash register."
                confirmText="Delete"
                variant="danger"
                loading={deleteMutation.isPending}
            />
        </div>
    );
}
