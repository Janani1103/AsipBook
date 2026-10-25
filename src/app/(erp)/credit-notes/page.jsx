"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightCircle,
  Edit,
  Eye,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Card from "../../../components/ui/Card.jsx";
import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Pagination from "../../../components/ui/Pagination.jsx";
import Table from "../../../components/ui/Table.jsx";
import CreditNoteApplyModal from "../../../client/features/creditNotes/CreditNoteApplyModal.jsx";
import CreditNoteFormModal from "../../../client/features/creditNotes/CreditNoteFormModal.jsx";
import {
  useCreditNotes,
  useDeleteCreditNote,
} from "../../../client/features/creditNotes/useCreditNotes.js";

const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(value || 0);

const date = (value) => new Date(value).toLocaleDateString("en-LK");

const statusVariants = {
  issued: "info",
  partially_applied: "warning",
  fully_applied: "success",
  cancelled: "default",
};

const STATUS_FILTERS = [
  { value: "", label: "All Statuses" },
  { value: "issued", label: "Issued (Open)" },
  { value: "partially_applied", label: "Partially Applied" },
  { value: "fully_applied", label: "Fully Applied" },
];

export default function CreditNotesPage() {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState(null);
  const [noteToApply, setNoteToApply] = useState(null);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [filters, setFilters] = useState({ status: "", page: 1, limit: 15 });

  const { data, isLoading } = useCreditNotes(filters);
  const deleteMutation = useDeleteCreditNote();

  const notes = data?.data || [];

  const openNote = (note) => router.push(`/credit-notes/${note._id}`);

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;
    try {
      await deleteMutation.mutateAsync(noteToDelete._id);
      setNoteToDelete(null);
    } catch {
      // Handled by mutation toast
    }
  };

  const columns = [
    {
      key: "creditNoteNumber",
      label: "CN #",
      render: (note) => (
        <span className="font-mono text-xs font-bold text-gray-900">
          {note.creditNoteNumber}
        </span>
      ),
    },
    {
      key: "issueDate",
      label: "Date",
      render: (note) => date(note.issueDate),
    },
    {
      key: "customer",
      label: "Customer",
      render: (note) => (
        <div>
          <p className="font-semibold text-gray-900">
            {note.customerSnapshot?.name || "Customer"}
          </p>
          {note.customerSnapshot?.code && (
            <p className="font-mono text-2xs text-gray-400">
              {note.customerSnapshot.code}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "reason",
      label: "Reason",
      render: (note) => (
        <span className="capitalize text-xs text-gray-600">
          {(note.reason || "other").replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (note) => (
        <span className="font-bold text-gray-900">{money(note.amount)}</span>
      ),
    },
    {
      key: "remainingAmount",
      label: "Remaining",
      render: (note) => (
        <span className="font-bold text-primary-600">
          {money(note.remainingAmount)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (note) => (
        <Badge variant={statusVariants[note.status] || "default"}>
          {(note.status || "issued").replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      width: "140px",
      render: (note) => (
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {note.remainingAmount > 0 && note.status !== "cancelled" && (
            <button
              onClick={() => setNoteToApply(note)}
              className="rounded-lg p-1.5 text-primary-600 transition-colors hover:bg-primary-50"
              title="Apply to Invoice"
            >
              <ArrowRightCircle size={16} />
            </button>
          )}
          {note.status !== "cancelled" && (
            <button
              onClick={() => setNoteToEdit(note)}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-amber-600"
              title="Edit Credit Note"
            >
              <Edit size={16} />
            </button>
          )}
          <button
            onClick={() => setNoteToDelete(note)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Delete Credit Note"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={() => openNote(note)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            title="View Details"
          >
            <Eye size={16} />
          </button>
        </div>
      ),
    },
  ];

  let content;
  if (isLoading) {
    content = (
      <div className="py-16 text-center text-gray-500">
        Loading credit notes...
      </div>
    );
  } else if (notes.length === 0) {
    content = (
      <EmptyState
        icon={FileText}
        title="No credit notes found"
        description={
          filters.status
            ? "No credit notes match the selected status filter."
            : "Credit notes are issued from processed returns or created manually for customer adjustments."
        }
        action={
          <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} className="mr-1.5" />
            Issue Credit Note
          </Button>
        }
      />
    );
  } else {
    content = (
      <>
        <Table columns={columns} data={notes} onRowClick={openNote} />
        <Pagination
          page={filters.page}
          totalPages={data?.totalPages || 1}
          total={data?.total || 0}
          onPageChange={(page) =>
            setFilters((current) => ({ ...current, page }))
          }
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credit Notes"
        description="Credit issued to customers, from returns or manual price/discount adjustments"
        icon={FileText}
        actions={
          <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} className="mr-1.5" />
            Issue Credit Note
          </Button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((tab) => (
          <button
            key={tab.value}
            onClick={() =>
              setFilters((prev) => ({ ...prev, status: tab.value, page: 1 }))
            }
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filters.status === tab.value
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>{content}</Card>

      {/* Create / Edit Modal */}
      <CreditNoteFormModal
        isOpen={isCreateOpen || !!noteToEdit}
        onClose={() => {
          setIsCreateOpen(false);
          setNoteToEdit(null);
        }}
        creditNoteToEdit={noteToEdit}
      />

      {/* Apply to Invoice Modal */}
      <CreditNoteApplyModal
        isOpen={!!noteToApply}
        onClose={() => setNoteToApply(null)}
        creditNote={noteToApply}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Credit Note"
        message={
          noteToDelete?.applications?.length > 0
            ? `Are you sure you want to delete ${noteToDelete?.creditNoteNumber}? This credit note has been applied to invoices; all applied payments will be automatically reversed and customer balances updated.`
            : `Are you sure you want to delete ${noteToDelete?.creditNoteNumber}? This will cancel the credit note and remove the credit from the customer's account.`
        }
        confirmText="Delete Credit Note"
        loading={deleteMutation.isPending}
        variant="danger"
      />
    </div>
  );
}
