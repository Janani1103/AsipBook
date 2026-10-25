"use client";

import { useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Printer, MessageSquare, ArrowLeft, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { useInvoice } from "../../../client/features/invoices/useInvoices.js";
import { useReturn } from "../../../client/features/returns/useReturns.js";
import { useCompanySettings } from "../../../client/features/settings/useSettings.js";
import { getBluetoothPrintUrl } from "../../../client/utils/printHelpers.js";

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

function ReceiptRow({ label, value, strong = false, isNegative = false, highlight = false }) {
  const displayVal = isNegative && value > 0 ? `-${formatNumber(value)}` : formatNumber(value);
  return (
    <div
      className={`flex justify-between ${
        strong ? "border-t border-black pt-1 text-sm font-black" : ""
      } ${highlight ? "font-bold" : ""}`}
    >
      <span>{label}</span>
      <span>{displayVal}</span>
    </div>
  );
}

function ReceiptContent() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const requestedType = searchParams.get("type");

  const { data: invoiceData, isLoading: invoiceLoading } = useInvoice(id);
  const { data: returnData, isLoading: returnLoading } = useReturn(id);
  const { data: settingsData } = useCompanySettings();

  const invoice = invoiceData?.data;
  const returnDoc = returnData?.data;
  const settings = settingsData?.data || {};

  const isReturnReceipt = requestedType === "return" || (!invoice && Boolean(returnDoc));
  const activeDoc = isReturnReceipt ? returnDoc : invoice;

  useEffect(() => {
    if (!activeDoc) return undefined;

    const timer = setTimeout(() => {
      window.print();
    }, 600);

    return () => clearTimeout(timer);
  }, [activeDoc]);

  const handlePrint = () => {
    window.print();
  };

  if ((requestedType === "return" ? returnLoading : invoiceLoading) && !activeDoc) {
    return (
      <div className="flex h-screen items-center justify-center font-sans text-gray-500">
        Loading receipt preview...
      </div>
    );
  }

  if (!activeDoc) {
    return (
      <div className="flex h-screen flex-col items-center justify-center font-sans text-gray-600 gap-3">
        <p className="text-base font-semibold">Receipt or Document not found</p>
        <Link
          href="/pos"
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <ArrowLeft size={16} /> Return to POS Terminal
        </Link>
      </div>
    );
  }

  const footer =
    settings.receiptFooterMessage ||
    "THANK YOU FOR YOUR BUSINESS!\nPLEASE VISIT AGAIN.";

  // Render Direct Return Slip
  if (isReturnReceipt && returnDoc) {
    const customer = returnDoc.customerSnapshot || {};
    return (
      <>
        <style>{`
          @media print {
            @page { size: 80mm auto; margin: 4mm; }
            .no-print { display: none !important; }
          }
          @media screen {
            body { background: #f3f4f6; }
          }
        `}</style>

        <div className="no-print fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b bg-white p-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Link
              href="/pos"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <ArrowLeft size={16} />
              Back to POS
            </Link>
            <Link
              href="/customer-returns"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              All Returns
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700"
            >
              <Printer size={16} />
              Print Return Slip
            </button>
            <button
              onClick={() => {
                if (customer.phone) {
                  toast.success(`SMS successfully sent to ${customer.phone}`);
                } else {
                  toast.error("Customer does not have a phone number");
                }
              }}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700"
            >
              <MessageSquare size={16} />
              Send SMS
            </button>
          </div>
        </div>

        <main className="receipt-wrapper print-thermal-container mx-auto mt-16 w-[80mm] bg-white p-3 font-mono text-[13px] text-black">
          <header className="mb-3 text-center">
            {settings.logo && (
              <img
                src={settings.logo}
                alt="Company Logo"
                className="mx-auto mb-2 h-14 w-auto object-contain"
              />
            )}
            <h1 className="text-[16px] font-black uppercase">
              {settings.companyName || "YOUR COMPANY NAME"}
            </h1>
            {settings.address && <p>{settings.address}</p>}
            {settings.phone && <p>TEL: {settings.phone}</p>}
            {settings.email && <p>{settings.email}</p>}
            {settings.taxRegistrationNumber && (
              <p>VAT NO: {settings.taxRegistrationNumber}</p>
            )}
          </header>

          <div className="my-2 border-y-2 border-dashed border-black py-1.5 text-center">
            <p className="text-[14px] font-black tracking-wide uppercase">
              *** CUSTOMER RETURN RECEIPT ***
            </p>
            <p className="text-[11px] font-bold text-gray-700">REFUND & RESTOCK NOTE</p>
          </div>

          <div className="my-2 space-y-0.5 text-xs">
            <p>
              RMA Ref: <strong>{returnDoc.rmaNumber}</strong>
            </p>
            <p>
              Date:{" "}
              {returnDoc.requestDate || returnDoc.createdAt
                ? new Date(returnDoc.requestDate || returnDoc.createdAt).toLocaleString("en-LK")
                : "—"}
            </p>
            {customer.name && (
              <p>
                Customer: <strong>{customer.name}</strong>
              </p>
            )}
            {customer.phone && <p>Contact: {customer.phone}</p>}
            <p>
              Refund Method:{" "}
              <strong className="uppercase">
                {returnDoc.refundMethod === "cash_refund"
                  ? "CASH REFUND"
                  : returnDoc.refundMethod === "credit_note"
                  ? "STORE CREDIT"
                  : returnDoc.refundMethod || "N/A"}
              </strong>
            </p>
            <p>
              Status: <strong className="uppercase">{returnDoc.status}</strong>
            </p>
          </div>

          <hr className="border-black" />

          <div className="my-1.5 flex justify-between text-[11px] font-black uppercase">
            <span>Returned Item</span>
            <span>Refund</span>
          </div>

          <hr className="border-black mb-2" />

          <div className="space-y-2">
            {(returnDoc.items || []).map((item, index) => (
              <section key={item._id || index} className="text-xs">
                <p className="font-bold">{item.productName || item.productCode || "Product"}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <span className="font-semibold text-black">
                    [{formatCondition(item.condition)}]
                  </span>
                  {item.reason && <span>· {formatReason(item.reason)}</span>}
                </div>
                <div className="flex justify-between text-xs mt-0.5">
                  <span>
                    {item.quantityReturned} × {formatNumber(item.unitPrice)}
                  </span>
                  <strong>{formatNumber(item.refundAmount || item.quantityReturned * item.unitPrice)}</strong>
                </div>
              </section>
            ))}
          </div>

          <hr className="border-black my-2" />

          <div className="space-y-1">
            <ReceiptRow label="Total Return Value" value={returnDoc.totalReturnValue} />
            {returnDoc.totalRestockingFees > 0 && (
              <ReceiptRow
                label="Restocking Fee"
                value={returnDoc.totalRestockingFees}
                isNegative
              />
            )}
            <ReceiptRow
              label="TOTAL REFUND PAID"
              value={returnDoc.netRefundAmount || returnDoc.totalRefundAmount || returnDoc.totalReturnValue}
              strong
            />
          </div>

          {returnDoc.customerNotes && (
            <div className="mt-3 border-t border-dashed border-black pt-1.5 text-xs">
              <p>Note: {returnDoc.customerNotes}</p>
            </div>
          )}

          <div className="mt-4 border-t border-black pt-2 text-center text-[10px]">
            <p>Items verified and returned to store inventory/scrap.</p>
            <div className="mt-5 flex justify-between px-2 text-[11px]">
              <div>
                <p>_______________________</p>
                <p className="font-bold">Customer Signature</p>
              </div>
              <div>
                <p>_______________________</p>
                <p className="font-bold">Cashier / Staff</p>
              </div>
            </div>
          </div>

          <footer className="mt-4 border-t pt-2 text-center">
            {footer.split("\n").map((line, index) => (
              <p key={`${line}-${index}`}>{line}</p>
            ))}
          </footer>
        </main>
      </>
    );
  }

  // Render Standard or Exchange Invoice Receipt
  const customer = invoice.customerSnapshot || {};
  const isExchange =
    Boolean(invoice.isExchange) ||
    Boolean(invoice.exchangeReturnItems && invoice.exchangeReturnItems.length > 0) ||
    Boolean(invoice.returnCreditAmount > 0);

  const exchangeItems = invoice.exchangeReturnItems || [];
  const exchangeCredit =
    invoice.returnCreditAmount ||
    exchangeItems.reduce((sum, item) => sum + (item.lineTotal || item.quantity * item.unitPrice), 0);

  return (
    <>
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 4mm; }
          .no-print { display: none !important; }
        }
        @media screen {
          body { background: #f3f4f6; }
        }
      `}</style>

      <div className="no-print fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b bg-white p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Link
            href="/pos"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft size={16} />
            Back to POS
          </Link>
          <Link
            href={`/invoices/${invoice._id}`}
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            View Invoice
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            <Printer size={16} />
            Print Receipt
          </button>
          <button
            onClick={() => {
              window.location.href = getBluetoothPrintUrl(invoice._id);
            }}
            className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            <Printer size={16} />
            Bluetooth Print
          </button>
          <button
            onClick={() => {
              if (customer.phone) {
                toast.success(`SMS successfully sent to ${customer.phone}`);
              } else {
                toast.error("Customer does not have a phone number");
              }
            }}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700"
          >
            <MessageSquare size={16} />
            Send SMS
          </button>
        </div>
      </div>

      <main className="receipt-wrapper print-thermal-container mx-auto mt-16 w-[80mm] bg-white p-3 font-mono text-[13px] text-black">
        <header className="mb-3 text-center">
          {settings.logo && (
            <img
              src={settings.logo}
              alt="Company Logo"
              className="mx-auto mb-2 h-14 w-auto object-contain"
            />
          )}
          <h1 className="text-[17px] font-black uppercase">
            {settings.companyName || "YOUR COMPANY NAME"}
          </h1>
          {settings.address && <p>{settings.address}</p>}
          {settings.phone && <p>TEL: {settings.phone}</p>}
          {settings.email && <p>{settings.email}</p>}
          {settings.taxRegistrationNumber && (
            <p>VAT NO: {settings.taxRegistrationNumber}</p>
          )}
        </header>

        {isExchange && (
          <div className="my-2 border-y-2 border-dashed border-black py-1.5 text-center">
            <p className="text-[13px] font-black tracking-wider uppercase">
              *** EXCHANGE TRANSACTION ***
            </p>
            {invoice.customerReturnId?.rmaNumber && (
              <p className="text-[11px] font-semibold text-gray-700">
                Return RMA: {invoice.customerReturnId.rmaNumber}
              </p>
            )}
          </div>
        )}

        <hr className="border-black" />

        <div className="my-2 text-xs space-y-0.5">
          <p>
            Receipt No: <strong>{invoice.invoiceNumber}</strong>
          </p>
          <p>Date: {new Date(invoice.invoiceDate).toLocaleString("en-LK")}</p>
          {customer.name && (
            <p>
              Customer: <strong>{customer.name}</strong>
            </p>
          )}
          {customer.phone && <p>Contact: {customer.phone}</p>}
        </div>

        <hr className="border-black" />

        {/* Header for Items */}
        <div className="my-1.5 flex justify-between text-[11px] font-black uppercase">
          <span>Description</span>
          <span>Amount</span>
        </div>

        <hr className="border-black mb-2" />

        {/* Section 1: Purchased Items */}
        {isExchange && invoice.items?.length > 0 && (
          <div className="mb-1 text-[11px] font-black uppercase tracking-wider text-black">
            [NEW PURCHASED ITEMS]
          </div>
        )}

        {invoice.items.map((item) => (
          <section key={item._id} className="mb-2">
            <strong className="text-xs">{item.productName}</strong>
            <div className="flex justify-between text-xs">
              <span>
                {item.quantity} {item.unitOfMeasure || ""} × {formatNumber(item.unitPrice)}
              </span>
              <strong>{formatNumber(item.lineTotal)}</strong>
            </div>
            {item.discountPercent > 0 && (
              <small className="text-[11px] text-gray-600 block">Discount: {item.discountPercent}%</small>
            )}
          </section>
        ))}

        {/* Section 2: Exchanged / Returned Items */}
        {isExchange && exchangeItems.length > 0 && (
          <div className="mt-3 border-t border-dashed border-black pt-2">
            <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-black">
              [RETURNED / EXCHANGED ITEMS]
            </div>
            {exchangeItems.map((rItem, idx) => {
              const itemTotal = rItem.lineTotal || rItem.quantity * rItem.unitPrice;
              return (
                <section key={rItem._id || idx} className="mb-2 text-xs">
                  <strong className="block font-bold">
                    (RET) {rItem.productName}
                  </strong>
                  <div className="flex flex-wrap items-center gap-1 text-[11px] text-gray-700">
                    <span className="font-semibold">[{formatCondition(rItem.condition)}]</span>
                    {rItem.reason && <span>· {formatReason(rItem.reason)}</span>}
                    {rItem.originalInvoiceNumber && (
                      <span>· Ref: {rItem.originalInvoiceNumber}</span>
                    )}
                  </div>
                  <div className="flex justify-between text-xs mt-0.5">
                    <span>
                      {rItem.quantity} × {formatNumber(rItem.unitPrice)}
                    </span>
                    <strong className="font-bold">
                      -{formatNumber(itemTotal)}
                    </strong>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <hr className="border-black my-2" />

        {/* Summary Breakdown */}
        <div className="space-y-1">
          <ReceiptRow
            label={isExchange ? "Subtotal (New Items)" : "Subtotal"}
            value={invoice.subtotal}
          />
          {invoice.totalDiscount > 0 && (
            <ReceiptRow
              label="Item Discounts"
              value={invoice.totalDiscount}
              isNegative
            />
          )}
          {invoice.orderDiscount?.amount > 0 && (
            <ReceiptRow
              label="Manual Discount"
              value={invoice.orderDiscount.amount}
              isNegative
            />
          )}
          {invoice.promoCodeApplied?.discountAmount > 0 && (
            <ReceiptRow
              label={`Promo (${invoice.promoCodeApplied.code})`}
              value={invoice.promoCodeApplied.discountAmount}
              isNegative
            />
          )}
          {invoice.giftVoucherApplied?.discountAmount > 0 && (
            <ReceiptRow
              label={`Voucher (${invoice.giftVoucherApplied.code})`}
              value={invoice.giftVoucherApplied.discountAmount}
              isNegative
            />
          )}
          {invoice.promotionApplied?.discountAmount > 0 && (
            <ReceiptRow
              label={`Offer (${invoice.promotionApplied.name})`}
              value={invoice.promotionApplied.discountAmount}
              isNegative
            />
          )}

          {/* Exchange Return Credit Row */}
          {isExchange && exchangeCredit > 0 && (
            <div className="border-y border-dashed border-black py-0.5 my-0.5">
              <ReceiptRow
                label="Exchange Return Credit"
                value={exchangeCredit}
                isNegative
                highlight
              />
            </div>
          )}

          {invoice.totalTax > 0 && (
            <ReceiptRow label="Tax" value={invoice.totalTax} />
          )}
          {invoice.shippingCost > 0 && (
            <ReceiptRow label="Shipping" value={invoice.shippingCost} />
          )}
          {invoice.otherCharges > 0 && (
            <ReceiptRow label="Other Charges" value={invoice.otherCharges} />
          )}

          {/* Net Grand Total / Payable */}
          <ReceiptRow
            label={invoice.grandTotal >= 0 ? (isExchange ? "NET TOTAL PAYABLE" : "TOTAL") : "NET REFUND DUE"}
            value={Math.abs(invoice.grandTotal)}
            strong
          />

          {invoice.amountPaid > 0 && (
            <ReceiptRow label="Paid Amount" value={invoice.amountPaid} />
          )}

          {invoice.cashReceived > 0 && (
            <>
              <ReceiptRow label="Cash Given" value={invoice.cashReceived} />
              <ReceiptRow label="Change Returned" value={invoice.changeReturned} />
            </>
          )}

          {invoice.balanceDue > 0 && (
            <ReceiptRow label="Amount Due" value={invoice.balanceDue} strong />
          )}
        </div>

        {(invoice.notes || invoice.paymentInstructions) && (
          <div className="mt-3 border-t border-dashed border-black pt-1.5 text-xs">
            {invoice.notes && <p>Notes: {invoice.notes}</p>}
            {invoice.paymentInstructions && <p>{invoice.paymentInstructions}</p>}
          </div>
        )}

        <footer className="mt-4 border-t pt-2 text-center text-xs">
          {footer.split("\n").map((line, index) => (
            <p key={`${line}-${index}`}>{line}</p>
          ))}
        </footer>
      </main>
    </>
  );
}

export default function ReceiptPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center font-sans text-gray-500">
          Loading receipt...
        </div>
      }
    >
      <ReceiptContent />
    </Suspense>
  );
}
