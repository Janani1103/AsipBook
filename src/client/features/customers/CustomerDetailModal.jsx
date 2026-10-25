"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Ban,
  Building,
  Calendar,
  CreditCard,
  DollarSign,
  Edit,
  Mail,
  MapPin,
  Phone,
  Receipt,
  ShoppingBag,
  Tag,
  User,
  Users,
  X,
} from "lucide-react";
import Modal from "../../../components/ui/Modal.jsx";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Link from "next/link";

const statusVariant = {
  active: "success",
  inactive: "default",
  prospect: "info",
  on_hold: "warning",
  blacklisted: "danger",
};

const money = (val) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(val || 0);

const formatDate = (val) =>
  val
    ? new Date(val).toLocaleDateString("en-LK", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export default function CustomerDetailModal({
  isOpen,
  onClose,
  customer,
  onEdit,
}) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!customer) return null;

  const creditStatus = customer.creditStatus || {};
  const paymentTerms = customer.paymentTerms || {};
  const analytics = customer.analytics || {};
  const primaryContact = customer.primaryContact || {};
  const billing = customer.billingAddress || {};

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-semibold uppercase bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
            {customer.customerCode || "CUSTOMER"}
          </span>
          <span className="text-gray-900 font-semibold">
            {customer.displayName}
          </span>
          <Badge variant={statusVariant[customer.status] || "default"}>
            {customer.status}
          </Badge>
        </div>
      }
      size="xl"
    >
      <div className="p-6 space-y-6">
        {/* Credit Hold Banner */}
        {creditStatus.onCreditHold && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
            <Ban size={20} className="shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Account on Credit Hold</p>
              <p className="text-xs text-red-700 mt-0.5">
                {creditStatus.creditHoldReason ||
                  "This customer has been placed on credit hold. New credit orders are blocked."}
              </p>
            </div>
          </div>
        )}

        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500">
              <span>Outstanding</span>
              <DollarSign size={16} className="text-blue-500" />
            </div>
            <p
              className={`mt-1.5 text-lg font-bold ${
                creditStatus.isOverdue ? "text-red-600" : "text-gray-900"
              }`}
            >
              {money(creditStatus.currentBalance)}
            </p>
            {creditStatus.isOverdue && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 mt-0.5">
                <AlertTriangle size={12} /> Overdue by {creditStatus.daysPastDue || 0}d
              </span>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500">
              <span>Credit Limit</span>
              <CreditCard size={16} className="text-purple-500" />
            </div>
            <p className="mt-1.5 text-lg font-bold text-gray-900">
              {money(paymentTerms.creditLimit)}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Available: {money(creditStatus.availableCredit)}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500">
              <span>Store Credit</span>
              <Receipt size={16} className="text-emerald-500" />
            </div>
            <p className="mt-1.5 text-lg font-bold text-emerald-600">
              {money(creditStatus.storeCredit)}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">Ready for POS/Sales</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500">
              <span>Payment Terms</span>
              <Calendar size={16} className="text-amber-500" />
            </div>
            <p className="mt-1.5 text-sm font-bold text-gray-900 uppercase">
              {paymentTerms.type === "credit"
                ? `${paymentTerms.creditDays || 0} Days Credit`
                : paymentTerms.type || "COD"}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Discount: {customer.defaultDiscountPercent || 0}%
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-medium transition-colors ${
              activeTab === "overview"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <User size={15} /> Overview & Contacts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("business")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-medium transition-colors ${
              activeTab === "business"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Building size={15} /> Business & Tax
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-medium transition-colors ${
              activeTab === "analytics"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <ShoppingBag size={15} /> Orders & Activity
          </button>
        </div>

        {/* Tab 1: Overview & Contacts */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Contact */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 border-b pb-2 mb-3">
                  <Phone size={16} className="text-primary-600" />
                  Primary Contact
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name:</span>
                    <span className="font-medium text-gray-900">
                      {primaryContact.name || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone:</span>
                    <span className="font-medium text-gray-900">
                      {primaryContact.phone || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mobile:</span>
                    <span className="font-medium text-gray-900">
                      {primaryContact.mobile || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email:</span>
                    <span className="font-medium text-gray-900">
                      {primaryContact.email || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 border-b pb-2 mb-3">
                  <MapPin size={16} className="text-primary-600" />
                  Billing Address
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  {billing.line1 ? (
                    <>
                      <p className="font-medium text-gray-900">{billing.line1}</p>
                      {billing.line2 && <p>{billing.line2}</p>}
                      <p>
                        {[billing.city, billing.state, billing.postalCode]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      <p className="text-gray-500">{billing.country || "Sri Lanka"}</p>
                    </>
                  ) : (
                    <p className="text-gray-400 italic">No billing address specified</p>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Contacts */}
            {customer.contacts?.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 border-b pb-2 mb-3">
                  <Users size={16} className="text-primary-600" />
                  Additional Contacts ({customer.contacts.length})
                </div>
                <div className="divide-y divide-gray-100">
                  {customer.contacts.map((c, idx) => (
                    <div
                      key={c._id || idx}
                      className="py-2.5 flex flex-wrap items-center justify-between text-sm gap-2"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-500">
                          {c.designation || c.role || "Contact"}
                        </p>
                      </div>
                      <div className="text-right text-xs text-gray-600">
                        {c.phone && <p>📞 {c.phone}</p>}
                        {c.email && <p>✉️ {c.email}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Business & Tax */}
        {activeTab === "business" && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="border-b border-gray-100 pb-2">
                <span className="text-xs text-gray-500 uppercase block">Company Name</span>
                <span className="font-medium text-gray-900">
                  {customer.companyName || customer.displayName}
                </span>
              </div>

              <div className="border-b border-gray-100 pb-2">
                <span className="text-xs text-gray-500 uppercase block">Business Type</span>
                <span className="font-medium text-gray-900 capitalize">
                  {customer.businessType || "Retailer"}
                </span>
              </div>

              <div className="border-b border-gray-100 pb-2">
                <span className="text-xs text-gray-500 uppercase block">Business Reg No (BRN)</span>
                <span className="font-medium text-gray-900">
                  {customer.businessRegistrationNumber || "—"}
                </span>
              </div>

              <div className="border-b border-gray-100 pb-2">
                <span className="text-xs text-gray-500 uppercase block">Tax / VAT No (TIN)</span>
                <span className="font-medium text-gray-900">
                  {customer.taxRegistrationNumber || "—"}
                </span>
              </div>

              <div className="border-b border-gray-100 pb-2">
                <span className="text-xs text-gray-500 uppercase block">Customer Group</span>
                {customer.customerGroupId ? (
                  <span
                    className="inline-block rounded px-2 py-0.5 text-xs font-medium text-white mt-1"
                    style={{
                      backgroundColor: customer.customerGroupId.color || "#4f46e5",
                    }}
                  >
                    {customer.customerGroupId.name}
                  </span>
                ) : (
                  <span className="font-medium text-gray-400">—</span>
                )}
              </div>

              <div className="border-b border-gray-100 pb-2">
                <span className="text-xs text-gray-500 uppercase block">Industry</span>
                <span className="font-medium text-gray-900">
                  {customer.industry || "General Retail"}
                </span>
              </div>
            </div>

            {customer.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">
                  Notes
                </span>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {customer.notes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Orders & Analytics */}
        {activeTab === "analytics" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-center">
                <span className="text-xs text-gray-500 font-medium uppercase block">Total Orders</span>
                <span className="text-2xl font-bold text-gray-900 mt-1 block">
                  {analytics.totalOrders || 0}
                </span>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-center">
                <span className="text-xs text-gray-500 font-medium uppercase block">Total Value</span>
                <span className="text-2xl font-bold text-primary-600 mt-1 block">
                  {money(analytics.totalOrderValue)}
                </span>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-center">
                <span className="text-xs text-gray-500 font-medium uppercase block">Total Paid</span>
                <span className="text-2xl font-bold text-emerald-600 mt-1 block">
                  {money(analytics.totalPaidAmount)}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex justify-between text-sm py-1 border-b border-gray-100">
                <span className="text-gray-500">Last Order Date:</span>
                <span className="font-medium text-gray-900">{formatDate(analytics.lastOrderDate)}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-gray-100">
                <span className="text-gray-500">Last Payment Date:</span>
                <span className="font-medium text-gray-900">{formatDate(analytics.lastPaymentDate)}</span>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-500">Account Created:</span>
                <span className="font-medium text-gray-900">{formatDate(customer.createdAt)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Link
                href={`/invoices?customerId=${customer._id}`}
                className="flex-1 text-center py-2 px-3 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={onClose}
              >
                View Invoices
              </Link>
              <Link
                href={`/sales-orders?customerId=${customer._id}`}
                className="flex-1 text-center py-2 px-3 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={onClose}
              >
                View Sales Orders
              </Link>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-400">
            ID: {customer._id}
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onEdit(customer);
                }}
              >
                <Edit size={14} className="mr-1.5" />
                Edit Customer
              </Button>
            )}
            <Button variant="default" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
