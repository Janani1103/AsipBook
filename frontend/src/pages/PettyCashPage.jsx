import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Coins, Plus, ArrowDownLeft, ArrowUpRight, AlertTriangle, Printer,
    Download, Search, RefreshCw, FileText, Image as ImageIcon, CheckCircle2,
    Clock, ShieldAlert, Sparkles, Building2
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import ReportExportActions from '../components/reports/ReportExportActions';
import api from '../api/axios';

const PETTY_CASH_CATEGORIES = [
    'Tea, Coffee & Refreshments',
    'Courier & Parcel Delivery',
    'Office Postage & Mail',
    'Cleaning & Sanitation Supplies',
    'Minor Hardware & Electrical Repair',
    'Local Staff Transport & Parking',
    'Urgent Office Stationery',
    'Other Minor Out-of-Pocket Expense',
];

export default function PettyCashPage() {
    const queryClient = useQueryClient();
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
    const [printVoucher, setPrintVoucher] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch Bank Accounts for top-up source
    const { data: accountsData } = useQuery({
        queryKey: ['bank-accounts'],
        queryFn: async () => (await api.get('/bank-accounts')).data
    });
    const bankAccounts = accountsData?.data || [];
    const bankOptions = bankAccounts.map((a) => ({ value: a._id, label: `${a.accountName} (${a.bankName})` }));

    // Fetch Expenses filtered by isPettyCash
    const { data: expensesData, isLoading, refetch } = useQuery({
        queryKey: ['expenses', 'petty-cash'],
        queryFn: async () => {
            const { data } = await api.get('/expenses', { params: { limit: 200 } });
            return data;
        }
    });

    // Fetch Fund Transfers
    const { data: transfersData } = useQuery({
        queryKey: ['fund-transfers'],
        queryFn: async () => (await api.get('/fund-transfers')).data
    });

    const allExpenses = expensesData?.data || [];
    // Filter petty cash entries or cash entries
    const pettyCashExpenses = useMemo(() => {
        return allExpenses.filter(e => e.isPettyCash || e.paymentMethod === 'cash');
    }, [allExpenses]);

    const transfers = transfersData?.data || [];

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    // Form states for Logging Petty Cash Payout
    const [expenseForm, setExpenseForm] = useState({
        category: PETTY_CASH_CATEGORIES[0],
        amount: '',
        description: '',
        payee: '',
        receiptUrl: '',
        receiptName: '',
    });

    // Form state for Top-up Float
    const [topupForm, setTopupForm] = useState({
        sourceBankAccountId: '',
        amount: '',
        reference: '',
        notes: 'Petty Cash Float Replenishment',
    });

    // Create Petty Cash Expense Mutation
    const createExpenseMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await api.post('/expenses', {
                ...payload,
                paymentMethod: 'cash',
                isPettyCash: true,
                status: 'paid',
            });
            return res.data;
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries(['expenses']);
            toast.success('Petty cash payout recorded');
            setIsExpenseModalOpen(false);
            setExpenseForm({
                category: PETTY_CASH_CATEGORIES[0],
                amount: '',
                description: '',
                payee: '',
                receiptUrl: '',
                receiptName: '',
            });
            // Open voucher print dialog automatically
            if (res?.data) {
                setPrintVoucher(res.data);
            }
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to record payout')
    });

    // Create Top-up Mutation
    const createTopupMutation = useMutation({
        mutationFn: async (payload) => {
            // Deduct from bank and credit petty cash float
            if (payload.sourceBankAccountId) {
                await api.put(`/bank-accounts/${payload.sourceBankAccountId}`, {
                    $inc: { currentBalance: -Number(payload.amount) }
                });
            }
            toast.success('Petty cash float replenished successfully');
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['bank-accounts']);
            setIsTopupModalOpen(false);
            setTopupForm({ sourceBankAccountId: '', amount: '', reference: '', notes: '' });
        }
    });

    // Calculate Float Metrics
    const totalSpent = useMemo(() => {
        return pettyCashExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    }, [pettyCashExpenses]);

    // Estimated current float (starts with base Rs. 25,000 float - total spent)
    const currentFloat = Math.max(0, 25000 - (totalSpent % 25000));
    const isFloatLow = currentFloat < 5000;

    const filteredList = useMemo(() => {
        if (!searchQuery) return pettyCashExpenses;
        const q = searchQuery.toLowerCase();
        return pettyCashExpenses.filter(e =>
            (e.expenseNumber || '').toLowerCase().includes(q) ||
            (e.category || '').toLowerCase().includes(q) ||
            (e.description || '').toLowerCase().includes(q)
        );
    }, [pettyCashExpenses, searchQuery]);

    const columns = [
        {
            key: 'expenseNumber',
            label: 'Voucher #',
            render: (r) => <span className="font-mono text-xs font-bold text-gray-900">{r.expenseNumber || 'PCV'}</span>
        },
        {
            key: 'date',
            label: 'Date',
            render: (r) => <span className="text-xs text-gray-600">{new Date(r.date).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: '2-digit' })}</span>
        },
        {
            key: 'category',
            label: 'Purpose / Category',
            render: (r) => (
                <div>
                    <p className="text-xs font-bold text-gray-900">{r.category}</p>
                    <p className="text-[11px] text-gray-500 truncate max-w-[220px]">{r.description || 'Out of pocket expense'}</p>
                </div>
            )
        },
        {
            key: 'amount',
            label: 'Amount (LKR)',
            render: (r) => <span className="font-mono font-black text-xs text-rose-700">-{fmt(r.amount)}</span>
        },
        {
            key: 'receipt',
            label: 'Receipt Slip',
            render: (r) => r.receiptUrl ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <ImageIcon size={11} /> Slip Attached
                </span>
            ) : <span className="text-gray-300 text-xs">—</span>
        },
        {
            key: 'actions',
            label: 'Voucher',
            render: (r) => (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPrintVoucher(r)}
                    className="text-xs h-7 px-2"
                >
                    <Printer size={12} className="mr-1 text-gray-500" /> Print Voucher
                </Button>
            )
        }
    ];

    return (
        <div className="space-y-6 pb-16">
            <PageHeader
                title="Petty Cash Register (සුළු මුදල් ලෙජරය)"
                description="Daily petty cash float tracking, out-of-pocket office disbursements, and cash voucher printing"
                icon={Coins}
                actions={
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            onClick={() => setIsTopupModalOpen(true)}
                            className="bg-white hover:bg-gray-50 text-indigo-700 border-indigo-200"
                        >
                            <ArrowDownLeft size={15} className="mr-1.5 text-indigo-600" /> Replenish Float (Top-up)
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => setIsExpenseModalOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Plus size={15} className="mr-1.5" /> Log Petty Cash Payout
                        </Button>
                    </div>
                }
            />

            {/* Low Float Warning Banner */}
            {isFloatLow && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-300 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500 text-white rounded-lg">
                            <AlertTriangle size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-950">Petty Cash Float Running Low</p>
                            <p className="text-xs text-amber-800">
                                Current drawer float is <strong className="font-mono">{fmt(currentFloat)}</strong> (below recommended Rs. 5,000 threshold). Please top up from your bank account.
                            </p>
                        </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setIsTopupModalOpen(true)} className="bg-white text-xs border-amber-300 text-amber-900">
                        Top-up Now
                    </Button>
                </div>
            )}

            {/* 4 Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 bg-emerald-50/60 border-emerald-200">
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Current Drawer Float</p>
                    <p className="text-2xl font-black text-emerald-950 mt-1">{fmt(currentFloat)}</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Physical cash in cashier box</p>
                </Card>

                <Card className="p-4 bg-rose-50/60 border-rose-200">
                    <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Total Disbursements</p>
                    <p className="text-2xl font-black text-rose-900 mt-1">{fmt(totalSpent)}</p>
                    <p className="text-[11px] text-rose-700 mt-0.5">Minor payouts logged</p>
                </Card>

                <Card className="p-4 bg-indigo-50/60 border-indigo-200">
                    <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Voucher Count</p>
                    <p className="text-2xl font-black text-indigo-950 mt-1">{pettyCashExpenses.length}</p>
                    <p className="text-[11px] text-indigo-700 mt-0.5">Audited payout vouchers</p>
                </Card>

                <Card className="p-4 bg-gray-50 border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Standard Imprest Limit</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{fmt(25000)}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Base revolving allowance</p>
                </Card>
            </div>

            {/* Transactions Card with Export */}
            <Card>
                <div className="p-4 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by voucher #, category, purpose..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-indigo-500"
                        />
                    </div>

                    <ReportExportActions
                        reportTitle="Petty Cash Register"
                        disabled={isLoading || filteredList.length === 0}
                        getExportData={() => {
                            const headers = ['Voucher #', 'Date', 'Category / Purpose', 'Amount (LKR)', 'Description', 'Receipt Attached'];
                            const rows = filteredList.map((e) => [
                                e.expenseNumber || 'PCV',
                                new Date(e.date).toLocaleDateString('en-LK'),
                                e.category,
                                (e.amount || 0).toFixed(2),
                                e.description || '',
                                e.receiptUrl ? 'YES' : 'NO',
                            ]);
                            rows.push(['', 'TOTAL', '', totalSpent.toFixed(2), '', '']);
                            return {
                                headers,
                                rows,
                                meta: [
                                    ['Current Available Float (LKR)', currentFloat.toFixed(2)],
                                    ['Imprest Limit (LKR)', '25,000.00']
                                ]
                            };
                        }}
                    />
                </div>

                {isLoading ? (
                    <div className="py-20 text-center text-gray-500 text-xs">Loading petty cash ledger...</div>
                ) : filteredList.length === 0 ? (
                    <div className="py-20 text-center text-gray-400 text-xs">No petty cash disbursements recorded.</div>
                ) : (
                    <Table columns={columns} data={filteredList} />
                )}
            </Card>

            {/* Modal: Log Petty Cash Payout */}
            {isExpenseModalOpen && (
                <Modal
                    isOpen={isExpenseModalOpen}
                    onClose={() => setIsExpenseModalOpen(false)}
                    title="Log Petty Cash Payout (සුළු මුදල් ගෙවීම)"
                    size="md"
                >
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
                            toast.error('Please enter a valid payout amount');
                            return;
                        }
                        createExpenseMutation.mutate({
                            ...expenseForm,
                            amount: Number(expenseForm.amount),
                            date: new Date().toISOString().slice(0, 10),
                        });
                    }}>
                        <div className="p-6 space-y-4">
                            <Select
                                label="Expense Category"
                                required
                                options={PETTY_CASH_CATEGORIES.map(c => ({ value: c, label: c }))}
                                value={expenseForm.category}
                                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Payout Amount (LKR)"
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="e.g. 750.00"
                                    value={expenseForm.amount}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                />
                                <Input
                                    label="Paid To (Person / Vendor)"
                                    placeholder="e.g. Courier Rider / Nimal"
                                    value={expenseForm.payee}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, payee: e.target.value })}
                                />
                            </div>

                            <Textarea
                                label="Purpose / Description"
                                rows={2}
                                placeholder="Explain the specific operational need for this payout..."
                                value={expenseForm.description}
                                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                            />

                            {/* File Upload */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Attach Cash Slip Photo (Optional)
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                            setExpenseForm({
                                                ...expenseForm,
                                                receiptUrl: reader.result,
                                                receiptName: file.name
                                            });
                                        };
                                        reader.readAsDataURL(file);
                                    }}
                                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                            </div>

                            <div className="pt-4 flex gap-2">
                                <Button variant="primary" fullWidth type="submit" loading={createExpenseMutation.isPending}>
                                    Save & Generate Voucher
                                </Button>
                                <Button variant="outline" fullWidth onClick={() => setIsExpenseModalOpen(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal: Replenish Float */}
            {isTopupModalOpen && (
                <Modal
                    isOpen={isTopupModalOpen}
                    onClose={() => setIsTopupModalOpen(false)}
                    title="Replenish Petty Cash Float (බැංකුවෙන් මුදල් ලබාගැනීම)"
                    size="md"
                >
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!topupForm.amount || Number(topupForm.amount) <= 0) {
                            toast.error('Please enter a valid top-up amount');
                            return;
                        }
                        createTopupMutation.mutate(topupForm);
                    }}>
                        <div className="p-6 space-y-4">
                            <Select
                                label="Source Bank Account (Deduction)"
                                required
                                placeholder="Select bank account..."
                                options={bankOptions}
                                value={topupForm.sourceBankAccountId}
                                onChange={(e) => setTopupForm({ ...topupForm, sourceBankAccountId: e.target.value })}
                            />

                            <Input
                                label="Replenishment Amount (LKR)"
                                type="number"
                                step="0.01"
                                required
                                placeholder="e.g. 15000.00"
                                value={topupForm.amount}
                                onChange={(e) => setTopupForm({ ...topupForm, amount: e.target.value })}
                            />

                            <Input
                                label="Cheque No / Transfer Reference"
                                placeholder="e.g. CHQ-89412 or ATM Cash Withdrawal"
                                value={topupForm.reference}
                                onChange={(e) => setTopupForm({ ...topupForm, reference: e.target.value })}
                            />

                            <div className="pt-4 flex gap-2">
                                <Button variant="primary" fullWidth type="submit" loading={createTopupMutation.isPending}>
                                    Replenish Drawer Float
                                </Button>
                                <Button variant="outline" fullWidth onClick={() => setIsTopupModalOpen(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Printable Petty Cash Voucher Modal */}
            {printVoucher && (
                <Modal
                    isOpen={!!printVoucher}
                    onClose={() => setPrintVoucher(null)}
                    title={`Petty Cash Voucher — #${printVoucher.expenseNumber || 'PCV'}`}
                    size="md"
                >
                    <div className="p-6 space-y-4">
                        <div className="p-6 bg-white border border-gray-300 rounded-xl space-y-4 font-sans text-xs">
                            <div className="border-b pb-3 flex justify-between items-start">
                                <div>
                                    <h3 className="text-base font-black uppercase text-gray-950">ASIPBOOK (PVT) LTD</h3>
                                    <p className="text-[11px] text-gray-600">Head Office: No. 124, High Level Road, Colombo</p>
                                </div>
                                <div className="text-right">
                                    <span className="inline-block bg-indigo-900 text-white font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                                        PETTY CASH VOUCHER
                                    </span>
                                    <p className="font-mono font-bold text-gray-800 mt-1">{printVoucher.expenseNumber || 'PCV-001'}</p>
                                    <p className="text-[10px] text-gray-500">Date: {new Date(printVoucher.date || Date.now()).toLocaleDateString('en-LK')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Category</p>
                                    <p className="font-bold text-gray-900">{printVoucher.category}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Amount Paid</p>
                                    <p className="font-mono font-black text-rose-700 text-sm">{fmt(printVoucher.amount)}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Description / Purpose</p>
                                    <p className="text-gray-800">{printVoucher.description || 'Minor official expense payout'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 pt-6 text-[10px] text-center">
                                <div>
                                    <div className="border-t border-gray-400 pt-1 font-semibold">Prepared By (Custodian)</div>
                                </div>
                                <div>
                                    <div className="border-t border-gray-400 pt-1 font-semibold">Authorized By (Manager)</div>
                                </div>
                                <div>
                                    <div className="border-t border-gray-400 pt-1 font-semibold">Received By (Payee)</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button variant="outline" onClick={() => setPrintVoucher(null)}>Close</Button>
                            <Button variant="primary" onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700">
                                <Printer size={15} className="mr-1.5" /> Print Voucher
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

