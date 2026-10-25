"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Ban, Printer, Send, DollarSign } from "lucide-react";
import Badge from "../../../../components/ui/Badge.jsx";
import Button from "../../../../components/ui/Button.jsx";
import Card from "../../../../components/ui/Card.jsx";
import PageHeader from "../../../../components/ui/PageHeader.jsx";
import PaymentDialog from "../../../../components/ui/PaymentDialog.jsx";
import {
  useChangeInvoiceStatus,
  useInvoice,
} from "../../../../client/features/invoices/useInvoices.js";
import { useCompanySettings } from "../../../../client/features/settings/useSettings.js";
import { getBluetoothPrintUrl } from "../../../../client/utils/printHelpers.js";

const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
  }).format(value || 0);

const date = (value) =>
  value ? new Date(value).toLocaleDateString("en-LK") : "—";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useInvoice(id);
  const { data: settingsData } = useCompanySettings();
  const changeStatus = useChangeInvoiceStatus();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const invoice = data?.data;
  const settings = settingsData?.data || {};

  const updateStatus = async (status) => {
    const reason =
      status === "cancelled"
        ? window.prompt("Cancellation reason")
        : undefined;
    if (status === "cancelled" && reason === null) {
      return;
    }

    await changeStatus.mutateAsync({ id, status, reason });
  };

  if (isLoading) {
    return <div className="py-16 text-center text-gray-500">Loading...</div>;
  }

  if (!invoice) {
    return (
      <div className="py-16 text-center text-gray-500">Invoice not found</div>
    );
  }

  const canSend = invoice.status === "approved";
  const canCancel = ["approved", "sent"].includes(invoice.status) && invoice.paymentStatus !== "paid";
  const canReceivePayment = ["approved", "sent"].includes(invoice.status) && invoice.balanceDue > 0;

  return (
    <div>
      <PageHeader
        title={`Invoice ${invoice.invoiceNumber}`}
        description={`${date(invoice.invoiceDate)} · ${invoice.invoiceType}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/invoices">
              <Button variant="outline">
                <ArrowLeft size={16} className="mr-1.5" />
                Back
              </Button>
            </Link>
            <Link href={`/receipt/${invoice._id}`}>
              <Button variant="outline">
                <Printer size={16} className="mr-1.5" />
                POS Receipt
              </Button>
            </Link>
            <Button
              variant="outline"
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
              onClick={() => {
                window.location.href = getBluetoothPrintUrl(invoice._id);
              }}
            >
              <Printer size={16} className="mr-1.5 text-emerald-600" />
              Bluetooth Print
            </Button>
            {canSend && (
              <Button
                variant="primary"
                loading={changeStatus.isPending}
                onClick={() => updateStatus("sent")}
              >
                <Send size={16} className="mr-1.5" />
                Mark Sent
              </Button>
            )}
            {canCancel && (
              <Button
                variant="danger"
                loading={changeStatus.isPending}
                onClick={() => updateStatus("cancelled")}
              >
                <Ban size={16} className="mr-1.5" />
                Cancel
              </Button>
            )}
            {canReceivePayment && (
              <Button
                variant="success"
                onClick={() => setShowPaymentDialog(true)}
              >
                <DollarSign size={16} className="mr-1.5" />
                Receive Payment
              </Button>
            )}
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="mb-6 flex items-start justify-between">
              <div className="flex-1">
                {settings.logo && (
                  <img
                    src={settings.logo}
                    alt="Company Logo"
                    className="mb-4 h-20 w-auto object-contain"
                  />
                )}
                <h2 className="text-xl font-bold">{settings.companyName || "Company Name"}</h2>
                <p className="text-sm text-gray-600">{settings.address}</p>
                <p className="text-sm text-gray-600">{settings.phone}</p>
                {settings.taxRegistrationNumber && (
                  <p className="text-sm text-gray-600">VAT No: {settings.taxRegistrationNumber}</p>
                )}
              </div>
              <div className="text-right">
                <h1 className="text-2xl font-bold text-gray-900">INVOICE</h1>
                <p className="text-lg font-semibold text-gray-700">{invoice.invoiceNumber}</p>
                <p className="text-sm text-gray-500">{date(invoice.invoiceDate)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 border-t pt-6">
              <div>
                <p className="text-xs uppercase text-gray-500">Bill To</p>
                <p className="font-medium">{invoice.customerSnapshot?.name}</p>
                <p className="text-sm text-gray-600">{invoice.customerSnapshot?.code}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Due Date</p>
                <p>{date(invoice.dueDate)}</p>
                <Badge className="mt-2">{invoice.paymentStatus}</Badge>{" "}
                <Badge variant="info">{invoice.status}</Badge>
              </div>
            </div>
          </Card>
          <Card className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-3 text-left">Item</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">Discount</th>
                  <th className="p-3 text-right">Tax</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item._id} className="border-b">
                    <td className="p-3">
                      <p>{item.productName}</p>
                      <p className="text-xs text-gray-500">
                        {item.productCode} · {item.unitOfMeasure}
                      </p>
                    </td>
                    <td className="p-3 text-right">{item.quantity}</td>
                    <td className="p-3 text-right">{money(item.unitPrice)}</td>
                    <td className="p-3 text-right">{money(item.lineDiscount)}</td>
                    <td className="p-3 text-right">{money(item.lineTax)}</td>
                    <td className="p-3 text-right">{money(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {invoice.exchangeReturnItems && invoice.exchangeReturnItems.length > 0 && (
            <Card className="overflow-x-auto border-purple-200">
              <div className="border-b bg-purple-50/70 p-3">
                <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                  Exchange & Returned Items
                  <Badge variant="purple">Return Credit</Badge>
                </h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs">
                    <th className="p-3 text-left">Returned Product</th>
                    <th className="p-3 text-left">Condition</th>
                    <th className="p-3 text-left">Reason</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Credit Value</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.exchangeReturnItems.map((item, idx) => (
                    <tr key={item._id || idx} className="border-b text-sm">
                      <td className="p-3">
                        <p className="font-medium text-gray-900">{item.productName || "Product"}</p>
                        <p className="text-xs text-gray-500">
                          {item.productCode || ""} {item.originalInvoiceNumber ? `· Ref: ${item.originalInvoiceNumber}` : ""}
                        </p>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          item.condition === "damaged"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {item.condition === "damaged" ? "Damaged / Scrap" : "Resellable"}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-gray-600">
                        {item.reason ? item.reason.replace(/_/g, " ") : "Exchange"}
                      </td>
                      <td className="p-3 text-right font-medium">{item.quantity}</td>
                      <td className="p-3 text-right text-gray-600">{money(item.unitPrice)}</td>
                      <td className="p-3 text-right font-bold text-rose-600">
                        -{money(item.lineTotal || item.quantity * item.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
          {(invoice.notes || invoice.paymentInstructions) && (
            <Card className="space-y-4 p-6">
              {invoice.notes && (
                <div>
                  <h3 className="font-semibold">Notes</h3>
                  <p>{invoice.notes}</p>
                </div>
              )}
              {invoice.paymentInstructions && (
                <div>
                  <h3 className="font-semibold">Payment Instructions</h3>
                  <p>{invoice.paymentInstructions}</p>
                </div>
              )}
            </Card>
          )}
        </div>
        <Card className="h-fit space-y-2 p-6">
          <h3 className="mb-4 font-semibold">Summary</h3>
          <Summary label="Subtotal" value={invoice.subtotal} />
          <Summary
            label="Discount"
            value={invoice.totalDiscount + (invoice.orderDiscount?.amount || 0)}
          />
          {invoice.returnCreditAmount > 0 && (
            <Summary label="Exchange Credit" value={-invoice.returnCreditAmount} />
          )}
          <Summary label="Tax" value={invoice.totalTax} />
          <Summary label="Shipping" value={invoice.shippingCost} />
          <Summary label="Other Charges" value={invoice.otherCharges} />
          <Summary label="Grand Total" value={invoice.grandTotal} strong />
          <Summary label="Amount Paid" value={invoice.amountPaid} />
          <Summary label="Balance Due" value={invoice.balanceDue} strong />
        </Card>
      </div>

      <PaymentDialog
        isOpen={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        customerId={invoice.customerId}
        totalAmount={invoice.balanceDue}
        documentNumber={invoice.invoiceNumber}
        documentType="invoice"
        documentId={invoice._id}
      />
    </div>
  );
}

function Summary({ label, value, strong = false }) {
  const className = `flex justify-between ${
    strong ? "border-t pt-2 font-bold" : ""
  }`;

  return (
    <div className={className}>
      <span>{label}</span>
      <span>{money(value)}</span>
    </div>
  );
}
