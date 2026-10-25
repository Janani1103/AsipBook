"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Plus, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import Button from "../../../components/ui/Button.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Card from "../../../components/ui/Card.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import {
  useAttendance,
  useBulkMarkAttendance,
  useDepartments,
  useEmployees,
} from "../../../client/features/hr/useHr.js";
import toast from "react-hot-toast";

const statuses = ["present", "absent", "half_day", "late", "leave"];
const statusLabels = {
  present: "Present",
  absent: "Absent",
  half_day: "Half Day",
  late: "Late",
  leave: "Leave",
};
const statusVariant = {
  present: "success",
  absent: "danger",
  half_day: "warning",
  leave: "info",
  holiday: "default",
  weekend: "default",
  late: "warning",
};

function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-LK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderEmployee(record) {
  return (
    <div>
      <p className="text-sm font-medium">{record.employeeName}</p>
      <p className="font-mono text-xs text-gray-500">{record.employeeCode}</p>
    </div>
  );
}

function renderStatus(record) {
  return (
    <Badge variant={statusVariant[record.status]}>
      {record.status?.replace(/_/g, " ")}
    </Badge>
  );
}

function renderWorkedTime(record) {
  if (!record.totalWorkedMinutes) return "—";
  return `${(record.totalWorkedMinutes / 60).toFixed(1)} hrs`;
}

function renderLateMinutes(record) {
  return record.lateMinutes > 0 ? `${record.lateMinutes} min` : "—";
}

function renderOvertime(record) {
  return record.overtimeMinutes > 0
    ? `${(record.overtimeMinutes / 60).toFixed(1)} hrs`
    : "—";
}

function AttendanceTable({ records }) {
  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: renderEmployee,
    },
    {
      key: "status",
      label: "Status",
      render: renderStatus,
    },
    {
      key: "checkInTime",
      label: "Check In",
      render: (record) => formatTime(record.checkInTime),
    },
    {
      key: "checkOutTime",
      label: "Check Out",
      render: (record) => formatTime(record.checkOutTime),
    },
    {
      key: "breakInTime",
      label: "Break In",
      render: (record) => formatTime(record.breakInTime),
    },
    {
      key: "breakOutTime",
      label: "Break Out",
      render: (record) => formatTime(record.breakOutTime),
    },
    {
      key: "totalWorkedMinutes",
      label: "Worked",
      render: renderWorkedTime,
    },
    {
      key: "totalBreakMinutes",
      label: "Break",
      render: (record) => {
        if (!record.totalBreakMinutes) return "—";
        return `${(record.totalBreakMinutes / 60).toFixed(1)} hrs`;
      },
    },
    {
      key: "lateMinutes",
      label: "Late",
      render: renderLateMinutes,
    },
    {
      key: "overtimeMinutes",
      label: "OT",
      render: renderOvertime,
    },
  ];

  return <Table columns={columns} data={records} />;
}

function BulkAttendanceRows({ records, onChange, onBreakInChange, onBreakOutChange }) {
  return records.map((record, index) => {
    const canEnterTimes = ["present", "late", "half_day"].includes(record.status);

    return (
      <tr key={record.employeeId}>
        <td className="py-2">{record.employeeName}</td>
        <td className="py-2">
          <select
            value={record.status}
            onChange={(event) => onChange(index, "status", event.target.value)}
            className="rounded border px-2 py-1 text-xs"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </td>
        <td className="py-2">
          <input
            type="datetime-local"
            value={record.checkInTime}
            disabled={!canEnterTimes}
            onChange={(event) => onChange(index, "checkInTime", event.target.value)}
            className="rounded border px-2 py-1 text-xs disabled:bg-gray-100"
          />
        </td>
        <td className="py-2">
          <input
            type="datetime-local"
            value={record.checkOutTime}
            disabled={!canEnterTimes}
            onChange={(event) => onChange(index, "checkOutTime", event.target.value)}
            className="rounded border px-2 py-1 text-xs disabled:bg-gray-100"
          />
        </td>
        <td className="py-2">
          <input
            type="datetime-local"
            value={record.breakInTime || ""}
            disabled={!canEnterTimes}
            onChange={(event) => onBreakInChange(index, event.target.value)}
            className="rounded border px-2 py-1 text-xs disabled:bg-gray-100"
          />
        </td>
        <td className="py-2">
          <input
            type="datetime-local"
            value={record.breakOutTime || ""}
            disabled={!canEnterTimes}
            onChange={(event) => onBreakOutChange(index, event.target.value)}
            className="rounded border px-2 py-1 text-xs disabled:bg-gray-100"
          />
        </td>
      </tr>
    );
  });
}

