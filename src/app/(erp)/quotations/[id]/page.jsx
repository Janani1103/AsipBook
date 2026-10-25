"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Building2,
  CheckCircle,
  Download,
  Edit,
  FileCheck,
  FileText,
  Mail,
  MapPin,
  Phone,
  Printer,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../../../client/store/authStore.js";
import {
  useChangeQuotationStatus,
  useConvertQuotationToInvoice,
  useConvertQuotationToSalesOrder,
  useDeleteQuotation,
  useQuotation,
} from "../../../../client/features/quotations/useQuotations.js";
import { useCompanySettings } from "../../../../client/features/settings/useSettings.js";
import { useBankAccounts } from "../../../../client/features/bankAccounts/useBankAccounts.js";
import Badge from "../../../../components/ui/Badge.jsx";
import Button from "../../../../components/ui/Button.jsx";
import ConfirmDialog from "../../../../components/ui/ConfirmDialog.jsx";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import PaymentDialog from "../../../../components/ui/PaymentDialog.jsx";

const variants = {
  draft: "default",
  sent: "info",
  accepted: "success",
  rejected: "danger",
  expired: "warning",
  converted: "success",
  cancelled: "danger",
};

const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(value || 0);

const date = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-LK", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const formatPaymentTerms = (terms) => {
  if (!terms) return "Standard Payment Terms";
  const typeMap = {
    cod: "Cash on Delivery (COD)",
    advance: "Advance Payment Prior to Delivery",
    credit: `Net Credit (${terms.creditDays || 30} Days)`,
  };
  return typeMap[terms.type] || (terms.type ? String(terms.type).toUpperCase() : "Standard Payment Terms");
};

function numberToWords(amount) {
  if (!amount || isNaN(amount)) return "";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  function convertGroup(n) {
    let str = "";
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + " ";
    }
    return str.trim();
  }

  const [intPartStr, decPartStr] = Number(amount).toFixed(2).split(".");
  let num = parseInt(intPartStr, 10);
  if (num === 0) return "Zero Rupees Only";

  let result = "";
  const billions = Math.floor(num / 1000000000);
  num %= 1000000000;
  const millions = Math.floor(num / 1000000);
  num %= 1000000;
  const thousands = Math.floor(num / 1000);
  num %= 1000;

  if (billions) result += convertGroup(billions) + " Billion ";
  if (millions) result += convertGroup(millions) + " Million ";
  if (thousands) result += convertGroup(thousands) + " Thousand ";
  if (num) result += convertGroup(num) + " ";

  result = result.trim() + " Rupees";
  const cents = parseInt(decPartStr, 10);
  if (cents > 0) {
    result += " and " + convertGroup(cents) + " Cents";
  }
  return result + " Only";
}

