"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Building2, Calendar, FileText } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import Select from "../../../components/ui/Select.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";
import { useBankAccounts } from "../bankAccounts/useBankAccounts.js";
import { useCustomers } from "../customers/useCustomers.js";
import { useSuppliers } from "../suppliers/useSuppliers.js";
import { useCreateCheque, useUpdateCheque } from "./useCheques.js";

const POPULAR_BANKS = [
  "Commercial Bank of Ceylon",
  "Bank of Ceylon (BOC)",
  "Sampath Bank",
  "Hatton National Bank (HNB)",
  "Seylan Bank",
  "Nations Trust Bank (NTB)",
  "People's Bank",
  "DFCC Bank",
  "Pan Asia Bank",
  "Union Bank",
  "National Development Bank (NDB)",
  "Standard Chartered Bank",
  "HSBC",
];

const getInitialForm = (cheque) => ({
  chequeNumber: cheque?.chequeNumber || "",
  chequeDate: cheque?.chequeDate
    ? new Date(cheque.chequeDate).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0],
  amount: cheque?.amount !== undefined ? cheque.amount : "",
  bankName: cheque?.bankName || "",
  branchName: cheque?.branchName || "",
  payeeName: cheque?.payeeName || "",
  direction: cheque?.direction || "incoming",
  status: cheque?.status || "pending",
  customerId: cheque?.customerId?._id || cheque?.customerId || "",
  supplierId: cheque?.supplierId?._id || cheque?.supplierId || "",
  depositedBankAccountId:
    cheque?.depositedBankAccountId?._id ||
    cheque?.depositedBankAccountId ||
    "",
  notes: cheque?.notes || "",
});

