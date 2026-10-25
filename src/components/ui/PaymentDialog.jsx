"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Button from "./Button.jsx";
import Card from "./Card.jsx";
import Input from "./Input.jsx";
import Select from "./Select.jsx";
import Textarea from "./Textarea.jsx";
import api from "../../client/api/axios.js";

const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
  }).format(value || 0);

export default function PaymentDialog({ isOpen, onClose, customerId, totalAmount, documentNumber, documentType, documentId }) {
  const [amount, setAmount] = useState(totalAmount || 0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState("cash");
  const [bankAccountId, setBankAccountId] = useState("");
  const [reference, setReference] = useState(documentNumber || "");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountsData, setAccountsData] = useState(null);

  const loadBankAccounts = async () => {
    try {
      const response = await api.get("/bank-accounts");
      setAccountsData(response.data);
    } catch (error) {
      console.error("Failed to load bank accounts:", error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBankAccounts();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAmount(totalAmount || 0);
      setReference(documentNumber || "");
    }
  }, [isOpen, totalAmount, documentNumber]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      return toast.error("Enter a valid amount");
    }
    if (amount > totalAmount) {
      return toast.error("Payment amount cannot exceed total amount");
    }
    if (method !== "cash" && !bankAccountId) {
      return toast.error("Select a bank account");
    }

    setIsSubmitting(true);
    try {
      if (documentType === "quotation") {
        await api.post(`/quotations/${documentId}/payment`, {
          amount: Number(amount),
          method,
          bankAccountId: method !== "cash" ? bankAccountId : undefined,
          transactionReference: reference || undefined,
          notes: notes || undefined,
          isPartial: amount < totalAmount,
        });
      } else {
        await api.post("/payments", {
          direction: "received",
          customerId,
          amount: Number(amount),
          paymentDate,
          method,
          bankAccountId: method !== "cash" ? bankAccountId : undefined,
          transactionReference: reference || undefined,
          allocations: documentId ? [{
            documentType: "invoice",
            documentId,
            documentNumber,
            amount: Number(amount),
          }] : [],
          notes: notes || undefined,
        });
      }

      toast.success("Payment received successfully");
      onClose();
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to receive payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-md p-6">
        <h2 className="mb-4 text-xl font-bold">Receive Payment</h2>
        <p className="mb-4 text-sm text-gray-600">
          Total Amount: <span className="font-semibold">{money(totalAmount)}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Payment Amount (LKR)"
            type="number"
            min="0.01"
            max={totalAmount}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <Input
            label="Payment Date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />

          <Select
            label="Payment Method"
            options={[
              { value: "cash", label: "Cash" },
              { value: "card", label: "Card" },
              { value: "bank_transfer", label: "Bank Transfer" },
              { value: "cheque", label: "Cheque" },
              { value: "mobile_wallet", label: "Mobile Wallet" },
              { value: "other", label: "Other" },
            ]}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            required
          />

          {method !== "cash" && (
            <Select
              label="Bank Account"
              options={(accountsData || []).map((account) => ({
                value: account._id,
                label: `${account.accountName} (${account.bankName})`,
              }))}
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              required
            />
          )}

          <Input
            label="Transaction Reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Optional reference number"
          />

          <Textarea
            label="Notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
          />

          {amount < totalAmount && (
            <div className="rounded bg-yellow-50 p-3 text-sm text-yellow-800">
              Partial payment: {money(amount)} of {money(totalAmount)}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isSubmitting}
            >
              Receive Payment
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
