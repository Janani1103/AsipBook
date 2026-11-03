import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Plus, Calendar as CalendarIcon, Upload, Download, FileSpreadsheet,
    Users, CheckCircle2, XCircle, Clock, AlertTriangle, ChevronLeft,
    ChevronRight, Search, Check, RefreshCw, CalendarDays, Layers,
    Filter, HelpCircle, Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import {
    useAttendance, useBulkMarkAttendance, useEmployees,
    useDepartments, useMarkAttendance
} from '../features/hr/useHr';

const statusVariant = {
    present: 'success',
    absent: 'danger',
    half_day: 'warning',
    leave: 'info',
    holiday: 'default',
    weekend: 'default',
    late: 'warning',
};

export default function AttendancePage() {
    const [viewTab, setViewTab] = useState('daily'); // 'daily' | 'monthly'
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [departmentId, setDepartmentId] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    // Monthly Timesheet Matrix State
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const [matrixYear, setMatrixYear] = useState(currentYear);
    const [matrixMonth, setMatrixMonth] = useState(currentMonth);
    const [matrixDept, setMatrixDept] = useState('');
    const [matrixSearch, setMatrixSearch] = useState('');
    const [editCellModal, setEditCellModal] = useState(null);

    // Queries
    const { data: attData, isLoading: attLoading } = useAttendance({
        date: selectedDate,
        departmentId: departmentId || undefined,
        limit: 500,
    });
    const { data: empData } = useEmployees({
        departmentId: departmentId || matrixDept || undefined,
        status: 'active',
        limit: 500,
    });
    const { data: deptsData } = useDepartments();
    const bulkMark = useBulkMarkAttendance();
    const markSingleAtt = useMarkAttendance();

    const attendance = attData?.data || [];
    const employees = empData?.data || [];
    const depts = deptsData?.data || [];
    const deptOptions = depts.map((d) => ({ value: d._id, label: d.name }));

    // Monthly Attendance Query for Matrix
    const daysInMatrixMonth = new Date(matrixYear, matrixMonth, 0).getDate();
    const matrixStartStr = `${matrixYear}-${String(matrixMonth).padStart(2, '0')}-01`;
    const matrixEndStr = `${matrixYear}-${String(matrixMonth).padStart(2, '0')}-${String(daysInMatrixMonth).padStart(2, '0')}`;

    const { data: monthAttRes, isLoading: monthAttLoading } = useAttendance({
        startDate: matrixStartStr,
        endDate: matrixEndStr,
        departmentId: matrixDept || undefined,
        limit: 3000,
    });

    // Map monthly attendance by employeeId_YYYY-MM-DD and employeeCode_YYYY-MM-DD
    const monthAttMap = useMemo(() => {
        const map = new Map();
        (monthAttRes?.data || []).forEach((item) => {
            if (item.date) {
                const dt = new Date(item.date);
                const y = dt.getFullYear();
                const m = String(dt.getMonth() + 1).padStart(2, '0');
                const d = String(dt.getDate()).padStart(2, '0');
                const dateKey = `${y}-${m}-${d}`;
                const isoKey = dt.toISOString().slice(0, 10);
                const empId = item.employeeId?._id?.toString() || item.employeeId?.toString();
                const empCode = (item.employeeCode || item.employeeId?.employeeCode || '').toUpperCase().trim();

                if (empId) {
                    map.set(`${empId}_${dateKey}`, item);
                    map.set(`${empId}_${isoKey}`, item);
                }
                if (empCode) {
                    map.set(`${empCode}_${dateKey}`, item);
                    map.set(`${empCode}_${isoKey}`, item);
                }
            }
        });
        return map;
    }, [monthAttRes]);

    // Calendar days for matrix header
    const matrixDays = useMemo(() => {
        const list = [];
        const dayInitials = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        for (let d = 1; d <= daysInMatrixMonth; d++) {
            const dt = new Date(matrixYear, matrixMonth - 1, d);
            const dow = dt.getDay();
            const isWeekend = dow === 0 || dow === 6;
            list.push({
                dayNum: d,
                dayPad: String(d).padStart(2, '0'),
                weekday: dayInitials[dow],
                isWeekend,
                dateStr: `${matrixYear}-${String(matrixMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
            });
        }
        return list;
    }, [matrixYear, matrixMonth, daysInMatrixMonth]);

    // Filter employees for monthly matrix
    const filteredMatrixEmployees = useMemo(() => {
        return employees.filter((emp) => {
            if (matrixDept) {
                const empDeptId = emp.departmentId?._id || emp.departmentId;
                if (empDeptId?.toString() !== matrixDept) return false;
            }
            if (matrixSearch) {
                const q = matrixSearch.toLowerCase();
                const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
                const code = (emp.employeeCode || '').toLowerCase();
                if (!fullName.includes(q) && !code.includes(q)) return false;
            }
            return true;
        });
    }, [employees, matrixDept, matrixSearch]);

    // Map of existing attendance for selected date
    const attMap = useMemo(() => {
        const map = new Map();
        attendance.forEach((a) => {
            const key = a.employeeId?._id || a.employeeId;
            if (key) map.set(key.toString(), a);
        });
        return map;
    }, [attendance]);

    // KPI Metrics
    const metrics = useMemo(() => {
        const totalEmployees = employees.length;
        let present = 0;
        let absent = 0;
        let late = 0;
        let halfDay = 0;
        let leave = 0;
        let totalOtMins = 0;

        attendance.forEach((a) => {
            if (a.status === 'present') present++;
            else if (a.status === 'absent') absent++;
            else if (a.status === 'late') { late++; present++; }
            else if (a.status === 'half_day') halfDay++;
            else if (a.status === 'leave') leave++;

            if (a.overtimeMinutes) totalOtMins += a.overtimeMinutes;
        });

        // If not marked yet, difference is unmarked / absent
        const markedCount = attendance.length;
        const unmarked = Math.max(0, totalEmployees - markedCount);

        return {
            total: totalEmployees,
            present,
            absent: absent + unmarked,
            late,
            halfDay,
            leave,
            otHours: (totalOtMins / 60).toFixed(1),
        };
    }, [employees, attendance]);

    // Filtered list for table
    const filteredAttendance = useMemo(() => {
        return attendance.filter((item) => {
            if (statusFilter && item.status !== statusFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const nameMatch = item.employeeName?.toLowerCase().includes(q);
                const codeMatch = item.employeeCode?.toLowerCase().includes(q);
                if (!nameMatch && !codeMatch) return false;
            }
            return true;
        });
    }, [attendance, statusFilter, searchQuery]);

    // Date Navigation helpers
    const changeDate = (days) => {
        const current = new Date(selectedDate);
        current.setDate(current.getDate() + days);
        setSelectedDate(current.toISOString().slice(0, 10));
    };

    const setToday = () => {
        setSelectedDate(new Date().toISOString().slice(0, 10));
    };

    // -------------------------------------------------------------
    // BULK ATTENDANCE QUICK MARKER
    // -------------------------------------------------------------
    const [bulkRecords, setBulkRecords] = useState([]);

    const openBulkModal = () => {
        const records = employees.map((e) => {
            const existing = attMap.get(e._id.toString());
            const checkIn = existing?.checkInTime
                ? new Date(existing.checkInTime).toTimeString().slice(0, 5)
                : '08:30';
            const checkOut = existing?.checkOutTime
                ? new Date(existing.checkOutTime).toTimeString().slice(0, 5)
                : '17:00';

            return {
                employeeId: e._id,
                employeeCode: e.employeeCode,
                employeeName: `${e.firstName} ${e.lastName}`,
                designation: e.designationId?.name || '',
                status: existing?.status || 'present',
                inTime: checkIn,
                outTime: checkOut,
            };
        });
        setBulkRecords(records);
        setIsBulkOpen(true);
    };

    const markAllAs = (status) => {
        setBulkRecords((prev) =>
            prev.map((r) => ({
                ...r,
                status,
            }))
        );
    };

    const updateBulkRow = (idx, field, value) => {
        setBulkRecords((prev) => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], [field]: value };
            return copy;
        });
    };

    const submitBulk = async () => {
        try {
            const payload = bulkRecords.map((r) => {
                const isWorking = ['present', 'late', 'half_day'].includes(r.status);
                return {
                    employeeId: r.employeeId,
                    employeeCode: r.employeeCode,
                    status: r.status,
                    checkInTime: isWorking && r.inTime ? `${selectedDate}T${r.inTime}:00` : undefined,
                    checkOutTime: isWorking && r.outTime ? `${selectedDate}T${r.outTime}:00` : undefined,
                };
            });

            await bulkMark.mutateAsync({
                date: selectedDate,
                records: payload,
            });
            toast.success(`Attendance updated for ${payload.length} employees`);
            setIsBulkOpen(false);
        } catch { }
    };

    // -------------------------------------------------------------
    // EXCEL / CSV IMPORT MODULE
    // -------------------------------------------------------------
    const fileInputRef = useRef(null);
    const [parsedUpload, setParsedUpload] = useState([]);
    const [isParsing, setIsParsing] = useState(false);

    const downloadTemplate = () => {
        const sampleEmployees = employees.slice(0, 6);
        const sampleRows = sampleEmployees.length > 0
            ? sampleEmployees.map((e, idx) => {
                const status = idx === 1 ? 'late' : (idx === 3 ? 'absent' : 'present');
                const inT = status === 'absent' ? '' : (status === 'late' ? '09:15' : '08:30');
                const outT = status === 'absent' ? '' : '17:00';
                return `${e.employeeCode},${selectedDate},${inT},${outT},${status},`;
            }).join('\n')
            : `EMP-1001,${selectedDate},08:30,17:00,present,\nEMP-1002,${selectedDate},09:15,17:00,late,Traffic\nEMP-1003,${selectedDate},,,absent,Sick`;

        const csvContent =
            "data:text/csv;charset=utf-8,EmployeeCode,Date,InTime,OutTime,Status,Notes\n" + sampleRows;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `attendance_template_${selectedDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Attendance CSV template downloaded');
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const text = event.target?.result;
                if (!text || typeof text !== 'string') {
                    toast.error('File is empty or invalid');
                    setIsParsing(false);
                    return;
                }

                const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
                if (lines.length < 2) {
                    toast.error('File does not contain data rows');
                    setIsParsing(false);
                    return;
                }

                // Detect delimiter
                const firstLine = lines[0];
                let sep = ',';
                if (firstLine.includes('\t')) sep = '\t';
                else if (firstLine.includes(';') && !firstLine.includes(',')) sep = ';';

                const parseRow = (line) => {
                    const result = [];
                    let cur = '';
                    let inQuotes = false;
                    for (let i = 0; i < line.length; i++) {
                        const c = line[i];
                        if (c === '"') {
                            if (inQuotes && line[i + 1] === '"') {
                                cur += '"';
                                i++;
                            } else {
                                inQuotes = !inQuotes;
                            }
                        } else if (c === sep && !inQuotes) {
                            result.push(cur.trim());
                            cur = '';
                        } else {
                            cur += c;
                        }
                    }
                    result.push(cur.trim());
                    return result;
                };

                const headers = parseRow(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

                const codeIdx = headers.findIndex((h) => h.includes('code') || h.includes('id') || h.includes('badge'));
                const dateIdx = headers.findIndex((h) => h.includes('date'));
                const inIdx = headers.findIndex((h) => h.includes('in') || h.includes('start'));
                const outIdx = headers.findIndex((h) => h.includes('out') || h.includes('end'));
                const statusIdx = headers.findIndex((h) => h.includes('status'));
                const notesIdx = headers.findIndex((h) => h.includes('note') || h.includes('reason'));

                const parsed = [];
                // Create map of active employees by employeeCode (case-insensitive)
                const empCodeMap = new Map();
                employees.forEach((emp) => {
                    if (emp.employeeCode) {
                        empCodeMap.set(emp.employeeCode.toUpperCase().trim(), emp);
                    }
                });

                for (let i = 1; i < lines.length; i++) {
                    const parts = parseRow(lines[i]);
                    if (!parts.some((p) => p)) continue;

                    const rawCode = codeIdx >= 0 ? parts[codeIdx] : parts[0];
                    if (!rawCode) continue;

                    const codeClean = rawCode.toUpperCase().trim();
                    const matchedEmp = empCodeMap.get(codeClean);
                    const rowDate = dateIdx >= 0 && parts[dateIdx] ? parts[dateIdx] : selectedDate;
                    const inTime = inIdx >= 0 ? parts[inIdx] : '';
                    const outTime = outIdx >= 0 ? parts[outIdx] : '';
                    const rawStatus = (statusIdx >= 0 ? parts[statusIdx] : '').toLowerCase();
                    const rowNotes = notesIdx >= 0 ? parts[notesIdx] : '';

                    let status = 'present';
                    if (rawStatus.includes('absent') || rawStatus === 'a') status = 'absent';
                    else if (rawStatus.includes('late') || rawStatus === 'l') status = 'late';
                    else if (rawStatus.includes('half') || rawStatus === 'hd') status = 'half_day';
                    else if (rawStatus.includes('leave') || rawStatus === 'lv') status = 'leave';
                    else if (!inTime && !outTime) status = 'absent';

                    parsed.push({
                        employeeCode: rawCode,
                        employeeName: matchedEmp ? `${matchedEmp.firstName} ${matchedEmp.lastName}` : '— (Unknown Code)',
                        employeeId: matchedEmp?._id,
                        isValid: !!matchedEmp,
                        date: rowDate,
                        inTime,
                        outTime,
                        status,
                        notes: rowNotes,
                    });
                }

                setParsedUpload(parsed);
                setIsParsing(false);
            } catch (err) {
                toast.error('Failed to parse file: ' + err.message);
                setIsParsing(false);
            }
        };

        reader.readAsText(file);
    };

    const confirmImportUpload = async () => {
        const validRows = parsedUpload.filter((r) => r.isValid && r.employeeId);
        if (validRows.length === 0) {
            toast.error('No valid employee records to import');
            return;
        }

        try {
            const formatTime = (dStr, tStr) => {
                if (!tStr) return undefined;
                const d = dStr || selectedDate;
                if (tStr.includes('T')) return tStr;
                const parts = tStr.split(':');
                const hh = String(parts[0] || '0').padStart(2, '0');
                const mm = String(parts[1] || '0').padStart(2, '0');
                return `${d}T${hh}:${mm}:00`;
            };

            const payload = validRows.map((r) => ({
                employeeId: r.employeeId,
                employeeCode: r.employeeCode,
                date: r.date || selectedDate,
                status: r.status,
                checkInTime: formatTime(r.date, r.inTime),
                checkOutTime: formatTime(r.date, r.outTime),
                notes: r.notes || 'Imported via CSV/Excel',
            }));

            await bulkMark.mutateAsync({
                date: selectedDate,
                records: payload,
            });

            toast.success(`Successfully imported ${validRows.length} attendance records`);
            setIsUploadOpen(false);
            setParsedUpload([]);
        } catch { }
    };

    // -------------------------------------------------------------
    // EXPORT ATTENDANCE TO CSV
    // -------------------------------------------------------------
    const exportAttendanceCSV = () => {
        if (attendance.length === 0) {
            toast.error('No attendance records to export for this date');
            return;
        }
        const headers = [
            'Employee Code',
            'Employee Name',
            'Date',
            'Status',
            'Check In',
            'Check Out',
            'Worked (Hours)',
            'Late (Minutes)',
            'Overtime (Hours)',
            'Notes',
        ];

        const rows = attendance.map((r) => [
            r.employeeCode || '',
            `"${r.employeeName || ''}"`,
            selectedDate,
            r.status,
            r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }) : '',
            r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }) : '',
            r.totalWorkedMinutes ? (r.totalWorkedMinutes / 60).toFixed(1) : '0',
            r.lateMinutes || 0,
            r.overtimeMinutes ? (r.overtimeMinutes / 60).toFixed(1) : '0',
            `"${r.notes || ''}"`,
        ]);

        const csvContent =
            'data:text/csv;charset=utf-8,' +
            [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `attendance_export_${selectedDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Attendance records exported');
    };

    // -------------------------------------------------------------
    // EXPORT MONTHLY MATRIX (DAY 1 TO 31) TO CSV
    // -------------------------------------------------------------
    const exportMonthlyMatrixCSV = () => {
        if (filteredMatrixEmployees.length === 0) {
            toast.error('No employees to export');
            return;
        }

        const headers = [
            'Employee Code',
            'Employee Name',
            'Department',
            ...matrixDays.map((d) => `Day ${d.dayNum} (${d.weekday})`),
            'Total Present',
            'Total Absent',
            'Total Late',
            'Total Overtime (Hrs)',
        ];

        const rows = filteredMatrixEmployees.map((emp) => {
            let presentCount = 0;
            let absentCount = 0;
            let lateCount = 0;
            let totalOtMins = 0;

            const dayCells = matrixDays.map((d) => {
                const rec = monthAttMap.get(`${emp._id}_${d.dateStr}`) || monthAttMap.get(`${emp.employeeCode?.toUpperCase()}_${d.dateStr}`);
                if (rec) {
                    if (rec.status === 'present') { presentCount++; return 'P'; }
                    if (rec.status === 'late') { lateCount++; presentCount++; return 'L'; }
                    if (rec.status === 'half_day') { return 'HD'; }
                    if (rec.status === 'absent') { absentCount++; return 'A'; }
                    if (rec.status === 'leave') { return 'LV'; }
                    if (rec.status === 'holiday') { return 'H'; }
                    if (rec.overtimeMinutes) totalOtMins += rec.overtimeMinutes;
                    return rec.status.toUpperCase();
                } else if (d.isWeekend) {
                    return 'OFF';
                }
                return '-';
            });

            return [
                emp.employeeCode || '',
                `"${emp.firstName} ${emp.lastName}"`,
                `"${emp.departmentId?.name || ''}"`,
                ...dayCells,
                presentCount,
                absentCount,
                lateCount,
                (totalOtMins / 60).toFixed(1),
            ];
        });

        const csvContent =
            'data:text/csv;charset=utf-8,' +
            [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `monthly_attendance_matrix_${matrixYear}_${String(matrixMonth).padStart(2, '0')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${filteredMatrixEmployees.length} staff attendance records to CSV`);
    };

    // -------------------------------------------------------------
    // SAVE SINGLE CELL ATTENDANCE FROM MATRIX
    // -------------------------------------------------------------
    const saveCellAttendance = async () => {
        if (!editCellModal) return;
        try {
            const isWorking = ['present', 'late', 'half_day'].includes(editCellModal.status);
            await markSingleAtt.mutateAsync({
                employeeId: editCellModal.employee._id,
                date: editCellModal.dateStr,
                status: editCellModal.status,
                checkInTime: isWorking && editCellModal.inTime ? `${editCellModal.dateStr}T${editCellModal.inTime}:00` : undefined,
                checkOutTime: isWorking && editCellModal.outTime ? `${editCellModal.dateStr}T${editCellModal.outTime}:00` : undefined,
                overtimeMinutes: Number(editCellModal.overtimeMinutes) || 0,
                lateMinutes: Number(editCellModal.lateMinutes) || 0,
                notes: editCellModal.notes,
            });
            toast.success(`Updated Day ${editCellModal.dayNum} for ${editCellModal.employee.firstName}`);
            setEditCellModal(null);
        } catch { }
    };

    // Table columns
    const columns = [
        {
            key: 'employee',
            label: 'Employee',
            render: (r) => (
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-semibold text-xs border border-indigo-200">
                        {r.employeeName ? r.employeeName.slice(0, 2).toUpperCase() : 'EM'}
                    </div>
                    <div>
                        <p className="font-medium text-sm text-gray-900">{r.employeeName}</p>
                        <p className="text-xs font-mono text-gray-500">{r.employeeCode}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (r) => (
                <Badge variant={statusVariant[r.status]}>
                    {r.status?.replace(/_/g, ' ').toUpperCase()}
                </Badge>
            ),
        },
        {
            key: 'checkIn',
            label: 'Check In',
            render: (r) =>
                r.checkInTime ? (
                    <span className="font-mono text-xs text-gray-800">
                        {new Date(r.checkInTime).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                ) : (
                    <span className="text-gray-400">—</span>
                ),
        },
        {
            key: 'checkOut',
            label: 'Check Out',
            render: (r) =>
                r.checkOutTime ? (
                    <span className="font-mono text-xs text-gray-800">
                        {new Date(r.checkOutTime).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                ) : (
                    <span className="text-gray-400">—</span>
                ),
        },
        {
            key: 'worked',
            label: 'Worked Time',
            render: (r) =>
                r.totalWorkedMinutes ? (
                    <span className="font-medium text-xs text-gray-700">
                        {(r.totalWorkedMinutes / 60).toFixed(1)} hrs
                    </span>
                ) : (
                    <span className="text-gray-400">—</span>
                ),
        },
        {
            key: 'late',
            label: 'Late',
            render: (r) =>
                r.lateMinutes > 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        {r.lateMinutes} min
                    </span>
                ) : (
                    <span className="text-gray-400 text-xs">On time</span>
                ),
        },
        {
            key: 'ot',
            label: 'Overtime',
            render: (r) =>
                r.overtimeMinutes > 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        +{(r.overtimeMinutes / 60).toFixed(1)} hrs
                    </span>
                ) : (
                    <span className="text-gray-400 text-xs">—</span>
                ),
        },
    ];

    const monthNamesList = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Staff Attendance & Timesheet"
                description="Daily staff attendance, 31-day monthly matrix, biometric imports, overtime tracking and reports"
                actions={
                    <div className="flex flex-wrap gap-2">
                        {viewTab === 'monthly' ? (
                            <Button
                                variant="outline"
                                onClick={exportMonthlyMatrixCSV}
                                className="bg-white hover:bg-gray-50 border-gray-300"
                                disabled={filteredMatrixEmployees.length === 0}
                            >
                                <FileSpreadsheet size={15} className="mr-1.5 text-emerald-600" />
                                Export Month Matrix (CSV)
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsUploadOpen(true)}
                                    className="bg-white hover:bg-gray-50 border-gray-300"
                                >
                                    <Upload size={15} className="mr-1.5 text-indigo-600" />
                                    Import Excel / CSV
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={exportAttendanceCSV}
                                    className="bg-white hover:bg-gray-50 border-gray-300"
                                    disabled={attendance.length === 0}
                                >
                                    <Download size={15} className="mr-1.5 text-gray-600" />
                                    Export CSV
                                </Button>
                                <Button variant="primary" onClick={openBulkModal}>
                                    <Plus size={16} className="mr-1.5" />
                                    Bulk Mark Attendance
                                </Button>
                            </>
                        )}
                    </div>
                }
            />

            {/* TAB SELECTOR: DAILY VIEW vs MONTHLY MATRIX (1-31) */}
            <div className="flex border-b border-gray-200 gap-4">
                <button
                    type="button"
                    onClick={() => setViewTab('daily')}
                    className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                        viewTab === 'daily'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Clock size={16} />
                    Daily Attendance View
                </button>
                <button
                    type="button"
                    onClick={() => setViewTab('monthly')}
                    className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                        viewTab === 'monthly'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <CalendarDays size={16} />
                    Monthly Timesheet Matrix (Day 1 — 31)
                </button>
            </div>

            {/* ============================================================== */}
            {/* VIEW 1: DAILY ATTENDANCE                                       */}
            {/* ============================================================== */}
            {viewTab === 'daily' && (
                <>
                    {/* LIVE KPI METRICS SUMMARY */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        <Card className="p-3.5 border-l-4 border-l-blue-500 bg-white">
                            <p className="text-xs font-medium text-gray-500">Total Staff</p>
                            <p className="text-2xl font-bold text-gray-800 mt-1">{metrics.total}</p>
                        </Card>

                        <Card className="p-3.5 border-l-4 border-l-emerald-500 bg-white">
                            <p className="text-xs font-medium text-gray-500 flex items-center justify-between">
                                <span>Present</span>
                                <CheckCircle2 size={13} className="text-emerald-500" />
                            </p>
                            <p className="text-2xl font-bold text-emerald-700 mt-1">{metrics.present}</p>
                        </Card>

                        <Card className="p-3.5 border-l-4 border-l-rose-500 bg-white">
                            <p className="text-xs font-medium text-gray-500 flex items-center justify-between">
                                <span>Absent</span>
                                <XCircle size={13} className="text-rose-500" />
                            </p>
                            <p className="text-2xl font-bold text-rose-700 mt-1">{metrics.absent}</p>
                        </Card>

                        <Card className="p-3.5 border-l-4 border-l-amber-500 bg-white">
                            <p className="text-xs font-medium text-gray-500 flex items-center justify-between">
                                <span>Late Arrivals</span>
                                <Clock size={13} className="text-amber-500" />
                            </p>
                            <p className="text-2xl font-bold text-amber-700 mt-1">{metrics.late}</p>
                        </Card>

                        <Card className="p-3.5 border-l-4 border-l-indigo-500 bg-white">
                            <p className="text-xs font-medium text-gray-500">On Leave / Half</p>
                            <p className="text-2xl font-bold text-indigo-700 mt-1">{metrics.leave + metrics.halfDay}</p>
                        </Card>

                        <Card className="p-3.5 border-l-4 border-l-purple-500 bg-white">
                            <p className="text-xs font-medium text-gray-500">Total Overtime</p>
                            <p className="text-2xl font-bold text-purple-700 mt-1">{metrics.otHours} <span className="text-xs font-normal text-gray-500">hrs</span></p>
                        </Card>
                    </div>

                    {/* FILTER BAR & DATE SELECTOR */}
                    <Card className="p-4 bg-white border border-gray-200">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            {/* Date Navigation */}
                            <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-lg border border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => changeDate(-1)}
                                    className="p-1.5 hover:bg-white rounded text-gray-600 hover:text-gray-900 transition"
                                    title="Previous day"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="px-2.5 py-1 text-sm font-semibold text-gray-800 bg-transparent border-0 focus:ring-0 cursor-pointer"
                                />
                                <button
                                    type="button"
                                    onClick={() => changeDate(1)}
                                    className="p-1.5 hover:bg-white rounded text-gray-600 hover:text-gray-900 transition"
                                    title="Next day"
                                >
                                    <ChevronRight size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={setToday}
                                    className="text-xs font-medium px-2 py-1 bg-white hover:bg-gray-100 rounded text-indigo-600 border border-gray-200 ml-1 transition"
                                >
                                    Today
                                </button>
                            </div>

                            {/* Department, Status & Search Filters */}
                            <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl justify-end">
                                <div className="w-44">
                                    <Select
                                        placeholder="All Departments"
                                        options={deptOptions}
                                        value={departmentId}
                                        onChange={(e) => setDepartmentId(e.target.value)}
                                    />
                                </div>
                                <div className="w-36">
                                    <Select
                                        placeholder="All Status"
                                        options={[
                                            { value: '', label: 'All Status' },
                                            { value: 'present', label: 'Present' },
                                            { value: 'late', label: 'Late' },
                                            { value: 'absent', label: 'Absent' },
                                            { value: 'half_day', label: 'Half Day' },
                                            { value: 'leave', label: 'Leave' },
                                        ]}
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    />
                                </div>
                                <div className="w-52 relative">
                                    <input
                                        type="text"
                                        placeholder="Search employee..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                    <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* ATTENDANCE TABLE */}
                    <Card className="overflow-hidden border border-gray-200 shadow-sm">
                        {attLoading ? (
                            <div className="p-12 text-center text-gray-400 text-sm">
                                Loading attendance records...
                            </div>
                        ) : filteredAttendance.length === 0 ? (
                            <EmptyState
                                icon={CalendarIcon}
                                title="No attendance recorded for this date"
                                description="You can mark attendance manually using 'Bulk Mark' or upload your biometric machine CSV/Excel file."
                                action={
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => setIsUploadOpen(true)}>
                                            <Upload size={14} className="mr-1.5" /> Import Excel / CSV
                                        </Button>
                                        <Button variant="primary" onClick={openBulkModal}>
                                            <Plus size={14} className="mr-1.5" /> Mark Today's Attendance
                                        </Button>
                                    </div>
                                }
                            />
                        ) : (
                            <Table columns={columns} data={filteredAttendance} />
                        )}
                    </Card>
                </>
            )}

            {/* ============================================================== */}
            {/* VIEW 2: MONTHLY TIMESHEET MATRIX (DAY 1 TO 31)                 */}
            {/* ============================================================== */}
            {viewTab === 'monthly' && (
                <div className="space-y-4">
                    {/* Controls & Filter Bar */}
                    <Card className="p-4 bg-white border border-gray-200">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Year Selector */}
                                <div className="w-28">
                                    <Select
                                        value={matrixYear}
                                        onChange={(e) => setMatrixYear(Number(e.target.value))}
                                        options={[
                                            { value: currentYear - 1, label: String(currentYear - 1) },
                                            { value: currentYear, label: String(currentYear) },
                                            { value: currentYear + 1, label: String(currentYear + 1) },
                                        ]}
                                    />
                                </div>

                                {/* Month Selector */}
                                <div className="w-36">
                                    <Select
                                        value={matrixMonth}
                                        onChange={(e) => setMatrixMonth(Number(e.target.value))}
                                        options={monthNamesList.map((m, idx) => ({ value: idx + 1, label: m }))}
                                    />
                                </div>

                                {/* Department Filter */}
                                <div className="w-44">
                                    <Select
                                        placeholder="All Departments"
                                        options={deptOptions}
                                        value={matrixDept}
                                        onChange={(e) => setMatrixDept(e.target.value)}
                                    />
                                </div>

                                {/* Staff Search */}
                                <div className="w-56 relative">
                                    <input
                                        type="text"
                                        placeholder="Search employee..."
                                        value={matrixSearch}
                                        onChange={(e) => setMatrixSearch(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                    <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                                </div>
                            </div>

                            {/* Status Badges Legend */}
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                                <span className="font-semibold text-gray-500 mr-1">Legend:</span>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">P = Present</span>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">L = Late</span>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">A = Absent</span>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">HD = Half</span>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">LV = Leave</span>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">OFF = Weekend</span>
                            </div>
                        </div>
                    </Card>

                    {/* Comprehensive Monthly Grid */}
                    <Card className="overflow-hidden border border-gray-200 shadow-sm bg-white">
                        {monthAttLoading ? (
                            <div className="p-16 text-center text-gray-400 text-sm">
                                Loading complete monthly timesheet matrix for {monthNamesList[matrixMonth - 1]} {matrixYear}...
                            </div>
                        ) : filteredMatrixEmployees.length === 0 ? (
                            <div className="p-12 text-center text-gray-500 text-sm">
                                No active employees found matching the filters.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse min-w-[1100px]">
                                    <thead>
                                        <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-300">
                                            {/* Sticky Employee Column */}
                                            <th className="sticky left-0 bg-gray-100 z-10 px-3 py-2.5 w-52 border-r border-gray-300 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                                                Employee
                                            </th>
                                            {/* Days 1 to 28/30/31 Columns */}
                                            {matrixDays.map((d) => (
                                                <th
                                                    key={d.dayNum}
                                                    className={`px-1 py-1.5 text-center w-8 border-r border-gray-200 ${
                                                        d.isWeekend ? 'bg-slate-200/60 text-slate-600' : ''
                                                    }`}
                                                >
                                                    <span className="block font-bold text-[11px]">{d.dayPad}</span>
                                                    <span className="block text-[9px] font-normal text-gray-500 uppercase">{d.weekday}</span>
                                                </th>
                                            ))}
                                            {/* Totals Summary Columns */}
                                            <th className="px-2 py-2 text-center w-12 bg-emerald-50 text-emerald-800 border-r border-gray-200 font-bold">Pres</th>
                                            <th className="px-2 py-2 text-center w-12 bg-rose-50 text-rose-800 border-r border-gray-200 font-bold">Abs</th>
                                            <th className="px-2 py-2 text-center w-12 bg-amber-50 text-amber-800 border-r border-gray-200 font-bold">Late</th>
                                            <th className="px-2 py-2 text-center w-14 bg-purple-50 text-purple-800 font-bold">OT (h)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredMatrixEmployees.map((emp) => {
                                            let presentDays = 0;
                                            let lateDays = 0;
                                            let absentDays = 0;
                                            let totalOtMins = 0;

                                            return (
                                                <tr key={emp._id} className="hover:bg-indigo-50/20 transition-colors">
                                                    {/* Sticky Employee Name & Code */}
                                                    <td className="sticky left-0 bg-white z-10 px-3 py-2 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
                                                        <p className="font-semibold text-gray-900 truncate max-w-[180px]">
                                                            {emp.firstName} {emp.lastName}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500 font-mono">
                                                            {emp.employeeCode} {emp.departmentId?.name && `• ${emp.departmentId.name}`}
                                                        </p>
                                                    </td>

                                                    {/* Day Cells 1 to 28/30/31 */}
                                                    {matrixDays.map((d) => {
                                                        const rec = monthAttMap.get(`${emp._id}_${d.dateStr}`) || monthAttMap.get(`${emp.employeeCode?.toUpperCase()}_${d.dateStr}`);

                                                        let cellContent = '—';
                                                        let cellClass = 'text-gray-300 hover:bg-gray-100';
                                                        let title = `${emp.firstName}: Day ${d.dayNum} (${d.dateStr}) — Unmarked`;

                                                        if (rec) {
                                                            const st = rec.status;
                                                            if (st === 'present') {
                                                                presentDays++;
                                                                cellContent = 'P';
                                                                cellClass = 'bg-emerald-600 text-white font-bold hover:bg-emerald-700';
                                                            } else if (st === 'late') {
                                                                lateDays++;
                                                                presentDays++;
                                                                cellContent = 'L';
                                                                cellClass = 'bg-amber-500 text-white font-bold hover:bg-amber-600';
                                                            } else if (st === 'half_day') {
                                                                cellContent = 'HD';
                                                                cellClass = 'bg-blue-600 text-white font-bold hover:bg-blue-700';
                                                            } else if (st === 'absent') {
                                                                absentDays++;
                                                                cellContent = 'A';
                                                                cellClass = 'bg-rose-600 text-white font-bold hover:bg-rose-700';
                                                            } else if (st === 'leave') {
                                                                cellContent = 'LV';
                                                                cellClass = 'bg-indigo-600 text-white font-bold hover:bg-indigo-700';
                                                            } else if (st === 'holiday') {
                                                                cellContent = 'H';
                                                                cellClass = 'bg-purple-600 text-white font-bold hover:bg-purple-700';
                                                            }

                                                            if (rec.overtimeMinutes) totalOtMins += rec.overtimeMinutes;

                                                            const inStr = rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }) : '—';
                                                            const outStr = rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }) : '—';
                                                            title = `${emp.firstName}: Day ${d.dayNum} [${st.toUpperCase()}]\nIn: ${inStr} | Out: ${outStr}${rec.overtimeMinutes ? `\nOT: ${(rec.overtimeMinutes/60).toFixed(1)} hrs` : ''}\nClick to view or edit`;
                                                        } else if (d.isWeekend) {
                                                            cellContent = 'OFF';
                                                            cellClass = 'bg-slate-100 text-slate-400 text-[9px] hover:bg-slate-200';
                                                            title = `${emp.firstName}: Day ${d.dayNum} — Weekend Off-Day`;
                                                        }

                                                        return (
                                                            <td
                                                                key={d.dayNum}
                                                                className={`p-0.5 text-center border-r border-gray-100 ${
                                                                    d.isWeekend ? 'bg-slate-50/50' : ''
                                                                }`}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    title={title}
                                                                    onClick={() => {
                                                                        const existingIn = rec?.checkInTime ? new Date(rec.checkInTime).toTimeString().slice(0, 5) : '08:30';
                                                                        const existingOut = rec?.checkOutTime ? new Date(rec.checkOutTime).toTimeString().slice(0, 5) : '17:00';
                                                                        setEditCellModal({
                                                                            employee: emp,
                                                                            dateStr: d.dateStr,
                                                                            dayNum: d.dayNum,
                                                                            status: rec?.status || (d.isWeekend ? 'weekend' : 'present'),
                                                                            inTime: existingIn,
                                                                            outTime: existingOut,
                                                                            overtimeMinutes: rec?.overtimeMinutes || 0,
                                                                            lateMinutes: rec?.lateMinutes || 0,
                                                                            notes: rec?.notes || '',
                                                                        });
                                                                    }}
                                                                    className={`w-full h-7 rounded text-[10px] flex items-center justify-center transition cursor-pointer font-mono ${cellClass}`}
                                                                >
                                                                    {cellContent}
                                                                </button>
                                                            </td>
                                                        );
                                                    })}

                                                    {/* Row Summary Values */}
                                                    <td className="px-2 py-2 text-center font-bold text-emerald-800 bg-emerald-50/40 border-r border-gray-200 font-mono">
                                                        {presentDays}
                                                    </td>
                                                    <td className="px-2 py-2 text-center font-bold text-rose-800 bg-rose-50/40 border-r border-gray-200 font-mono">
                                                        {absentDays}
                                                    </td>
                                                    <td className="px-2 py-2 text-center font-bold text-amber-800 bg-amber-50/40 border-r border-gray-200 font-mono">
                                                        {lateDays}
                                                    </td>
                                                    <td className="px-2 py-2 text-center font-bold text-purple-900 bg-purple-50/40 font-mono">
                                                        {(totalOtMins / 60).toFixed(1)}
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

            {/* ------------------------------------------------------------- */}
            {/* FAST BULK ATTENDANCE MODAL                                   */}
            {/* ------------------------------------------------------------- */}
            <Modal
                isOpen={isBulkOpen}
                onClose={() => setIsBulkOpen(false)}
                title={`Mark Attendance — ${selectedDate}`}
                size="xl"
            >
                <div className="flex flex-col max-h-[78vh]">
                    {/* Quick Action Buttons Header */}
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Quick Mark All:</span>
                            <button
                                type="button"
                                onClick={() => markAllAs('present')}
                                className="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded hover:bg-emerald-200 transition cursor-pointer"
                            >
                                ✓ All Present
                            </button>
                            <button
                                type="button"
                                onClick={() => markAllAs('absent')}
                                className="px-2.5 py-1 text-xs font-medium bg-rose-100 text-rose-800 rounded hover:bg-rose-200 transition cursor-pointer"
                            >
                                ✗ All Absent
                            </button>
                        </div>
                        <span className="text-xs text-gray-500">{bulkRecords.length} staff members</span>
                    </div>

                    {/* Table Body */}
                    <div className="p-6 overflow-y-auto flex-1">
                        <table className="w-full text-sm">
                            <thead className="border-b border-gray-200 text-gray-600 text-xs font-semibold uppercase">
                                <tr>
                                    <th className="text-left pb-2 w-1/3">Employee</th>
                                    <th className="text-left pb-2">Status</th>
                                    <th className="text-left pb-2 w-28">Check In</th>
                                    <th className="text-left pb-2 w-28">Check Out</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {bulkRecords.map((r, idx) => {
                                    const isWorking = ['present', 'late', 'half_day'].includes(r.status);
                                    return (
                                        <tr key={r.employeeId} className="hover:bg-gray-50/70">
                                            <td className="py-2.5">
                                                <p className="font-medium text-gray-900">{r.employeeName}</p>
                                                <p className="text-xs text-gray-500 font-mono">
                                                    {r.employeeCode} {r.designation && `• ${r.designation}`}
                                                </p>
                                            </td>
                                            <td className="py-2.5">
                                                {/* Quick Badge Selector */}
                                                <div className="flex gap-1">
                                                    {[
                                                        { key: 'present', label: 'P', color: 'emerald' },
                                                        { key: 'late', label: 'L', color: 'amber' },
                                                        { key: 'half_day', label: 'HD', color: 'blue' },
                                                        { key: 'absent', label: 'A', color: 'rose' },
                                                        { key: 'leave', label: 'LV', color: 'gray' },
                                                    ].map((st) => (
                                                        <button
                                                            key={st.key}
                                                            type="button"
                                                            onClick={() => updateBulkRow(idx, 'status', st.key)}
                                                            className={`w-7 h-7 text-xs font-bold rounded flex items-center justify-center transition cursor-pointer ${
                                                                r.status === st.key
                                                                    ? `bg-${st.color}-600 text-white shadow-xs`
                                                                    : `bg-gray-100 text-gray-600 hover:bg-gray-200`
                                                            }`}
                                                            style={{
                                                                backgroundColor: r.status === st.key ? (
                                                                    st.color === 'emerald' ? '#059669' :
                                                                    st.color === 'amber' ? '#d97706' :
                                                                    st.color === 'blue' ? '#2563eb' :
                                                                    st.color === 'rose' ? '#e11d48' : '#4b5563'
                                                                ) : undefined,
                                                                color: r.status === st.key ? '#fff' : undefined,
                                                            }}
                                                        >
                                                            {st.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-2.5">
                                                <input
                                                    type="time"
                                                    value={r.inTime}
                                                    onChange={(e) => updateBulkRow(idx, 'inTime', e.target.value)}
                                                    disabled={!isWorking}
                                                    className="px-2 py-1 text-xs border border-gray-300 rounded disabled:bg-gray-100 disabled:text-gray-400 font-mono w-24"
                                                />
                                            </td>
                                            <td className="py-2.5">
                                                <input
                                                    type="time"
                                                    value={r.outTime}
                                                    onChange={(e) => updateBulkRow(idx, 'outTime', e.target.value)}
                                                    disabled={!isWorking}
                                                    className="px-2 py-1 text-xs border border-gray-300 rounded disabled:bg-gray-100 disabled:text-gray-400 font-mono w-24"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Modal Footer */}
                    <div className="flex justify-between items-center px-6 py-3.5 border-t border-gray-200 bg-gray-50">
                        <span className="text-xs text-gray-500">
                            P = Present, L = Late, HD = Half Day, A = Absent, LV = Leave
                        </span>
                        <div className="flex gap-2">
                            <Button variant="outline" type="button" onClick={() => setIsBulkOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="button" onClick={submitBulk} loading={bulkMark.isPending}>
                                <Check size={16} className="mr-1.5" /> Save Attendance ({bulkRecords.length})
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* ------------------------------------------------------------- */}
            {/* EXCEL / CSV BIOMETRIC IMPORT MODAL                           */}
            {/* ------------------------------------------------------------- */}
            <Modal
                isOpen={isUploadOpen}
                onClose={() => { setIsUploadOpen(false); setParsedUpload([]); }}
                title="Import Attendance from Excel / CSV"
                size="xl"
            >
                <div className="p-6 space-y-4 max-h-[78vh] flex flex-col">
                    {/* Instructions & Template Download */}
                    <div className="flex flex-wrap items-center justify-between bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3.5 gap-2">
                        <div>
                            <p className="text-xs font-semibold text-indigo-950 flex items-center gap-1.5">
                                <FileSpreadsheet size={15} className="text-indigo-600" />
                                <span>Upload Biometric Attendance CSV or Excel Sheet</span>
                            </p>
                            <p className="text-xs text-indigo-700 mt-0.5">
                                Works directly with Fingerprint / Face ID machine exports or custom CSV spreadsheets.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={downloadTemplate}
                            className="bg-white border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                        >
                            <Download size={13} className="mr-1" />
                            Download CSV Template
                        </Button>
                    </div>

                    {/* File Dropzone */}
                    {parsedUpload.length === 0 ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-8 text-center cursor-pointer transition bg-gray-50/50 hover:bg-indigo-50/20"
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.txt,.xlsx"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Upload size={22} />
                            </div>
                            <p className="text-sm font-semibold text-gray-800">
                                Click to browse or drag & drop CSV file
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Columns supported: EmployeeCode, Date, InTime, OutTime, Status, Notes
                            </p>
                        </div>
                    ) : (
                        /* Parsed Preview Table */
                        <div className="space-y-3 flex-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-gray-700">
                                    Previewing {parsedUpload.length} parsed records:
                                    <span className="text-emerald-600 ml-2">
                                        ✓ {parsedUpload.filter((r) => r.isValid).length} ready to import
                                    </span>
                                    {parsedUpload.some((r) => !r.isValid) && (
                                        <span className="text-rose-600 ml-2">
                                            ✗ {parsedUpload.filter((r) => !r.isValid).length} invalid codes
                                        </span>
                                    )}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setParsedUpload([])}
                                    className="text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <RefreshCw size={12} /> Choose another file
                                </button>
                            </div>

                            <div className="overflow-y-auto border border-gray-200 rounded-lg max-h-64">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold sticky top-0">
                                        <tr>
                                            <th className="text-left p-2">Code</th>
                                            <th className="text-left p-2">Employee Name</th>
                                            <th className="text-left p-2">Date</th>
                                            <th className="text-left p-2">Status</th>
                                            <th className="text-left p-2">In Time</th>
                                            <th className="text-left p-2">Out Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {parsedUpload.map((r, i) => (
                                            <tr key={i} className={r.isValid ? 'hover:bg-gray-50' : 'bg-red-50/60'}>
                                                <td className="p-2 font-mono font-medium">{r.employeeCode}</td>
                                                <td className="p-2">
                                                    {r.isValid ? (
                                                        <span className="text-gray-900 font-medium">{r.employeeName}</span>
                                                    ) : (
                                                        <span className="text-red-600 italic">Not found in Employee list</span>
                                                    )}
                                                </td>
                                                <td className="p-2 text-gray-600">{r.date}</td>
                                                <td className="p-2">
                                                    <Badge variant={statusVariant[r.status] || 'default'}>
                                                        {r.status}
                                                    </Badge>
                                                </td>
                                                <td className="p-2 font-mono text-gray-600">{r.inTime || '—'}</td>
                                                <td className="p-2 font-mono text-gray-600">{r.outTime || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                        <Button
                            variant="outline"
                            type="button"
                            onClick={() => { setIsUploadOpen(false); setParsedUpload([]); }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            type="button"
                            onClick={confirmImportUpload}
                            loading={bulkMark.isPending}
                            disabled={parsedUpload.filter((r) => r.isValid).length === 0}
                        >
                            Import & Save {parsedUpload.filter((r) => r.isValid).length} Records
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* ------------------------------------------------------------- */}
            {/* QUICK EDIT SINGLE DAY CELL MODAL (FROM MONTHLY MATRIX)       */}
            {/* ------------------------------------------------------------- */}
            <Modal
                isOpen={!!editCellModal}
                onClose={() => setEditCellModal(null)}
                title={editCellModal ? `Duty Record: ${editCellModal.employee?.firstName} ${editCellModal.employee?.lastName} — Day ${editCellModal.dayNum} (${editCellModal.dateStr})` : ''}
                size="md"
            >
                {editCellModal && (
                    <div className="p-6 space-y-4">
                        <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200/80 text-xs flex justify-between items-center">
                            <div>
                                <span className="text-gray-500">Employee:</span>
                                <span className="font-bold text-gray-900 ml-1.5">{editCellModal.employee.firstName} {editCellModal.employee.lastName}</span>
                                {editCellModal.employee.departmentId?.name && (
                                    <span className="text-indigo-700 ml-1.5">({editCellModal.employee.departmentId.name})</span>
                                )}
                            </div>
                            <div>
                                <span className="text-gray-500">Code:</span>
                                <span className="font-mono font-bold text-indigo-900 ml-1.5">{editCellModal.employee.employeeCode}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Attendance Status</label>
                            <Select
                                value={editCellModal.status}
                                onChange={(e) => setEditCellModal({ ...editCellModal, status: e.target.value })}
                                options={[
                                    { value: 'present', label: 'Present' },
                                    { value: 'late', label: 'Late Arrival' },
                                    { value: 'half_day', label: 'Half Day' },
                                    { value: 'absent', label: 'Absent' },
                                    { value: 'leave', label: 'Approved Leave' },
                                    { value: 'holiday', label: 'Public Holiday' },
                                    { value: 'weekend', label: 'Weekly Off / Weekend' },
                                ]}
                            />
                        </div>

                        {['present', 'late', 'half_day'].includes(editCellModal.status) && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Check In Time</label>
                                    <input
                                        type="time"
                                        value={editCellModal.inTime || '08:30'}
                                        onChange={(e) => setEditCellModal({ ...editCellModal, inTime: e.target.value })}
                                        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Check Out Time</label>
                                    <input
                                        type="time"
                                        value={editCellModal.outTime || '17:00'}
                                        onChange={(e) => setEditCellModal({ ...editCellModal, outTime: e.target.value })}
                                        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Late (Minutes)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={editCellModal.lateMinutes || 0}
                                    onChange={(e) => setEditCellModal({ ...editCellModal, lateMinutes: e.target.value })}
                                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Overtime (Minutes)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="15"
                                    value={editCellModal.overtimeMinutes || 0}
                                    onChange={(e) => setEditCellModal({ ...editCellModal, overtimeMinutes: e.target.value })}
                                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Duty Remarks & Notes</label>
                            <input
                                type="text"
                                placeholder="e.g. Approved by Supervisor, Medical appointment, Traffic delay..."
                                value={editCellModal.notes || ''}
                                onChange={(e) => setEditCellModal({ ...editCellModal, notes: e.target.value })}
                                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                            <Button variant="outline" type="button" onClick={() => setEditCellModal(null)}>
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                type="button"
                                onClick={saveCellAttendance}
                                loading={markSingleAtt.isPending}
                            >
                                <Check size={15} className="mr-1" />
                                Save Day Record
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