export default function ChequeFormModal({
  isOpen,
  onClose,
  chequeToEdit = null,
}) {
  const [formData, setFormData] = useState(() => getInitialForm(chequeToEdit));

  const { data: bankAccountsData } = useBankAccounts();
  const { data: customersData } = useCustomers({ limit: 100 });
  const { data: suppliersData } = useSuppliers({ limit: 100 });

  const createCheque = useCreateCheque();
  const updateCheque = useUpdateCheque();

  const isEditing = !!chequeToEdit;
  const isPending = isEditing ? updateCheque.isPending : createCheque.isPending;

  const bankAccounts = bankAccountsData?.data || [];
  const customers = customersData?.data || [];
  const suppliers = suppliersData?.data || [];

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCustomerChange = (customerId) => {
    const cust = customers.find((c) => c._id === customerId);
    setFormData((prev) => ({
      ...prev,
      customerId,
      payeeName: cust ? cust.displayName : prev.payeeName,
    }));
  };

  const handleSupplierChange = (supplierId) => {
    const supp = suppliers.find((s) => s._id === supplierId);
    setFormData((prev) => ({
      ...prev,
      supplierId,
      payeeName: supp ? supp.displayName : prev.payeeName,
    }));
  };

  const submitCheque = (e) => {
    e.preventDefault();

    if (!formData.chequeNumber.trim()) {
      toast.error("Cheque Number is required");
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error("Valid amount is required");
      return;
    }

    const payload = {
      ...formData,
      amount: Number(formData.amount),
      customerId: formData.customerId || undefined,
      supplierId: formData.supplierId || undefined,
      depositedBankAccountId: formData.depositedBankAccountId || undefined,
    };

    if (isEditing) {
      updateCheque.mutate(
        { id: chequeToEdit._id, data: payload },
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    } else {
      createCheque.mutate(payload, {
        onSuccess: () => {
          onClose();
        },
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Cheque — ${chequeToEdit.chequeNumber}` : "Record Cheque"}
      size="md"
    >
      <form onSubmit={submitCheque}>
        <div className="space-y-4 p-5">
          {/* Direction Toggle */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Cheque Type / Direction <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateField("direction", "incoming")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                  formData.direction === "incoming"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-2xs"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <ArrowDownLeft
                  size={16}
                  className={formData.direction === "incoming" ? "text-emerald-600" : "text-gray-400"}
                />
                Incoming (Received Cheque)
              </button>
              <button
                type="button"
                onClick={() => updateField("direction", "outgoing")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                  formData.direction === "outgoing"
                    ? "border-amber-500 bg-amber-50 text-amber-800 shadow-2xs"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <ArrowUpRight
                  size={16}
                  className={formData.direction === "outgoing" ? "text-amber-600" : "text-gray-400"}
                />
                Outgoing (Issued Cheque)
              </button>
            </div>
          </div>

          {/* Cheque # & Date */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cheque Number"
              placeholder="e.g. 004921 or CHQ-091"
              required
              value={formData.chequeNumber}
              onChange={(e) => updateField("chequeNumber", e.target.value)}
            />
            <Input
              label="Cheque Date (Realization)"
              type="date"
              required
              value={formData.chequeDate}
              onChange={(e) => updateField("chequeDate", e.target.value)}
            />
          </div>

          {/* Amount & Status */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount (LKR)"
              type="number"
              step="0.01"
              placeholder="e.g. 25000"
              required
              value={formData.amount}
              onChange={(e) => updateField("amount", e.target.value)}
            />
            <Select
              label="Initial Status"
              options={[
                { value: "pending", label: "Pending" },
                { value: "deposited", label: "Deposited" },
                { value: "cleared", label: "Cleared" },
                { value: "bounced", label: "Bounced" },
              ]}
              value={formData.status}
              onChange={(e) => updateField("status", e.target.value)}
            />
          </div>

          {/* Bank & Branch */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Issuing Bank <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                list="popular-banks-list"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                placeholder="Select or type bank name"
                value={formData.bankName}
                onChange={(e) => updateField("bankName", e.target.value)}
              />
              <datalist id="popular-banks-list">
                {POPULAR_BANKS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <Input
              label="Branch Name"
              placeholder="e.g. Kollupitiya, Pettah"
              value={formData.branchName}
              onChange={(e) => updateField("branchName", e.target.value)}
            />
          </div>

          {/* Party (Customer / Supplier / Payee) */}
          <div className="grid grid-cols-2 gap-3">
            {formData.direction === "incoming" ? (
              <Select
                label="Customer (Optional)"
                placeholder="Select registered customer..."
                options={customers.map((c) => ({
                  value: c._id,
                  label: `${c.displayName} (${c.customerCode || ""})`,
                }))}
                value={formData.customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
              />
            ) : (
              <Select
                label="Supplier (Optional)"
                placeholder="Select registered supplier..."
                options={suppliers.map((s) => ({
                  value: s._id,
                  label: `${s.displayName} (${s.supplierCode || ""})`,
                }))}
                value={formData.supplierId}
                onChange={(e) => handleSupplierChange(e.target.value)}
              />
            )}

            <Input
              label="Payee / Party Name"
              placeholder="Name on cheque"
              value={formData.payeeName}
              onChange={(e) => updateField("payeeName", e.target.value)}
            />
          </div>

          {/* Bank Account for deposit / realization */}
          <div>
            <Select
              label={
                formData.direction === "incoming"
                  ? "Deposit Bank Account (Optional)"
                  : "Drawn From Bank Account (Optional)"
              }
              placeholder="Select account to link..."
              options={bankAccounts.map((acc) => ({
                value: acc._id,
                label: `${acc.bankName} - ${acc.accountName} (${acc.category})`,
              }))}
              value={formData.depositedBankAccountId}
              onChange={(e) => updateField("depositedBankAccountId", e.target.value)}
            />
          </div>

          {/* Notes */}
          <Textarea
            label="Notes / Description"
            rows={2}
            placeholder="e.g. Invoice #1024 settlement, Post-dated cheque (PDC)"
            value={formData.notes}
            onChange={(e) => updateField("notes", e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 p-4 rounded-b-2xl">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isPending}>
            {isEditing ? "Update Cheque" : "Save Cheque"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
