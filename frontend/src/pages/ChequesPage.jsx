import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus, Search, FileCheck, CheckCircle, XCircle, AlertCircle, Clock,
    ExternalLink, Trash2, Calendar, AlertTriangle, Printer, Download,
    Building2, CheckCircle2, ArrowRight
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
import api from '../api/axios';

const BOUNCED_REASONS = [
    '01 - Refer to Drawer / Insufficient Funds',
    '02 - Payment Stopped by Drawer',
    '03 - Signature Incomplete / Differs from Mandate',
    '04 - Cheque is Post-Dated / Stale',
    '05 - Words and Figures Differ',
    '06 - Account Closed / Blocked',
    '07 - Alteration Requires Drawer Full Signature',
];

export default function ChequesPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState({ status: '', direction: '', search: '', page: 1, limit: 100 });
    const [pdcFilter, setPdcFilter] = useState('all'); // 'all' | 'due_today' | 'due_this_week' | 'future_pdc' | 'overdue' | 'cleared' | 'bounced'
    const [statusModal, setStatusModal] = useState(null);
    const [newStatus, setNewStatus] = useState('');
    const [statusDate, setStatusDate] = useState(new Date().toISOString().split('T')[0]);
    const [bouncedReason, setBouncedReason] = useState(BOUNCED_REASONS[0]);
    const [depositedBankAccountId, setDepositedBankAccountId] = useState('');
    const [isDepositSlipOpen, setIsDepositSlipOpen] = useState(false);

    const { data: bankAccountsData } = useQuery({
        queryKey: ['bank-accounts'],
        queryFn: async () => (await api.get('/bank-accounts')).data
    });
    const bankAccounts = bankAccountsData?.data || [];
    const bankOptions = bankAccounts.map(a => ({ value: a._id, label: `${a.accountName} (${a.bankName})` }));

    const { data, isLoading } = useQuery({
        queryKey: ['cheques', filters],
        queryFn: async () => {
            const { data } = await api.get('/cheques', { params: filters });
            return data;
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const res = await api.put(`/cheques/${id}/status`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cheques'] });
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            toast.success('Cheque status updated');
            setStatusModal(null);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to update cheque')
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => (await api.delete(`/cheques/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cheques'] });
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            toast.success('Cheque record deleted');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Delete failed')
    });

    const allCheques = data?.data || [];
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    // PDC Timing Analysis
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const classifiedCheques = useMemo(() => {
        return allCheques.map((c) => {
            const cDate = c.chequeDate ? new Date(c.chequeDate).toISOString().slice(0, 10) : '';
            let pdcCategory = 'regular';

            if (c.status === 'cleared') {
                pdcCategory = 'cleared';
            } else if (c.status === 'bounced') {
                pdcCategory = 'bounced';
            } else if (cDate === today) {
                pdcCategory = 'due_today';
            } else if (cDate > today && cDate <= sevenDaysFromNow) {
                pdcCategory = 'due_this_week';
            } else if (cDate > sevenDaysFromNow) {
                pdcCategory = 'future_pdc';
            } else if (cDate < today) {
                pdcCategory = 'overdue';
            }

            return { ...c, pdcCategory, cDate };
        });
    }, [allCheques, today, sevenDaysFromNow]);

    // Active PDC Counts
    const dueTodayCount = classifiedCheques.filter(c => c.pdcCategory === 'due_today' && c.status === 'pending').length;
    const dueThisWeekCount = classifiedCheques.filter(c => c.pdcCategory === 'due_this_week' && c.status === 'pending').length;
    const overdueCount = classifiedCheques.filter(c => c.pdcCategory === 'overdue' && c.status === 'pending').length;
    const futurePdcCount = classifiedCheques.filter(c => c.pdcCategory === 'future_pdc' && c.status === 'pending').length;
    const clearedCount = classifiedCheques.filter(c => c.status === 'cleared').length;
    const bouncedCount = classifiedCheques.filter(c => c.status === 'bounced').length;

    // Filtered list by smart PDC tab
    const filteredCheques = useMemo(() => {
        if (pdcFilter === 'all') return classifiedCheques;
        if (pdcFilter === 'due_today') return classifiedCheques.filter(c => c.pdcCategory === 'due_today' && c.status === 'pending');
        if (pdcFilter === 'due_this_week') return classifiedCheques.filter(c => ['due_today', 'due_this_week'].includes(c.pdcCategory) && c.status === 'pending');
        if (pdcFilter === 'future_pdc') return classifiedCheques.filter(c => c.pdcCategory === 'future_pdc' && c.status === 'pending');
        if (pdcFilter === 'overdue') return classifiedCheques.filter(c => c.pdcCategory === 'overdue' && c.status === 'pending');
        if (pdcFilter === 'cleared') return classifiedCheques.filter(c => c.status === 'cleared');
        if (pdcFilter === 'bounced') return classifiedCheques.filter(c => c.status === 'bounced');
        return classifiedCheques;
    }, [classifiedCheques, pdcFilter]);

    const totalFilteredAmount = filteredCheques.reduce((sum, c) => sum + (c.amount || 0), 0);

    const columns = [
        { 
            key: 'chequeNumber', 
            label: 'Cheque #', 
            render: (r) => (
                <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-900">{r.chequeNumber}</span>
                    {r.paymentId && (
                        <button 
                            type="button"
                            onClick={() => navigate(`/payments/${r.paymentId?._id || r.paymentId}`)}
                            className="p-1 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                            title="View Linked Payment Record"
                        >
                            <ExternalLink size={12} />
                        </button>
                    )}
                </div>
            )
        },
        { 
            key: 'chequeDate', 
            label: 'Cheque Date', 
            render: (r) => {
                const isOverdue = r.pdcCategory === 'overdue' && r.status === 'pending';
                const isToday = r.pdcCategory === 'due_today' && r.status === 'pending';
                const isThisWeek = r.pdcCategory === 'due_this_week' && r.status === 'pending';

                return (
                    <div>
                        <p className={`font-mono font-semibold text-xs ${isOverdue ? 'text-rose-700 font-bold' : isToday ? 'text-amber-700 font-bold' : 'text-gray-800'}`}>
                            {new Date(r.chequeDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: '2-digit' })}
                        </p>
                        {isToday && <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900">Due Today</span>}
                        {isThisWeek && <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-900">Due This Week</span>}
                        {isOverdue && <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-900">Overdue Banking</span>}
                    </div>
                );
            }
        },
        { key: 'party', label: 'Drawer / Payee Party', render: (r) => <span className="font-medium text-xs text-gray-900">{r.payeeName || r.customerId?.displayName || r.customerId?.name || r.supplierId?.displayName || r.supplierId?.name || '—'}</span> },
        { 
            key: 'bank', 
            label: 'Bank & Branch', 
            render: (r) => (
                <div>
                    <p className="text-xs font-bold text-gray-900">{r.bankName || 'Bank'}</p>
                    <p className="text-[11px] text-gray-500">{r.branchName || 'Branch'}</p>
                </div>
            ) 
        },
        { key: 'amount', label: 'Amount (LKR)', render: (r) => <span className="font-mono font-black text-xs text-gray-900">{fmt(r.amount)}</span> },
        { 
            key: 'direction', 
            label: 'Direction', 
            render: (r) => (
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    r.direction === 'incoming' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}>
                    {r.direction === 'incoming' ? '↓ Incoming (Customer)' : '↑ Outgoing (Supplier)'}
                </span>
            )
        },
        { 
            key: 'status', 
            label: 'Realization Status', 
            render: (r) => {
                if (r.status === 'cleared') return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">CLEARED ✓</span>;
                if (r.status === 'bounced') return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300">BOUNCED ✗</span>;
                if (r.status === 'deposited') return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300">DEPOSITED</span>;
                return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">PENDING (PDC)</span>;
            }
        },
        { 
            key: 'actions', 
            label: 'Actions', 
            render: (r) => (
                <div className="flex items-center gap-1.5">
                    <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => { 
                            setStatusModal(r); 
                            setNewStatus(r.status);
                            setDepositedBankAccountId(r.depositedBankAccountId?._id || bankOptions[0]?.value || '');
                        }}
                        className="text-xs h-7 px-2"
                    >
                        Update
                    </Button>
                    <button 
                        type="button"
                        onClick={() => { if(window.confirm(`Delete cheque record #${r.chequeNumber}?`)) deleteMutation.mutate(r._id) }}
                        className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Delete Cheque"
                        disabled={deleteMutation.isPending}
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            )
        }
    ];

    const handleUpdateStatus = () => {
        const payload = { status: newStatus };
        if (newStatus === 'cleared' || newStatus === 'deposited') {
            payload.clearedDate = statusDate;
            payload.depositedBankAccountId = depositedBankAccountId;
        }
        if (newStatus === 'bounced') {
            payload.bouncedDate = statusDate;
            payload.bouncedReason = bouncedReason;
        }
        updateStatusMutation.mutate({ id: statusModal._id, data: payload });
    };

    return (
        <div className="space-y-6 pb-16">
            <PageHeader 
                title="Cheque Registry & PDC Management" 
                description="Real-time post-dated cheque (PDC) realization tracker, bank deposits, and return management"
                icon={FileCheck}
                actions={
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button 
                            variant="outline" 
                            onClick={() => setIsDepositSlipOpen(true)}
                            className="bg-white hover:bg-gray-50 text-indigo-700 border-indigo-200"
                        >
                            <Printer size={15} className="mr-1.5 text-indigo-600" /> Print Bank Deposit Slip
                        </Button>
                    </div>
                }
            />

            {/* Smart PDC Alert Banner (If pending cheques are due today or this week) */}
            {(dueTodayCount > 0 || dueThisWeekCount > 0 || overdueCount > 0) && (
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-300 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-950">
                                Attention: Post-Dated Cheques Requiring Realization
                            </p>
                            <p className="text-xs text-amber-800 mt-0.5">
                                You have <strong className="text-rose-700">{dueTodayCount} cheque(s) due today</strong>, <strong className="text-amber-900">{dueThisWeekCount} cheque(s) due this week</strong>, and <strong className="text-red-800">{overdueCount} overdue cheque(s)</strong> awaiting banking.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setPdcFilter('due_this_week')}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                        >
                            View Due Cheques <ArrowRight size={13} className="ml-1" />
                        </Button>
                    </div>
                </div>
            )}

            {/* 6 PDC Metric Pulse Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Card className="p-3.5 border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md transition" onClick={() => setPdcFilter('due_today')}>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Due Today</p>
                    <p className="text-2xl font-black text-amber-600 mt-0.5">{dueTodayCount}</p>
                    <span className="text-[10px] text-amber-700 font-semibold">Ready to bank</span>
                </Card>

                <Card className="p-3.5 border-l-4 border-l-indigo-500 cursor-pointer hover:shadow-md transition" onClick={() => setPdcFilter('due_this_week')}>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Due This Week</p>
                    <p className="text-2xl font-black text-indigo-600 mt-0.5">{dueThisWeekCount}</p>
                    <span className="text-[10px] text-indigo-700 font-semibold">PDC Realization</span>
                </Card>

                <Card className="p-3.5 border-l-4 border-l-purple-500 cursor-pointer hover:shadow-md transition" onClick={() => setPdcFilter('future_pdc')}>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Future PDCs</p>
                    <p className="text-2xl font-black text-purple-600 mt-0.5">{futurePdcCount}</p>
                    <span className="text-[10px] text-gray-500 font-semibold">&gt; 7 days out</span>
                </Card>

                <Card className="p-3.5 border-l-4 border-l-rose-500 cursor-pointer hover:shadow-md transition" onClick={() => setPdcFilter('overdue')}>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Overdue</p>
                    <p className="text-2xl font-black text-rose-600 mt-0.5">{overdueCount}</p>
                    <span className="text-[10px] text-rose-700 font-semibold">Past cheque date</span>
                </Card>

                <Card className="p-3.5 border-l-4 border-l-emerald-500 cursor-pointer hover:shadow-md transition" onClick={() => setPdcFilter('cleared')}>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Cleared</p>
                    <p className="text-2xl font-black text-emerald-600 mt-0.5">{clearedCount}</p>
                    <span className="text-[10px] text-emerald-700 font-semibold">Bank credited</span>
                </Card>

                <Card className="p-3.5 border-l-4 border-l-red-600 cursor-pointer hover:shadow-md transition" onClick={() => setPdcFilter('bounced')}>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Bounced</p>
                    <p className="text-2xl font-black text-red-600 mt-0.5">{bouncedCount}</p>
                    <span className="text-[10px] text-red-700 font-semibold">Returned cheques</span>
                </Card>
            </div>

            {/* Smart PDC Filter Pills Bar */}
            <div className="flex items-center gap-1.5 flex-wrap border-b border-gray-200 pb-3">
                {[
                    { id: 'all', label: 'All Cheques' },
                    { id: 'due_this_week', label: 'Due This Week (PDC)' },
                    { id: 'due_today', label: 'Due Today' },
                    { id: 'future_pdc', label: 'Future PDCs' },
                    { id: 'overdue', label: 'Overdue Banking' },
                    { id: 'cleared', label: 'Cleared' },
                    { id: 'bounced', label: 'Bounced' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPdcFilter(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            pdcFilter === tab.id
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <Card>
                <div className="p-4 border-b flex flex-wrap gap-4 items-center justify-between">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search by cheque number, drawer name, bank..." 
                            className="w-full pl-9 pr-4 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={filters.search}
                            onChange={(e) => setFilters({...filters, search: e.target.value, page: 1})}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Select 
                            className="w-36 text-xs"
                            options={[
                                { value: '', label: 'All Types' },
                                { value: 'incoming', label: 'Incoming' },
                                { value: 'outgoing', label: 'Outgoing' },
                            ]}
                            value={filters.direction}
                            onChange={(e) => setFilters({...filters, direction: e.target.value, page: 1})}
                        />
                        <div className="text-xs font-semibold text-gray-600 px-3 py-2 bg-gray-50 rounded-lg border">
                            Total: <strong className="text-gray-900 font-mono ml-1">{fmt(totalFilteredAmount)}</strong>
                        </div>
                    </div>
                </div>
                
                {isLoading ? (
                    <div className="py-20 text-center text-gray-500 text-xs">Loading cheque registry...</div>
                ) : filteredCheques.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 text-xs">No cheques match the selected filter.</div>
                ) : (
                    <Table columns={columns} data={filteredCheques} />
                )}
            </Card>

            {/* Status Update Modal */}
            <Modal 
                isOpen={!!statusModal} 
                onClose={() => setStatusModal(null)} 
                title={`Update Cheque Realization — #${statusModal?.chequeNumber}`}
                size="md"
            >
                <div className="p-6 space-y-4">
                    <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                        <p><strong className="text-gray-700">Amount:</strong> <span className="font-mono text-emerald-700 font-bold">{fmt(statusModal?.amount)}</span></p>
                        <p><strong className="text-gray-700">Cheque Date:</strong> {new Date(statusModal?.chequeDate).toLocaleDateString('en-LK')}</p>
                        <p><strong className="text-gray-700">Party:</strong> {statusModal?.payeeName || statusModal?.customerId?.displayName || '—'}</p>
                    </div>

                    <Select 
                        label="New Status"
                        options={[
                            { value: 'pending', label: 'Pending Realization' },
                            { value: 'deposited', label: 'Deposited in Bank' },
                            { value: 'cleared', label: 'Cleared (Realized into Account)' },
                            { value: 'bounced', label: 'Bounced / Returned' },
                            { value: 'cancelled', label: 'Cancelled' },
                        ]}
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                    />
                    
                    {(newStatus === 'cleared' || newStatus === 'deposited' || newStatus === 'bounced') && (
                        <Input 
                            label={newStatus === 'cleared' ? 'Cleared Realization Date' : newStatus === 'deposited' ? 'Deposit Date' : 'Bounced Return Date'}
                            type="date"
                            value={statusDate}
                            onChange={(e) => setStatusDate(e.target.value)}
                        />
                    )}

                    {(newStatus === 'cleared' || newStatus === 'deposited') && (
                        <Select 
                            label="Target Bank Account"
                            required
                            placeholder="Select bank account..."
                            options={bankOptions}
                            value={depositedBankAccountId}
                            onChange={(e) => setDepositedBankAccountId(e.target.value)}
                        />
                    )}

                    {newStatus === 'bounced' && (
                        <Select 
                            label="Standard Return Reason"
                            options={BOUNCED_REASONS.map(r => ({ value: r, label: r }))}
                            value={bouncedReason}
                            onChange={(e) => setBouncedReason(e.target.value)}
                        />
                    )}

                    <div className="pt-4 flex gap-2">
                        <Button variant="primary" fullWidth onClick={handleUpdateStatus} loading={updateStatusMutation.isPending}>
                            Save & Update Cheque
                        </Button>
                        <Button variant="outline" fullWidth onClick={() => setStatusModal(null)}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Printable Bank Deposit Slip Modal */}
            {isDepositSlipOpen && (
                <Modal
                    isOpen={isDepositSlipOpen}
                    onClose={() => setIsDepositSlipOpen(false)}
                    title="Print Bank Cheque Deposit Slip"
                    size="lg"
                >
                    <div className="p-6 space-y-4">
                        <div className="p-6 bg-white border border-gray-300 rounded-xl space-y-4 font-sans text-xs" id="printable-deposit-slip">
                            <div className="border-b pb-3 flex justify-between items-start">
                                <div>
                                    <h3 className="text-base font-black uppercase text-gray-950">ASIPBOOK (PVT) LTD</h3>
                                    <p className="text-[11px] text-gray-600">Cheque Banking Deposit Summary • Reg No: PV-89412</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-indigo-900">BANK DEPOSIT SLIP</p>
                                    <p className="text-[10px] text-gray-500">Date: {new Date().toLocaleDateString('en-LK')}</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-gray-100 font-bold border-b">
                                        <tr>
                                            <th className="py-2 px-3">#</th>
                                            <th className="py-2 px-3">Cheque #</th>
                                            <th className="py-2 px-3">Drawer Party</th>
                                            <th className="py-2 px-3">Bank & Branch</th>
                                            <th className="py-2 px-3 text-right">Amount (LKR)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredCheques.filter(c => c.direction === 'incoming').map((c, idx) => (
                                            <tr key={c._id}>
                                                <td className="py-2 px-3 font-mono">{idx + 1}</td>
                                                <td className="py-2 px-3 font-mono font-bold">{c.chequeNumber}</td>
                                                <td className="py-2 px-3">{c.payeeName || c.customerId?.displayName || 'Customer'}</td>
                                                <td className="py-2 px-3">{c.bankName} - {c.branchName}</td>
                                                <td className="py-2 px-3 text-right font-mono font-bold">{fmt(c.amount)}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-gray-50 font-bold border-t-2">
                                            <td colSpan={4} className="py-2 px-3 text-right uppercase">Total Deposit Value:</td>
                                            <td className="py-2 px-3 text-right font-mono text-indigo-950">{fmt(totalFilteredAmount)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="grid grid-cols-2 gap-8 pt-8 text-[11px]">
                                <div>
                                    <div className="border-t border-gray-400 pt-1 text-center font-semibold">Deposited By (Cashier Signature)</div>
                                </div>
                                <div>
                                    <div className="border-t border-gray-400 pt-1 text-center font-semibold">Bank Officer Stamp & Signature</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button variant="outline" onClick={() => setIsDepositSlipOpen(false)}>Close</Button>
                            <Button variant="primary" onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700">
                                <Printer size={15} className="mr-1.5" /> Print Deposit Slip
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
