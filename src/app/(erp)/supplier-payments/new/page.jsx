"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, DollarSign } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import Card from "../../../../components/ui/Card.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Input from "../../../../components/ui/Input.jsx";
import Select from "../../../../components/ui/Select.jsx";
import toast from "react-hot-toast";
import { useSuppliers } from "../../../../client/features/suppliers/useSuppliers.js";
import { useWarehouses } from "../../../../client/features/warehouses/useWarehouses.js";
import axios from "axios";

const paymentTypeLabels = {
  advance: "Advance Payment",
  payment: "Payment",
  refund: "Refund",
  credit_note: "Credit Note",
};

const methodLabels = {
  cash: "Cash",
  cheque: "Cheque",
  bank_transfer: "Bank Transfer",
  card: "Card",
  mobile_wallet: "Mobile Wallet",
  other: "Other",
};

export default function NewSupplierPaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    supplierId: "",
    paymentType: "payment",
    amount: "",
    method: "cash",
    paymentDate: new Date().toISOString().split('T')[0],
    chequeNumber: "",
    chequeDate: "",
    bankName: "",
    transactionReference: "",
    notes: "",
  });

  const { data: suppliersData } = useSuppliers({ status: "active" });
  const suppliers = suppliersData?.data || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplierId || !formData.amount) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        supplierId: formData.supplierId,
        paymentType: formData.paymentType,
        amount: Number(formData.amount),
        method: formData.method,
        paymentDate: formData.paymentDate,
        notes: formData.notes || undefined,
      };

      if (formData.method === "cheque") {
        payload.chequeNumber = formData.chequeNumber;
        payload.chequeDate = formData.chequeDate;
        payload.bankName = formData.bankName;
      }

      if (formData.method === "bank_transfer" || formData.method === "card" || formData.method === "mobile_wallet") {
        payload.transactionReference = formData.transactionReference;
      }

      await axios.post("/api/supplier-payments", payload);
      toast.success("Payment recorded successfully");
      router.push("/supplier-payments");
    } catch (error) {
      console.error("Failed to create payment:", error);
      toast.error(error.response?.data?.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="New Supplier Payment"
        description="Record payment or advance to supplier"
        actions={
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft size={16} className="mr-1.5" />
            Back
          </Button>
        }
      />
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Supplier"
              required
              options={suppliers.map((s) => ({ value: s._id, label: `${s.displayName} (${s.supplierCode})` }))}
              value={formData.supplierId}
              onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
            />
            <Select
              label="Payment Type"
              required
              options={Object.entries(paymentTypeLabels).map(([value, label]) => ({ value, label }))}
              value={formData.paymentType}
              onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (LKR)"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
            <Input
              label="Payment Date"
              type="date"
              required
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
            />
          </div>

          <Select
            label="Payment Method"
            required
            options={Object.entries(methodLabels).map(([value, label]) => ({ value, label }))}
            value={formData.method}
            onChange={(e) => setFormData({ ...formData, method: e.target.value })}
          />

          {formData.method === "cheque" && (
            <div className="space-y-4 rounded-lg border p-4">
              <h4 className="text-sm font-semibold text-gray-700">Cheque Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Cheque Number"
                  value={formData.chequeNumber}
                  onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value })}
                />
                <Input
                  label="Cheque Date"
                  type="date"
                  value={formData.chequeDate}
                  onChange={(e) => setFormData({ ...formData, chequeDate: e.target.value })}
                />
              </div>
              <Input
                label="Bank Name"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              />
            </div>
          )}

          {(formData.method === "bank_transfer" || formData.method === "card" || formData.method === "mobile_wallet") && (
            <Input
              label="Transaction Reference"
              value={formData.transactionReference}
              onChange={(e) => setFormData({ ...formData, transactionReference: e.target.value })}
            />
          )}

          <Input
            label="Notes"
            textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              Record Payment
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
