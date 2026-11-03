import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import KpiCard from '../../components/ui/KpiCard';
import Badge from '../../components/ui/Badge';
import ReportExportActions from '../../components/reports/ReportExportActions';
import {
    useHeadcountReport, useAttendanceReport, useLeavePatternsReport, usePayrollSummaryReport,
} from '../../features/reports/useReports';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function HrReportsPage() {
    const navigate = useNavigate();
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const { data: headData } = useHeadcountReport();
    const { data: attData } = useAttendanceReport({ startDate, endDate });
    const { data: leaveData } = useLeavePatternsReport({ year });
    const { data: payrollData } = usePayrollSummaryReport({ year });

    const head = headData?.data;
    const att = attData?.data;
    const leave = leaveData?.data;
    const payroll = payrollData?.data;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(n || 0);

    return (
        <div>
            <PageHeader
                title="HR & Workforce Performance Reports"
                description="Staff headcount, biometric attendance, leave patterns, and annual payroll compensation"
                actions={
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" onClick={() => navigate('/reports')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back to Reports
                        </Button>
                        <ReportExportActions
                            reportTitle="HR Workforce and Payroll Report"
                            disabled={!head}
                            getExportData={() => {
                                const headers = ['Section', 'Category / Employee', 'Metric 1', 'Metric 2', 'Metric 3 / Total'];
                                const rows = [
                                    ['HEADCOUNT', 'Total On-Roll Employees', head?.total || 0, 'Active', head?.byStatus?.find(s => s._id === 'active')?.count || 0],
                                    ['', '', '', '', ''],
                                    ['DEPARTMENT HEADCOUNT', 'Department Name', 'Staff Count', '', ''],
                                    ...(head?.byDepartment || []).map((dept) => [
                                        'DEPARTMENT', dept.name || 'Unassigned', dept.count, '', ''
                                    ]),
                                    ['', '', '', '', ''],
                                    ['ATTENDANCE BY EMPLOYEE', 'Employee Name & Code', 'Present Days', 'Late Days', 'Absent Days'],
                                    ...(att?.byEmployee || []).map((emp) => [
                                        'ATTENDANCE',
                                        `${emp.employeeName} (${emp.employeeCode})`,
                                        emp.present || 0,
                                        emp.late || 0,
                                        emp.absent || 0
                                    ]),
                                    ['', '', '', '', ''],
                                    ['MONTHLY PAYROLL SUMMARY', 'Month', 'Staff Count', 'Gross Wages (LKR)', 'Net Payable (LKR)'],
                                    ...(payroll?.byMonth || []).map((pm) => [
                                        'PAYROLL',
                                        monthNames[(pm.month || 1) - 1] || `M${pm.month}`,
                                        pm.employeeCount || 0,
                                        (pm.totalGross || 0).toFixed(2),
                                        (pm.totalNet || 0).toFixed(2)
                                    ])
                                ];
                                return {
                                    headers,
                                    rows,
                                    meta: [
                                        ['Calendar Year', year],
                                        ['Attendance Date Range', `${startDate} to ${endDate}`]
                                    ]
                                };
                            }}
                        />
                    </div>
                }
            />

            {head && (
                <>
                    <h3 className="text-sm font-semibold mb-3">Headcount</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <KpiCard label="Total Employees" value={head.total} />
                        <KpiCard label="Departments" value={head.byDepartment.length} />
                        <KpiCard label="Active"
                            value={head.byStatus.find((s) => s._id === 'active')?.count || 0} />
                        <KpiCard label="On Probation"
                            value={head.byStatus.find((s) => s._id === 'probation')?.count || 0} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <Card>
                            <div className="px-6 py-4 border-b"><h3 className="text-sm font-semibold">By Department</h3></div>
                            <Table columns={[
                                { key: 'name', label: 'Department', render: (r) => r.name || 'Unassigned' },
                                { key: 'count', label: 'Headcount' },
                            ]} data={head.byDepartment} />
                        </Card>
                        <Card>
                            <div className="px-6 py-4 border-b"><h3 className="text-sm font-semibold">By Employment Type</h3></div>
                            <Table columns={[
                                { key: '_id', label: 'Type', render: (r) => <Badge>{r._id?.replace(/_/g, ' ')}</Badge> },
                                { key: 'count', label: 'Count' },
                            ]} data={head.byEmploymentType} />
                        </Card>
                    </div>
                </>
            )}

            <h3 className="text-sm font-semibold mb-3">Attendance Summary</h3>
            <Card className="p-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="w-full sm:w-40"><Input label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                    <div className="w-full sm:w-40"><Input label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                </div>
            </Card>

            {att && att.byEmployee.length > 0 && (
                <Card className="mb-6">
                    <Table columns={[
                        { key: 'employee', label: 'Employee', render: (r) => <div><p className="text-sm font-medium">{r.employeeName}</p><p className="text-xs text-gray-500 font-mono">{r.employeeCode}</p></div> },
                        { key: 'present', label: 'Present' },
                        { key: 'absent', label: 'Absent', render: (r) => r.absent > 0 ? <span className="text-red-600">{r.absent}</span> : '—' },
                        { key: 'late', label: 'Late' },
                        { key: 'leave', label: 'Leave' },
                        { key: 'halfDay', label: 'Half Day' },
                        { key: 'lateMin', label: 'Late Min', render: (r) => r.totalLateMinutes },
                        { key: 'otHours', label: 'OT Hours', render: (r) => `${(r.totalOvertimeMinutes / 60).toFixed(1)}` },
                    ]} data={att.byEmployee} />
                </Card>
            )}

            <h3 className="text-sm font-semibold mb-3">Leave Patterns ({year})</h3>
            <Card className="p-4 mb-4">
                <div className="w-32"><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} /></div>
            </Card>

            {leave && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <Card>
                        <div className="px-6 py-4 border-b"><h3 className="text-sm font-semibold">By Leave Type</h3></div>
                        <Table columns={[
                            { key: '_id', label: 'Type', render: (r) => <Badge>{r._id}</Badge> },
                            { key: 'count', label: 'Requests' },
                            { key: 'totalDays', label: 'Total Days' },
                        ]} data={leave.byType} />
                    </Card>
                    <Card>
                        <div className="px-6 py-4 border-b"><h3 className="text-sm font-semibold">Top Leave Takers</h3></div>
                        <Table columns={[
                            { key: 'employee', label: 'Employee', render: (r) => <div><p className="text-sm">{r.employeeName}</p><p className="text-xs text-gray-500 font-mono">{r.employeeCode}</p></div> },
                            { key: 'leaveCount', label: 'Leaves' },
                            { key: 'totalDays', label: 'Days' },
                        ]} data={leave.topTakers} />
                    </Card>
                </div>
            )}

            <h3 className="text-sm font-semibold mb-3">Payroll Summary ({year})</h3>
            {payroll && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <KpiCard label="YTD Gross" value={fmt(payroll.yearTotals.gross)} />
                        <KpiCard label="YTD Net Pay" value={fmt(payroll.yearTotals.netPay)} />
                        <KpiCard label="YTD EPF (8%+12%)" value={fmt(payroll.yearTotals.epfEmployee + payroll.yearTotals.epfEmployer)} />
                        <KpiCard label="YTD APIT" value={fmt(payroll.yearTotals.apit)} />
                    </div>
                    <Card>
                        <Table columns={[
                            { key: 'period', label: 'Month', render: (r) => `${monthNames[r.periodMonth - 1]} ${r.periodYear}` },
                            { key: 'totalEmployees', label: 'Emp Count' },
                            { key: 'gross', label: 'Gross', render: (r) => fmt(r.totalGrossEarnings) },
                            { key: 'epfEmp', label: 'EPF Emp', render: (r) => fmt(r.totalEpfEmployee) },
                            { key: 'epfEmpr', label: 'EPF Empr', render: (r) => fmt(r.totalEpfEmployer) },
                            { key: 'etf', label: 'ETF', render: (r) => fmt(r.totalEtf) },
                            { key: 'apit', label: 'APIT', render: (r) => fmt(r.totalApit) },
                            { key: 'net', label: 'Net Pay', render: (r) => <span className="font-semibold">{fmt(r.totalNetPay)}</span> },
                            { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
                        ]} data={payroll.monthly} />
                    </Card>
                </>
            )}
        </div>
    );
}