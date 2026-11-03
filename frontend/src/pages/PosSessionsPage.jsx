import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Calendar as CalendarIcon, Filter, X, RefreshCw, Clock, User,
    FileText, ArrowLeftRight, PiggyBank, ArrowDownRight, ArrowUpRight, ShieldAlert
} from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import { posSessionsApi } from '../features/posSessions/posSessionsApi';
import { usersApi } from '../features/users/usersApi';

export default function PosSessionsPage() {
    const navigate = useNavigate();

    // Filters State
    const [filters, setFilters] = useState({
        userId: '',
        startDate: '',
        endDate: '',
        page: 1,
        limit: 15,
    });

    // Fetch cashiers for filtering
    const { data: usersRes } = useQuery({
        queryKey: ['users', { isActive: true, limit: 100 }],
        queryFn: () => usersApi.list({ isActive: true, limit: 100 }),
    });

    // Fetch POS register sessions
    const { data: sessionsRes, isLoading, refetch } = useQuery({
        queryKey: ['pos-sessions', filters],
        queryFn: () => posSessionsApi.list({
            ...filters,
            userId: filters.userId || undefined,
            startDate: filters.startDate || undefined,
            endDate: filters.endDate || undefined,
        }),
    });

    const sessions = sessionsRes?.data || [];
    const total = sessionsRes?.total || 0;
    const totalPages = sessionsRes?.totalPages || 1;
    const users = usersRes?.data || [];

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(n || 0);

    const fmtDate = (d) => d ? new Date(d).toLocaleString('en-LK', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '—';

    const clearFilters = () => {
        setFilters({ userId: '', startDate: '', endDate: '', page: 1, limit: 15 });
    };

    const hasFilters = filters.userId || filters.startDate || filters.endDate;

    const columns = [
        {
            key: 'cashier',
            label: 'Cashier',
            render: (row) => {
                const name = row.userId
                    ? `${row.userId.firstName || ''} ${row.userId.lastName || ''}`.trim() || row.userId.email
                    : 'Unknown User';
                return (
                    <div className="flex items-center space-x-2">
                        <div className="bg-indigo-50 text-indigo-700 p-1.5 rounded-full">
                            <User size={14} />
                        </div>
                        <span className="font-semibold text-gray-900">{name}</span>
                    </div>
                );
            }
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => (
                <Badge variant={row.status === 'open' ? 'success' : 'secondary'} className="capitalize">
                    {row.status}
                </Badge>
            )
        },
        {
            key: 'openedAt',
            label: 'Opened At',
            render: (row) => (
                <div className="flex items-center space-x-1.5 text-xs text-gray-500">
                    <Clock size={12} />
                    <span>{fmtDate(row.openedAt)}</span>
                </div>
            )
        },
        {
            key: 'closedAt',
            label: 'Closed At',
            render: (row) => (
                <div className="flex items-center space-x-1.5 text-xs text-gray-500">
                    <Clock size={12} />
                    <span>{row.closedAt ? fmtDate(row.closedAt) : 'Active Session'}</span>
                </div>
            )
        },
        {
            key: 'openingBalance',
            label: 'Opening Bal',
            render: (row) => <span className="font-mono text-xs">{fmt(row.openingBalance)}</span>
        },
        {
            key: 'cashSales',
            label: 'Cash Sales',
            render: (row) => <span className="font-mono text-xs text-emerald-600 font-medium">+{fmt(row.cashSales)}</span>
        },
        {
            key: 'cashExpenses',
            label: 'Cash Exp',
            render: (row) => <span className="font-mono text-xs text-red-500 font-medium">-{fmt(row.cashExpenses)}</span>
        },
        {
            key: 'expectedClosing',
            label: 'Expected Bal',
            render: (row) => {
                const expected = (row.openingBalance || 0) + (row.cashSales || 0) - (row.cashExpenses || 0);
                return <span className="font-mono text-xs font-semibold">{fmt(expected)}</span>;
            }
        },
        {
            key: 'actualClosing',
            label: 'Actual Bal',
            render: (row) => (
                row.status === 'closed' ? (
                    <span className="font-mono text-xs font-semibold">{fmt(row.actualClosingBalance)}</span>
                ) : (
                    <span className="text-xs text-gray-400 italic">Open Register</span>
                )
            )
        },
        {
            key: 'difference',
            label: 'Discrepancy',
            render: (row) => {
                if (row.status === 'open') return <span className="text-xs text-gray-400">—</span>;
                const expected = (row.openingBalance || 0) + (row.cashSales || 0) - (row.cashExpenses || 0);
                const difference = (row.actualClosingBalance || 0) - expected;
                
                if (difference === 0) {
                    return <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Balanced</span>;
                }
                const isOver = difference > 0;
                return (
                    <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${isOver ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50'}`}>
                        {isOver ? '+' : ''}{fmt(difference)}
                    </span>
                );
            }
        },
        {
            key: 'notes',
            label: 'Notes',
            render: (row) => (
                <span className="text-xs text-gray-500 max-w-[200px] truncate block" title={row.notes}>
                    {row.notes || '—'}
                </span>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="POS Sessions"
                description="Monitor active and closed cashier register sessions, cash flows, and balance discrepancies."
            >
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="shadow-sm">
                        <RefreshCw size={14} className="mr-1" /> Refresh
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => navigate('/pos')} className="shadow-md bg-indigo-600 hover:bg-indigo-700">
                        Open POS Terminal
                    </Button>
                </div>
            </PageHeader>

            {/* Overview KPI row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-white shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="bg-indigo-50 text-indigo-600 p-3 rounded-lg">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Registers</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                            {sessions.filter(s => s.status === 'open').length}
                        </p>
                    </div>
                </Card>
                
                <Card className="p-4 bg-white shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg">
                        <ArrowUpRight size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cash Sales</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-1">
                            {fmt(sessions.reduce((acc, s) => acc + (s.cashSales || 0), 0))}
                        </p>
                    </div>
                </Card>

                <Card className="p-4 bg-white shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="bg-rose-50 text-rose-600 p-3 rounded-lg">
                        <ArrowDownRight size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cash Expenses</p>
                        <p className="text-2xl font-bold text-rose-600 mt-1">
                            {fmt(sessions.reduce((acc, s) => acc + (s.cashExpenses || 0), 0))}
                        </p>
                    </div>
                </Card>

                <Card className="p-4 bg-white shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="bg-amber-50 text-amber-600 p-3 rounded-lg">
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Discrepancies</p>
                        <p className="text-2xl font-bold text-amber-700 mt-1">
                            {fmt(sessions.reduce((acc, s) => {
                                if (s.status === 'open') return acc;
                                const expected = (s.openingBalance || 0) + (s.cashSales || 0) - (s.cashExpenses || 0);
                                return acc + ((s.actualClosingBalance || 0) - expected);
                            }, 0))}
                        </p>
                    </div>
                </Card>
            </div>

            {/* Filters Bar */}
            <Card className="p-5 bg-white shadow-sm border border-gray-150 rounded-xl">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Cashier</label>
                        <Select
                            value={filters.userId}
                            onChange={(e) => setFilters(f => ({ ...f, userId: e.target.value, page: 1 }))}
                            className="w-full"
                        >
                            <option value="">All Cashiers</option>
                            {users.map(u => (
                                <option key={u._id} value={u._id}>
                                    {u.firstName || ''} {u.lastName || ''} ({u.email})
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Start Date</label>
                        <Input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value, page: 1 }))}
                            className="w-full"
                        />
                    </div>

                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">End Date</label>
                        <Input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value, page: 1 }))}
                            className="w-full"
                        />
                    </div>

                    {hasFilters && (
                        <Button
                            variant="outline"
                            onClick={clearFilters}
                            className="h-10 text-gray-600 border-gray-300 hover:bg-gray-50 flex items-center justify-center px-4"
                        >
                            <X size={14} className="mr-1" /> Clear
                        </Button>
                    )}
                </div>
            </Card>

            {/* Register Sessions Table */}
            <Card className="shadow-md border border-gray-150 overflow-hidden rounded-xl bg-white">
                {isLoading ? (
                    <div className="flex justify-center items-center py-24">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                    </div>
                ) : sessions.length === 0 ? (
                    <EmptyState
                        title="No POS Sessions Found"
                        description="There are no register histories matches your selection or filter queries."
                        icon={Clock}
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <Table columns={columns} data={sessions} />
                        </div>
                        {totalPages > 1 && (
                            <div className="p-4 border-t bg-gray-50">
                                <Pagination
                                    currentPage={filters.page}
                                    totalPages={totalPages}
                                    onPageChange={(page) => setFilters(f => ({ ...f, page }))}
                                />
                            </div>
                        )}
                    </>
                )}
            </Card>
        </div>
    );
}
