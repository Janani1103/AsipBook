"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Card from "../../../../components/ui/Card.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Badge from "../../../../components/ui/Badge.jsx";
import ConfirmDialog from "../../../../components/ui/ConfirmDialog.jsx";
import CreditNoteApplyModal from "../../../../client/features/creditNotes/CreditNoteApplyModal.jsx";
import CreditNoteFormModal from "../../../../client/features/creditNotes/CreditNoteFormModal.jsx";
import {
  useCreditNote,
  useDeleteCreditNote,
} from "../../../../client/features/creditNotes/useCreditNotes.js";

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

export default function CreditNoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data, isLoading } = useCreditNote(id);
  const deleteMutation = useDeleteCreditNote();

  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const creditNote = data?.data;

  if (isLoading || !creditNote) {
    return (
      <div className="py-16 text-center text-gray-500">
        Loading credit note details...
      </div>
    );
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(creditNote._id);
      setIsDeleteOpen(false);
      router.push("/credit-notes");
    } catch {
      // Handled by mutation toast
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>Credit Note {creditNote.creditNoteNumber}</span>
            <Badge variant={statusVariants[creditNote.status] || "default"}>
              {(creditNote.status || "issued").replace(/_/g, " ")}
            </Badge>
          </div>
        }
        description={`Customer: ${creditNote.customerSnapshot?.name || "Customer"} · Issued: ${date(creditNote.issueDate)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/credit-notes")}
            >
              <ArrowLeft size={16} className="mr-1.5" /> Back
            </Button>

            {creditNote.status !== "cancelled" && (
              <Button
                variant="outline"
                onClick={() => setIsEditOpen(true)}
              >
                <Edit size={16} className="mr-1.5" /> Edit
              </Button>
            )}

            <Button
              variant="outline"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 size={16} className="mr-1.5" /> Delete
            </Button>

            {creditNote.remainingAmount > 0 &&
              creditNote.status !== "cancelled" && (
                <Button variant="primary" onClick={() => setIsApplyOpen(true)}>
                  Apply to Invoice
                </Button>
              )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 border-b pb-2">
              General Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Customer Name</p>
                <p className="font-medium text-gray-900">
                  {creditNote.customerSnapshot?.name || "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Customer Code</p>
                <p className="font-mono text-gray-900">
                  {creditNote.customerSnapshot?.code || "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Reason</p>
                <p className="capitalize font-medium text-gray-900">
                  {(creditNote.reason || "other").replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Issue Date</p>
                <p className="font-medium text-gray-900">
                  {date(creditNote.issueDate)}
                </p>
              </div>
            </div>

            {creditNote.description && (
              <div className="mt-4 border-t pt-3">
                <p className="text-xs text-gray-500">Description</p>
                <p className="mt-1 text-sm text-gray-800">
                  {creditNote.description}
                </p>
              </div>
            )}

            {creditNote.notes && (
              <div className="mt-3">
                <p className="text-xs text-gray-500">Internal Notes</p>
                <p className="mt-1 text-sm text-gray-600 italic">
                  {creditNote.notes}
                </p>
              </div>
            )}

            {creditNote.customerReturnId && (
              <div className="mt-4 border-t pt-3 text-sm">
                <span className="text-gray-500">Originating RMA: </span>
                <button
                  onClick={() =>
                    router.push(
                      `/returns/${creditNote.customerReturnId._id || creditNote.customerReturnId}`
                    )
                  }
                  className="font-semibold text-primary-600 hover:underline"
                >
                  {creditNote.customerReturnId.rmaNumber || "View RMA"}
                </button>
              </div>
            )}
          </Card>

          <Card>
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Invoice Applications
              </h3>
              <Badge variant="info">
                {creditNote.applications?.length || 0} applied
              </Badge>
            </div>
            {!creditNote.applications || creditNote.applications.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-400">
                This credit note has not yet been applied to any customer invoice.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b bg-gray-50 text-xs text-gray-600 font-semibold">
                    <tr>
                      <th className="px-5 py-3">Invoice Number</th>
                      <th className="px-5 py-3">Applied Date</th>
                      <th className="px-5 py-3 text-right">Amount Applied</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {creditNote.applications.map((app, index) => (
                      <tr key={index} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 font-mono font-medium text-primary-600">
                          {app.invoiceNumber || "Invoice"}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {date(app.appliedAt)}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-gray-900">
                          {money(app.amountApplied)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
              Credit Balance
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Original Credit Amount</span>
                <span className="font-semibold text-gray-900">
                  {money(creditNote.amount)}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Applied to Invoices</span>
                <span className="font-semibold text-gray-700">
                  {money(creditNote.amount - (creditNote.remainingAmount || 0))}
                </span>
              </div>
              <div className="flex justify-between border-t pt-3 font-bold text-base">
                <span>Remaining Available</span>
                <span className="text-primary-600">
                  {money(creditNote.remainingAmount)}
                </span>
              </div>
            </div>

            {creditNote.remainingAmount > 0 && creditNote.status !== "cancelled" && (
              <Button
                variant="primary"
                className="w-full mt-4"
                onClick={() => setIsApplyOpen(true)}
              >
                Apply to Invoice
              </Button>
            )}
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <CreditNoteFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        creditNoteToEdit={creditNote}
      />

      {/* Apply to Invoice Modal */}
      <CreditNoteApplyModal
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        creditNote={creditNote}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Credit Note"
        message={
          creditNote.applications?.length > 0
            ? `Are you sure you want to delete ${creditNote.creditNoteNumber}? This will reverse all applied invoice amounts and update customer balances automatically.`
            : `Are you sure you want to delete ${creditNote.creditNoteNumber}? This will cancel the credit note and remove available credit from the customer's account.`
        }
        confirmText="Delete Credit Note"
        loading={deleteMutation.isPending}
        variant="danger"
      />
    </div>
  );
}
