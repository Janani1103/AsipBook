"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Edit2,
  ExternalLink,
  Eye,
  FileCheck,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Select from "../../../components/ui/Select.jsx";
import Table from "../../../components/ui/Table.jsx";
import ChequeFormModal from "../../../client/features/cheques/ChequeFormModal.jsx";
import ChequeViewModal from "../../../client/features/cheques/ChequeViewModal.jsx";
import { useBankAccounts } from "../../../client/features/bankAccounts/useBankAccounts.js";
import {
  useCheques,
  useDeleteCheque,
  useUpdateChequeStatus,
} from "../../../client/features/cheques/useCheques.js";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
  }).format(value || 0);

function statusBadgeVariant(status) {
  if (status === "cleared") {
    return "success";
  }
  if (status === "bounced") {
    return "danger";
  }
  return "info";
}

export default function ChequesPage() {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewingCheque, setViewingCheque] = useState(null);
  const [editingCheque, setEditingCheque] = useState(null);
  const [filters, setFilters] = useState({
    status: "",
    direction: "",
    search: "",
    page: 1,
    limit: 15,
  });
  const [statusModal, setStatusModal] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusDate, setStatusDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [bouncedReason, setBouncedReason] = useState("");
  const [depositedBankAccountId, setDepositedBankAccountId] = useState("");
  const { data: bankAccountsData } = useBankAccounts();
  const { data, isLoading } = useCheques(filters);
  const updateStatusMutation = useUpdateChequeStatus();
  const deleteMutation = useDeleteCheque();
  const bankAccounts = bankAccountsData?.data || [];
  const bankOptions = bankAccounts.map((account) => ({
    value: account._id,
    label: `${account.accountName} (${account.bankName})`,
  }));
  const cheques = data?.data || [];
  const pendingCount = cheques.filter(
    (cheque) => cheque.status === "pending",
  ).length;
  const clearedCount = cheques.filter(
    (cheque) => cheque.status === "cleared",
  ).length;
  const bouncedCount = cheques.filter(
    (cheque) => cheque.status === "bounced",
  ).length;
  const incomingCount = cheques.filter(
    (cheque) => cheque.direction === "incoming",
  ).length;

  const updateFilter = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
      page: 1,
    }));
  };

  const openStatusModal = (cheque) => {
    setStatusModal(cheque);
    setNewStatus(cheque.status);
  };

  const confirmDelete = (cheque) => {
    if (window.confirm("Delete this cheque record?")) {
      deleteMutation.mutate(cheque._id);
    }
  };

  const handleUpdateStatus = () => {
    const payload = { status: newStatus };

    if (newStatus === "cleared") {
      payload.clearedDate = statusDate;
      payload.depositedBankAccountId = depositedBankAccountId;
    }
    if (newStatus === "bounced") {
      payload.bouncedDate = statusDate;
      payload.bouncedReason = bouncedReason;
    }

    updateStatusMutation.mutate(
      { id: statusModal._id, data: payload },
      { onSuccess: () => setStatusModal(null) },
    );
  };

  const columns = [
    {
      key: "chequeNumber",
      label: "Cheque #",
      render: (cheque) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-gray-700">
            {cheque.chequeNumber}
          </span>
          {cheque.paymentId && (
            <button
              onClick={() =>
                router.push(`/payments/${cheque.paymentId?._id || cheque.paymentId}`)
              }
              className="rounded p-1 text-primary-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
              title="View Payment"
            >
              <ExternalLink size={12} />
            </button>
          )}
        </div>
      ),
    },
    {
      key: "chequeDate",
      label: "Date",
      render: (cheque) => new Date(cheque.chequeDate).toLocaleDateString(),
    },
    {
      key: "party",
      label: "Party",
      render: (cheque) =>
        cheque.payeeName ||
        cheque.customerId?.displayName ||
        cheque.supplierId?.displayName ||
        "—",
    },
    {
      key: "bank",
      label: "Bank",
      render: (cheque) => (
        <div>
          <p className="text-sm">{cheque.bankName}</p>
          <p className="text-xs text-gray-500">{cheque.branchName}</p>
        </div>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (cheque) => (
        <span className="font-bold">{formatCurrency(cheque.amount)}</span>
      ),
    },
    {
      key: "direction",
      label: "Type",
      render: (cheque) => (
        <Badge
          variant={cheque.direction === "incoming" ? "success" : "warning"}
        >
          {cheque.direction}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (cheque) => (
        <Badge variant={statusBadgeVariant(cheque.status)}>
          {cheque.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      width: "160px",
      render: (cheque) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setViewingCheque(cheque)}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
            title="View Cheque Voucher"
          >
            <Eye size={16} />
          </button>
          <button
            type="button"
            onClick={() => setEditingCheque(cheque)}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-primary-50 hover:text-primary-600"
            title="Edit Cheque"
          >
            <Edit2 size={16} />
          </button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => openStatusModal(cheque)}
            className="text-2xs px-2 py-1"
          >
            Status
          </Button>
          <button
            type="button"
            onClick={() => confirmDelete(cheque)}
            className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Delete Cheque"
            disabled={deleteMutation.isPending}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cheque Management"
        description="Track and manage incoming and outgoing cheques"
        icon={FileCheck}
        actions={
          <Button variant="primary" onClick={() => setIsFormOpen(true)}>
            <Plus size={16} className="mr-1.5" />
            Record Cheque
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard
          icon={Clock}
          iconClassName="bg-blue-50 text-blue-600"
          label="Pending"
          value={pendingCount}
        />
        <SummaryCard
          icon={CheckCircle}
          iconClassName="bg-green-50 text-green-600"
          label="Cleared"
          value={clearedCount}
        />
        <SummaryCard
          icon={XCircle}
          iconClassName="bg-red-50 text-red-600"
          label="Bounced"
          value={bouncedCount}
        />
        <SummaryCard
          icon={AlertCircle}
          iconClassName="bg-amber-50 text-amber-600"
          label="Incoming"
          value={incomingCount}
        />
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-b p-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by cheque #, bank, or party..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="deposited">Deposited</option>
              <option value="cleared">Cleared</option>
              <option value="bounced">Bounced</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              value={filters.direction}
              onChange={(event) => updateFilter("direction", event.target.value)}
            >
              <option value="">All Types</option>
              <option value="incoming">Incoming</option>
              <option value="outgoing">Outgoing</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-gray-500">Loading cheques...</div>
        ) : (
          <Table columns={columns} data={cheques} />
        )}
      </Card>

      <ChequeViewModal
        cheque={viewingCheque}
        isOpen={!!viewingCheque}
        onClose={() => setViewingCheque(null)}
        onEdit={(chq) => {
          setViewingCheque(null);
          setEditingCheque(chq);
        }}
        onUpdateStatus={(chq) => {
          setViewingCheque(null);
          openStatusModal(chq);
        }}
      />

      <ChequeFormModal
        key={editingCheque?._id || (isFormOpen ? "create" : "idle")}
        isOpen={isFormOpen || !!editingCheque}
        chequeToEdit={editingCheque}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCheque(null);
        }}
      />

      <Modal
        isOpen={!!statusModal}
        onClose={() => setStatusModal(null)}
        title={`Update Cheque — ${statusModal?.chequeNumber}`}
        size="sm"
      >
        <div className="space-y-4 p-6">
          <Select
            label="New Status"
            options={[
              { value: "pending", label: "Pending" },
              { value: "cleared", label: "Cleared" },
              { value: "bounced", label: "Bounced" },
              { value: "cancelled", label: "Cancelled" },
            ]}
            value={newStatus}
            onChange={(event) => setNewStatus(event.target.value)}
          />

          {(newStatus === "cleared" || newStatus === "bounced") && (
            <Input
              label={newStatus === "cleared" ? "Cleared Date" : "Bounced Date"}
              type="date"
              value={statusDate}
              onChange={(event) => setStatusDate(event.target.value)}
            />
          )}

          {newStatus === "cleared" && (
            <Select
              label="Deposit To Account"
              required
              placeholder="Select bank account..."
              options={bankOptions}
              value={depositedBankAccountId}
              onChange={(event) => setDepositedBankAccountId(event.target.value)}
            />
          )}

          {newStatus === "bounced" && (
            <Input
              label="Reason for Bouncing"
              placeholder="e.g., Insufficient funds"
              value={bouncedReason}
              onChange={(event) => setBouncedReason(event.target.value)}
            />
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="primary"
              fullWidth
              onClick={handleUpdateStatus}
              loading={updateStatusMutation.isPending}
            >
              Update Status
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => setStatusModal(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SummaryCard({ icon: Icon, iconClassName, label, value }) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className={`rounded-xl p-3 ${iconClassName}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </Card>
  );
}
