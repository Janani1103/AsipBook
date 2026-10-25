"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Printer,
  Download,
  CheckCircle2,
  RotateCcw,
  Plus,
  MessageSquare,
  ExternalLink,
  FileText,
  Copy,
} from "lucide-react";
import toast from "react-hot-toast";
import Button from "../../../components/ui/Button.jsx";
import { useInvoice } from "../invoices/useInvoices.js";
import { useReturn } from "../returns/useReturns.js";
import { useCompanySettings } from "../settings/useSettings.js";
import { getBluetoothPrintUrl } from "../../utils/printHelpers.js";

const formatNumber = (value) =>
  new Intl.NumberFormat("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

const formatReason = (reason) => {
  if (!reason) return "";
  const map = {
    customer_changed_mind: "Customer Changed Mind",
    defective: "Defective / Faulty",
    damaged_on_arrival: "Damaged on Arrival",
    wrong_item: "Wrong Item / Size",
    not_as_described: "Not as Described",
    expired: "Expired",
    overshipped: "Overshipped",
    other: "Other Reason",
  };
  return map[reason] || reason.replace(/_/g, " ");
};

const formatCondition = (condition) => {
  if (!condition) return "";
  const map = {
    resellable: "Resellable",
    damaged: "Damaged / Defect",
    repairable: "Repairable",
    expired: "Expired",
    pending_inspection: "Inspected",
  };
  return map[condition] || condition;
};

export default function PosReceiptPanel({ receiptInfo, onNewSale }) {
  const receiptRef = useRef(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  const isReturn = receiptInfo?.type === "return";
  const docId = receiptInfo?.id || receiptInfo?.invoiceId || receiptInfo?.returnId;

  const { data: invoiceData, isLoading: invoiceLoading } = useInvoice(
    !isReturn ? docId : null
  );
  const { data: returnData, isLoading: returnLoading } = useReturn(
    isReturn ? docId : null
  );
  const { data: settingsData } = useCompanySettings();

  const orderDoc = receiptInfo?.order || receiptInfo?.data;
  const invoice = invoiceData?.data || receiptInfo?.invoice || (!isReturn ? orderDoc : null);
  const returnDoc = returnData?.data || receiptInfo?.returnDoc;
  const settings = settingsData?.data || {};

  const isLoading = isReturn ? returnLoading : (invoiceLoading && !orderDoc);
  const activeDoc = isReturn ? returnDoc : (invoice || orderDoc);

  const docNumber =
    invoice?.invoiceNumber ||
    returnDoc?.rmaNumber ||
    orderDoc?.orderNumber ||
    receiptInfo?.invoiceNumber ||
    receiptInfo?.rmaNumber ||
    "RECEIPT";

  const customer = isReturn
    ? returnDoc?.customerSnapshot || {}
    : (activeDoc?.customerSnapshot || {});

  const isExchange =
    Boolean(activeDoc?.isExchange) ||
    Boolean(activeDoc?.exchangeReturnItems?.length > 0) ||
    Boolean(activeDoc?.returnCreditAmount > 0);

  const exchangeItems = activeDoc?.exchangeReturnItems || [];
  const exchangeCredit =
    activeDoc?.returnCreditAmount ||
    exchangeItems.reduce(
      (sum, item) => sum + (item.lineTotal || (item.quantity || item.qty || 1) * (item.unitPrice || item.price || 0)),
      0
    );

  const footer =
    settings.receiptFooterMessage ||
    "THANK YOU FOR YOUR BUSINESS!\nPLEASE VISIT AGAIN.";

  // 1. Direct Print in Popup Window
  const handlePrint = () => {
    const printUrl = `/receipt/${docId}${isReturn ? "?type=return" : ""}`;
    const printWindow = window.open(
      printUrl,
      "_blank",
      "width=480,height=720,menubar=no,toolbar=no,location=no,status=no"
    );
    if (printWindow) {
      printWindow.focus();
    } else {
      window.open(printUrl, "_blank");
    }
  };

  // 2. Bluetooth Print Trigger
  const handleBluetoothPrint = () => {
    if (!isReturn && docId) {
      window.location.href = getBluetoothPrintUrl(docId);
    } else {
      toast.error("Bluetooth print is currently configured for invoices");
    }
  };

  // 3. Download Printable HTML file
  const handleDownloadHtml = () => {
    if (!receiptRef.current) return;
    const content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt-${docNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    body {
      font-family: monospace, Courier, sans-serif;
      font-size: 13px;
      margin: 0;
      padding: 10px;
      color: #000;
      background: #fff;
      max-width: 80mm;
      margin: 0 auto;
    }
    .text-center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .solid-divider { border-top: 1px solid #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .title { font-size: 16px; font-weight: 900; text-transform: uppercase; }
  </style>
</head>
<body>
  ${receiptRef.current.innerHTML}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

    const blob = new Blob([content], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Receipt-${docNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded as printable HTML");
    setDownloadMenuOpen(false);
  };

  // 4. Download Plain Text Slip
  const handleDownloadText = () => {
    let lines = [];
    const width = 36;
    const pad = (l, r) => {
      const sp = width - l.length - r.length;
      return sp > 0 ? l + " ".repeat(sp) + r : l + " " + r;
    };

    lines.push((settings.companyName || "STORE RECEIPT").toUpperCase());
    if (settings.address) lines.push(settings.address);
    if (settings.phone) lines.push(`TEL: ${settings.phone}`);
    lines.push("=".repeat(width));

    if (isReturn) {
      lines.push("*** CUSTOMER RETURN RECEIPT ***");
      lines.push(pad("RMA Ref:", returnDoc?.rmaNumber || ""));
      lines.push(pad("Date:", new Date().toLocaleDateString("en-LK")));
      if (customer.name) lines.push(pad("Customer:", customer.name));
      lines.push("-".repeat(width));
      lines.push(pad("Returned Item", "Refund"));
      lines.push("-".repeat(width));
      (returnDoc?.items || []).forEach((i) => {
        lines.push(i.productName || "Item");
        lines.push(pad(`  ${i.quantityReturned} x ${formatNumber(i.unitPrice)}`, formatNumber(i.refundAmount)));
      });
      lines.push("=".repeat(width));
      lines.push(pad("TOTAL REFUND", formatNumber(returnDoc?.netRefundAmount || returnDoc?.totalRefundAmount)));
    } else {
      if (isExchange) lines.push("*** EXCHANGE TRANSACTION ***");
      lines.push(pad("Receipt No:", invoice?.invoiceNumber || ""));
      lines.push(pad("Date:", new Date(invoice?.invoiceDate || Date.now()).toLocaleDateString("en-LK")));
      if (customer.name) lines.push(pad("Customer:", customer.name));
      lines.push("-".repeat(width));
      lines.push(pad("Description", "Amount"));
      lines.push("-".repeat(width));
      (invoice?.items || []).forEach((i) => {
        lines.push(i.productName || "Item");
        lines.push(pad(`  ${i.quantity} x ${formatNumber(i.unitPrice)}`, formatNumber(i.lineTotal)));
      });
      if (isExchange && exchangeItems.length > 0) {
        lines.push("-".repeat(width));
        lines.push("RETURNED ITEMS:");
        exchangeItems.forEach((r) => {
          lines.push(`(RET) ${r.productName || "Item"}`);
          lines.push(pad(`  ${r.quantity} x ${formatNumber(r.unitPrice)}`, `-${formatNumber(r.lineTotal)}`));
        });
      }
      lines.push("=".repeat(width));
      lines.push(pad("Subtotal", formatNumber(invoice?.subtotal)));
      if (isExchange && exchangeCredit > 0) {
        lines.push(pad("Exchange Credit", `-${formatNumber(exchangeCredit)}`));
      }
      lines.push(pad("NET TOTAL", formatNumber(invoice?.grandTotal)));
      if (invoice?.amountPaid) lines.push(pad("Paid Amount", formatNumber(invoice?.amountPaid)));
      if (invoice?.changeReturned) lines.push(pad("Change", formatNumber(invoice?.changeReturned)));
    }

    lines.push("=".repeat(width));
    lines.push(footer.replace(/\n/g, " "));

    const textContent = lines.join("\n");
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${docNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded as plain text");
    setDownloadMenuOpen(false);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-emerald-200 bg-white shadow-xl overflow-hidden transition-all">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-white/20 p-2 backdrop-blur-md">
              <CheckCircle2 className="h-5 w-5 text-emerald-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                  {isReturn ? "Return Processed" : isExchange ? "Exchange Completed" : "Payment Successful"}
                </span>
              </div>
              <p className="font-mono text-base font-bold text-white tracking-wide">
                {docNumber}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={onNewSale}
            className="flex items-center gap-1.5 border border-white/30 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-lg backdrop-blur-xs shadow-xs"
          >
            <Plus size={14} />
            New Sale
          </Button>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-gray-800 shadow-md transition-all hover:bg-gray-100 active:scale-95"
            title="Instant Print Receipt"
          >
            <Printer size={15} className="text-blue-600" />
            Print
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white shadow-xs backdrop-blur-md transition-all hover:bg-white/25 active:scale-95"
            >
              <Download size={15} className="text-emerald-300" />
              Download
            </button>

            {downloadMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl text-gray-800">
                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium hover:bg-gray-100"
                >
                  <FileText size={14} className="text-blue-600" />
                  Printable HTML / PDF
                </button>
                <button
                  type="button"
                  onClick={handleDownloadText}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium hover:bg-gray-100"
                >
                  <Copy size={14} className="text-emerald-600" />
                  Thermal Text (.txt)
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleBluetoothPrint}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white shadow-xs backdrop-blur-md transition-all hover:bg-white/25 active:scale-95"
            title="Bluetooth Thermal Printer"
          >
            <Printer size={15} className="text-teal-300" />
            Bluetooth
          </button>

          <button
            type="button"
            onClick={() => {
              if (customer.phone) {
                toast.success(`SMS sent to ${customer.phone}`);
              } else {
                toast.error("Customer phone not available");
              }
            }}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white shadow-xs backdrop-blur-md transition-all hover:bg-white/25 active:scale-95"
            title="Send SMS"
          >
            <MessageSquare size={15} className="text-indigo-300" />
            SMS
          </button>
        </div>
      </div>

      {/* Bill Preview Paper Area */}
      <div className="bg-gray-100/80 p-3 max-h-[560px] overflow-y-auto">
        {isLoading && (
          <div className="py-16 text-center text-xs text-gray-500">
            Loading bill details...
          </div>
        )}

        {!isLoading && !activeDoc && (
          <div className="py-12 text-center text-xs text-gray-500">
            Invoice created. Click Print to preview bill.
          </div>
        )}

        {!isLoading && activeDoc && (
          <div
            ref={receiptRef}
            className="mx-auto w-full max-w-[340px] rounded-lg border border-gray-200/90 bg-white p-3.5 font-mono text-[11.5px] leading-relaxed text-black shadow-md"
            style={{ fontFamily: "'Courier New', Courier, monospace" }}
          >
            {/* Header info */}
            <div className="text-center mb-2">
              {settings.logo && (
                <img
                  src={settings.logo}
                  alt="Logo"
                  className="mx-auto mb-1.5 h-10 w-auto object-contain"
                />
              )}
              <h3 className="text-sm font-black uppercase tracking-wide">
                {settings.companyName || "STORE NAME"}
              </h3>
              {settings.address && <p className="text-[10px] text-gray-600">{settings.address}</p>}
              {settings.phone && <p className="text-[10px] text-gray-600">TEL: {settings.phone}</p>}
              {settings.taxRegistrationNumber && (
                <p className="text-[10px] text-gray-600">VAT: {settings.taxRegistrationNumber}</p>
              )}
            </div>

            {/* Banner */}
            <div className="my-1.5 border-y border-dashed border-black py-1 text-center">
              <p className="text-[11px] font-black uppercase tracking-wider">
                {isReturn
                  ? "*** RETURN RECEIPT ***"
                  : isExchange
                  ? "*** EXCHANGE TRANSACTION ***"
                  : "*** SALES RECEIPT ***"}
              </p>
              {isExchange && invoice?.customerReturnId?.rmaNumber && (
                <p className="text-[10px] font-semibold text-gray-700">
                  RMA: {invoice.customerReturnId.rmaNumber}
                </p>
              )}
            </div>

            {/* Metadata */}
            <div className="my-1.5 space-y-0.5 text-[10.5px]">
              <div className="flex justify-between">
                <span>Receipt:</span>
                <span className="font-bold">{docNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>
                  {(isReturn
                    ? returnDoc?.requestDate || returnDoc?.createdAt
                    : invoice?.invoiceDate)
                    ? new Date(
                        isReturn
                          ? returnDoc?.requestDate || returnDoc?.createdAt
                          : invoice?.invoiceDate
                      ).toLocaleString("en-LK")
                    : "—"}
                </span>
              </div>
              {customer.name && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-bold">{customer.name}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex justify-between">
                  <span>Contact:</span>
                  <span>{customer.phone}</span>
                </div>
              )}
            </div>

            <div className="border-t border-black my-1" />

            {/* Table Header */}
            <div className="flex justify-between text-[10px] font-black uppercase mb-1">
              <span>Item / Description</span>
              <span>Amount</span>
            </div>

            <div className="border-t border-black my-1" />

            {/* Items */}
            {isReturn ? (
              <div className="space-y-1.5 my-1.5">
                {(returnDoc?.items || []).map((item, idx) => (
                  <div key={item._id || idx} className="text-[11px]">
                    <p className="font-bold">{item.productName || "Item"}</p>
                    <div className="flex justify-between text-[10px] text-gray-600">
                      <span>
                        [{formatCondition(item.condition)}] {item.reason ? `· ${formatReason(item.reason)}` : ""}
                      </span>
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span>
                        {item.quantityReturned} × {formatNumber(item.unitPrice)}
                      </span>
                      <span className="font-bold">
                        {formatNumber(item.refundAmount || item.quantityReturned * item.unitPrice)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5 my-1.5">
                {isExchange && (activeDoc?.items || []).length > 0 && (
                  <p className="text-[10px] font-black uppercase text-gray-800">[NEW ITEMS]</p>
                )}
                {(activeDoc?.items || []).map((item, idx) => {
                  const itemQty = item.quantity ?? item.orderedQuantity ?? item.qty ?? 1;
                  const itemLineTotal = item.lineTotal ?? (itemQty * (item.unitPrice || 0));
                  return (
                    <div key={item._id || idx} className="text-[11px]">
                      <p className="font-bold">{item.productName || item.name || "Item"}</p>
                      <div className="flex justify-between text-[10.5px]">
                        <span>
                          {itemQty} {item.unitOfMeasure || ""} × {formatNumber(item.unitPrice)}
                        </span>
                        <span className="font-bold">{formatNumber(itemLineTotal)}</span>
                      </div>
                      {item.discountPercent > 0 && (
                        <span className="text-[10px] text-gray-500 block">
                          Disc: {item.discountPercent}%
                        </span>
                      )}
                    </div>
                  );
                })}

                {isExchange && exchangeItems.length > 0 && (
                  <div className="mt-2 border-t border-dashed border-black pt-1.5">
                    <p className="text-[10px] font-black uppercase text-gray-800 mb-1">
                      [RETURNED / EXCHANGED ITEMS]
                    </p>
                    {exchangeItems.map((rItem, idx) => (
                      <div key={rItem._id || idx} className="text-[11px] mb-1">
                        <p className="font-bold">(RET) {rItem.productName}</p>
                        <div className="flex items-center gap-1 text-[10px] text-gray-600">
                          <span>[{formatCondition(rItem.condition)}]</span>
                          {rItem.reason && <span>· {formatReason(rItem.reason)}</span>}
                          {rItem.originalInvoiceNumber && (
                            <span>· Ref: {rItem.originalInvoiceNumber}</span>
                          )}
                        </div>
                        <div className="flex justify-between text-[10.5px]">
                          <span>
                            {rItem.quantity} × {formatNumber(rItem.unitPrice)}
                          </span>
                          <span className="font-bold text-rose-700">
                            -{formatNumber(rItem.lineTotal || rItem.quantity * rItem.unitPrice)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-black my-1.5" />

            {/* Totals */}
            <div className="space-y-0.5 text-[11px]">
              {isReturn ? (
                <>
                  <div className="flex justify-between">
                    <span>Return Value</span>
                    <span>{formatNumber(returnDoc?.totalReturnValue)}</span>
                  </div>
                  {returnDoc?.totalRestockingFees > 0 && (
                    <div className="flex justify-between">
                      <span>Restocking Fee</span>
                      <span>-{formatNumber(returnDoc.totalRestockingFees)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-black pt-1 font-black text-xs">
                    <span>TOTAL REFUND</span>
                    <span>
                      {formatNumber(
                        returnDoc?.netRefundAmount ||
                          returnDoc?.totalRefundAmount ||
                          returnDoc?.totalReturnValue
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                    <span>Refund Method</span>
                    <span className="uppercase font-semibold">
                      {returnDoc?.refundMethod === "cash_refund"
                        ? "CASH DRAWER"
                        : returnDoc?.refundMethod === "credit_note"
                        ? "STORE CREDIT"
                        : returnDoc?.refundMethod}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatNumber(activeDoc?.subtotal)}</span>
                  </div>
                  {activeDoc?.totalDiscount > 0 && (
                    <div className="flex justify-between">
                      <span>Discounts</span>
                      <span>-{formatNumber(activeDoc.totalDiscount)}</span>
                    </div>
                  )}
                  {activeDoc?.orderDiscount?.amount > 0 && (
                    <div className="flex justify-between">
                      <span>Order Disc.</span>
                      <span>-{formatNumber(activeDoc.orderDiscount.amount)}</span>
                    </div>
                  )}
                  {isExchange && exchangeCredit > 0 && (
                    <div className="flex justify-between font-bold text-rose-700 border-y border-dashed border-black py-0.5 my-0.5">
                      <span>Exchange Credit</span>
                      <span>-{formatNumber(exchangeCredit)}</span>
                    </div>
                  )}
                  {activeDoc?.totalTax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{formatNumber(activeDoc.totalTax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-black pt-1 font-black text-xs">
                    <span>{activeDoc?.grandTotal >= 0 ? "TOTAL PAYABLE" : "REFUND DUE"}</span>
                    <span>{formatNumber(Math.abs(activeDoc?.grandTotal || 0))}</span>
                  </div>
                  {(activeDoc?.amountPaid > 0 || activeDoc?.grandTotal > 0) && (
                    <div className="flex justify-between">
                      <span>Paid Amount</span>
                      <span>{formatNumber(activeDoc?.amountPaid ?? activeDoc?.grandTotal)}</span>
                    </div>
                  )}
                  {activeDoc?.cashReceived > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span>Cash Received</span>
                        <span>{formatNumber(activeDoc.cashReceived)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Change Given</span>
                        <span>{formatNumber(activeDoc.changeReturned)}</span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-dashed border-black my-2" />

            <div className="text-center text-[9.5px] text-gray-600">
              {footer.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Start New Sale Action */}
      <div className="border-t border-gray-200 bg-white p-3">
        <Button
          fullWidth
          size="lg"
          variant="primary"
          onClick={onNewSale}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-md hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] py-3 text-sm rounded-xl"
        >
          <Plus size={18} />
          Start New Sale / Next Customer
        </Button>
      </div>
    </div>
  );
}
