import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BookOpen, Search, ArrowUpRight, ArrowDownLeft, Landmark, Calendar,
    Filter, Download, Printer, RefreshCw, DollarSign, Wallet
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import ReportExportActions from '../components/reports/ReportExportActions';
import api from '../api/axios';

export default function CashBookPage() {
    const today = new Date().toISOString().slice(0, 10);
    const startOfMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

    const [startDate, setStartDate] = useState(startOfMonth);
    const [endDate, setEndDate] = useState(today);
    const [bankAccountId, setBankAccountId] = useState('');
    const [directionFilter, setDirectionFilter] = useState('all'); // 'all' | 'in' | 'out'
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch Bank Accounts for filter dropdown
    const { data: accountsData } = useQuery({
        queryKey: ['bank-accounts'],
        queryFn: async () => (await api.get('/bank-accounts')).data
    });
    const bankAccounts = accountsData?.data || [];
    const bankOptions = [
        { value: '', label: 'All Accounts & Cash Drawers' },
        ...bankAccounts.map((a) => ({ value: a._id, label: `${a.accountName} (${a.bankName})` }))
    ];

    // Fetch Cash Book Ledger Data
    const { data: cashBookData, isLoading, refetch } = useQuery({
        queryKey: ['cash-book', startDate, endDate, bankAccountId],
        queryFn: async () => {
            const { data } = await api.get('/financial-reports/cash-book', {
                params: {
                    startDate,
                    endDate,
                    bankAccountId: bankAccountId || undefined,
                }
            });
            return data;
        }
    });

    const book = cashBookData?.data || {};
    const summary = book.summary || { totalIn: 0, totalOut: 0, netCashFlow: 0, transactionCount: 0 };
    const transactions = book.transactions || [];

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    // Filter transactions by direction and search keyword
    const filteredTransactions = useMemo(() => {
        return transactions.filter((t) => {
            if (directionFilter === 'in' && t.direction !== 'in') return false;
            if (directionFilter === 'out' && t.direction !== 'out') return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchRef = (t.ref || '').toLowerCase().includes(q);
                const matchParty = (t.party || '').toLowerCase().includes(q);
                const matchCategory = (t.category || '').toLowerCase().includes(q);
                const matchNotes = (t.notes || '').toLowerCase().includes(q);
                if (!matchRef && !matchParty && !matchCategory && !matchNotes) return false;
            }
            return true;
        });
    }, [transactions, directionFilter, searchQuery]);

    const columns = [
        {
            key: 'date',
            label: 'Date & Ref',
            render: (r) => (
                <div>
                    <p className="font-mono text-xs font-bold text-gray-900">{r.ref}</p>
                    <p className="text-[11px] text-gray-500">{new Date(r.date).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: '2-digit' })}</p>
                </div>
            )
        },
        {
            key: 'category',
            label: 'Transaction Type',
            render: (r) => (
                <div className="flex items-center gap-1.5">
                    <span className={`p-1 rounded-full ${r.direction === 'in' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {r.direction === 'in' ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                    </span>
                    <div>
                        <p className="text-xs font-bold text-gray-900">{r.category}</p>
                        <p className="text-[10px] text-gray-400 font-mono uppercase">{r.method?.replace(/_/g, ' ')}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'party',
            label: 'Party / Payee',
            render: (r) => (
                <div>
                    <p className="text-xs font-semibold text-gray-900">{r.party}</p>
                    {r.notes && <p className="text-[11px] text-gray-500 truncate max-w-[200px]">{r.notes}</p>}
                </div>
            )
        },
        {
            key: 'account',
            label: 'Bank / Cash Account',
            render: (r) => (
                <span className="text-xs text-gray-700 font-medium bg-gray-100 px-2 py-0.5 rounded">
                    {r.account}
                </span>
            )
        },
        {
            key: 'moneyIn',
            label: 'Money In (LKR)',
            render: (r) => r.moneyIn > 0 ? (
                <span className="font-mono font-bold text-xs text-emerald-700">
                    +{fmt(r.moneyIn)}
                </span>
            ) : <span className="text-gray-300 font-mono text-xs">—</span>
        },
        {
            key: 'moneyOut',
            label: 'Money Out (LKR)',
            render: (r) => r.moneyOut > 0 ? (
                <span className="font-mono font-bold text-xs text-rose-700">
                    -{fmt(r.moneyOut)}
                </span>
            ) : <span className="text-gray-300 font-mono text-xs">—</span>
        },
        {
            key: 'runningBalance',
            label: 'Running Balance',
            render: (r) => (
                <span className="font-mono font-black text-xs text-gray-950">
                    {fmt(r.runningBalance)}
                </span>
            )
        }
    ];

    return (
        <div className="space-y-6 pb-16">
            <PageHeader
                title="Unified Cash & Bank Book"
                description="Consolidated running cash and bank ledger tracking all customer inflows, operating expenses, and supplier payouts"
                icon={BookOpen}
                actions={
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" onClick={() => refetch()} className="bg-white hover:bg-gray-50 text-gray-700">
                            <RefreshCw size={15} className="mr-1.5 text-gray-500" /> Refresh
                        </Button>
                        <ReportExportActions
                            reportTitle="Unified Cash & Bank Book"
                            disabled={isLoading || transactions.length === 0}
                            getExportData={() => {
                                const headers = ['Date', 'Reference #', 'Category / Type', 'Party / Payee', 'Bank / Cash Account', 'Money In (LKR)', 'Money Out (LKR)', 'Running Balance (LKR)', 'Notes'];
                                const rows = filteredTransactions.map((t) => [
                                    new Date(t.date).toLocaleDateString('en-LK'),
                                    t.ref,
                                    t.category,
                                    t.party,
                                    t.account,
                                    t.moneyIn || 0,
                                    t.moneyOut || 0,
                                    t.runningBalance || 0,
                                    t.notes || '',
                                ]);
                                return {
                                    headers,
                                    rows,
                                    meta: [
                                        ['Period Scope', `${startDate} to ${endDate}`],
                                        ['Total Inflow (LKR)', summary.totalIn],
                                        ['Total Outflow (LKR)', summary.totalOut],
                                        ['Net Cash Flow (LKR)', summary.netCashFlow],
                                    ]
                                };
                            }}
                        />
                    </div>
                }
            />

            {/* 4 KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 bg-emerald-50/60 border-emerald-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Cash Inflow</p>
                            <p className="text-2xl font-black text-emerald-900 mt-1">{fmt(summary.totalIn)}</p>
                            <p className="text-[11px] text-emerald-700 mt-0.5">Collections, POS sales & deposits</p>
                        </div>
                        <span className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                            <ArrowDownLeft size={20} />
                        </span>
                    </div>
                </Card>

                <Card className="p-4 bg-rose-50/60 border-rose-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Total Cash Outflow</p>
                            <p className="text-2xl font-black text-rose-900 mt-1">{fmt(summary.totalOut)}</p>
                            <p className="text-[11px] text-rose-700 mt-0.5">Supplier bills, expenses & payouts</p>
                        </div>
                        <span className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                            <ArrowUpRight size={20} />
                        </span>
                    </div>
                </Card>

                <Card className="p-4 bg-indigo-50/60 border-indigo-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Net Cash Flow (Scope)</p>
                            <p className={`text-2xl font-black mt-1 ${summary.netCashFlow >= 0 ? 'text-indigo-950' : 'text-rose-700'}`}>
                                {fmt(summary.netCashFlow)}
                            </p>
                            <p className="text-[11px] text-indigo-700 mt-0.5">Inflow minus Outflow balance</p>
                        </div>
                        <span className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                            <Wallet size={20} />
                        </span>
                    </div>
                </Card>

                <Card className="p-4 bg-gray-50 border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ledger Entries</p>
                            <p className="text-2xl font-black text-gray-900 mt-1">{filteredTransactions.length}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">Total audited transactions</p>
                        </div>
                        <span className="p-2.5 bg-gray-200 text-gray-700 rounded-xl">
                            <BookOpen size={20} />
                        </span>
                    </div>
                </Card>
            </div>

            {/* Filter and Search Bar */}
            <Card className="p-4">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium"
                            />
                            <span className="text-gray-400 text-xs">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium"
                            />
                        </div>

                        <div className="w-56">
                            <Select
                                options={bankOptions}
                                value={bankAccountId}
                                onChange={(e) => setBankAccountId(e.target.value)}
                                className="text-xs"
                            />
                        </div>

                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'in', label: 'Money In (+)' },
                                { id: 'out', label: 'Money Out (-)' },
                            ].map((dir) => (
                                <button
                                    key={dir.id}
                                    type="button"
                                    onClick={() => setDirectionFilter(dir.id)}
                                    className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer ${
                                        directionFilter === dir.id ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    {dir.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative min-w-[220px]">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Filter by ref, party, notes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-indigo-500"
                        />
                    </div>
                </div>
            </Card>

            {/* Ledger Transactions Table */}
            <Card>
                {isLoading ? (
                    <div className="py-20 text-center text-gray-500 text-xs">Computing cash book ledger...</div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="py-20 text-center text-gray-400 text-xs">No cash or bank transactions found in this period.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table columns={columns} data={filteredTransactions} />
                    </div>
                )}
            </Card>
        </div>
    );
}