function EditableAttendanceRow({ record, index, onChange, onSave }) {
  const canEnterTimes = ["present", "late", "half_day"].includes(record.status);

  return (
    <tr key={record.employeeId} className={record.hasChanges ? "bg-blue-50" : ""}>
      <td className="py-2">
        <div>
          <p className="text-sm font-medium">{record.employeeName}</p>
          <p className="font-mono text-xs text-gray-500">{record.employeeCode}</p>
        </div>
      </td>
      <td className="py-2">
        <select
          value={record.status}
          onChange={(event) => onChange(index, "status", event.target.value)}
          className="rounded border px-2 py-1 text-xs"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2">
        <input
          type="datetime-local"
          value={record.checkInTime}
          disabled={!canEnterTimes}
          onChange={(event) => onChange(index, "checkInTime", event.target.value)}
          className="rounded border px-2 py-1 text-xs disabled:bg-gray-100"
        />
      </td>
      <td className="py-2">
        <input
          type="datetime-local"
          value={record.checkOutTime}
          disabled={!canEnterTimes}
          onChange={(event) => onChange(index, "checkOutTime", event.target.value)}
          className="rounded border px-2 py-1 text-xs disabled:bg-gray-100"
        />
      </td>
      <td className="py-2">
        <input
          type="datetime-local"
          value={record.breakInTime || ""}
          disabled={!canEnterTimes}
          onChange={(event) => onChange(index, "breakInTime", event.target.value)}
          className="rounded border px-2 py-1 text-xs disabled:bg-gray-100"
        />
      </td>
      <td className="py-2">
        <input
          type="datetime-local"
          value={record.breakOutTime || ""}
          disabled={!canEnterTimes}
          onChange={(event) => onChange(index, "breakOutTime", event.target.value)}
          className="rounded border px-2 py-1 text-xs disabled:bg-gray-100"
        />
      </td>
      <td className="py-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSave(index)}
          disabled={!record.hasChanges}
          className="text-xs"
        >
          Save
        </Button>
      </td>
    </tr>
  );
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [departmentId, setDepartmentId] = useState("");
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkRecords, setBulkRecords] = useState([]);
  const [bulkDate, setBulkDate] = useState("");
  const [bulkStartDate, setBulkStartDate] = useState("");
  const [bulkEndDate, setBulkEndDate] = useState("");
  const [useDateRange, setUseDateRange] = useState(false);
  const [defaultCheckIn, setDefaultCheckIn] = useState("08:00");
  const [defaultCheckOut, setDefaultCheckOut] = useState("17:00");
  const [defaultBreakIn, setDefaultBreakIn] = useState("12:00");
  const [defaultBreakOut, setDefaultBreakOut] = useState("13:00");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadData, setUploadData] = useState([]);
  const [editableRecords, setEditableRecords] = useState([]);
  const attendanceQuery = useAttendance({
    date: selectedDate,
    departmentId: departmentId || undefined,
    limit: 200,
  });
  const employeesQuery = useEmployees({
    departmentId: departmentId || undefined,
    status: "active",
    limit: 500,
  });
  const departmentsQuery = useDepartments();
  const bulkMark = useBulkMarkAttendance();
  const attendance = attendanceQuery.data?.data || [];
  const employees = employeesQuery.data?.data || [];
  const departments = departmentsQuery.data?.data || [];
  const departmentOptions = departments.map((department) => ({
    value: department._id,
    label: department.name,
  }));

  // Initialize editable records when employees or attendance data changes
  const initializeEditableRecords = () => {
    const attendanceByEmployee = new Map(
      attendance.map((record) => [record.employeeId._id || record.employeeId, record]),
    );
    const records = employees.map((employee) => {
      const existing = attendanceByEmployee.get(employee._id);
      return {
        employeeId: employee._id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        employeeCode: employee.employeeCode,
        status: existing?.status || "present",
        checkInTime: existing?.checkInTime ? existing.checkInTime.slice(0, 16) : `${selectedDate}T${defaultCheckIn}`,
        checkOutTime: existing?.checkOutTime ? existing.checkOutTime.slice(0, 16) : `${selectedDate}T${defaultCheckOut}`,
        breakInTime: existing?.breakInTime ? existing.breakInTime.slice(0, 16) : "",
        breakOutTime: existing?.breakOutTime ? existing.breakOutTime.slice(0, 16) : "",
        hasChanges: false,
      };
    });
    setEditableRecords(records);
  };

  // Re-initialize when date, department, or employees change
  useEffect(() => {
    if (employees.length > 0) {
      initializeEditableRecords();
    }
  }, [selectedDate, departmentId, employees.length, attendance]);

  const openBulkMark = () => {
    setBulkDate(selectedDate);
    setBulkStartDate(selectedDate);
    setBulkEndDate(selectedDate);
    setUseDateRange(false);
    const attendanceByEmployee = new Map(
      attendance.map((record) => [record.employeeId._id || record.employeeId, record]),
    );
    const records = employees.map((employee) => {
      const existing = attendanceByEmployee.get(employee._id);
      return {
        employeeId: employee._id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        status: existing?.status || "present",
        checkInTime: existing?.checkInTime || `${selectedDate}T${defaultCheckIn}`,
        checkOutTime: existing?.checkOutTime || `${selectedDate}T${defaultCheckOut}`,
        breakInTime: existing?.breakInTime || "",
        breakOutTime: existing?.breakOutTime || "",
      };
    });

    setBulkRecords(records);
    setIsBulkOpen(true);
  };

  const updateBulkRecord = (index, field, value) => {
    setBulkRecords((records) => records.map((record, recordIndex) => {
      if (recordIndex !== index) return record;
      return { ...record, [field]: value };
    }));
  };

  const applyDefaultTimes = () => {
    const dateToUse = useDateRange ? bulkStartDate : bulkDate;
    setBulkRecords((records) => records.map((record) => ({
      ...record,
      checkInTime: `${dateToUse}T${defaultCheckIn}`,
      checkOutTime: `${dateToUse}T${defaultCheckOut}`,
      breakInTime: `${dateToUse}T${defaultBreakIn}`,
      breakOutTime: `${dateToUse}T${defaultBreakOut}`,
    })));
  };

  // Auto-apply when default times change
  const handleDefaultCheckInChange = (value) => {
    setDefaultCheckIn(value);
    const dateToUse = useDateRange ? bulkStartDate : bulkDate;
    setBulkRecords((records) => records.map((record) => ({
      ...record,
      checkInTime: `${dateToUse}T${value}`,
    })));
  };

  const handleDefaultCheckOutChange = (value) => {
    setDefaultCheckOut(value);
    const dateToUse = useDateRange ? bulkStartDate : bulkDate;
    setBulkRecords((records) => records.map((record) => ({
      ...record,
      checkOutTime: `${dateToUse}T${value}`,
    })));
  };

  const handleDefaultBreakInChange = (value) => {
    setDefaultBreakIn(value);
    const dateToUse = useDateRange ? bulkStartDate : bulkDate;
    setBulkRecords((records) => records.map((record) => ({
      ...record,
      breakInTime: `${dateToUse}T${value}`,
    })));
  };

  const handleDefaultBreakOutChange = (value) => {
    setDefaultBreakOut(value);
    const dateToUse = useDateRange ? bulkStartDate : bulkDate;
    setBulkRecords((records) => records.map((record) => ({
      ...record,
      breakOutTime: `${dateToUse}T${value}`,
    })));
  };

  const handleBreakInChange = (index, value) => {
    setBulkRecords((records) => records.map((record, recordIndex) => {
      if (recordIndex !== index) return record;
      return { ...record, breakInTime: value };
    }));
  };

  const handleBreakOutChange = (index, value) => {
    setBulkRecords((records) => records.map((record, recordIndex) => {
      if (recordIndex !== index) return record;
      return { ...record, breakOutTime: value };
    }));
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          toast.error("Excel file is empty or invalid");
          return;
        }

        const headers = jsonData[0];
        const rows = jsonData.slice(1);

        const processedData = rows.map((row) => {
          const record = {};
          headers.forEach((header, index) => {
            record[header] = row[index];
          });
          return record;
        });

        setUploadedFile(file);
        setUploadData(processedData);
        toast.success(`Loaded ${processedData.length} records from Excel`);
      } catch (error) {
        toast.error("Error reading Excel file");
        console.error(error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processExcelUpload = async () => {
    if (!selectedMonth) {
      toast.error("Please select a month");
      return;
    }

    if (uploadData.length === 0) {
      toast.error("No data to upload");
      return;
    }

    const [year, month] = selectedMonth.split("-");
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-${daysInMonth.toString().padStart(2, "0")}`;

    const records = [];
    const employeeCodeMap = new Map();
    employees.forEach((emp) => {
      employeeCodeMap.set(emp.employeeCode.toLowerCase(), emp._id);
      employeeCodeMap.set(emp.firstName.toLowerCase(), emp._id);
    });

    uploadData.forEach((row) => {
      const employeeCode = row["Employee Code"] || row["employee_code"] || row["code"];
      const employeeName = row["Employee Name"] || row["employee_name"] || row["name"];
      const status = row["Status"] || row["status"] || "present";
      const checkIn = row["Check In"] || row["check_in"] || row["in"];
      const checkOut = row["Check Out"] || row["check_out"] || row["out"];
      const breakIn = row["Break In"] || row["break_in"] || row["break_in_time"];
      const breakOut = row["Break Out"] || row["break_out"] || row["break_out_time"];

      const employeeId = employeeCodeMap.get(employeeCode?.toLowerCase()) ||
                         employeeCodeMap.get(employeeName?.toLowerCase());

      if (employeeId) {
        records.push({
          employeeId,
          status: status.toLowerCase(),
          checkInTime: checkIn ? `${startDate}T${checkIn}` : undefined,
          checkOutTime: checkOut ? `${startDate}T${checkOut}` : undefined,
          breakInTime: breakIn ? `${startDate}T${breakIn}` : undefined,
          breakOutTime: breakOut ? `${startDate}T${breakOut}` : undefined,
        });
      }
    });

    if (records.length === 0) {
      toast.error("No matching employees found in Excel");
      return;
    }

    try {
      await bulkMark.mutateAsync({
        startDate,
        endDate,
        records,
      });
      toast.success(`Successfully uploaded ${records.length} attendance records`);
      setIsUploadOpen(false);
      setUploadedFile(null);
      setUploadData([]);
      attendanceQuery.refetch();
    } catch (error) {
      toast.error("Error uploading attendance data");
      console.error(error);
    }
  };

  const submitBulkMark = async () => {
    const payload = {
      records: bulkRecords.map((record) => ({
        employeeId: record.employeeId,
        status: record.status,
        checkInTime: ["present", "late"].includes(record.status)
          ? record.checkInTime
          : undefined,
        checkOutTime: ["present", "late"].includes(record.status)
          ? record.checkOutTime
          : undefined,
        breakInTime: record.breakInTime || undefined,
        breakOutTime: record.breakOutTime || undefined,
      })),
    };

    if (useDateRange) {
      payload.startDate = bulkStartDate;
      payload.endDate = bulkEndDate;
    } else {
      payload.date = bulkDate;
    }

    await bulkMark.mutateAsync(payload);
    setIsBulkOpen(false);
  };

  const updateEditableRecord = (index, field, value) => {
    setEditableRecords((records) => records.map((record, recordIndex) => {
      if (recordIndex !== index) return record;
      return { ...record, [field]: value, hasChanges: true };
    }));
  };

  const saveIndividualRecord = async (index) => {
    const record = editableRecords[index];
    const canEnterTimes = ["present", "late", "half_day"].includes(record.status);

    try {
      await bulkMark.mutateAsync({
        date: selectedDate,
        records: [{
          employeeId: record.employeeId,
          status: record.status,
          checkInTime: canEnterTimes ? record.checkInTime : undefined,
          checkOutTime: canEnterTimes ? record.checkOutTime : undefined,
          breakInTime: record.breakInTime || undefined,
          breakOutTime: record.breakOutTime || undefined,
        }],
      });
      toast.success(`Attendance saved for ${record.employeeName}`);
      setEditableRecords((records) => records.map((r, i) => 
        i === index ? { ...r, hasChanges: false } : r
      ));
      attendanceQuery.refetch();
    } catch (error) {
      toast.error("Error saving attendance");
      console.error(error);
    }
  };

  const saveAllRecords = async () => {
    const changedRecords = editableRecords.filter((record) => record.hasChanges);
    
    if (changedRecords.length === 0) {
      toast.info("No changes to save");
      return;
    }

    try {
      await bulkMark.mutateAsync({
        date: selectedDate,
        records: changedRecords.map((record) => {
          const canEnterTimes = ["present", "late", "half_day"].includes(record.status);
          return {
            employeeId: record.employeeId,
            status: record.status,
            checkInTime: canEnterTimes ? record.checkInTime : undefined,
            checkOutTime: canEnterTimes ? record.checkOutTime : undefined,
            breakInTime: record.breakInTime || undefined,
            breakOutTime: record.breakOutTime || undefined,
          };
        }),
      });
      toast.success(`Successfully saved ${changedRecords.length} attendance records`);
      setEditableRecords((records) => records.map((r) => ({ ...r, hasChanges: false })));
      attendanceQuery.refetch();
    } catch (error) {
      toast.error("Error saving attendance records");
      console.error(error);
    }
  };

  const bulkAction = (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => setIsUploadOpen(true)}>
        <Upload size={16} className="mr-1.5" />
        Upload Excel
      </Button>
      <Button variant="primary" onClick={openBulkMark}>
        <Plus size={16} className="mr-1.5" />
        Bulk Mark Attendance
      </Button>
      <Button 
        variant="primary" 
        onClick={saveAllRecords}
        disabled={!editableRecords.some((r) => r.hasChanges)}
        className="bg-green-600 hover:bg-green-700"
      >
        Save All Changes
      </Button>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Daily staff attendance records"
        actions={bulkAction}
      />

      <Card>
        <div className="flex gap-3 border-b p-4">
          <div className="w-48">
            <Input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>
          <div className="w-56">
            <Select
              placeholder="All Departments"
              options={departmentOptions}
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
            />
          </div>
        </div>

        {employees.length === 0 ? (
          <EmptyState
            icon={CalendarIcon}
            title="No employees found"
            description="Add employees to start marking attendance"
          />
        ) : (
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Employee</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Clock In</th>
                  <th className="px-4 py-3 text-left font-medium">Clock Out</th>
                  <th className="px-4 py-3 text-left font-medium">Break In</th>
                  <th className="px-4 py-3 text-left font-medium">Break Out</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {editableRecords.map((record, index) => (
                  <EditableAttendanceRow
                    key={record.employeeId}
                    record={record}
                    index={index}
                    onChange={updateEditableRecord}
                    onSave={saveIndividualRecord}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        title={`Mark Attendance`}
        size="lg"
      >
        <div className="border-b bg-gray-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="useDateRange"
              checked={useDateRange}
              onChange={(event) => setUseDateRange(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="useDateRange" className="text-sm font-medium">
              Use Date Range
            </label>
          </div>
          <div className={`grid gap-3 ${useDateRange ? 'md:grid-cols-6' : 'md:grid-cols-5'}`}>
            {!useDateRange ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Date</label>
                <Input
                  type="date"
                  value={bulkDate}
                  onChange={(event) => {
                    setBulkDate(event.target.value);
                    applyDefaultTimes();
                  }}
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Start Date</label>
                  <Input
                    type="date"
                    value={bulkStartDate}
                    onChange={(event) => {
                      setBulkStartDate(event.target.value);
                      applyDefaultTimes();
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">End Date</label>
                  <Input
                    type="date"
                    value={bulkEndDate}
                    onChange={(event) => {
                      setBulkEndDate(event.target.value);
                      applyDefaultTimes();
                    }}
                  />
                </div>
              </>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Default Check In</label>
              <Input
                type="time"
                value={defaultCheckIn}
                onChange={(event) => handleDefaultCheckInChange(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Default Check Out</label>
              <Input
                type="time"
                value={defaultCheckOut}
                onChange={(event) => handleDefaultCheckOutChange(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Default Break In</label>
              <Input
                type="time"
                value={defaultBreakIn}
                onChange={(event) => handleDefaultBreakInChange(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Default Break Out</label>
              <Input
                type="time"
                value={defaultBreakOut}
                onChange={(event) => handleDefaultBreakOutChange(event.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto p-6">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="py-2 text-left">Employee</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-left">Clock In</th>
                <th className="py-2 text-left">Clock Out</th>
                <th className="py-2 text-left">Break In</th>
                <th className="py-2 text-left">Break Out</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <BulkAttendanceRows
                records={bulkRecords}
                onChange={updateBulkRecord}
                onBreakInChange={handleBreakInChange}
                onBreakOutChange={handleBreakOutChange}
              />
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
          <Button variant="outline" onClick={() => setIsBulkOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submitBulkMark}
            loading={bulkMark.isPending}
          >
            Save All ({bulkRecords.length} records)
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Attendance from Excel"
        size="lg"
      >
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Select Month
            </label>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Upload Excel File
            </label>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
            />
            <p className="mt-1 text-xs text-gray-500">
              Excel should contain columns: Employee Code, Employee Name, Status, Check In, Check Out, Break In, Break Out
            </p>
          </div>

          {uploadedFile && (
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-sm font-medium text-green-800">
                File: {uploadedFile.name}
              </p>
              <p className="text-xs text-green-600">
                {uploadData.length} records loaded
              </p>
            </div>
          )}

          {uploadData.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded border">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1 text-left">Employee Code</th>
                    <th className="px-2 py-1 text-left">Employee Name</th>
                    <th className="px-2 py-1 text-left">Status</th>
                    <th className="px-2 py-1 text-left">Check In</th>
                    <th className="px-2 py-1 text-left">Check Out</th>
                    <th className="px-2 py-1 text-left">Break In</th>
                    <th className="px-2 py-1 text-left">Break Out</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadData.slice(0, 10).map((row, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-2 py-1">{row["Employee Code"] || row["employee_code"] || row["code"]}</td>
                      <td className="px-2 py-1">{row["Employee Name"] || row["employee_name"] || row["name"]}</td>
                      <td className="px-2 py-1">{row["Status"] || row["status"]}</td>
                      <td className="px-2 py-1">{row["Check In"] || row["check_in"] || row["in"]}</td>
                      <td className="px-2 py-1">{row["Check Out"] || row["check_out"] || row["out"]}</td>
                      <td className="px-2 py-1">{row["Break In"] || row["break_in"] || row["break_in_time"]}</td>
                      <td className="px-2 py-1">{row["Break Out"] || row["break_out"] || row["break_out_time"]}</td>
                    </tr>
                  ))}
                  {uploadData.length > 10 && (
                    <tr>
                      <td colSpan={7} className="px-2 py-1 text-center text-gray-500">
                        ... and {uploadData.length - 10} more records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
          <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={processExcelUpload}
            loading={bulkMark.isPending}
            disabled={!uploadedFile || !selectedMonth}
          >
            Upload Attendance
          </Button>
        </div>
      </Modal>
    </div>
  );
}
