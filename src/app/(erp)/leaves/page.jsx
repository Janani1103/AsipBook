"use client";

import { useState } from "react";
import {
  Ban,
  CheckCircle,
  Edit,
  Eye,
  Plane,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";
import { useAuthStore } from "../../../client/store/authStore.js";
import {
  useCreateLeave,
  useDeleteLeave,
  useEmployees,
  useLeaveActions,
  useLeaves,
  useUpdateLeave,
} from "../../../client/features/hr/useHr.js";

const statusVariant = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "default",
};

const leaveTypeOptions = [
  { value: "annual", label: "Annual" },
  { value: "sick", label: "Sick" },
  { value: "casual", label: "Casual" },
  { value: "maternity", label: "Maternity" },
  { value: "paternity", label: "Paternity" },
  { value: "unpaid", label: "Unpaid" },
  { value: "compensatory", label: "Compensatory" },
  { value: "bereavement", label: "Bereavement" },
];

const initialForm = {
  employeeId: "",
  leaveType: "annual",
  fromDate: "",
  toDate: "",
  isHalfDay: false,
  reason: "",
};

const formatDateForInput = (d) => {
  if (!d) return "";
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return "";
  return dateObj.toISOString().split("T")[0];
};

function LeaveActions({
  leave,
  canApprove,
  onAction,
  onView,
  onEdit,
  onDelete,
}) {
  const canCancel = ["pending", "approved"].includes(leave.status);
  const canEdit = leave.status !== "cancelled";

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onView(leave)}
        className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
        title="View details"
      >
        <Eye size={16} />
      </button>

      {canEdit ? (
        <button
          onClick={() => onEdit(leave)}
          className="rounded p-1.5 text-amber-600 hover:bg-amber-50"
          title="Edit leave"
        >
          <Edit size={16} />
        </button>
      ) : null}

      {leave.status === "pending" && canApprove ? (
        <>
          <button
            onClick={() => onAction("approve", leave)}
            className="rounded p-1.5 text-green-600 hover:bg-green-50"
            title="Approve"
          >
            <CheckCircle size={16} />
          </button>
          <button
            onClick={() => onAction("reject", leave)}
            className="rounded p-1.5 text-red-600 hover:bg-red-50"
            title="Reject"
          >
            <XCircle size={16} />
          </button>
        </>
      ) : null}

      {canCancel ? (
        <button
          onClick={() => onAction("cancel", leave)}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
          title="Cancel"
        >
          <Ban size={16} />
        </button>
      ) : null}

      <button
        onClick={() => onDelete(leave)}
        className="rounded p-1.5 text-red-600 hover:bg-red-50"
        title="Delete leave"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export default function LeaveRequestsPage() {
  const user = useAuthStore((state) => state.user);
  const canApprove = ["admin", "manager"].includes(user?.role);
  const [filters, setFilters] = useState({ status: "", page: 1, limit: 20 });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [viewingLeave, setViewingLeave] = useState(null);
  const [deletingLeave, setDeletingLeave] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [form, setForm] = useState(initialForm);

  const leavesQuery = useLeaves(filters);
  const employeesQuery = useEmployees({ status: "active", limit: 500 });
  const createLeave = useCreateLeave();
  const updateLeave = useUpdateLeave();
  const deleteLeave = useDeleteLeave();
  const actions = useLeaveActions();

  const leaves = leavesQuery.data?.data || [];
  const employeeOptions = (employeesQuery.data?.data || []).map((employee) => ({
    value: employee._id,
    label: `${employee.firstName} ${employee.lastName} (${employee.employeeCode})`,
  }));

  const setFormField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const setStatusFilter = (status) => {
    setFilters((current) => ({ ...current, status, page: 1 }));
  };

  const computeDays = () => {
    if (!form.fromDate || !form.toDate) return 0;
    if (form.isHalfDay) return 0.5;
    return (
      Math.floor((new Date(form.toDate) - new Date(form.fromDate)) / 86400000) + 1
    );
  };

  const handleOpenCreate = () => {
    setEditingLeave(null);
    setForm(initialForm);
    setIsFormOpen(true);
  };

  const handleEdit = (leave) => {
    setEditingLeave(leave);
    setForm({
      employeeId:
        typeof leave.employeeId === "object"
          ? leave.employeeId?._id || ""
          : leave.employeeId || "",
      leaveType: leave.leaveType || "annual",
      fromDate: formatDateForInput(leave.fromDate),
      toDate: formatDateForInput(leave.toDate),
      isHalfDay: Boolean(leave.isHalfDay),
      reason: leave.reason || "",
    });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingLeave(null);
    setForm(initialForm);
  };

  const submitLeave = async () => {
    if (!form.employeeId || !form.fromDate || !form.toDate || !form.reason) {
      toast.error("All fields required");
      return;
    }

    try {
      if (editingLeave) {
        await updateLeave.mutateAsync({
          id: editingLeave._id,
          data: form,
        });
      } else {
        await createLeave.mutateAsync(form);
      }
      handleCloseForm();
    } catch {}
  };

  const openAction = (type, leave) => {
    setActionModal({ type, leave });
  };

  const closeAction = () => {
    setActionModal(null);
    setRejectReason("");
  };

  const submitAction = async () => {
    const { type, leave } = actionModal;

    try {
      if (type === "approve") await actions.approve.mutateAsync(leave._id);
      else if (type === "reject")
        await actions.reject.mutateAsync({
          id: leave._id,
          reason: rejectReason,
        });
      else if (type === "cancel") await actions.cancel.mutateAsync(leave._id);
      closeAction();
    } catch {}
  };

  const columns = [
    {
      key: "leaveNumber",
      label: "Ref",
      render: (leave) => (
        <span className="font-mono text-xs">{leave.leaveNumber}</span>
      ),
    },
    {
      key: "employee",
      label: "Employee",
      render: (leave) => (
        <div>
          <p className="text-sm font-medium">{leave.employeeName}</p>
          <p className="font-mono text-xs text-gray-500">
            {leave.employeeCode}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (leave) => <Badge>{leave.leaveType}</Badge>,
    },
    {
      key: "dates",
      label: "Dates",
      render: (leave) => (
        <div>
          <p className="text-sm">
            {new Date(leave.fromDate).toLocaleDateString("en-LK")} —{" "}
            {new Date(leave.toDate).toLocaleDateString("en-LK")}
          </p>
          <p className="text-xs text-gray-500">
            {leave.numberOfDays} day{leave.numberOfDays > 1 ? "s" : ""}
            {leave.isHalfDay ? " (half)" : ""}
          </p>
        </div>
      ),
    },
    {
      key: "reason",
      label: "Reason",
      render: (leave) => (
        <span className="block max-w-xs truncate text-sm">{leave.reason}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (leave) => (
        <Badge variant={statusVariant[leave.status]}>{leave.status}</Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      width: "160px",
      render: (leave) => (
        <LeaveActions
          leave={leave}
          canApprove={canApprove}
          onAction={openAction}
          onView={(item) => setViewingLeave(item)}
          onEdit={handleEdit}
          onDelete={(item) => setDeletingLeave(item)}
        />
      ),
    },
  ];

  const actionTitle =
    actionModal?.type === "approve"
      ? "Approve Leave"
      : actionModal?.type === "reject"
        ? "Reject Leave"
        : "Cancel Leave";
  const actionMessage =
    actionModal?.type === "approve"
      ? `Approve ${actionModal?.leave?.numberOfDays} day(s) of ${actionModal?.leave?.leaveType} leave for ${actionModal?.leave?.employeeName}?`
      : "Cancel this leave request?";

  return (
    <div>
      <PageHeader
        title="Leave Requests"
        description="Manage employee leave applications"
        actions={
          <Button variant="primary" onClick={handleOpenCreate}>
            <Plus size={16} className="mr-1.5" />
            Request Leave
          </Button>
        }
      />

      <Card>
        <div className="flex gap-3 border-b p-4">
          <div className="w-48">
            <Select
              placeholder="All Statuses"
              options={[
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
                { value: "cancelled", label: "Cancelled" },
              ]}
              value={filters.status}
              onChange={(event) => setStatusFilter(event.target.value)}
            />
          </div>
        </div>

        {leaves.length === 0 ? (
          <EmptyState
            icon={Plane}
            title="No leave requests"
            description="Submit a leave request"
          />
        ) : (
          <>
            <Table columns={columns} data={leaves} />
            <Pagination
              page={filters.page}
              totalPages={leavesQuery.data?.totalPages || 1}
              total={leavesQuery.data?.total || 0}
              onPageChange={(page) =>
                setFilters((current) => ({ ...current, page }))
              }
            />
          </>
        )}
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        title={editingLeave ? "Edit Leave Request" : "New Leave Request"}
        size="md"
      >
        <div className="space-y-4 p-6">
          <Select
            label="Employee"
            required
            placeholder="Select..."
            options={employeeOptions}
            value={form.employeeId}
            onChange={(event) => setFormField("employeeId", event.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Leave Type"
              options={leaveTypeOptions}
              value={form.leaveType}
              onChange={(event) =>
                setFormField("leaveType", event.target.value)
              }
            />
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={form.isHalfDay}
                  onChange={(event) =>
                    setFormField("isHalfDay", event.target.checked)
                  }
                />
                Half day
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="From Date"
              required
              type="date"
              value={form.fromDate}
              onChange={(event) => setFormField("fromDate", event.target.value)}
            />
            <Input
              label="To Date"
              required
              type="date"
              value={form.toDate}
              onChange={(event) => setFormField("toDate", event.target.value)}
            />
          </div>

          <p className="text-sm text-gray-600">
            Total days: <strong className="text-gray-900">{computeDays()}</strong>
          </p>

          <Textarea
            label="Reason"
            required
            rows={3}
            value={form.reason}
            onChange={(event) => setFormField("reason", event.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
          <Button variant="outline" onClick={handleCloseForm}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submitLeave}
            loading={createLeave.isPending || updateLeave.isPending}
          >
            {editingLeave ? "Update Request" : "Submit"}
          </Button>
        </div>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewingLeave}
        onClose={() => setViewingLeave(null)}
        title="Leave Request Details"
        size="md"
      >
        {viewingLeave ? (
          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="font-mono text-sm font-semibold text-gray-800">
                  {viewingLeave.leaveNumber}
                </span>
                <p className="text-xs text-gray-500">
                  Applied on:{" "}
                  {viewingLeave.createdAt
                    ? new Date(viewingLeave.createdAt).toLocaleDateString("en-LK")
                    : "-"}
                </p>
              </div>
              <Badge variant={statusVariant[viewingLeave.status]}>
                {viewingLeave.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Employee
                </p>
                <p className="mt-0.5 text-sm font-medium text-gray-900">
                  {viewingLeave.employeeName}
                </p>
                <p className="font-mono text-xs text-gray-600">
                  {viewingLeave.employeeCode}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Leave Type
                </p>
                <p className="mt-0.5 text-sm font-medium capitalize text-gray-900">
                  {viewingLeave.leaveType}
                </p>
                <p className="text-xs text-gray-600">
                  {viewingLeave.numberOfDays} Day
                  {viewingLeave.numberOfDays > 1 ? "s" : ""}
                  {viewingLeave.isHalfDay ? " (Half Day)" : ""}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs text-gray-500">From Date</p>
                <p className="mt-0.5 text-sm font-medium text-gray-900">
                  {new Date(viewingLeave.fromDate).toLocaleDateString("en-LK")}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs text-gray-500">To Date</p>
                <p className="mt-0.5 text-sm font-medium text-gray-900">
                  {new Date(viewingLeave.toDate).toLocaleDateString("en-LK")}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-600">Reason</p>
              <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50/50 p-3 text-sm text-gray-700">
                {viewingLeave.reason || "No reason specified"}
              </div>
            </div>

            {viewingLeave.status === "rejected" && viewingLeave.rejectionReason && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
                  Rejection Reason
                </p>
                <p className="mt-0.5 text-sm text-red-600">
                  {viewingLeave.rejectionReason}
                </p>
              </div>
            )}

            {viewingLeave.status === "approved" && viewingLeave.approvedBy && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-green-700">
                  Approved By
                </p>
                <p className="mt-0.5 text-sm text-green-800">
                  {typeof viewingLeave.approvedBy === "object"
                    ? `${viewingLeave.approvedBy.firstName || ""} ${viewingLeave.approvedBy.lastName || ""}`.trim()
                    : viewingLeave.approvedBy}
                  {viewingLeave.approvedAt &&
                    ` on ${new Date(viewingLeave.approvedAt).toLocaleDateString("en-LK")}`}
                </p>
              </div>
            )}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
          <Button variant="outline" onClick={() => setViewingLeave(null)}>
            Close
          </Button>
          {viewingLeave && viewingLeave.status !== "cancelled" && (
            <Button
              variant="primary"
              onClick={() => {
                const leaveToEdit = viewingLeave;
                setViewingLeave(null);
                handleEdit(leaveToEdit);
              }}
            >
              <Edit size={14} className="mr-1.5" />
              Edit Request
            </Button>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingLeave}
        onClose={() => setDeletingLeave(null)}
        onConfirm={async () => {
          if (!deletingLeave) return;
          try {
            await deleteLeave.mutateAsync(deletingLeave._id);
            setDeletingLeave(null);
          } catch {}
        }}
        title="Delete Leave Request"
        message={`Are you sure you want to delete leave request "${deletingLeave?.leaveNumber}" for ${deletingLeave?.employeeName}? If previously approved, the employee's leave balance will be restored.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteLeave.isPending}
      />

      {/* Approve / Reject / Cancel Action Modal */}
      <Modal
        isOpen={!!actionModal}
        onClose={closeAction}
        title={actionTitle}
        size="md"
      >
        <div className="space-y-4 p-6">
          {actionModal?.type === "reject" ? (
            <Textarea
              label="Rejection Reason"
              required
              rows={3}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
            />
          ) : (
            <p>{actionMessage}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
          <Button variant="outline" onClick={closeAction}>
            Close
          </Button>
          <Button
            variant={actionModal?.type === "reject" ? "danger" : "primary"}
            onClick={submitAction}
            loading={
              actions.approve.isPending ||
              actions.reject.isPending ||
              actions.cancel.isPending
            }
          >
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  );
}
