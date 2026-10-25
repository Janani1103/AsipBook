"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import Select from "../../../components/ui/Select.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";
import { useCustomers } from "../customers/useCustomers.js";
import { invoicesApi } from "../invoices/invoicesApi.js";
import { useCreateCreditNote, useUpdateCreditNote } from "./useCreditNotes.js";

const REASONS = [
  { value: "return", label: "Product Return / RMA" },
  { value: "discount_adjustment", label: "Discount / Rebate Adjustment" },
  { value: "overcharge", label: "Billing Overcharge Correction" },
  { value: "price_correction", label: "Price Difference Correction" },
  { value: "goodwill", label: "Customer Goodwill / Concession" },
  { value: "other", label: "Other Reason" },
];

const money = (val) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(val || 0);

function CreditNoteFormContent({ creditNoteToEdit, onClose }) {
  const isEditing = Boolean(creditNoteToEdit);

  const [customerId, setCustomerId] = useState(
    creditNoteToEdit?.customerId?._id ||
      creditNoteToEdit?.customerId ||
      ""
  );
  const [amount, setAmount] = useState(
    creditNoteToEdit?.amount ? String(creditNoteToEdit.amount) : ""
  );
  const [reason, setReason] = useState(creditNoteToEdit?.reason || "return");
  const [issueDate, setIssueDate] = useState(
    creditNoteToEdit?.issueDate
      ? new Date(creditNoteToEdit.issueDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [invoiceId, setInvoiceId] = useState(
    creditNoteToEdit?.invoiceId?._id ||
      creditNoteToEdit?.invoiceId ||
      ""
  );
  const [description, setDescription] = useState(
    creditNoteToEdit?.description || ""
  );
  const [notes, setNotes] = useState(creditNoteToEdit?.notes || "");

  const { data: customersData } = useCustomers({ limit: 100 });
  const customers = customersData?.data || [];

  // Query customer's open invoices if a customer is selected
  const { data: invoicesData } = useQuery({
    queryKey: ["customerInvoicesForCreditNote", customerId],
    queryFn: () =>
      invoicesApi.list({
        customerId,
        paymentStatus: "unpaid,partially_paid,overdue",
        limit: 50,
      }),
    enabled: !!customerId,
  });

  const openInvoices = invoicesData?.data || [];
  const createMutation = useCreateCreditNote();
  const updateMutation = useUpdateCreditNote();

  const totalApplied = (creditNoteToEdit?.applications || []).reduce(
    (sum, a) => sum + (a.amountApplied || 0),
    0
  );

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Please enter a valid credit amount");
      return;
    }

    if (isEditing && numAmount < totalApplied) {
      toast.error(
        `Amount cannot be less than already applied credit (${money(totalApplied)})`
      );
      return;
    }

    const payload = {
      customerId,
      amount: numAmount,
      reason,
      issueDate,
      invoiceId: invoiceId || undefined,
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: creditNoteToEdit._id, data: payload },
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          onClose();
        },
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 p-5">
        {/* Customer Selection */}
        <div>
          <Select
            label="Customer"
            required
            disabled={isEditing && totalApplied > 0}
            placeholder="Select customer..."
            options={customers.map((c) => ({
              value: c._id,
              label: `${c.displayName} (${c.customerCode || ""})`,
            }))}
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setInvoiceId("");
            }}
          />
          {isEditing && totalApplied > 0 && (
            <p className="mt-1 text-2xs text-amber-600 font-medium">
              Customer locked because credit note has already been applied to invoices.
            </p>
          )}
        </div>

        {/* Amount & Issue Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              label="Credit Amount (LKR)"
              type="number"
              step="0.01"
              min={isEditing && totalApplied > 0 ? totalApplied : 0.01}
              required
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {isEditing && totalApplied > 0 && (
              <p className="mt-1 text-2xs text-gray-500">
                Min {money(totalApplied)} (already applied)
              </p>
            )}
          </div>

          <Input
            label="Issue Date"
            type="date"
            required
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        </div>

        {/* Reason */}
        <Select
          label="Reason for Credit"
          required
          options={REASONS}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        {/* Optional Linked Invoice */}
        {customerId && openInvoices.length > 0 && (
          <div>
            <Select
              label="Related Invoice (Optional)"
              placeholder="Select open invoice to link..."
              options={openInvoices.map((inv) => ({
                value: inv._id,
                label: `${inv.invoiceNumber} — Due: ${money(inv.balanceDue)}`,
              }))}
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
            />
            <p className="mt-1 text-2xs text-gray-400">
              You can link an open invoice for reference, or apply credit to it after issuing.
            </p>
          </div>
        )}

        {/* Description / Details */}
        <Textarea
          label="Description & Details"
          rows={2}
          placeholder="e.g. Returned 2 damaged boxes, 5% negotiated discount adjustment"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Internal Notes */}
        <Input
          label="Internal Notes / Memo (Optional)"
          placeholder="e.g. Approved by Sales Manager"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 border-t bg-gray-50 p-4 rounded-b-2xl">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
        >
          {isEditing ? "Update Credit Note" : "Issue Credit Note"}
        </Button>
      </div>
    </form>
  );
}

export default function CreditNoteFormModal({
  isOpen,
  onClose,
  creditNoteToEdit = null,
}) {
  if (!isOpen) return null;

  const isEditing = Boolean(creditNoteToEdit);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEditing
          ? `Edit Credit Note: ${creditNoteToEdit?.creditNoteNumber || ""}`
          : "Issue Credit Note"
      }
      size="md"
    >
      <CreditNoteFormContent
        key={creditNoteToEdit?._id || "new"}
        creditNoteToEdit={creditNoteToEdit}
        onClose={onClose}
      />
    </Modal>
  );
}
