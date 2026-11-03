import { useParams, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
    ArrowLeft, Printer, Building2, ShieldCheck, CheckCircle2,
    Clock, Calendar, FileText, ChevronDown, ChevronUp, UserCheck,
    AlertCircle, MapPin, Globe, Phone, Mail, PenTool, Stamp,
    Upload, RefreshCw, Check, Download, FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { usePayslip, useAttendance } from '../features/hr/useHr';
import { useCompanySettings } from '../features/settings/useSettings';

const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

function numberToWords(num) {
    if (!num || isNaN(num) || num === 0) return 'Zero Rupees Only';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n) => {
        if (n === 0) return '';
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
        if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + inWords(n % 100) : '');
        if (n < 1000000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
        if (n < 1000000000) return inWords(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 ? ' ' + inWords(n % 1000000) : '');
        return String(n);
    };

    const whole = Math.floor(Math.abs(num));
    const cents = Math.round((Math.abs(num) - whole) * 100);

    let res = inWords(whole).trim() + ' Rupees';
    if (cents > 0) res += ' and ' + inWords(cents).trim() + ' Cents';
    return res + ' Only';
}

function formatTime12(isoOrTimeString) {
    if (!isoOrTimeString) return '—';
    const d = new Date(isoOrTimeString);
    if (isNaN(d.getTime())) {
        return isoOrTimeString;
    }
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatMinutes(mins) {
    if (!mins || mins <= 0) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

// -----------------------------------------------------------------
// E-SIGNATURES & OFFICIAL COMPANY SEAL HELPERS
// -----------------------------------------------------------------
function CompanyRubberSeal({ companyName = 'ASIPBOOK', regNo = 'PV-89412', customSealUrl }) {
    if (customSealUrl) {
        return (
            <img
                src={customSealUrl}
                alt="Company Seal"
                className="w-20 h-20 object-contain rotate-[-8deg] opacity-85 select-none"
            />
        );
    }
    return (
        <div className="w-20 h-20 rounded-full border-2 border-red-700/85 p-0.5 rotate-[-8deg] opacity-85 select-none bg-red-50/10 shadow-xs">
            <div className="w-full h-full rounded-full border border-dashed border-red-700/85 flex flex-col items-center justify-center text-center p-1 leading-none text-red-700">
                <span className="text-[7px] font-black uppercase tracking-tight">★ {companyName.slice(0, 10)} ★</span>
                <span className="text-[6px] font-bold my-0.5">{regNo}</span>
                <span className="text-[6.5px] font-extrabold uppercase border-y border-red-700/80 py-0.5 w-14 tracking-widest bg-red-100/40">APPROVED</span>
                <span className="text-[6px] font-semibold mt-0.5 tracking-tight">SRI LANKA</span>
            </div>
        </div>
    );
}

function HrDigitalSignature({ customSignUrl }) {
    if (customSignUrl) {
        return (
            <img
                src={customSignUrl}
                alt="HR Signature"
                className="h-12 w-auto max-w-[150px] mx-auto object-contain"
            />
        );
    }
    return (
        <svg className="w-36 h-12 mx-auto text-blue-800" viewBox="0 0 160 50" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 35 Q 25 10 35 22 Q 45 35 55 20 Q 65 8 75 25 T 95 24 Q 110 22 135 15 M 40 28 L 140 26" />
        </svg>
    );
}

function ManagerDigitalSignature({ customSignUrl }) {
    if (customSignUrl) {
        return (
            <img
                src={customSignUrl}
                alt="Manager Signature"
                className="h-12 w-auto max-w-[150px] mx-auto object-contain relative z-10"
            />
        );
    }
    return (
        <svg className="w-36 h-12 mx-auto text-indigo-950 relative z-10" viewBox="0 0 180 50" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 38 Q 30 5 45 18 Q 60 30 75 14 Q 90 2 105 22 Q 120 40 135 20 T 165 18 M 30 25 Q 90 35 160 22" />
        </svg>
    );
}

export default function PayslipDetailPage() {
    const { payrollId, employeeId } = useParams();
    const navigate = useNavigate();
    const { data } = usePayslip(payrollId, employeeId);
    const { data: settingsRes } = useCompanySettings();
    const [filterStatus, setFilterStatus] = useState('all');

    // E-Signature & Company Seal State
    const [showDigitalSignatures, setShowDigitalSignatures] = useState(false);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [customHrSign, setCustomHrSign] = useState(() => localStorage.getItem('asip_hr_sign') || '');
    const [customManagerSign, setCustomManagerSign] = useState(() => localStorage.getItem('asip_mgt_sign') || '');
    const [customSeal, setCustomSeal] = useState(() => localStorage.getItem('asip_company_seal') || '');

    const companySettings = settingsRes?.data || {};
    const baseName = companySettings.companyName || 'ASIPBOOK';
    const companyName = baseName.toUpperCase().includes('LTD') || baseName.toUpperCase().includes('PVT')
        ? baseName.toUpperCase()
        : `${baseName.toUpperCase()} (PVT) LTD`;

    const rawAddress = typeof companySettings.address === 'string'
        ? companySettings.address
        : [companySettings.address?.line1, companySettings.address?.city, companySettings.address?.country].filter(Boolean).join(', ');
    const companyAddress = (rawAddress && !rawAddress.toUpperCase().includes('YOUR STREET') && rawAddress.trim() !== 'Sri Lanka')
        ? rawAddress
        : 'No. 124, High Level Road, Colombo, Sri Lanka';

    const rawPhone = companySettings.phone || companySettings.contactNumber;
    const companyPhone = (rawPhone && !rawPhone.includes('XXX'))
        ? rawPhone
        : '+94 11 285 4567';

    const companyEmail = companySettings.email || 'info@asip.lk';
    const companyWebsite = companySettings.website || 'www.asip.lk';
    const companyTax = companySettings.taxRegistrationNumber || companySettings.taxNumber || 'PV-89412';
    const companyLogo = companySettings.logoUrl || '/asipbook-logo.png';
    const companyTagline = companySettings.tagline || 'Books, Office Stationery & Retail Distribution';

    const d = data?.data;
    const fmt = (n) =>
        new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const periodYear = d?.payroll?.periodYear || (d?.payroll?.periodStartDate ? new Date(d.payroll.periodStartDate).getFullYear() : new Date().getFullYear());
    const periodMonth = d?.payroll?.periodMonth || (d?.payroll?.periodStartDate ? new Date(d.payroll.periodStartDate).getMonth() + 1 : (new Date().getMonth() + 1));
    const daysInMonth = new Date(periodYear, periodMonth, 0).getDate();

    const startDateStr = `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`;
    const endDateStr = `${periodYear}-${String(periodMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // Query 31-day attendance records for this employee in this month
    const { data: attendanceRes, isLoading: attLoading } = useAttendance({
        employeeId: d?.employee?._id || employeeId,
        startDate: startDateStr,
        endDate: endDateStr,
        limit: 100,
    });

    // Map attendance by date string
    const attMap = useMemo(() => {
        const map = new Map();
        (attendanceRes?.data || []).forEach((item) => {
            if (item.date) {
                const dt = new Date(item.date);
                const y = dt.getFullYear();
                const m = String(dt.getMonth() + 1).padStart(2, '0');
                const day = String(dt.getDate()).padStart(2, '0');
                map.set(`${y}-${m}-${day}`, item);
                map.set(dt.toISOString().slice(0, 10), item);
            }
        });
        return map;
    }, [attendanceRes]);

    // Build day-by-day table data (Days 1 to 28/30/31)
    const monthDays = useMemo(() => {
        const list = [];
        const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
            const dateStr = `${periodYear}-${String(periodMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dateObj = new Date(periodYear, periodMonth - 1, dayNum);
            const dayOfWeek = dateObj.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const record = attMap.get(dateStr);

            let status = 'unmarked';
            let statusLabel = '—';
            let badgeClass = 'bg-gray-100 text-gray-600 border-gray-200';

            if (record) {
                status = record.status;
                if (status === 'present') {
                    statusLabel = 'Present';
                    badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold';
                } else if (status === 'late') {
                    statusLabel = 'Late Arrival';
                    badgeClass = 'bg-amber-50 text-amber-700 border-amber-300 font-semibold';
                } else if (status === 'absent') {
                    statusLabel = 'Absent';
                    badgeClass = 'bg-rose-50 text-rose-700 border-rose-300 font-semibold';
                } else if (status === 'half_day') {
                    statusLabel = 'Half Day';
                    badgeClass = 'bg-orange-50 text-orange-700 border-orange-300 font-semibold';
                } else if (status === 'leave') {
                    statusLabel = 'Approved Leave';
                    badgeClass = 'bg-blue-50 text-blue-700 border-blue-300 font-semibold';
                } else if (status === 'holiday') {
                    statusLabel = 'Public Holiday';
                    badgeClass = 'bg-purple-50 text-purple-700 border-purple-300 font-semibold';
                }
            } else if (isWeekend) {
                status = 'weekend';
                statusLabel = 'Weekly Off';
                badgeClass = 'bg-slate-100 text-slate-500 border-slate-200';
            }

            list.push({
                dayNum,
                dateStr,
                dateObj,
                weekday: weekdayNames[dayOfWeek],
                fullDay: fullDayNames[dayOfWeek],
                isWeekend,
                record,
                status,
                statusLabel,
                badgeClass,
                inTime: record?.checkInTime ? formatTime12(record.checkInTime) : '—',
                outTime: record?.checkOutTime ? formatTime12(record.checkOutTime) : '—',
                workedMinutes: record?.totalWorkedMinutes || 0,
                lateMinutes: record?.lateMinutes || 0,
                overtimeMinutes: record?.overtimeMinutes || 0,
                notes: record?.notes || (isWeekend ? 'Weekly Off-Day' : (record ? 'Biometric Punch Verified' : '—')),
            });
        }
        return list;
    }, [periodYear, periodMonth, daysInMonth, attMap]);

    // Summary calculation for the 31-day table
    const timesheetSummary = useMemo(() => {
        let presentDays = 0;
        let lateDays = 0;
        let absentDays = 0;
        let leaveDays = 0;
        let halfDays = 0;
        let totalWorkedMins = 0;
        let totalLateMins = 0;
        let totalOtMins = 0;

        monthDays.forEach((item) => {
            if (item.status === 'present') presentDays++;
            else if (item.status === 'late') { lateDays++; presentDays++; }
            else if (item.status === 'absent') absentDays++;
            else if (item.status === 'half_day') halfDays++;
            else if (item.status === 'leave') leaveDays++;

            totalWorkedMins += item.workedMinutes;
            totalLateMins += item.lateMinutes;
            totalOtMins += item.overtimeMinutes;
        });

        return {
            presentDays,
            lateDays,
            absentDays,
            leaveDays,
            halfDays,
            totalWorkedHours: (totalWorkedMins / 60).toFixed(1),
            totalLateMins,
            totalOtHours: (totalOtMins / 60).toFixed(1),
        };
    }, [monthDays]);

    // Optional status filter in screen view
    const displayedDays = useMemo(() => {
        if (filterStatus === 'all') return monthDays;
        if (filterStatus === 'working') return monthDays.filter(d => ['present', 'late', 'half_day'].includes(d.status));
        if (filterStatus === 'absent') return monthDays.filter(d => d.status === 'absent');
        if (filterStatus === 'leave') return monthDays.filter(d => ['leave', 'holiday', 'weekend'].includes(d.status));
        return monthDays;
    }, [monthDays, filterStatus]);

    if (!d) return <div className="py-24 text-center text-gray-500 text-sm">Loading payslip details...</div>;

    const { payslip: ps, payroll, employee } = d;
    const payPeriodName = `${monthNames[payroll.periodMonth - 1]} ${payroll.periodYear}`;

    // Total EPF 20% = Employee 8% + Employer 12%
    const totalEpfContribution = (ps.epfEmployeeContribution || 0) + (ps.epfEmployerContribution || 0);

    // Download Payslip as PDF (Triggers browser save-as-pdf with clean pre-named title)
    const downloadPayslipPDF = () => {
        const originalTitle = document.title;
        document.title = `Payslip_${employee.employeeCode}_${employee.firstName}_${monthNames[payroll.periodMonth - 1]}_${payroll.periodYear}`;
        window.print();
        setTimeout(() => {
            document.title = originalTitle;
        }, 1500);
    };

    // Download Individual Payslip and Timesheet Breakdown as CSV
    const downloadIndividualPayslipCSV = () => {
        const headers = ['Category', 'Description', 'Amount (LKR) / Value'];
        const rows = [
            ['EMPLOYEE', 'Employee Name', `"${employee.firstName} ${employee.lastName}"`],
            ['EMPLOYEE', 'Employee Code', employee.employeeCode],
            ['EMPLOYEE', 'Designation', `"${employee.designation || 'Staff'}"`],
            ['EMPLOYEE', 'Department', `"${employee.department || 'Operations'}"`],
            ['EMPLOYEE', 'EPF Member No', employee.epfNumber || '—'],
            ['PAYROLL', 'Pay Period', `${monthNames[payroll.periodMonth - 1]} ${payroll.periodYear}`],
            ['PAYROLL', 'Voucher Number', payroll.payrollNumber],
            ['PAYROLL', 'Working Days', ps.workingDays],
            ['PAYROLL', 'Days Present', ps.daysPresent],
            ['PAYROLL', 'Days Absent', ps.daysAbsent],
            ['PAYROLL', 'Leave Days', ps.leaveDays],
            ['PAYROLL', 'Overtime Hours', ps.overtimeHours],
            ['', '', ''],
            ['EARNINGS', 'Basic Salary', ps.basicSalary],
            ...(ps.earnings || []).map((e) => ['EARNINGS', `"${e.name}"`, e.amount]),
            ['EARNINGS', 'GROSS EARNINGS', ps.grossEarnings],
            ['', '', ''],
            ['DEDUCTIONS', 'EPF Employee (8%)', `-${ps.epfEmployeeContribution}`],
            ...(ps.deductions || []).map((ded) => ['DEDUCTIONS', `"${ded.name}"`, `-${ded.amount}`]),
            ['DEDUCTIONS', 'TOTAL DEDUCTIONS', `-${ps.totalDeductions}`],
            ['', '', ''],
            ['NET PAY', 'NET SALARY PAYABLE', ps.netPay],
            ['NET PAY', 'Amount In Words', `"${numberToWords(ps.netPay)}"`],
            ['', '', ''],
            ['COMPANY REMITTANCE', 'Employer EPF (12%)', ps.epfEmployerContribution],
            ['COMPANY REMITTANCE', 'Employer ETF (3%)', ps.etfContribution],
            ['COMPANY REMITTANCE', 'Total CBSL Contribution (15%)', (ps.epfEmployerContribution || 0) + (ps.etfContribution || 0)],
            ['', '', ''],
            ['TIMESHEET (DAYS 1-31)', 'Date & Weekday', 'Punch Log & Punctuality Details'],
            ...monthDays.map((dm) => [
                'TIMESHEET',
                `Day ${dm.dayNum} (${dm.dateStr}) [${dm.weekday}]`,
                `"${dm.statusLabel} | In: ${dm.inTime} | Out: ${dm.outTime} | Worked: ${formatMinutes(dm.workedMinutes)} | Late: ${dm.lateMinutes}m | OT: ${(dm.overtimeMinutes / 60).toFixed(1)}h | ${dm.notes}"`
            ])
        ];

        const csvContent =
            'data:text/csv;charset=utf-8,' +
            [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Payslip_${employee.employeeCode}_${monthNames[payroll.periodMonth - 1]}_${payroll.periodYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Payslip CSV downloaded');
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-16">
            {/* Top Navigation & Action Bar (Hidden in Print) */}
            <div className="print:hidden">
                <PageHeader
                    title="Staff Salary Payslip & Monthly Timesheet"
                    description={`Detailed payslip and 31-day attendance statement for ${employee.firstName} ${employee.lastName} (${payPeriodName})`}
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Toggle E-Signature & Seal Pill */}
                            <button
                                type="button"
                                onClick={() => setShowDigitalSignatures(!showDigitalSignatures)}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs ${
                                    showDigitalSignatures
                                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                                title="Click to toggle between physical blank signature lines and digital e-signatures with company seal"
                            >
                                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                    showDigitalSignatures ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400'
                                }`}>
                                    {showDigitalSignatures ? '✓' : ''}
                                </div>
                                <span>Digital Sign & Seal: <strong className={showDigitalSignatures ? 'text-emerald-900' : 'text-gray-500'}>{showDigitalSignatures ? 'ON (Applied)' : 'OFF (Blank Lines)'}</strong></span>
                            </button>

                            {/* Configure Sign & Seal Modal Button */}
                            <Button
                                variant="outline"
                                onClick={() => setIsSignatureModalOpen(true)}
                                className="bg-white hover:bg-gray-50 border-gray-300"
                                title="Upload or customize company rubber stamp seal and digital signatures"
                            >
                                <Stamp size={15} className="mr-1.5 text-indigo-600" /> Configure Sign & Seal
                            </Button>

                            {/* Download CSV */}
                            <Button
                                variant="outline"
                                onClick={downloadIndividualPayslipCSV}
                                className="bg-white hover:bg-gray-50 border-gray-300"
                                title="Download complete payslip and timesheet statement in CSV / Excel format"
                            >
                                <FileSpreadsheet size={15} className="mr-1.5 text-emerald-600" /> Export CSV
                            </Button>

                            <Button variant="outline" onClick={() => navigate(`/payroll/${payrollId}`)}>
                                <ArrowLeft size={16} className="mr-1.5" /> Back to Payroll
                            </Button>

                            {/* Download / Print PDF */}
                            <Button variant="primary" onClick={downloadPayslipPDF} className="bg-indigo-600 hover:bg-indigo-700">
                                <Download size={16} className="mr-1.5" /> Download / Print PDF
                            </Button>
                        </div>
                    }
                />
            </div>

            {/* Print Layout Stylesheet */}
            <style>{`
                @media print {
                    body {
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .payslip-container {
                        box-shadow: none !important;
                        border: 1px solid #1f2937 !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 24px !important;
                        border-radius: 0 !important;
                    }
                    .timesheet-section {
                        page-break-before: always !important;
                        break-before: page !important;
                        padding-top: 24px !important;
                    }
                }
            `}</style>

            {/* Official Payslip Voucher Document */}
            <div className="payslip-container bg-white border border-gray-300 rounded-xl shadow-md p-6 sm:p-10 font-sans space-y-6">
                {/* 1. OFFICIAL CORPORATE LETTERHEAD HEADER */}
                <div className="pb-6 border-b-2 border-indigo-900/20">
                    {/* Top Letterhead Accent Line */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-indigo-900 via-indigo-700 to-amber-500 rounded-full mb-6"></div>

                    <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                        {/* Company Brand & Legal Identity */}
                        <div className="flex items-start gap-4 flex-1">
                            {/* Brand Logo / Monogram Fallback */}
                            <div className="shrink-0">
                                <img
                                    src={companyLogo}
                                    alt={companyName}
                                    className="h-16 w-auto max-w-[190px] object-contain rounded-lg border border-gray-200/80 p-1.5 bg-white shadow-xs"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                                    }}
                                />
                                <div
                                    style={{ display: 'none' }}
                                    className="w-16 h-16 rounded-xl bg-indigo-950 text-white items-center justify-center font-black text-2xl shadow-sm border border-indigo-800"
                                >
                                    {companyName.charAt(0)}
                                </div>
                            </div>

                            {/* Corporate Information */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 uppercase">
                                        {companyName}
                                    </h1>
                                </div>
                                <p className="text-xs font-semibold text-indigo-700 tracking-wide uppercase">
                                    {companyTagline}
                                </p>
                                <p className="text-xs text-gray-600 flex items-center gap-1.5 pt-0.5">
                                    <MapPin size={12} className="text-gray-400 shrink-0" />
                                    <span>{companyAddress}</span>
                                </p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Phone size={11} className="text-gray-400" />
                                        <strong className="text-gray-700 font-medium">{companyPhone}</strong>
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <Mail size={11} className="text-gray-400" />
                                        <strong className="text-gray-700 font-medium">{companyEmail}</strong>
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <Globe size={11} className="text-gray-400" />
                                        <strong className="text-gray-700 font-medium">{companyWebsite}</strong>
                                    </span>
                                </div>

                                {/* Official Statutory Registration Badges */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-300">
                                        Company Reg: <strong className="ml-1 font-mono text-gray-900">{companyTax}</strong>
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                        TIN: <strong className="ml-1 font-mono text-indigo-950">104598210-7000</strong>
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        CBSL EPF Reg: <strong className="ml-1 font-mono text-emerald-950">C/89412</strong>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Voucher Reference Card */}
                        <div className="w-full lg:w-auto bg-gradient-to-br from-gray-50 to-indigo-50/50 p-4 rounded-xl border border-indigo-100/80 shadow-xs text-left lg:text-right min-w-[240px]">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-900 text-white rounded text-[11px] font-bold tracking-widest uppercase mb-2 shadow-xs">
                                <Building2 size={12} className="text-indigo-300" />
                                <span>OFFICIAL SALARY PAYSLIP</span>
                            </div>
                            <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                                PRIVATE & CONFIDENTIAL
                            </p>
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mt-2">
                                Pay Period
                            </p>
                            <p className="text-base font-black text-gray-900 tracking-tight">
                                {payPeriodName}
                            </p>
                            <div className="mt-2.5 pt-2 border-t border-gray-200 text-[11px] space-y-0.5">
                                <p className="text-gray-500">
                                    Voucher No: <span className="font-mono font-bold text-gray-900">{payroll.payrollNumber}</span>
                                </p>
                                <p className="text-gray-500">
                                    Payment Date: <span className="font-medium text-gray-800">{new Date(payroll.periodEndDate).toLocaleDateString('en-LK')}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. EMPLOYEE & DISBURSEMENT INFORMATION (COMPACT UNIFIED STRIP) */}
                <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 text-xs">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Employee Identity */}
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Employee</span>
                            <p className="font-bold text-gray-900 text-sm">{employee.firstName} {employee.lastName}</p>
                            <p className="font-mono text-indigo-700 font-semibold">{employee.employeeCode}</p>
                            {employee.nationalIdNumber && (
                                <p className="text-gray-500 text-[11px]">NIC: {employee.nationalIdNumber}</p>
                            )}
                        </div>

                        {/* Designation & Department */}
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Role & Department</span>
                            <p className="font-semibold text-gray-800 text-xs">{employee.designation || 'Staff'}</p>
                            <p className="text-gray-500 text-[11px]">{employee.department || 'Operations'}</p>
                        </div>

                        {/* Disbursement Method */}
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Payment Disbursement</span>
                            <p className="font-semibold text-gray-800 text-xs">{employee.bankDetails?.bankName || 'Cash / Cheque'}</p>
                            <p className="font-mono text-gray-600 text-[11px]">
                                {employee.bankDetails?.accountNumber ? `A/C: ${employee.bankDetails.accountNumber}` : 'Direct Pay'}
                            </p>
                        </div>

                        {/* Member EPF & Duty Cycle */}
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Statutory & Work Cycle</span>
                            <p className="font-mono font-semibold text-gray-900 text-xs">EPF No: {employee.epfNumber || '—'}</p>
                            <p className="text-gray-500 text-[11px]">{ps.workingDays} Scheduled Working Days</p>
                        </div>
                    </div>
                </div>

                {/* 3. EARNINGS & DEDUCTIONS DUAL-LEDGER */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-1 text-xs">
                    {/* EARNINGS COLUMN */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col justify-between">
                        <div>
                            <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 font-bold text-gray-800 uppercase flex justify-between">
                                <span>Earnings Description</span>
                                <span>Amount (LKR)</span>
                            </div>
                            <table className="w-full">
                                <tbody>
                                    {ps.earnings?.map((e, i) => (
                                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
                                            <td className="px-3 py-2 text-gray-700">{e.name}</td>
                                            <td className="px-3 py-2 text-right font-medium text-gray-900">{fmt(e.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-gray-50 px-3 py-2.5 border-t border-gray-200 font-bold text-gray-900 flex justify-between text-sm">
                            <span>Gross Earnings</span>
                            <span className="text-indigo-900 font-mono">{fmt(ps.grossEarnings)}</span>
                        </div>
                    </div>

                    {/* DEDUCTIONS COLUMN */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col justify-between">
                        <div>
                            <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 font-bold text-gray-800 uppercase flex justify-between">
                                <span>Deductions Description</span>
                                <span>Amount (LKR)</span>
                            </div>
                            <table className="w-full">
                                <tbody>
                                    {ps.deductions?.length > 0 ? (
                                        ps.deductions.map((d, i) => (
                                             <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                <td className="px-3 py-2 text-gray-700">{d.name}</td>
                                                <td className="px-3 py-2 text-right font-medium text-rose-600 font-mono">-{fmt(d.amount)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={2} className="px-3 py-4 text-center text-gray-400 italic">No deductions</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-gray-50 px-3 py-2.5 border-t border-gray-200 font-bold text-gray-900 flex justify-between text-sm">
                            <span>Total Deductions</span>
                            <span className="text-rose-600 font-mono">-{fmt(ps.totalDeductions)}</span>
                        </div>
                    </div>
                </div>

                {/* 4. NET SALARY PAYABLE HIGHLIGHT BANNER */}
                <div className="my-2 p-4 bg-indigo-50/80 border-2 border-indigo-600 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                            Net Salary Payable (Take Home)
                        </p>
                        <p className="text-xs font-semibold text-gray-600 italic mt-0.5">
                            Amount in Words: <span className="text-gray-900 not-italic font-bold">{numberToWords(ps.netPay)}</span>
                        </p>
                    </div>
                    <div className="text-left sm:text-right">
                        <span className="text-2xl sm:text-3xl font-black text-indigo-950 font-mono">
                            {fmt(ps.netPay)}
                        </span>
                    </div>
                </div>

                {/* 5. STATUTORY CORPORATE CONTRIBUTIONS (EMPLOYER COMPANY COST) */}
                <div className="mt-2 p-3 bg-gray-50/80 rounded-lg border border-gray-200 text-xs">
                    <p className="font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        <span>Employer Statutory Remittances to Central Bank of Sri Lanka (CBSL)</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                        <div className="bg-white p-2 rounded border border-gray-200">
                            <span className="text-gray-500 text-[11px] block">Employer EPF (12%)</span>
                            <span className="font-bold text-gray-900 font-mono">{fmt(ps.epfEmployerContribution)}</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-gray-200">
                            <span className="text-gray-500 text-[11px] block">Employer ETF (3%)</span>
                            <span className="font-bold text-gray-900 font-mono">{fmt(ps.etfContribution)}</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-gray-200">
                            <span className="text-gray-500 text-[11px] block">Total Company Cost (15%)</span>
                            <span className="font-bold text-indigo-900 font-mono">{fmt((ps.epfEmployerContribution || 0) + (ps.etfContribution || 0))}</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1.5 italic text-center">
                        * Employer EPF (12%) and ETF (3%) are direct company remittances paid to CBSL and are not deducted from employee salary.
                    </p>
                </div>

                {/* ========================================================================= */}
                {/* 6. COMPREHENSIVE 31-DAY ATTENDANCE & TIMESHEET STATEMENT (LARGE TABLE)   */}
                {/* ========================================================================= */}
                <div className="timesheet-section pt-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b-2 border-indigo-600">
                        <div>
                            <div className="flex items-center gap-2">
                                <Calendar size={18} className="text-indigo-600" />
                                <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide">
                                    Monthly Duty & Attendance Timesheet (Days 1 to {daysInMonth})
                                </h2>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Official day-by-day biometric punch log, regular hours, overtime, and punctuality audit for {payPeriodName}
                            </p>
                        </div>

                        {/* Screen Filter Buttons (Hidden in print) */}
                        <div className="print:hidden flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg text-xs">
                            <button
                                type="button"
                                onClick={() => setFilterStatus('all')}
                                className={`px-2.5 py-1 rounded transition font-medium ${filterStatus === 'all' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                All Days ({daysInMonth})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterStatus('working')}
                                className={`px-2.5 py-1 rounded transition font-medium ${filterStatus === 'working' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                Worked ({timesheetSummary.presentDays})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterStatus('absent')}
                                className={`px-2.5 py-1 rounded transition font-medium ${filterStatus === 'absent' ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                Absents ({timesheetSummary.absentDays})
                            </button>
                        </div>
                    </div>

                    {/* Quick Metric Bar for Timesheet */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 my-3 text-xs">
                        <div className="bg-slate-50 border border-slate-200 p-2 rounded">
                            <span className="text-gray-500 block text-[11px]">Total Days in Month</span>
                            <span className="font-bold text-gray-900 text-sm">{daysInMonth} Days</span>
                        </div>
                        <div className="bg-emerald-50/70 border border-emerald-200 p-2 rounded">
                            <span className="text-emerald-700 block text-[11px]">Present / Worked</span>
                            <span className="font-bold text-emerald-900 text-sm">{timesheetSummary.presentDays} Days</span>
                        </div>
                        <div className="bg-rose-50/70 border border-rose-200 p-2 rounded">
                            <span className="text-rose-700 block text-[11px]">Absents / Unpaid</span>
                            <span className="font-bold text-rose-900 text-sm">{timesheetSummary.absentDays} Days</span>
                        </div>
                        <div className="bg-amber-50/70 border border-amber-200 p-2 rounded">
                            <span className="text-amber-700 block text-[11px]">Late Arrivals</span>
                            <span className="font-bold text-amber-900 text-sm">{timesheetSummary.lateDays} ({timesheetSummary.totalLateMins}m)</span>
                        </div>
                        <div className="bg-purple-50/70 border border-purple-200 p-2 rounded">
                            <span className="text-purple-700 block text-[11px]">Overtime Worked</span>
                            <span className="font-bold text-purple-900 text-sm">{timesheetSummary.totalOtHours} hrs</span>
                        </div>
                    </div>

                    {/* FULL 31-DAY TIMESHEET TABLE */}
                    <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-100/90 text-gray-700 uppercase font-bold text-[11px] border-b border-gray-300">
                                        <th className="px-3 py-2.5 text-center w-12 border-r border-gray-200">Day</th>
                                        <th className="px-3 py-2.5 w-32 border-r border-gray-200">Date & Weekday</th>
                                        <th className="px-3 py-2.5 w-28 text-center border-r border-gray-200">Status</th>
                                        <th className="px-3 py-2.5 text-center w-24 border-r border-gray-200">Check In</th>
                                        <th className="px-3 py-2.5 text-center w-24 border-r border-gray-200">Check Out</th>
                                        <th className="px-3 py-2.5 text-center w-24 border-r border-gray-200">Worked Hours</th>
                                        <th className="px-3 py-2.5 text-center w-20 border-r border-gray-200">Late (min)</th>
                                        <th className="px-3 py-2.5 text-center w-20 border-r border-gray-200">OT (hrs)</th>
                                        <th className="px-3 py-2.5">Duty Remarks & Punch Method</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedDays.map((d) => (
                                        <tr
                                            key={d.dayNum}
                                            className={`border-b border-gray-200 hover:bg-gray-50/80 transition-colors ${d.isWeekend ? 'bg-slate-50/50' : ''}`}
                                        >
                                            <td className="px-3 py-2 text-center font-bold text-gray-700 border-r border-gray-200">
                                                {String(d.dayNum).padStart(2, '0')}
                                            </td>
                                            <td className="px-3 py-2 font-medium text-gray-900 border-r border-gray-200 whitespace-nowrap">
                                                <span>{d.dateStr}</span>
                                                <span className={`ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-semibold ${d.isWeekend ? 'bg-gray-200 text-gray-700' : 'bg-indigo-50 text-indigo-700'}`}>
                                                    {d.weekday}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-center border-r border-gray-200">
                                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${d.badgeClass}`}>
                                                    {d.statusLabel}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-center font-mono border-r border-gray-200 text-gray-700">
                                                {d.inTime !== '—' ? (
                                                    <span className="text-emerald-700 font-semibold">{d.inTime}</span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-center font-mono border-r border-gray-200 text-gray-700">
                                                {d.outTime !== '—' ? (
                                                    <span className="text-indigo-700 font-semibold">{d.outTime}</span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-center font-medium border-r border-gray-200">
                                                {d.workedMinutes > 0 ? (
                                                    <span className="text-gray-900">{formatMinutes(d.workedMinutes)}</span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-center border-r border-gray-200 font-medium">
                                                {d.lateMinutes > 0 ? (
                                                    <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                        +{d.lateMinutes}m
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-center border-r border-gray-200 font-medium">
                                                {d.overtimeMinutes > 0 ? (
                                                    <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                        +{(d.overtimeMinutes / 60).toFixed(1)}h
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-gray-600 text-[11px]">
                                                {d.notes}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300">
                                        <td colSpan={2} className="px-3 py-2.5 text-right uppercase tracking-wider border-r border-gray-200">
                                            Timesheet Month Totals:
                                        </td>
                                        <td className="px-3 py-2.5 text-center border-r border-gray-200 text-emerald-800">
                                            {timesheetSummary.presentDays} Days P
                                        </td>
                                        <td colSpan={2} className="px-3 py-2.5 text-center border-r border-gray-200 text-gray-600">
                                            {timesheetSummary.absentDays} Absents
                                        </td>
                                        <td className="px-3 py-2.5 text-center border-r border-gray-200 text-indigo-900 font-mono">
                                            {timesheetSummary.totalWorkedHours} hrs
                                        </td>
                                        <td className="px-3 py-2.5 text-center border-r border-gray-200 text-amber-800 font-mono">
                                            {timesheetSummary.totalLateMins}m
                                        </td>
                                        <td className="px-3 py-2.5 text-center border-r border-gray-200 text-purple-900 font-mono">
                                            {timesheetSummary.totalOtHours}h
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-600 text-[10px] italic">
                                            * Audited with Electronic Attendance & Biometric Database
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* 7. UNIFIED OFFICIAL AUTHORIZATION & CERTIFICATION */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 pb-4 text-xs text-center border-b border-gray-200 mt-4">
                        {/* HR Prepared By */}
                        <div className="flex flex-col justify-end">
                            <div className="min-h-[62px] flex items-center justify-center">
                                {showDigitalSignatures ? (
                                    <div className="space-y-0.5 text-center">
                                        <HrDigitalSignature customSignUrl={customHrSign} />
                                        <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                            <CheckCircle2 size={10} className="text-emerald-600" /> Digitally Verified: {new Date(payroll.periodEndDate).toLocaleDateString('en-LK')}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="h-14"></div>
                                )}
                            </div>
                            <div className="border-t border-gray-400 mx-4 pt-1.5 mt-1">
                                <p className="font-bold text-gray-900">Prepared By</p>
                                <p className="text-[10px] text-gray-500">HR / Payroll Executive</p>
                                <p className="text-[9px] text-gray-400 mt-0.5">Calculations & Attendance Verified</p>
                            </div>
                        </div>

                        {/* Authorized Signatory & Official Seal */}
                        <div className="flex flex-col justify-end relative">
                            <div className="min-h-[62px] flex items-center justify-center">
                                {showDigitalSignatures ? (
                                    <div className="relative inline-block w-48 mx-auto text-center">
                                        <ManagerDigitalSignature customSignUrl={customManagerSign} />
                                        {/* Rubber Stamp Seal Overlay */}
                                        <div className="absolute -top-3.5 right-0 z-20 pointer-events-none">
                                            <CompanyRubberSeal companyName={baseName} regNo={companyTax} customSealUrl={customSeal} />
                                        </div>
                                        <span className="inline-flex items-center gap-1 text-[9px] font-mono text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 mt-0.5 relative z-10">
                                            <ShieldCheck size={10} className="text-indigo-600" /> Authorized & Sealed: {new Date(payroll.periodEndDate).toLocaleDateString('en-LK')}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="h-14"></div>
                                )}
                            </div>
                            <div className="border-t border-gray-400 mx-4 pt-1.5 mt-1">
                                <p className="font-bold text-gray-900">Authorized Signatory</p>
                                <p className="text-[10px] text-gray-500">Managing Director / Official Seal</p>
                                <p className="text-[9px] text-gray-400 mt-0.5">Payment Approved</p>
                            </div>
                        </div>

                        {/* Employee Acknowledgment */}
                        <div className="flex flex-col justify-end">
                            <div className="min-h-[62px] flex items-center justify-center">
                                <div className="h-14 flex items-center justify-center">
                                    <span className="text-[10px] text-gray-400 italic font-mono">
                                        (Sign with pen on receipt)
                                    </span>
                                </div>
                            </div>
                            <div className="border-t border-gray-400 mx-4 pt-1.5 mt-1">
                                <p className="font-bold text-gray-900">Employee Acknowledgment</p>
                                <p className="text-[10px] text-gray-500">Received & Acknowledged</p>
                                <p className="text-[9px] text-gray-400 mt-0.5">Timesheet & Salary Confirmed</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 8. FINAL SYSTEM FOOTER AUDIT */}
                <div className="pt-2 text-[10px] text-gray-400 flex flex-col sm:flex-row justify-between items-center gap-1">
                    <span>Generated via ASIP ERP System on {new Date().toLocaleDateString('en-LK')} • Official Confidential Document</span>
                    <span className="font-mono">Audit Ref: {payroll.payrollNumber}-{employee.employeeCode}</span>
                </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* CONFIGURE SIGNATURES & OFFICIAL SEAL MODAL                   */}
            {/* ------------------------------------------------------------- */}
            <Modal
                isOpen={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                title="Configure Official E-Signatures & Company Seal"
                size="lg"
            >
                <div className="p-6 space-y-5">
                    <p className="text-xs text-gray-600">
                        Upload custom transparent PNG images for HR and Management signatures, or use the official system-generated high-resolution vectors.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 1. HR Signature Card */}
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-center">
                            <span className="text-xs font-bold text-gray-700 block">HR Executive Signature</span>
                            <div className="h-20 bg-white border border-dashed border-gray-300 rounded-lg flex items-center justify-center p-2">
                                <HrDigitalSignature customSignUrl={customHrSign} />
                            </div>
                            <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
                                <Upload size={12} className="text-indigo-600" />
                                <span>Upload Custom PNG</span>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                            const b64 = ev.target?.result;
                                            if (typeof b64 === 'string') {
                                                setCustomHrSign(b64);
                                                localStorage.setItem('asip_hr_sign', b64);
                                            }
                                        };
                                        reader.readAsDataURL(file);
                                    }}
                                />
                            </label>
                        </div>

                        {/* 2. Manager Signature Card */}
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-center">
                            <span className="text-xs font-bold text-gray-700 block">Manager Signature</span>
                            <div className="h-20 bg-white border border-dashed border-gray-300 rounded-lg flex items-center justify-center p-2">
                                <ManagerDigitalSignature customSignUrl={customManagerSign} />
                            </div>
                            <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
                                <Upload size={12} className="text-indigo-600" />
                                <span>Upload Custom PNG</span>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                            const b64 = ev.target?.result;
                                            if (typeof b64 === 'string') {
                                                setCustomManagerSign(b64);
                                                localStorage.setItem('asip_mgt_sign', b64);
                                            }
                                        };
                                        reader.readAsDataURL(file);
                                    }}
                                />
                            </label>
                        </div>

                        {/* 3. Company Rubber Stamp Seal Card */}
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-center">
                            <span className="text-xs font-bold text-gray-700 block">Official Company Seal</span>
                            <div className="h-20 bg-white border border-dashed border-gray-300 rounded-lg flex items-center justify-center p-1">
                                <CompanyRubberSeal companyName={baseName} regNo={companyTax} customSealUrl={customSeal} />
                            </div>
                            <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
                                <Upload size={12} className="text-indigo-600" />
                                <span>Upload Custom PNG</span>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                            const b64 = ev.target?.result;
                                            if (typeof b64 === 'string') {
                                                setCustomSeal(b64);
                                                localStorage.setItem('asip_company_seal', b64);
                                            }
                                        };
                                        reader.readAsDataURL(file);
                                    }}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-gray-200 text-xs">
                        <button
                            type="button"
                            onClick={() => {
                                setCustomHrSign('');
                                setCustomManagerSign('');
                                setCustomSeal('');
                                localStorage.removeItem('asip_hr_sign');
                                localStorage.removeItem('asip_mgt_sign');
                                localStorage.removeItem('asip_company_seal');
                            }}
                            className="text-gray-500 hover:text-gray-700 flex items-center gap-1 cursor-pointer"
                        >
                            <RefreshCw size={12} /> Reset to System Vectors
                        </button>
                        <Button variant="primary" type="button" onClick={() => setIsSignatureModalOpen(false)}>
                            Done & Close
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