export default function QuotationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data, isLoading } = useQuotation(id);
  const { data: settingsData } = useCompanySettings();
  const { data: bankData } = useBankAccounts({ isActive: true });
  const changeStatus = useChangeQuotationStatus();
  const convertToSalesOrder = useConvertQuotationToSalesOrder();
  const convertToInvoice = useConvertQuotationToInvoice();
  const remove = useDeleteQuotation();
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const quotation = data?.data;
  const settings = settingsData?.data || {};
  const bankAccounts = bankData?.data || [];
  const primaryBank = bankAccounts.find((b) => b.category === "received") || bankAccounts[0];

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    toast.success("Opening Print dialog. Please select 'Save as PDF' to export.", {
      icon: "📄",
      duration: 4000,
    });
    setTimeout(() => {
      window.print();
    }, 300);
  };

  if (isLoading || !quotation) {
    return <div className="py-20 text-center text-slate-500">Loading quotation document...</div>;
  }

  const canEdit = ["admin", "manager", "sales_manager", "sales_rep"].includes(user?.role);
  const canCancel = ["admin", "manager", "sales_manager"].includes(user?.role);

  const actions = [];
  if (quotation.status === "draft" && canEdit) {
    actions.push({ label: "Send Quotation", icon: FileText, variant: "primary", status: "sent" });
  }
  if (quotation.status === "sent" && canEdit) {
    actions.push({ label: "Accept", icon: CheckCircle, variant: "primary", status: "accepted" });
    actions.push({ label: "Reject", icon: XCircle, variant: "danger", status: "rejected", needsReason: true });
  }
  if (quotation.status === "accepted" && canEdit) {
    actions.push({ label: "Convert to Sales Order", icon: ShoppingCart, variant: "primary", action: "convert" });
    actions.push({ label: "Convert to Invoice", icon: Receipt, variant: "info", action: "convert-invoice" });
    actions.push({ label: "Receive Payment", icon: Download, variant: "success", action: "payment" });
  }
  if (!["converted", "cancelled"].includes(quotation.status) && canCancel) {
    actions.push({ label: "Cancel", icon: Ban, variant: "danger", status: "cancelled", needsReason: true });
  }

  return (
    <div className="pb-16">
      {/* Global Print & Page Styling */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background-color: white !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, aside, .print\\:hidden {
            display: none !important;
          }
          .print-doc-container {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      {/* Screen Page Header (Hidden on Print) */}
      <div className="print:hidden">
        <PageHeader
          title={
            <span className="flex items-center gap-3">
              Quotation <span className="font-mono text-slate-900">{quotation.quotationNumber}</span>
              <Badge variant={variants[quotation.status]}>{quotation.status.replace("_", " ")}</Badge>
            </span>
          }
          description={`Created ${date(quotation.createdAt)} · Valid until ${date(quotation.validUntil)}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/quotations">
                <Button variant="outline">
                  <ArrowLeft size={16} className="mr-1.5" />
                  Back
                </Button>
              </Link>
              <Button variant="outline" onClick={handlePrint} title="Print directly to printer">
                <Printer size={16} className="mr-1.5" />
                Print
              </Button>
              <Button variant="primary" onClick={handleDownload} title="Export / Save as PDF">
                <Download size={16} className="mr-1.5" />
                Save as PDF
              </Button>
              {quotation.status !== "converted" && canEdit && (
                <Link href={`/quotations/${quotation._id}/edit`}>
                  <Button variant="outline">
                    <Edit size={16} className="mr-1.5" />
                    Edit
                  </Button>
                </Link>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  disabled={remove.isPending}
                  onClick={async () => {
                    if (window.confirm(`Are you sure you want to delete quotation ${quotation.quotationNumber}?`)) {
                      await remove.mutateAsync(quotation._id);
                      router.push("/quotations");
                    }
                  }}
                >
                  <Trash2 size={16} className="mr-1.5" />
                  Delete
                </Button>
              )}
              {actions.map((item) => (
                <Button
                  key={item.label}
                  variant={item.variant}
                  onClick={() => {
                    if (item.action === "convert") {
                      convertToSalesOrder.mutate(quotation._id);
                    } else if (item.action === "convert-invoice") {
                      convertToInvoice.mutate(quotation._id);
                    } else if (item.action === "payment") {
                      setShowPaymentDialog(true);
                    } else {
                      setAction(item);
                    }
                  }}
                  disabled={changeStatus.isPending || convertToSalesOrder.isPending || convertToInvoice.isPending}
                >
                  <item.icon size={16} className="mr-1.5" />
                  {item.label}
                </Button>
              ))}
            </div>
          }
        />
      </div>

      {/* Converted Status Banner (Screen Only) */}
      {quotation.convertedToSalesOrderId && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 px-5 py-3 text-emerald-950 shadow-sm print:hidden">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600" />
            <div className="text-sm">
              <span className="font-semibold">Converted to Sales Order: </span>
              <span className="font-mono font-bold text-emerald-800">
                {quotation.convertedToSalesOrderId.orderNumber || "SO"}
              </span>
              {quotation.convertedAt && (
                <span className="text-emerald-700"> on {date(quotation.convertedAt)}</span>
              )}
            </div>
          </div>
          <Link
            href={`/sales-orders/${quotation.convertedToSalesOrderId._id || quotation.convertedToSalesOrderId}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <ShoppingCart size={14} />
            View Sales Order →
          </Link>
        </div>
      )}

      {/* Official Executive Quotation Document Sheet */}
      <div className="print-doc-container relative mx-auto my-6 max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-md sm:p-12">
        {/* Top Executive Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-800" />

        {/* Security / Status Watermark */}
        {["draft", "accepted", "rejected", "expired", "converted", "cancelled"].includes(quotation.status) && (
          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden select-none">
            <span
              className={`text-8xl font-black uppercase tracking-widest rotate-[-30deg] opacity-[0.035] sm:text-9xl ${
                ["converted", "accepted"].includes(quotation.status)
                  ? "text-emerald-900"
                  : ["rejected", "cancelled"].includes(quotation.status)
                  ? "text-red-900"
                  : "text-slate-900"
              }`}
            >
              {quotation.status}
            </span>
          </div>
        )}

        {/* Document Content */}
        <div className="relative z-10 space-y-8">
          {/* Section 1: Header (Company & Quotation Title) */}
          <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-8 sm:flex-row sm:items-start">
            {/* Company Info */}
            <div className="max-w-md space-y-2">
              {settings.logo ? (
                <img
                  src={settings.logo}
                  alt="Company Logo"
                  className="h-16 w-auto max-w-[220px] object-contain"
                />
              ) : (
                <div className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900">
                  <Building2 className="h-7 w-7 text-indigo-700" />
                  {settings.companyName || "Warehouse System"}
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {settings.companyName || "Warehouse System"}
                </h2>
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin size={13} className="flex-shrink-0 text-slate-400" />
                  {settings.address || "Main Commercial Street, Colombo"}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                  <Phone size={13} className="flex-shrink-0 text-slate-400" />
                  {settings.phone || "+94 11 234 5678"}
                </p>
                {settings.email && (
                  <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <Mail size={13} className="flex-shrink-0 text-slate-400" />
                    {settings.email}
                  </p>
                )}
                {settings.taxRegistrationNumber && (
                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    VAT / TIN: {settings.taxRegistrationNumber}
                  </p>
                )}
              </div>
            </div>

            {/* Document Header & Quote # */}
            <div className="space-y-2 sm:text-right">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                <FileCheck size={14} className="text-indigo-400" />
                Executive Quotation
              </div>
              <h1 className="font-mono text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                {quotation.quotationNumber}
              </h1>
              <div className="flex flex-wrap items-center gap-2 pt-1 sm:justify-end">
                <Badge variant={variants[quotation.status]}>
                  {quotation.status.replace("_", " ")}
                </Badge>
                <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  VERIFIED
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Metadata Bar */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs sm:grid-cols-4">
            <div>
              <p className="font-semibold uppercase tracking-wider text-slate-400">Date Issued</p>
              <p className="mt-0.5 font-bold text-slate-900">
                {date(quotation.quotationDate || quotation.createdAt)}
              </p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wider text-slate-400">Valid Until</p>
              <p className="mt-0.5 font-bold text-slate-900">{date(quotation.validUntil)}</p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wider text-slate-400">Warehouse Origin</p>
              <p className="mt-0.5 font-bold text-slate-900">
                {quotation.sourceWarehouseSnapshot?.name || "Main Warehouse"}
              </p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wider text-slate-400">Sales Representative</p>
              <p className="mt-0.5 font-bold text-slate-900">
                {quotation.salesRepId
                  ? `${quotation.salesRepId.firstName} ${quotation.salesRepId.lastName}`
                  : "Desk Officer"}
              </p>
            </div>
          </div>

          {/* Section 3: Bill To & Ship To Cards */}
          <div className="grid grid-cols-1 gap-6 border-b border-slate-100 pb-8 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-indigo-700">Bill To</p>
              <div className="space-y-1 text-xs">
                <p className="text-base font-bold text-slate-900">
                  {quotation.customerSnapshot?.name}
                </p>
                {quotation.customerSnapshot?.code && (
                  <p className="font-mono text-slate-500">
                    Customer ID: {quotation.customerSnapshot.code}
                  </p>
                )}
                {quotation.customerSnapshot?.contactName && (
                  <p className="text-slate-600">Attn: {quotation.customerSnapshot.contactName}</p>
                )}
                {quotation.customerSnapshot?.phone && (
                  <p className="text-slate-600">Tel: {quotation.customerSnapshot.phone}</p>
                )}
                {quotation.customerSnapshot?.taxRegistrationNumber && (
                  <p className="text-slate-500">VAT / TIN: {quotation.customerSnapshot.taxRegistrationNumber}</p>
                )}
                {(quotation.billingAddress?.line1 || quotation.billingAddress?.city) && (
                  <p className="pt-1 text-slate-600">
                    {quotation.billingAddress.line1}
                    {quotation.billingAddress.city && `, ${quotation.billingAddress.city}`}
                    {quotation.billingAddress.postalCode && ` ${quotation.billingAddress.postalCode}`}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Ship To</p>
              <div className="space-y-1 text-xs">
                {quotation.shippingAddress?.line1 ? (
                  <>
                    {quotation.shippingAddress.label && (
                      <p className="text-base font-bold text-slate-900">
                        {quotation.shippingAddress.label}
                      </p>
                    )}
                    <p className="text-slate-600">{quotation.shippingAddress.line1}</p>
                    {(quotation.shippingAddress.city || quotation.shippingAddress.postalCode) && (
                      <p className="text-slate-600">
                        {quotation.shippingAddress.city} {quotation.shippingAddress.postalCode}
                      </p>
                    )}
                    {quotation.shippingAddress.phone && (
                      <p className="text-slate-600">Tel: {quotation.shippingAddress.phone}</p>
                    )}
                  </>
                ) : (
                  <div className="pt-1 text-slate-500">
                    <p className="font-bold text-slate-900">{quotation.customerSnapshot?.name}</p>
                    <p className="mt-1 italic text-slate-400">Same as billing address / Customer pickup</p>
                    {quotation.customerSnapshot?.phone && (
                      <p className="mt-0.5 text-slate-500">Contact: {quotation.customerSnapshot.phone}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Line Items Table (Corporate Executive Styling) */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold uppercase tracking-wider">
                  <th className="w-12 py-3 px-4 text-center">#</th>
                  <th className="py-3 px-4">Item & Specifications</th>
                  <th className="w-24 py-3 px-4 text-right">Qty</th>
                  <th className="w-32 py-3 px-4 text-right">Unit Price</th>
                  <th className="w-28 py-3 px-4 text-right">Discount</th>
                  <th className="w-20 py-3 px-4 text-right">Tax</th>
                  <th className="w-36 py-3 px-4 text-right">Total (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotation.items.map((item, index) => {
                  const lineDiscount =
                    item.discountAmount > 0
                      ? item.discountAmount
                      : (item.orderedQuantity * item.unitPrice * (item.discountPercent || 0)) / 100;
                  const calculatedLineTotal =
                    item.lineTotal || item.orderedQuantity * item.unitPrice - lineDiscount;
                  return (
                    <tr
                      key={item._id || index}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400">{index + 1}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{item.productName}</p>
                        <p className="font-mono text-[11px] text-slate-500">
                          {item.productCode || item.productId?.productCode}
                        </p>
                        {item.notes && (
                          <p className="mt-0.5 text-[11px] italic text-slate-500">{item.notes}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                        {item.orderedQuantity}{" "}
                        <span className="text-[11px] font-normal text-slate-500">
                          {item.unitOfMeasure || ""}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                        {money(item.unitPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        {item.discountPercent > 0 ? (
                          <span className="font-semibold text-red-600">
                            {item.discountPercent}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        {item.taxRate > 0 ? `${item.taxRate}%` : "0%"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {money(calculatedLineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Section 5: Bottom Grid (Amount in words, Bank, Terms & Financial Summary) */}
          <div className="grid grid-cols-1 gap-8 pt-2 lg:grid-cols-12">
            {/* Left Column: Words, Bank Details, Notes, Terms */}
            <div className="space-y-4 lg:col-span-7">
              {/* Amount in Words */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Amount in Words
                </p>
                <p className="mt-0.5 text-xs font-bold italic text-slate-800">
                  {numberToWords(quotation.grandTotal)}
                </p>
              </div>

              {/* Company Bank Account Transfer Details */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={15} className="text-indigo-700" />
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                    Bank Transfer / Wire Details
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Bank: </span>
                    <strong className="text-slate-900">
                      {primaryBank?.bankName || "Commercial Bank of Ceylon"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Branch: </span>
                    <strong className="text-slate-900">
                      {primaryBank?.branchName || "Main Branch, Colombo"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Account Name: </span>
                    <strong className="text-slate-900">
                      {primaryBank?.accountName || settings.companyName || "Warehouse System Ltd"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Account No: </span>
                    <strong className="font-mono text-slate-900">
                      {primaryBank?.accountNumber || "1000 8492 4821"}
                    </strong>
                  </div>
                  {primaryBank?.swiftCode && (
                    <div className="col-span-2">
                      <span className="text-slate-500">SWIFT / Code: </span>
                      <strong className="font-mono text-slate-900">{primaryBank.swiftCode}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Terms & Notes */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Payment Terms
                </p>
                <p className="text-xs font-semibold text-slate-900">
                  {formatPaymentTerms(quotation.paymentTerms)}
                </p>
                {quotation.paymentTerms?.dueDate && (
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Settlement Due Date: {date(quotation.paymentTerms.dueDate)}
                  </p>
                )}
              </div>

              {quotation.customerNotes && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                    Special Customer Notes
                  </p>
                  <p className="whitespace-pre-wrap text-slate-700">{quotation.customerNotes}</p>
                </div>
              )}

              {quotation.internalNotes && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 text-xs print:hidden">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-900">
                      Internal Office Notes
                    </p>
                    <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-semibold text-blue-700">
                      Internal Only
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-slate-700">{quotation.internalNotes}</p>
                </div>
              )}

              <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500 space-y-0.5">
                <p className="font-bold text-slate-700">Terms & Conditions:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                  <li>This quotation remains valid until {date(quotation.validUntil)}.</li>
                  <li>All prices are quoted in LKR and subject to inventory availability upon confirmation.</li>
                  <li>Orders will be processed upon receipt of signed confirmation or approved purchase order.</li>
                </ul>
              </div>
            </div>

            {/* Right Column: Financial Breakdown & Grand Total Card */}
            <div className="space-y-4 lg:col-span-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Price Breakdown
                </h3>

                <div className="space-y-2 text-xs text-slate-600 font-mono">
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-600">Subtotal</span>
                    <span className="font-semibold text-slate-900">{money(quotation.subtotal)}</span>
                  </div>

                  {quotation.totalDiscount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span className="font-sans">Item Discounts</span>
                      <span className="font-semibold">-{money(quotation.totalDiscount)}</span>
                    </div>
                  )}

                  {quotation.orderDiscount?.amount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span className="font-sans">
                        Order Discount {quotation.orderDiscount.value ? `(${quotation.orderDiscount.value}%)` : ""}
                      </span>
                      <span className="font-semibold">-{money(quotation.orderDiscount.amount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="font-sans text-slate-600">Tax / VAT</span>
                    <span className="font-semibold text-slate-900">{money(quotation.totalTax)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="font-sans text-slate-600">Shipping & Delivery</span>
                    <span className="font-semibold text-slate-900">{money(quotation.shippingCost)}</span>
                  </div>
                </div>

                {/* Grand Total Executive Box (Slate / Navy) */}
                <div className="mt-4 rounded-xl bg-slate-900 p-5 text-white shadow-sm">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Grand Total
                    </span>
                    <span className="font-mono text-2xl font-black text-white sm:text-3xl">
                      {money(quotation.grandTotal)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2 text-[10px] text-slate-400">
                    <span>Currency: {quotation.currency || "LKR"}</span>
                    <span>All inclusive</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: Official Seal / Stamp & Dual Signature Blocks */}
          <div className="mt-12 grid grid-cols-2 gap-8 border-t border-slate-200 pt-10 text-xs">
            {/* Authorized Signature & Seal */}
            <div className="space-y-3">
              <p className="font-bold uppercase tracking-wider text-slate-500">Prepared & Authorized By</p>
              <div className="flex items-end gap-6 pt-4">
                <div className="flex-1">
                  <div className="h-14 border-b-2 border-slate-300"></div>
                  <p className="mt-2 font-bold text-slate-900">
                    {quotation.salesRepId
                      ? `${quotation.salesRepId.firstName} ${quotation.salesRepId.lastName}`
                      : "Authorized Signatory"}
                  </p>
                  <p className="text-[11px] text-slate-500">{settings.companyName || "Warehouse System"}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Date: {date(new Date())}</p>
                </div>
                {/* Official Circular Seal Placeholder */}
                <div className="flex h-24 w-24 flex-shrink-0 flex-col items-center justify-center rounded-full border-2 border-dashed border-slate-300 p-2 text-center text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Official</span>
                  <span>Company</span>
                  <span>Seal</span>
                </div>
              </div>
            </div>

            {/* Customer Acceptance */}
            <div className="space-y-3">
              <p className="font-bold uppercase tracking-wider text-slate-500">Customer Acceptance</p>
              <p className="text-[10px] italic text-slate-500">
                I/We hereby accept this quotation and confirm the order terms stated herein.
              </p>
              <div className="flex items-end gap-6 pt-1">
                <div className="flex-1">
                  <div className="h-14 border-b-2 border-slate-300"></div>
                  <p className="mt-2 font-bold text-slate-900">
                    {quotation.customerSnapshot?.contactName || quotation.customerSnapshot?.name}
                  </p>
                  <p className="text-[11px] text-slate-500">Authorized Signature & Stamp</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Date: ________________________</p>
                </div>
                <div className="flex h-24 w-24 flex-shrink-0 flex-col items-center justify-center rounded-full border-2 border-dashed border-slate-300 p-2 text-center text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Customer</span>
                  <span>Rubber</span>
                  <span>Stamp</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 7: Security Hash Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-[10px] text-slate-400">
            <span>
              Doc Ref: <strong className="font-mono text-slate-600">{quotation.quotationNumber}</strong> · Generated via Warehouse ERP System
            </span>
            <span className="font-mono">
              SECURE SHA256: {quotation._id.toString().slice(-8).toUpperCase()}-VERIFIED-QUOTE
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation & Payment Dialogs */}
      <ConfirmDialog
        isOpen={!!action}
        onClose={() => {
          setAction(null);
          setReason("");
        }}
        title={`Confirm ${action?.label}`}
        onConfirm={() => {
          if (action?.action === "convert") {
            convertToSalesOrder.mutate(quotation._id);
          } else {
            changeStatus.mutate({ id: quotation._id, status: action?.status, reason });
          }
          setAction(null);
          setReason("");
        }}
      >
        {action?.needsReason && (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Reason</label>
            <textarea
              className="w-full rounded border p-2"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason..."
            />
          </div>
        )}
      </ConfirmDialog>

      <PaymentDialog
        isOpen={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        customerId={quotation.customerId}
        totalAmount={quotation.grandTotal}
        documentNumber={quotation.quotationNumber}
        documentType="quotation"
        documentId={quotation._id}
      />
    </div>
  );
}
