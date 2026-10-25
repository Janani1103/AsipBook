"use client";

import {
  Banknote,
  Calendar,
  CreditCard,
  Edit2,
  FileText,
  Landmark,
  Printer,
  Receipt,
  User,
  X,
} from "lucide-react";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Modal from "../../../components/ui/Modal.jsx";

const formatCurrency = (val) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(val || 0);

function formatDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatDateTime(d) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const methodIcons = {
  cash: { icon: Banknote, color: "text-emerald-600 bg-emerald-50", label: "Cash (Drawer)" },
  bank_transfer: { icon: Landmark, color: "text-blue-600 bg-blue-50", label: "Bank Transfer" },
  card: { icon: CreditCard, color: "text-purple-600 bg-purple-50", label: "Card" },
  cheque: { icon: FileText, color: "text-amber-600 bg-amber-50", label: "Cheque" },
  other: { icon: Receipt, color: "text-gray-600 bg-gray-50", label: "Other" },
};

export default function ExpenseViewModal({ expense, isOpen, onClose, onEdit }) {
  if (!expense) return null;

  const methodConfig =
    methodIcons[expense.paymentMethod] || methodIcons.other;
  const MethodIcon = methodConfig.icon;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Expense Voucher — ${expense.expenseNumber}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #111827; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px; }
            .title { font-size: 24px; font-weight: bold; }
            .badge { display: inline-block; padding: 4px 10px; background: #e0f2fe; color: #0369a1; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
            .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; font-weight: bold; margin-bottom: 4px; }
            .val { font-size: 14px; font-weight: 600; color: #111827; }
            .amount-box { background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; text-align: right; margin-bottom: 24px; }
            .amount-title { font-size: 12px; color: #dc2626; font-weight: bold; text-transform: uppercase; }
            .amount-val { font-size: 28px; font-weight: 900; color: #b91c1c; }
            .notes { background: #f9fafb; border: 1px solid #e5e7eb; padding: 14px; border-radius: 8px; margin-bottom: 32px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 60px; padding-top: 20px; border-top: 1px dashed #d1d5db; }
            .sig-block { text-align: center; width: 160px; border-top: 1px solid #9ca3af; padding-top: 6px; font-size: 12px; font-weight: 600; color: #4b5563; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">EXPENSE PAYMENT VOUCHER</div>
              <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">Voucher No: <strong>${expense.expenseNumber}</strong></div>
            </div>
            <div style="text-align: right;">
              <span class="badge">${expense.status || "PAID"}</span>
              <div style="font-size: 13px; color: #6b7280; margin-top: 6px;">Date: ${formatDate(expense.date)}</div>
            </div>
          </div>

          <div class="amount-box">
            <div class="amount-title">Total Amount Paid</div>
            <div class="amount-val">${formatCurrency(expense.amount)}</div>
          </div>

          <div class="grid">
            <div>
              <div class="label">Expense Category</div>
              <div class="val">${expense.category}</div>
            </div>
            <div>
              <div class="label">Payment Method</div>
              <div class="val">${methodConfig.label}</div>
            </div>
            <div>
              <div class="label">Reference / Slip No</div>
              <div class="val">${expense.reference || "—"}</div>
            </div>
            <div>
              <div class="label">Bank / Cash Account</div>
              <div class="val">${expense.bankAccountId?.accountName ? `${expense.bankAccountId.bankName} (${expense.bankAccountId.accountName})` : "Cash Drawer / General"}</div>
            </div>
          </div>

          ${
            expense.description
              ? `
            <div class="notes">
              <div class="label">Description / Remarks</div>
              <div style="font-size: 13px; color: #374151; margin-top: 4px;">${expense.description}</div>
            </div>
          `
              : ""
          }

          <div class="signatures">
            <div class="sig-block">Prepared By</div>
            <div class="sig-block">Checked By</div>
            <div class="sig-block">Approved By / Payee</div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Expense Details — ${expense.expenseNumber}`}
      size="md"
    >
      <div className="space-y-5 p-6">
        {/* Top Header Banner */}
        <div className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/60 p-4">
          <div>
            <span className="text-2xs font-bold uppercase tracking-wider text-red-600">
              Total Expense Amount
            </span>
            <h2 className="text-2xl font-black text-red-700 font-mono mt-0.5">
              {formatCurrency(expense.amount)}
            </h2>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-gray-800 border border-red-100 shadow-2xs">
                {expense.category}
              </span>
              <Badge variant={expense.status === "paid" ? "success" : "default"}>
                {expense.status || "Paid"}
              </Badge>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xs font-semibold text-gray-500 uppercase">
              Voucher No
            </span>
            <p className="font-mono text-sm font-bold text-gray-900">
              {expense.expenseNumber}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-600 justify-end">
              <Calendar size={13} className="text-gray-400" />
              <span>{formatDate(expense.date)}</span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-100 bg-gray-50/70 p-4">
          <div>
            <p className="text-3xs font-bold uppercase tracking-wider text-gray-400">
              Payment Method
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <div className={`rounded-lg p-1.5 ${methodConfig.color}`}>
                <MethodIcon size={14} />
              </div>
              <span className="text-xs font-semibold text-gray-800">
                {methodConfig.label}
              </span>
            </div>
          </div>

          <div>
            <p className="text-3xs font-bold uppercase tracking-wider text-gray-400">
              Account / Ledger
            </p>
            <p className="text-xs font-bold text-gray-800 mt-1.5">
              {expense.bankAccountId
                ? `${expense.bankAccountId.bankName || "Account"}`
                : expense.paymentMethod === "cash"
                ? "Cash in Hand (Petty Cash)"
                : "Default Payment Account"}
            </p>
            {expense.bankAccountId?.accountNumber && (
              <p className="text-2xs font-mono text-gray-500">
                {expense.bankAccountId.accountNumber}
              </p>
            )}
          </div>

          <div>
            <p className="text-3xs font-bold uppercase tracking-wider text-gray-400">
              Reference / Slip #
            </p>
            <p className="text-xs font-mono font-medium text-gray-800 mt-1">
              {expense.reference || "—"}
            </p>
          </div>

          <div>
            <p className="text-3xs font-bold uppercase tracking-wider text-gray-400">
              Recorded By
            </p>
            <div className="mt-1 flex items-center gap-1 text-xs text-gray-700">
              <User size={13} className="text-gray-400" />
              <span>
                {expense.createdBy?.firstName
                  ? `${expense.createdBy.firstName} ${expense.createdBy.lastName || ""}`
                  : "System User"}
              </span>
            </div>
          </div>
        </div>

        {/* Description / Notes */}
        {expense.description ? (
          <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
            <p className="text-3xs font-bold uppercase tracking-wider text-gray-400">
              Description & Notes
            </p>
            <p className="mt-1 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
              {expense.description}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 p-3 text-center text-xs text-gray-400">
            No additional notes or description provided
          </div>
        )}

        {/* Special Payroll Tag if Salary Expense */}
        {expense.category === "Salary" && (
          <div className="flex items-start gap-2.5 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-900">
            <span className="text-base">💼</span>
            <div>
              <p className="font-semibold text-indigo-950">Staff Payroll Expense</p>
              <p className="text-indigo-700 text-2xs mt-0.5">
                This expense was generated during the monthly salary disbursal. Any adjustments will directly update financial statements and linked account balances.
              </p>
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="flex items-center justify-between text-3xs text-gray-400 border-t border-gray-100 pt-3">
          <span>Created: {formatDateTime(expense.createdAt)}</span>
          {expense.updatedAt && expense.updatedAt !== expense.createdAt && (
            <span>Updated: {formatDateTime(expense.updatedAt)}</span>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1.5"
          >
            <Printer size={15} />
            Print Voucher
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                if (onEdit) onEdit(expense);
              }}
              className="flex items-center gap-1.5"
            >
              <Edit2 size={14} />
              Edit Expense
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
