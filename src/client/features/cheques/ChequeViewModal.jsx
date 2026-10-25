"use client";

import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Edit2,
  ExternalLink,
  FileText,
  Landmark,
  Printer,
  User,
  XCircle,
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

function statusBadgeVariant(status) {
  if (status === "cleared") return "success";
  if (status === "bounced") return "danger";
  if (status === "deposited") return "warning";
  if (status === "cancelled") return "default";
  return "info";
}

export default function ChequeViewModal({
  cheque,
  isOpen,
  onClose,
  onEdit,
  onUpdateStatus,
}) {
  if (!cheque) return null;

  const isIncoming = cheque.direction === "incoming";

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cheque Voucher — ${cheque.chequeNumber}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #111827; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px; }
            .title { font-size: 22px; font-weight: bold; }
            .badge { display: inline-block; padding: 4px 10px; background: #e0f2fe; color: #0369a1; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
            .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; font-weight: bold; margin-bottom: 4px; }
            .val { font-size: 14px; font-weight: 600; color: #111827; }
            .amount-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; text-align: right; margin-bottom: 24px; }
            .amount-title { font-size: 12px; color: #16a34a; font-weight: bold; text-transform: uppercase; }
            .amount-val { font-size: 28px; font-weight: 900; color: #15803d; }
            .notes { background: #f9fafb; border: 1px solid #e5e7eb; padding: 14px; border-radius: 8px; margin-bottom: 32px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 60px; padding-top: 20px; border-top: 1px dashed #d1d5db; }
            .sig-block { text-align: center; width: 160px; border-top: 1px solid #9ca3af; padding-top: 6px; font-size: 12px; font-weight: 600; color: #4b5563; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">${isIncoming ? "INCOMING CHEQUE RECEIPT" : "OUTGOING CHEQUE PAYMENT VOUCHER"}</div>
              <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">Cheque No: <strong>${cheque.chequeNumber}</strong></div>
            </div>
            <div style="text-align: right;">
              <span class="badge">${cheque.status || "PENDING"}</span>
              <div style="font-size: 13px; color: #6b7280; margin-top: 6px;">Cheque Date: ${formatDate(cheque.chequeDate)}</div>
            </div>
          </div>

          <div class="amount-box">
            <div class="amount-title">Cheque Amount</div>
            <div class="amount-val">${formatCurrency(cheque.amount)}</div>
          </div>

          <div class="grid">
            <div>
              <div class="label">Party / Payee</div>
              <div class="val">${cheque.payeeName || cheque.customerId?.displayName || cheque.supplierId?.displayName || "—"}</div>
            </div>
            <div>
              <div class="label">Issuing Bank & Branch</div>
              <div class="val">${cheque.bankName} ${cheque.branchName ? `(${cheque.branchName})` : ""}</div>
            </div>
            <div>
              <div class="label">Cheque Type</div>
              <div class="val">${isIncoming ? "Incoming (Customer Receipt)" : "Outgoing (Supplier / Vendor Payment)"}</div>
            </div>
            <div>
              <div class="label">Deposited / Linked Account</div>
              <div class="val">${cheque.depositedBankAccountId?.accountName ? `${cheque.depositedBankAccountId.bankName} (${cheque.depositedBankAccountId.accountName})` : "Not linked"}</div>
            </div>
          </div>

          ${
            cheque.notes
              ? `
            <div class="notes">
              <div class="label">Notes / Remarks</div>
              <div style="font-size: 13px; color: #374151; margin-top: 4px;">${cheque.notes}</div>
            </div>
          `
              : ""
          }

          <div class="signatures">
            <div class="sig-block">Prepared By</div>
            <div class="sig-block">Verified / Checked</div>
            <div class="sig-block">Authorized Signatory</div>
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

  const partyName =
    cheque.payeeName ||
    cheque.customerId?.displayName ||
    cheque.supplierId?.displayName ||
    "—";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cheque Details — ${cheque.chequeNumber}`}
      size="md"
    >
      <div className="space-y-5 p-6">
        {/* Banner */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/70 p-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold uppercase ${
                  isIncoming
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {isIncoming ? (
                  <ArrowDownLeft size={12} />
                ) : (
                  <ArrowUpRight size={12} />
                )}
                {isIncoming ? "Incoming Cheque" : "Outgoing Cheque"}
              </span>
              <Badge variant={statusBadgeVariant(cheque.status)} className="uppercase text-2xs">
                {cheque.status}
              </Badge>
            </div>
            <h2 className="text-2xl font-black text-gray-900 font-mono">
              {formatCurrency(cheque.amount)}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Payee: <strong className="text-gray-800 font-semibold">{partyName}</strong>
            </p>
          </div>

          <div className="text-right">
            <span className="text-2xs font-bold uppercase text-gray-400">
              Cheque Number
            </span>
            <p className="font-mono text-base font-bold text-gray-900">
              {cheque.chequeNumber}
            </p>
            <div className="mt-1 flex items-center gap-1 text-xs text-gray-600 justify-end">
              <Calendar size={13} className="text-gray-400" />
              <span>{formatDate(cheque.chequeDate)}</span>
            </div>
          </div>
        </div>

        {/* Bank & Party Details Grid */}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
          <div>
            <p className="text-3xs font-bold uppercase tracking-wider text-gray-400">
              Issuing Bank
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <Landmark size={14} className="text-gray-500" />
              <p className="text-xs font-bold text-gray-900">{cheque.bankName || "—"}</p>
            </div>
            {cheque.branchName && (
              <p className="text-2xs text-gray-500 mt-0.5 ml-5">{cheque.branchName} Branch</p>
            )}
          </div>

          <div>
            <p className="text-3xs font-bold uppercase tracking-wider text-gray-400">
              Deposited Account
            </p>
            <p className="text-xs font-semibold text-gray-900 mt-1">
              {cheque.depositedBankAccountId?.accountName
                ? `${cheque.depositedBankAccountId.bankName} (${cheque.depositedBankAccountId.accountName})`
                : "Not Deposited Yet"}
            </p>
            {cheque.depositedBankAccountId?.accountNumber && (
              <p className="text-2xs font-mono text-gray-500">
                Acc: {cheque.depositedBankAccountId.accountNumber}
              </p>
            )}
          </div>

          <div>
            <p className="text-3xs font-bold uppercase tracking-wider text-gray-400">
              Party / Entity
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <User size={14} className="text-gray-500" />
              <p className="text-xs font-medium text-gray-800">{partyName}</p>
            </div>
          </div>

          <div>
            <p className="text-3xs font-bold uppercase tracking-wider text-gray-400">
              Linked Payment
            </p>
            <p className="text-xs font-mono font-medium text-gray-800 mt-1">
              {cheque.paymentId?.paymentNumber || "Manual Cheque Entry"}
            </p>
          </div>
        </div>

        {/* Status Highlights */}
        {cheque.status === "cleared" && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">Cheque Cleared:</span> Realized on{" "}
              {formatDate(cheque.clearedDate || cheque.updatedAt)}. Funds credited to bank account.
            </div>
          </div>
        )}

        {cheque.status === "bounced" && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50/70 p-3 text-xs text-red-800">
            <XCircle size={16} className="text-red-600 shrink-0" />
            <div>
              <span className="font-bold">Cheque Bounced:</span> Date:{" "}
              {formatDate(cheque.bouncedDate || cheque.updatedAt)}{" "}
              {cheque.bouncedReason ? `· Reason: ${cheque.bouncedReason}` : ""}
            </div>
          </div>
        )}

        {/* Notes */}
        {cheque.notes && (
          <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-2xs">
            <p className="text-3xs font-bold uppercase tracking-wider text-gray-400">
              Notes & Memo
            </p>
            <p className="mt-1 text-xs text-gray-700 whitespace-pre-wrap">{cheque.notes}</p>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
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
              onClick={() => {
                onClose();
                if (onUpdateStatus) onUpdateStatus(cheque);
              }}
            >
              Update Status
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                if (onEdit) onEdit(cheque);
              }}
              className="flex items-center gap-1.5"
            >
              <Edit2 size={14} />
              Edit Cheque
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
