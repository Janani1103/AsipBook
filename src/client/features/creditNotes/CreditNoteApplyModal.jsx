"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { CheckCircle2, AlertCircle } from "lucide-react";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import Select from "../../../components/ui/Select.jsx";
import { invoicesApi } from "../invoices/invoicesApi.js";
import { useApplyCreditNote } from "./useCreditNotes.js";

const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(value || 0);

function CreditNoteApplyContent({ creditNote, onClose }) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [applyAmount, setApplyAmount] = useState("");

  const customerId = creditNote?.customerId?._id || creditNote?.customerId;
  const remainingCredit = Number(creditNote?.remainingAmount || 0);

  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["customerOpenInvoices", customerId],
    queryFn: () =>
      invoicesApi.list({
        customerId,
        paymentStatus: "unpaid,partially_paid,overdue",
        limit: 50,
      }),
    enabled: !!customerId,
  });

  const openInvoices = invoicesData?.data || [];
  const selectedInvoice = openInvoices.find((inv) => inv._id === selectedInvoiceId);

  const maxApply = selectedInvoice
    ? Math.min(remainingCredit, Number(selectedInvoice.balanceDue || 0))
    : 0;

  const handleInvoiceChange = (invId) => {
    setSelectedInvoiceId(invId);
    const invoice = openInvoices.find((inv) => inv._id === invId);
    if (invoice) {
      const allowed = Math.min(remainingCredit, Number(invoice.balanceDue || 0));
      setApplyAmount(allowed > 0 ? String(allowed) : "");
    } else {
      setApplyAmount("");
    }
  };

  const applyMutation = useApplyCreditNote();

  const handleApply = async (e) => {
    e.preventDefault();

    if (!selectedInvoiceId) {
      toast.error("Please select an invoice to apply credit to");
      return;
    }

    const numAmount = Number(applyAmount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (numAmount > maxApply) {
      toast.error(`Cannot apply more than maximum allowed: ${money(maxApply)}`);
      return;
    }

    try {
      await applyMutation.mutateAsync({
        id: creditNote._id,
        data: {
          invoiceId: selectedInvoiceId,
          amount: numAmount,
        },
      });
      onClose();
    } catch {
      // Handled by mutation onError toast
    }
  };

  return (
    <form onSubmit={handleApply}>
      <div className="space-y-4 p-5">
        {/* Credit Note Summary Header */}
        <div className="flex items-center justify-between rounded-xl bg-primary-50/70 p-3.5 border border-primary-100">
          <div>
            <p className="text-xs text-gray-500 font-medium">Customer</p>
            <p className="text-sm font-bold text-gray-900">
              {creditNote.customerSnapshot?.name || "Customer"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-medium">Available Credit</p>
            <p className="text-base font-extrabold text-primary-700">
              {money(remainingCredit)}
            </p>
          </div>
        </div>

        {/* Invoice Selection */}
        {isLoadingInvoices ? (
          <div className="py-6 text-center text-sm text-gray-400">
            Loading customer invoices...
          </div>
        ) : openInvoices.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <AlertCircle className="mx-auto mb-2 text-amber-500" size={24} />
            <p className="text-sm font-semibold text-amber-900">
              No Open Invoices Found
            </p>
            <p className="mt-1 text-xs text-amber-700">
              This customer currently has no unpaid or partially paid invoices to apply this credit to.
            </p>
          </div>
        ) : (
          <>
            <Select
              label="Target Invoice to Apply Credit"
              required
              placeholder="Select an open invoice..."
              options={openInvoices.map((inv) => ({
                value: inv._id,
                label: `${inv.invoiceNumber} — Balance Due: ${money(inv.balanceDue)} (${new Date(inv.issueDate || inv.createdAt).toLocaleDateString("en-LK")})`,
              }))}
              value={selectedInvoiceId}
              onChange={(e) => handleInvoiceChange(e.target.value)}
            />

            {selectedInvoice && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5 space-y-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Invoice Total Amount:</span>
                  <span className="font-medium text-gray-900">
                    {money(selectedInvoice.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Current Balance Due:</span>
                  <span className="font-bold text-amber-600">
                    {money(selectedInvoice.balanceDue)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 border-t pt-2">
                  <span>Max Applicable Credit:</span>
                  <span className="font-bold text-primary-600">
                    {money(maxApply)}
                  </span>
                </div>
              </div>
            )}

            {/* Amount to Apply Input */}
            {selectedInvoice && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">
                    Amount to Apply (LKR)
                  </label>
                  <button
                    type="button"
                    onClick={() => setApplyAmount(String(maxApply))}
                    className="text-2xs font-semibold text-primary-600 hover:underline"
                  >
                    Use Max ({money(maxApply)})
                  </button>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={maxApply}
                  required
                  placeholder="Enter amount to apply"
                  value={applyAmount}
                  onChange={(e) => setApplyAmount(e.target.value)}
                />
                {Number(applyAmount) > 0 && Number(applyAmount) <= maxApply && (
                  <div className="flex items-center gap-1.5 text-2xs text-emerald-600 font-medium">
                    <CheckCircle2 size={13} />
                    <span>
                      Remaining on credit note after apply:{" "}
                      {money(remainingCredit - Number(applyAmount))}
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t bg-gray-50 p-4 rounded-b-2xl">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={applyMutation.isPending}
          disabled={!selectedInvoiceId || !applyAmount || Number(applyAmount) <= 0 || openInvoices.length === 0}
        >
          Apply Credit
        </Button>
      </div>
    </form>
  );
}

export default function CreditNoteApplyModal({ isOpen, onClose, creditNote }) {
  if (!isOpen || !creditNote) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Apply Credit: ${creditNote.creditNoteNumber}`}
      size="md"
    >
      <CreditNoteApplyContent
        key={creditNote._id}
        creditNote={creditNote}
        onClose={onClose}
      />
    </Modal>
  );
}
