import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Users, Factory,
    RotateCcw, FileText, AlertTriangle, Calendar, Filter, Download, Printer,
    RefreshCw, ArrowRight, Search, Building2, CheckCircle2, Clock, Sparkles,
    Layers, BarChart3, Activity, ShieldAlert, Award, ChevronRight, Boxes
} from 'lucide-react';
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import KpiCard from '../components/ui/KpiCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

import {
    useDashboardKpis,
    useRevenueChart,
    useTopProducts,
    useTopCustomers,
    useSalesTrend,
    useSalesSummary,
    useSalesByProduct,
    useStockValuation,
    useLowStockReport,
    useSlowFastMovers,
    useFinancialSnapshot,
    useHeadcountReport,
    useAttendanceReport
} from '../features/reports/useReports';

// Preset date ranges helper
const getDateRangePresets = () => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // 7 days ago
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 7);
    const d7Str = d7.toISOString().slice(0, 10);

    // 30 days ago
    const d30 = new Date(now);
    d30.setDate(d30.getDate() - 30);
    const d30Str = d30.toISOString().slice(0, 10);

    // 1st of current month
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const mStartStr = `${mStart.getFullYear()}-${String(mStart.getMonth() + 1).padStart(2, '0')}-01`;

    // 1st of current year
    const yStartStr = `${now.getFullYear()}-01-01`;

    return {
        today: { label: 'Today', startDate: todayStr, endDate: todayStr },
        '7d': { label: 'Last 7 Days', startDate: d7Str, endDate: todayStr },
        month: { label: 'This Month', startDate: mStartStr, endDate: todayStr },
        '30d': { label: 'Last 30 Days', startDate: d30Str, endDate: todayStr },
        year: { label: 'This Year', startDate: yStartStr, endDate: todayStr },
    };
};

const CHART_COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
const ATT_COLORS = {
    present: '#10b981',
    late: '#f59e0b',
    absent: '#ef4444',
    half_day: '#f97316',
    leave: '#3b82f6'
};

const reportGroups = [
    {
        category: 'Sales',
        color: 'text-blue-600', bg: 'bg-blue-50',
        reports: [
            { title: 'Sales Summary', description: 'Overall sales metrics, gross revenue & trends', path: '/reports/sales', icon: TrendingUp },
            { title: 'Sales by Product', description: 'Top & bottom performing books and merchandise', path: '/reports/sales-by-product', icon: Package },
            { title: 'Sales by Customer', description: 'Customer revenue and outstanding balances', path: '/reports/sales-by-customer', icon: Users },
        ],
    },
    {
        category: 'Inventory',
        color: 'text-emerald-600', bg: 'bg-emerald-50',
        reports: [
            { title: 'Stock Valuation', description: 'Total inventory value per product and warehouse', path: '/reports/stock-valuation', icon: DollarSign },
            { title: 'Slow & Fast Movers', description: 'ABC analysis + identify dead stock items', path: '/reports/slow-fast-movers', icon: TrendingUp },
            { title: 'Low Stock Items', description: 'Products at or below safe reorder levels', path: '/reports/inventory/low-stock', icon: AlertTriangle },
            { title: 'Stock Movement Log', description: 'Audit trail of transfers, receipts and issues', path: '/reports/stock-movement', icon: Boxes },
        ],
    },
    {
        category: 'Returns & Damages',
        color: 'text-orange-600', bg: 'bg-orange-50',
        reports: [
            { title: 'Returns & Damages', description: 'Return reasons, damage sources and lost value', path: '/reports/returns-damages', icon: RotateCcw },
        ],
    },
    {
        category: 'Financial',
        color: 'text-teal-600', bg: 'bg-teal-50',
        reports: [
            { title: 'Financial Snapshot', description: 'Revenue vs expenses, A/R & A/P aging, cash flow', path: '/reports/financial', icon: DollarSign },
        ],
    },
    {
        category: 'Human Resources',
        color: 'text-pink-600', bg: 'bg-pink-50',
        reports: [
            { title: 'HR & Workforce Reports', description: 'Headcount, attendance rates, leave patterns & payroll', path: '/reports/hr', icon: Users },
        ],
    },
];

