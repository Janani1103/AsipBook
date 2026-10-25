"use client";

import { useState } from "react";
import { Edit, Eye, Plus, Search, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Card from "../../../components/ui/Card.jsx";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import { useDepartments, useEmployees, useDeleteEmployee } from "../../../client/features/hr/useHr.js";

const variants = {
  active: "success", on_leave: "warning", probation: "info", suspended: "danger",
  terminated: "default", resigned: "default",
};
const statuses = ["active", "on_leave", "probation", "suspended", "terminated", "resigned", "retired"];

export default function EmployeesPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    search: "", departmentId: "", status: "", page: 1, limit: 15,
  });
  const [deleting, setDeleting] = useState(null);
  const { data, isLoading } = useEmployees(filters);
  const { data: departmentsData } = useDepartments();
  const deleteMutation = useDeleteEmployee();
  const employees = data?.data || [];
  const departmentOptions = (departmentsData?.data || []).map((row) => ({
    value: row._id,
    label: row.name,
  }));
  const statusOptions = statuses.map((value) => ({
    value,
    label: value.replace(/_/g, " "),
  }));

  const change = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value, page: 1 }));
  };
  const viewEmployee = (employee) => router.push(`/employees/${employee._id}`);

  const columns = [
    {
      key: "employeeCode",
      label: "Code",
      width: "100px",
      render: (row) => <span className="font-mono text-xs">{row.employeeCode}</span>,
    },
    {
      key: "employee",
      label: "Employee",
      render: (row) => (
        <div
          onClick={(e) => {
            e.stopPropagation();
            viewEmployee(row);
          }}
          className="cursor-pointer group"
          title="Click to view profile"
        >
          <p className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
            {row.firstName} {row.lastName}
          </p>
          <p className="text-xs text-gray-500">{row.email || row.phone || "—"}</p>
        </div>
      ),
    },
    { key: "department", label: "Department", render: (row) => row.departmentId?.name || "—" },
    { key: "designation", label: "Designation", render: (row) => row.designationId?.name || "—" },
    { key: "type", label: "Type", render: (row) => row.employmentType?.replace(/_/g, " ") },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge variant={variants[row.status]}>{row.status?.replace(/_/g, " ")}</Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      width: "120px",
      render: (row) => (
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => viewEmployee(row)}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="View Details"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => router.push(`/employees/${row._id}/edit`)}
            className="rounded p-1.5 text-gray-500 hover:bg-primary-50 hover:text-primary-600 transition-colors"
            title="Edit Employee"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => setDeleting(row)}
            className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Delete Employee"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Manage employee records"
        actions={
          <Button variant="primary" onClick={() => router.push("/employees/new")}>
            <Plus size={16} className="mr-1.5" />
            Add Employee
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap gap-3 border-b p-4">
          <div className="min-w-60 flex-1">
            <Input
              placeholder="Search employees..."
              value={filters.search}
              onChange={(event) => change("search", event.target.value)}
              icon={<Search size={16} />}
            />
          </div>
          <div className="w-48">
            <Select
              placeholder="All Departments"
              value={filters.departmentId}
              options={departmentOptions}
              onChange={(event) => change("departmentId", event.target.value)}
            />
          </div>
          <div className="w-40">
            <Select
              placeholder="All Statuses"
              value={filters.status}
              options={statusOptions}
              onChange={(event) => change("status", event.target.value)}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">Loading...</div>
        ) : employees.length ? (
          <>
            <Table columns={columns} data={employees} onRowClick={viewEmployee} />
            <Pagination
              page={filters.page}
              totalPages={data?.totalPages || 1}
              total={data?.total || 0}
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          </>
        ) : (
          <EmptyState
            icon={Users}
            title="No employees"
            description="Add your first employee"
            action={
              <Button variant="primary" onClick={() => router.push("/employees/new")}>
                Add Employee
              </Button>
            }
          />
        )}
      </Card>
      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await deleteMutation.mutateAsync(deleting._id);
            setDeleting(null);
          }
        }}
        title="Delete Employee"
        message={`Are you sure you want to delete employee "${deleting?.firstName} ${deleting?.lastName}" (${deleting?.employeeCode})? This will mark the employee record as terminated.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