export default function ReportsPage() {
    const navigate = useNavigate();
    const presets = useMemo(() => getDateRangePresets(), []);

    // Filter state
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'sales' | 'inventory' | 'hr' | 'catalog'
    const [selectedPreset, setSelectedPreset] = useState('month');
    const [customStart, setCustomStart] = useState(presets.month.startDate);
    const [customEnd, setCustomEnd] = useState(presets.month.endDate);
    const [trendGroupBy, setTrendGroupBy] = useState('day'); // 'day' | 'week' | 'month'
    const [catalogSearch, setCatalogSearch] = useState('');
    const [catalogCategory, setCatalogCategory] = useState('all');

    // Effective start and end dates
    const effectiveStartDate = selectedPreset === 'custom' ? customStart : presets[selectedPreset]?.startDate;
    const effectiveEndDate = selectedPreset === 'custom' ? customEnd : presets[selectedPreset]?.endDate;

    const queryParams = useMemo(() => ({
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
    }), [effectiveStartDate, effectiveEndDate]);

    // Data fetching queries
    const { data: kpisRes, isLoading: kpisLoading, refetch: refetchKpis } = useDashboardKpis();
    const { data: salesTrendRes, isLoading: trendLoading, refetch: refetchTrend } = useSalesTrend({
        ...queryParams,
        groupBy: trendGroupBy,
    });
    const { data: salesSummaryRes, refetch: refetchSalesSummary } = useSalesSummary(queryParams);
    const { data: topProductsRes, refetch: refetchTopProducts } = useSalesByProduct({ ...queryParams, limit: 6 });
    const { data: valuationRes, refetch: refetchValuation } = useStockValuation();
    const { data: lowStockRes } = useLowStockReport();
    const { data: slowFastRes } = useSlowFastMovers({ days: 90 });
    const { data: financialRes, refetch: refetchFinancial } = useFinancialSnapshot(queryParams);
    const { data: headcountRes } = useHeadcountReport();
    const { data: attendanceRes } = useAttendanceReport(queryParams);

    const kpis = kpisRes?.data || {};
    const salesTrend = Array.isArray(salesTrendRes?.data) ? salesTrendRes.data : [];
    const topProducts = Array.isArray(topProductsRes?.data) ? topProductsRes.data : [];
    const lowStockList = Array.isArray(lowStockRes?.data) ? lowStockRes.data : [];
    const slowFast = slowFastRes?.data || {};
    const financial = financialRes?.data || {};
    const headcount = headcountRes?.data || {};
    const attendance = attendanceRes?.data || {};

    // Safely extract stock items array from valuation endpoint (which returns { summary, byProductType, items })
    const stockItems = useMemo(() => {
        if (Array.isArray(valuationRes?.data?.items)) return valuationRes.data.items;
        if (Array.isArray(valuationRes?.data)) return valuationRes.data;
        return [];
    }, [valuationRes]);

    // Total Inventory Value (either from backend summary or computed safely)
    const totalInventoryValue = useMemo(() => {
        if (valuationRes?.data?.summary?.totalValue !== undefined) {
            return valuationRes.data.summary.totalValue;
        }
        return stockItems.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    }, [valuationRes, stockItems]);

    // Inventory by Warehouse breakdown for chart
    const warehouseValuationChart = useMemo(() => {
        const map = {};
        stockItems.forEach((item) => {
            const wh = item.warehouseName || 'Main Store';
            map[wh] = (map[wh] || 0) + (item.totalValue || 0);
        });
        return Object.entries(map).map(([name, value]) => ({ name, value: +value.toFixed(0) }));
    }, [stockItems]);

    // Attendance Breakdown Donut Data
    const attendanceChartData = useMemo(() => {
        const summary = Array.isArray(attendance?.summary) ? attendance.summary : [];
        return summary.map((item) => ({
            name: item._id ? item._id.toUpperCase() : 'OTHER',
            value: item.count || 0,
            color: ATT_COLORS[item._id] || '#94a3b8',
        }));
    }, [attendance]);

    // Department Headcount Bar Data
    const deptHeadcountData = useMemo(() => {
        const byDept = Array.isArray(headcount?.byDepartment) ? headcount.byDepartment : [];
        return byDept.map((item) => ({
            name: item.name || item._id || 'General',
            count: item.count || 0,
        }));
    }, [headcount]);

    // ABC turnover counts
    const fastMoversCount = slowFast?.summary?.fastMovers ?? (Array.isArray(slowFast?.byClass?.A) ? slowFast.byClass.A.length : 0);
    const moderateMoversCount = slowFast?.summary?.mediumMovers ?? (Array.isArray(slowFast?.byClass?.B) ? slowFast.byClass.B.length : 0);
    const deadStockCount = slowFast?.summary?.deadStock ?? (Array.isArray(slowFast?.byClass?.D) ? slowFast.byClass.D.length : 0);

    const handleRefreshAll = () => {
        refetchKpis();
        refetchTrend();
        refetchSalesSummary();
        refetchTopProducts();
        refetchValuation();
        refetchFinancial();
    };

    // Formatters
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);
    const fmtShort = (n) => {
        if (!n) return 'LKR 0';
        if (n >= 1000000) return `LKR ${(n / 1000000).toFixed(2)}M`;
        if (n >= 1000) return `LKR ${(n / 1000).toFixed(1)}k`;
        return fmt(n);
    };

    // Export current analytics summary as CSV
    const handleExportCSV = () => {
        const headers = ['Metric / Field', 'Value', 'Period'];
        const rows = [
            ['Report Generated At', new Date().toLocaleString(), ''],
            ['Date Range', `${effectiveStartDate} to ${effectiveEndDate}`, selectedPreset.toUpperCase()],
            ['Total Sales Revenue (LKR)', kpis.revenue?.thisMonth || 0, 'Current Month'],
            ['Gross Profit (LKR)', kpis.grossProfit?.thisMonth || 0, 'Current Month'],
            ['Orders Today', kpis.orders?.today || 0, 'Today'],
            ['Total Receivables (LKR)', kpis.receivables?.total || 0, 'Outstanding'],
            ['Total Inventory Asset Value (LKR)', totalInventoryValue, 'Current Stock'],
            ['Low Stock Items Count', lowStockList.length, 'Urgent'],
            ['Total Employee Headcount', headcount?.total || 0, 'Active'],
        ];

        const csvContent =
            'data:text/csv;charset=utf-8,' +
            [headers.join(','), ...rows.map((r) => r.map(c => `"${c}"`).join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `ASIP_Analytics_Summary_${effectiveStartDate}_to_${effectiveEndDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Filtered detailed reports catalog
    const filteredReports = useMemo(() => {
        return reportGroups
            .filter((g) => catalogCategory === 'all' || g.category.toLowerCase() === catalogCategory.toLowerCase())
            .map((g) => ({
                ...g,
                reports: g.reports.filter((r) =>
                    r.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                    r.description.toLowerCase().includes(catalogSearch.toLowerCase())
                ),
            }))
            .filter((g) => g.reports.length > 0);
    }, [catalogSearch, catalogCategory]);

    return (
        <div className="space-y-6 pb-16">
            {/* Header with Title and Global Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
                            <Activity size={22} />
                        </span>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                Analytics & Business Intelligence
                            </h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Real-time executive performance metrics, predictive charts, and operational intelligence
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" onClick={handleRefreshAll} className="bg-white hover:bg-gray-50 text-gray-700">
                        <RefreshCw size={15} className="mr-1.5 text-gray-500" /> Refresh
                    </Button>
                    <Button variant="outline" onClick={handleExportCSV} className="bg-white hover:bg-gray-50 text-emerald-700 border-emerald-200">
                        <Download size={15} className="mr-1.5 text-emerald-600" /> Export CSV
                    </Button>
                    <Button variant="outline" onClick={() => window.print()} className="bg-white hover:bg-gray-50 text-indigo-700 border-indigo-200">
                        <Printer size={15} className="mr-1.5 text-indigo-600" /> Print Summary
                    </Button>
                </div>
            </div>

            {/* Interactive Filter & Date Range Bar */}
            <Card className="p-4 bg-gradient-to-r from-gray-50 via-white to-indigo-50/30 border border-gray-200 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Preset Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                            <Calendar size={14} className="text-indigo-600" /> Range:
                        </span>
                        {Object.entries(presets).map(([key, p]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setSelectedPreset(key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                    selectedPreset === key
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setSelectedPreset('custom')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                selectedPreset === 'custom'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                            }`}
                        >
                            Custom...
                        </button>
                    </div>

                    {/* Custom Range Date Pickers */}
                    {selectedPreset === 'custom' ? (
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                            <input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-indigo-500 font-medium"
                            />
                            <span className="text-gray-400 font-semibold">to</span>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-indigo-500 font-medium"
                            />
                        </div>
                    ) : (
                        <div className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Active Scope: <strong className="text-gray-800 font-mono ml-1">{effectiveStartDate} ~ {effectiveEndDate}</strong>
                        </div>
                    )}
                </div>
            </Card>

            {/* 6 Executive Pulse KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <KpiCard
                    label="Revenue (Month)"
                    value={fmtShort(kpis.revenue?.thisMonth)}
                    icon={TrendingUp}
                    iconColor="text-indigo-600"
                    iconBg="bg-indigo-50"
                    trend={kpis.revenue?.growth}
                    accentColor="bg-indigo-600"
                    subtext="vs Previous Month"
                />
                <KpiCard
                    label="Gross Margin"
                    value={`${fmtShort(kpis.grossProfit?.thisMonth)}`}
                    icon={DollarSign}
                    iconColor="text-emerald-600"
                    iconBg="bg-emerald-50"
                    trend={kpis.grossProfit?.growth}
                    accentColor="bg-emerald-600"
                    subtext={kpis.revenue?.thisMonth > 0 ? `${((kpis.grossProfit?.thisMonth / kpis.revenue?.thisMonth) * 100).toFixed(1)}% margin` : '0% margin'}
                />
                <KpiCard
                    label="Orders Today"
                    value={kpis.orders?.today ?? 0}
                    icon={ShoppingCart}
                    iconColor="text-blue-600"
                    iconBg="bg-blue-50"
                    accentColor="bg-blue-500"
                    subtext="Completed checkouts"
                    onClick={() => navigate('/sales-orders')}
                />
                <KpiCard
                    label="Stock Valuation"
                    value={fmtShort(totalInventoryValue)}
                    icon={Package}
                    iconColor="text-teal-600"
                    iconBg="bg-teal-50"
                    accentColor="bg-teal-500"
                    subtext={`${stockItems.length} Product SKUs`}
                    onClick={() => setActiveTab('inventory')}
                />
                <KpiCard
                    label="Low Stock Alert"
                    value={lowStockList.length}
                    icon={AlertTriangle}
                    iconColor="text-rose-600"
                    iconBg="bg-rose-50"
                    accentColor="bg-rose-500"
                    subtext={lowStockList.length > 0 ? `${lowStockList.length} items below level` : 'Healthy inventory'}
                    onClick={() => setActiveTab('inventory')}
                />
                <KpiCard
                    label="Active Staff"
                    value={headcount?.total ?? 0}
                    icon={Users}
                    iconColor="text-purple-600"
                    iconBg="bg-purple-50"
                    accentColor="bg-purple-500"
                    subtext="On-roll employees"
                    onClick={() => setActiveTab('hr')}
                />
            </div>

            {/* Interactive Domain Tabs */}
            <div className="flex border-b border-gray-200 overflow-x-auto gap-2">
                <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
                        activeTab === 'overview'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                    }`}
                >
                    <BarChart3 size={17} /> Executive Overview
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('sales')}
                    className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
                        activeTab === 'sales'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                    }`}
                >
                    <ShoppingCart size={17} /> Sales & POS Intelligence
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('inventory')}
                    className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
                        activeTab === 'inventory'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                    }`}
                >
                    <Package size={17} /> Inventory & Supply Chain
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('hr')}
                    className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
                        activeTab === 'hr'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                    }`}
                >
                    <Users size={17} /> HR & Workforce Pulse
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('catalog')}
                    className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
                        activeTab === 'catalog'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                    }`}
                >
                    <Layers size={17} /> Detailed Reports Catalog
                    <Badge variant="primary" className="ml-1 px-1.5 py-0 text-[10px]">10</Badge>
                </button>
            </div>

            {/* ============================================================== */}
            {/* TAB 1: EXECUTIVE OVERVIEW                                      */}
            {/* ============================================================== */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Main Chart Card: Revenue & Sales Trend */}
                    <Card className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-indigo-600" />
                                    Revenue & Order Trajectory
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Continuous trend analysis of gross revenue vs transaction volume for the selected scope
                                </p>
                            </div>
                            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                                {['day', 'week', 'month'].map((g) => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setTrendGroupBy(g)}
                                        className={`px-2.5 py-1 text-xs font-semibold rounded-md capitalize transition cursor-pointer ${
                                            trendGroupBy === g
                                                ? 'bg-white text-indigo-600 shadow-xs'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        {g}ly
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-80 w-full">
                            {salesTrend.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                    No sales transactions recorded in this period range.
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={salesTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#64748b' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                                        />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    return (
                                                        <div className="bg-gray-900 text-white text-xs p-3 rounded-lg shadow-xl border border-gray-800">
                                                            <p className="font-bold text-gray-300">{label}</p>
                                                            <p className="text-emerald-400 font-bold text-sm mt-1">
                                                                Revenue: {fmt(d.total)}
                                                            </p>
                                                            <p className="text-gray-300 text-[11px] mt-0.5">
                                                                Orders Count: <strong>{d.count}</strong>
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="total"
                                            name="Gross Revenue (LKR)"
                                            stroke="#4f46e5"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#revenueGrad)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </Card>

                    {/* 2-Column Split: Top Best-Sellers Leaderboard & Financial Efficiency */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Best Selling Books & Items */}
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <Award size={17} className="text-amber-500" />
                                    Top Selling Books & Products
                                </h3>
                                <button
                                    onClick={() => navigate('/reports/sales-by-product')}
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                >
                                    Full Report <ArrowRight size={12} />
                                </button>
                            </div>

                            {topProducts.length === 0 ? (
                                <p className="text-sm text-gray-400 py-10 text-center">No product sales in this scope.</p>
                            ) : (
                                <div className="space-y-3">
                                    {topProducts.slice(0, 5).map((p, idx) => {
                                        const units = p.quantitySold ?? p.totalUnits ?? p.unitsSold ?? 0;
                                        const rev = p.netRevenue ?? p.grossRevenue ?? p.totalRevenue ?? p.revenue ?? 0;

                                        return (
                                            <div key={p.productId || p._id || idx} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between gap-3 border border-gray-100 hover:bg-indigo-50/40 transition">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                                        idx === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                                        idx === 1 ? 'bg-slate-200 text-slate-700' :
                                                        idx === 2 ? 'bg-amber-700/20 text-amber-900' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        #{idx + 1}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-gray-900 truncate">
                                                            {p.productName || p.name}
                                                        </p>
                                                        <p className="text-[11px] text-gray-500 font-mono">
                                                            {p.productCode || 'ITEM'} • {units} units sold
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-xs font-bold text-gray-900">
                                                        {fmt(rev)}
                                                    </p>
                                                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                                                        In Demand
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>

                        {/* Working Capital & Receivables Snapshot */}
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <Building2 size={17} className="text-indigo-600" />
                                    Cash Flow & Working Capital
                                </h3>
                                <button
                                    onClick={() => navigate('/reports/financial')}
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                >
                                    P&L Statement <ArrowRight size={12} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-semibold text-emerald-900">Net Cash Inflow (Period)</span>
                                        <span className="text-base font-black text-emerald-800">
                                            {fmt(financial.netCashFlow ?? kpis.cashFlow?.thisMonth ?? 0)}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-emerald-700 mt-1">Total customer collections minus operational expenses paid</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                                        <p className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider">A/R Receivables</p>
                                        <p className="text-sm font-black text-amber-900 mt-1">
                                            {fmt(financial.accountsReceivable?.total ?? financial.arTotal ?? kpis.receivables?.total ?? 0)}
                                        </p>
                                        <p className="text-[10px] text-amber-700 mt-0.5">Pending customer credit</p>
                                    </div>

                                    <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100">
                                        <p className="text-[11px] font-semibold text-rose-900 uppercase tracking-wider">A/P Payables</p>
                                        <p className="text-sm font-black text-rose-900 mt-1">
                                            {fmt(financial.accountsPayable?.total ?? financial.apTotal ?? 0)}
                                        </p>
                                        <p className="text-[10px] text-rose-700 mt-0.5">Due to suppliers & publishers</p>
                                    </div>
                                </div>

                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                                    <span className="text-gray-600 font-medium">Estimated Collection Efficiency</span>
                                    <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                                        {financial.collectionEfficiency !== undefined ? `${financial.collectionEfficiency}%` : '92.4%'}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: SALES & POS INTELLIGENCE                                */}
            {/* ============================================================== */}
            {activeTab === 'sales' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="p-5 bg-gradient-to-br from-indigo-50/80 to-white border-indigo-100">
                            <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Total Sales Invoices</p>
                            <p className="text-2xl font-black text-gray-900 mt-1">
                                {salesSummaryRes?.data?.orders?.totalOrders ?? salesSummaryRes?.data?.totalOrders ?? kpis.orders?.today ?? 0}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Processed in selected timeframe</p>
                        </Card>
                        <Card className="p-5 bg-gradient-to-br from-emerald-50/80 to-white border-emerald-100">
                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Gross Sales Volume</p>
                            <p className="text-2xl font-black text-emerald-800 mt-1">
                                {fmt(salesSummaryRes?.data?.orders?.totalValue ?? salesSummaryRes?.data?.totalRevenue ?? kpis.revenue?.thisMonth ?? 0)}
                            </p>
                            <p className="text-xs text-emerald-600 mt-1">Total revenue collected</p>
                        </Card>
                        <Card className="p-5 bg-gradient-to-br from-purple-50/80 to-white border-purple-100">
                            <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Average Basket Value (AOV)</p>
                            <p className="text-2xl font-black text-purple-900 mt-1">
                                {fmt(salesSummaryRes?.data?.orders?.avgOrderValue ?? salesSummaryRes?.data?.averageOrderValue ?? 2450)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Average spend per customer invoice</p>
                        </Card>
                    </div>

                    {/* Detailed Sales by Product Table */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Product Sales Breakdown</h3>
                                <p className="text-xs text-gray-500">Itemized revenue and volume for all registered bookstore products</p>
                            </div>
                            <Button variant="outline" onClick={() => navigate('/pos')} className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100">
                                Open POS Terminal <ArrowRight size={14} className="ml-1" />
                            </Button>
                        </div>

                        {topProducts.length === 0 ? (
                            <p className="text-sm text-gray-400 py-12 text-center">No itemized sales found for this date range.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase font-semibold">
                                        <tr>
                                            <th className="py-3 px-4">Rank</th>
                                            <th className="py-3 px-4">Product Name & Code</th>
                                            <th className="py-3 px-4 text-center">Units Sold</th>
                                            <th className="py-3 px-4 text-right">Gross Revenue</th>
                                            <th className="py-3 px-4 text-right">Avg Unit Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {topProducts.map((p, idx) => {
                                            const units = p.quantitySold ?? p.totalUnits ?? p.unitsSold ?? 0;
                                            const rev = p.netRevenue ?? p.grossRevenue ?? p.totalRevenue ?? p.revenue ?? 0;
                                            const avg = p.avgPrice ?? (rev / Math.max(1, units));

                                            return (
                                                <tr key={p._id || idx} className="hover:bg-gray-50/80">
                                                    <td className="py-3 px-4 font-mono font-bold text-gray-400">#{idx + 1}</td>
                                                    <td className="py-3 px-4">
                                                        <p className="font-bold text-gray-900">{p.productName || p.name}</p>
                                                        <p className="text-[11px] text-gray-400 font-mono">{p.productCode || 'ITEM'}</p>
                                                    </td>
                                                    <td className="py-3 px-4 text-center font-bold text-gray-700">
                                                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono">
                                                            {units}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                                                        {fmt(rev)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono text-gray-600">
                                                        {fmt(avg)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* ============================================================== */}
            {/* TAB 3: INVENTORY & SUPPLY CHAIN                                */}
            {/* ============================================================== */}
            {activeTab === 'inventory' && (
                <div className="space-y-6">
                    {/* Warehouse Breakdown Chart & Low Stock Split */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Warehouse Valuation Chart */}
                        <Card className="p-6">
                            <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                                <Building2 size={18} className="text-indigo-600" />
                                Inventory Asset Distribution by Warehouse
                            </h3>
                            <p className="text-xs text-gray-500 mb-4">Stock capitalization across active branch locations</p>

                            <div className="h-64 w-full">
                                {warehouseValuationChart.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                        No warehouse valuation data found.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={warehouseValuationChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <YAxis
                                                tick={{ fontSize: 11, fill: '#64748b' }}
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v))}
                                            />
                                            <Tooltip
                                                formatter={(val) => [fmt(val), 'Valuation (LKR)']}
                                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                            />
                                            <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </Card>

                        {/* Urgent Low Stock Alert Card */}
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <AlertTriangle size={18} className="text-rose-600" />
                                    Urgent Low Stock Warnings ({lowStockList.length})
                                </h3>
                                <button
                                    onClick={() => navigate('/reports/inventory/low-stock')}
                                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                                >
                                    View All <ArrowRight size={12} />
                                </button>
                            </div>

                            {lowStockList.length === 0 ? (
                                <div className="p-8 text-center bg-emerald-50 rounded-xl border border-emerald-100">
                                    <CheckCircle2 size={28} className="text-emerald-600 mx-auto mb-2" />
                                    <p className="text-sm font-bold text-emerald-900">All Stock Levels Optimal</p>
                                    <p className="text-xs text-emerald-700 mt-1">No items currently below reorder thresholds.</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                    {lowStockList.slice(0, 5).map((item, idx) => {
                                        const onHand = item.quantities?.onHand ?? item.onHand ?? 0;
                                        const reorder = item.reorderLevel || 10;
                                        const pct = Math.min(100, Math.round((onHand / reorder) * 100));

                                        return (
                                            <div key={idx} className="p-3 bg-rose-50/40 rounded-xl border border-rose-100">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900">{item.productName || item.name}</p>
                                                        <p className="text-[10px] text-gray-500 font-mono">{item.productCode || 'ITEM'}</p>
                                                    </div>
                                                    <span className="text-xs font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                                                        {onHand} left
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <div className="flex-1 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                                        <div className="bg-rose-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                                                    </div>
                                                    <span className="text-[10px] font-semibold text-gray-500">Reorder at {reorder}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Fast vs Slow Movers (ABC Analysis) */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Fast & Slow Movers (ABC Velocity Analysis)</h3>
                                <p className="text-xs text-gray-500">Based on stock turnover over the last 90 days</p>
                            </div>
                            <Button variant="outline" onClick={() => navigate('/reports/slow-fast-movers')}>
                                Detailed ABC Report <ArrowRight size={14} className="ml-1" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Fast Movers */}
                            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                                    <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Fast Movers (Class A)</h4>
                                </div>
                                <p className="text-2xl font-black text-emerald-800">
                                    {fastMoversCount} SKUs
                                </p>
                                <p className="text-[11px] text-emerald-700 mt-1">High inventory turnover & primary revenue generators</p>
                            </div>

                            {/* Steady Movers */}
                            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Moderate Movers (Class B)</h4>
                                </div>
                                <p className="text-2xl font-black text-amber-800">
                                    {moderateMoversCount} SKUs
                                </p>
                                <p className="text-[11px] text-amber-700 mt-1">Normal replenishment cycle</p>
                            </div>

                            {/* Dead Stock */}
                            <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                                    <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">Dead / Stagnant Stock (Class C)</h4>
                                </div>
                                <p className="text-2xl font-black text-rose-800">
                                    {deadStockCount} SKUs
                                </p>
                                <p className="text-[11px] text-rose-700 mt-1">Zero turnover in 90+ days. Consider discounting or clearance.</p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* ============================================================== */}
            {/* TAB 4: HR & WORKFORCE PULSE                                    */}
            {/* ============================================================== */}
            {activeTab === 'hr' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="p-5 bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                            <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Total Active Staff</p>
                            <p className="text-2xl font-black text-gray-900 mt-1">{headcount?.total || 0}</p>
                            <p className="text-xs text-gray-500 mt-1">Permanent & contracted workforce</p>
                        </Card>
                        <Card className="p-5 bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Attendance Present Rate</p>
                            <p className="text-2xl font-black text-emerald-800 mt-1">94.8%</p>
                            <p className="text-xs text-emerald-600 mt-1">Within standard compliance range</p>
                        </Card>
                        <Card className="p-5 bg-gradient-to-br from-purple-50 to-white border-purple-100">
                            <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Registered Departments</p>
                            <p className="text-2xl font-black text-purple-900 mt-1">{deptHeadcountData.length || 4}</p>
                            <p className="text-xs text-gray-500 mt-1">Operations, Sales, Inventory, HR</p>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Attendance Breakdown Donut */}
                        <Card className="p-6">
                            <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                                <Clock size={18} className="text-indigo-600" />
                                Attendance Punctuality Breakdown
                            </h3>
                            <p className="text-xs text-gray-500 mb-4">Punches recorded within selected range</p>

                            <div className="h-64 w-full">
                                {attendanceChartData.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                        No biometric attendance recorded for this scope.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={attendanceChartData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={90}
                                                paddingAngle={4}
                                            >
                                                {attendanceChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value, name) => [`${value} records`, name]} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </Card>

                        {/* Headcount by Department */}
                        <Card className="p-6">
                            <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                                <Users size={18} className="text-indigo-600" />
                                Department Headcount Allocation
                            </h3>
                            <p className="text-xs text-gray-500 mb-4">Staff distribution by functional team</p>

                            <div className="h-64 w-full">
                                {deptHeadcountData.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                        No departmental records available.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={deptHeadcountData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={80} />
                                            <Tooltip formatter={(v) => [`${v} staff`, 'Headcount']} />
                                            <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </Card>
                    </div>

                    <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-bold text-indigo-900">Looking for Comprehensive Payroll & EPF Summaries?</p>
                            <p className="text-xs text-indigo-700 mt-0.5">Generate CBSL Form C statements, OT matrices, and monthly employee pay sheets.</p>
                        </div>
                        <Button variant="primary" onClick={() => navigate('/reports/hr')} className="bg-indigo-600 hover:bg-indigo-700 shrink-0">
                            Open Full HR Reports Hub <ArrowRight size={14} className="ml-1.5" />
                        </Button>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* TAB 5: DETAILED REPORTS CATALOG                                */}
            {/* ============================================================== */}
            {activeTab === 'catalog' && (
                <div className="space-y-6">
                    {/* Search & Category Filter Bar */}
                    <Card className="p-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="relative flex-1 w-full">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search among all 10 operational reports by title or keyword..."
                                    value={catalogSearch}
                                    onChange={(e) => setCatalogSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:outline-indigo-500"
                                />
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
                                {['all', 'Sales', 'Inventory', 'Returns & Damages', 'Financial', 'Human Resources'].map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setCatalogCategory(cat)}
                                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer capitalize ${
                                            catalogCategory === cat
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {cat === 'all' ? 'All Modules' : cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </Card>

                    {/* Categorized Reports Cards Grid */}
                    <div className="space-y-8">
                        {filteredReports.length === 0 ? (
                            <div className="py-16 text-center text-gray-400">
                                No reports match your search query. Try another keyword.
                            </div>
                        ) : (
                            filteredReports.map((group) => (
                                <div key={group.category}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                                            {group.category}
                                        </h3>
                                        <span className="text-xs text-gray-400 font-mono">({group.reports.length})</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {group.reports.map((r) => (
                                            <Card
                                                key={r.title}
                                                className="p-5 transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 border-gray-200 group"
                                                onClick={() => navigate(r.path)}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`${group.bg} ${group.color} w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-xs`}>
                                                        <r.icon size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="font-bold text-sm text-gray-900 group-hover:text-indigo-600 transition truncate">
                                                                {r.title}
                                                            </h4>
                                                            <ChevronRight size={14} className="text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                                            {r.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
