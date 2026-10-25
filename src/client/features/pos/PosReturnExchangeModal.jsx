"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  RotateCcw,
  Search,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Package,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeftRight,
  Wallet,
  DollarSign,
  X,
  ChevronLeft,
} from "lucide-react";
import Modal from "../../../components/ui/Modal.jsx";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import { invoicesApi } from "../invoices/invoicesApi.js";
import { posReturnsApi } from "./posReturnsApi.js";

const money = (val) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(val || 0);

export default function PosReturnExchangeModal({
  isOpen,
  onClose,
  warehouseId,
  onAddExchangeToCart,
  onReturnCompleted,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedItems, setSelectedItems] = useState({}); // { [productId]: { quantity, condition, reason, unitPrice, name, productCode } }
  const [refundMethod, setRefundMethod] = useState("cash");
  const [returnNotes, setReturnNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [directRefundMode, setDirectRefundMode] = useState(false);

  // Search invoices query
  const { data: invoicesData, isLoading: searchingInvoices } = useQuery({
    queryKey: ["pos-invoices-lookup", searchQuery],
    queryFn: async () => {
      const res = await invoicesApi.list({
        search: searchQuery || undefined,
        limit: 8,
      });
      return res?.data || [];
    },
    enabled: isOpen,
  });

  const invoicesList = invoicesData || [];

  // Reset state when opening / closing
  const handleClose = () => {
    setSelectedInvoice(null);
    setSelectedItems({});
    setSearchQuery("");
    setDirectRefundMode(false);
    setReturnNotes("");
    onClose();
  };

  // Toggle item selection
  const handleItemToggle = (item) => {
    const pId = item.productId?._id || item.productId;
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[pId]) {
        delete next[pId];
      } else {
        next[pId] = {
          productId: pId,
          productCode: item.productCode || item.productId?.productCode,
          name: item.productName || item.productId?.name,
          unitPrice: item.unitPrice,
          maxQuantity: item.quantity,
          quantity: 1,
          condition: "resellable",
          reason: "customer_changed_mind",
          reasonDescription: "",
        };
      }
      return next;
    });
  };

  const updateItemQty = (pId, newQty) => {
    setSelectedItems((prev) => {
      if (!prev[pId]) return prev;
      const max = prev[pId].maxQuantity || 999;
      const clamped = Math.max(1, Math.min(max, newQty));
      return {
        ...prev,
        [pId]: { ...prev[pId], quantity: clamped },
      };
    });
  };

  const updateItemCondition = (pId, condition) => {
    setSelectedItems((prev) => {
      if (!prev[pId]) return prev;
      return {
        ...prev,
        [pId]: { ...prev[pId], condition },
      };
    });
  };

  const updateItemReason = (pId, reason) => {
    setSelectedItems((prev) => {
      if (!prev[pId]) return prev;
      return {
        ...prev,
        [pId]: { ...prev[pId], reason },
      };
    });
  };

  // Calculate return credit
  const returnItemsList = Object.values(selectedItems);
  const totalReturnCredit = returnItemsList.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  // Send items to POS Cart for Exchange
  const handleAddToCartForExchange = () => {
    if (returnItemsList.length === 0) {
      return toast.error("Please select at least one item to return/exchange");
    }

    const payload = returnItemsList.map((item) => ({
      ...item,
      isReturn: true,
      originalInvoiceId: selectedInvoice?._id,
      originalInvoiceNumber: selectedInvoice?.invoiceNumber,
      customerSnapshot: selectedInvoice?.customerSnapshot,
      customerId: selectedInvoice?.customerId?._id || selectedInvoice?.customerId,
    }));

    onAddExchangeToCart(payload, selectedInvoice);
    toast.success(`${returnItemsList.length} return item(s) added to cart for exchange`);
    handleClose();
  };

  // Process Direct Refund (Cash out from POS Drawer or Store Credit)
  const handleProcessDirectRefund = async () => {
    if (returnItemsList.length === 0) {
      return toast.error("Please select at least one item to return");
    }
    if (!warehouseId) {
      return toast.error("Active warehouse is required");
    }

    setIsSubmitting(true);
    try {
      const payload = {
        invoiceId: selectedInvoice?._id,
        customerId: selectedInvoice?.customerId?._id || selectedInvoice?.customerId,
        warehouseId,
        refundMethod,
        notes: returnNotes,
        items: returnItemsList.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          condition: i.condition,
          reason: i.reason,
          reasonDescription: i.reasonDescription,
        })),
      };

      const result = await posReturnsApi.processDirectReturn(payload);
      toast.success(
        `Return ${result.data?.rmaNumber} completed! ${
          refundMethod === "cash" ? "Cash drawer refunded." : "Added to Store Credit."
        }`
      );
      if (onReturnCompleted) onReturnCompleted(result.data);
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to process return");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      size="xl"
    >
      <div className="relative overflow-hidden rounded-t-xl bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 p-6 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-md">
              <RotateCcw className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Return & Exchange Terminal</h2>
              <p className="text-xs text-purple-100">
                Lookup past receipt, select items, and process exchange or refund
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg bg-white/10 p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
        {/* STEP 1: SELECT INVOICE */}
        {!selectedInvoice ? (
          <div className="space-y-4">
            <div className="relative">
              <Search
                className="absolute left-3.5 top-3 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search by Invoice No (e.g. INV-1002), Customer Name, or Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {searchQuery ? "Search Results" : "Recent Invoices"}
                </span>
                <span className="text-xs text-gray-400">
                  {invoicesList.length} receipt(s) found
                </span>
              </div>

              {searchingInvoices ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  Loading invoices...
                </div>
              ) : invoicesList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
                  <Receipt className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-sm font-semibold text-gray-700">No invoices found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Try searching with another Invoice # or Customer Phone
                  </p>
                </div>
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {invoicesList.map((inv) => (
                    <div
                      key={inv._id}
                      onClick={() => setSelectedInvoice(inv)}
                      className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-indigo-400 hover:shadow-md hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-sm font-bold text-indigo-700">
                            {inv.invoiceNumber}
                          </span>
                          <p className="text-sm font-semibold text-gray-900 mt-0.5">
                            {inv.customerSnapshot?.name || inv.customerId?.displayName || "Walk-in Customer"}
                          </p>
                          {inv.customerSnapshot?.phone && (
                            <p className="text-xs text-gray-500">
                              Tel: {inv.customerSnapshot.phone}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">
                            {money(inv.grandTotal)}
                          </p>
                          <span className="mt-1 inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
                            {new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-xs text-gray-500 group-hover:text-indigo-600">
                        <span>{inv.items?.length || 0} item(s)</span>
                        <span className="flex items-center gap-1 font-semibold">
                          Select Receipt <ArrowRight size={13} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* STEP 2: SELECT ITEMS FROM INVOICE */
          <div className="space-y-5">
            {/* Invoice Header Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-3.5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInvoice(null);
                    setSelectedItems({});
                  }}
                  className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 shadow-sm transition hover:bg-gray-50"
                  title="Back to search"
                >
                  <ChevronLeft size={16} />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-indigo-800">
                      {selectedInvoice.invoiceNumber}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                      Purchased {new Date(selectedInvoice.invoiceDate || selectedInvoice.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Customer: <span className="font-semibold text-gray-900">{selectedInvoice.customerSnapshot?.name || "Walk-in"}</span>
                    {selectedInvoice.customerSnapshot?.phone ? ` (${selectedInvoice.customerSnapshot.phone})` : ""}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500">Original Total:</span>
                <p className="text-base font-bold text-gray-900">{money(selectedInvoice.grandTotal)}</p>
              </div>
            </div>

            {/* Purchased Items List */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Select Items to Return or Exchange:
              </p>

              <div className="space-y-2.5">
                {selectedInvoice.items?.map((item, idx) => {
                  const pId = item.productId?._id || item.productId;
                  const isSelected = !!selectedItems[pId];
                  const currentItem = selectedItems[pId];

                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border p-4 transition-all ${
                        isSelected
                          ? "border-indigo-400 bg-indigo-50/20 shadow-sm ring-1 ring-indigo-400"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <label className="flex items-start gap-3 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleItemToggle(item)}
                            className="mt-1 h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {item.productName || item.productId?.name}
                            </p>
                            <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-gray-500">
                              <span className="font-mono text-gray-600">
                                {item.productCode || item.productId?.productCode}
                              </span>
                              <span>• Sold Qty: {item.quantity}</span>
                              <span>• Unit Price: {money(item.unitPrice)}</span>
                            </div>
                          </div>
                        </label>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-900">
                            {money(item.quantity * item.unitPrice)}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Options when checked */}
                      {isSelected && (
                        <div className="mt-3.5 border-t border-indigo-100 pt-3 grid gap-3 sm:grid-cols-3 bg-white/70 p-3 rounded-lg">
                          {/* Quantity Counter */}
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">
                              Return Qty
                            </label>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateItemQty(pId, currentItem.quantity - 1)}
                                className="rounded-md border border-gray-200 bg-white p-1 text-gray-600 hover:bg-gray-100"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-9 text-center text-sm font-bold text-indigo-900">
                                {currentItem.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateItemQty(pId, currentItem.quantity + 1)}
                                className="rounded-md border border-gray-200 bg-white p-1 text-gray-600 hover:bg-gray-100"
                              >
                                <Plus size={14} />
                              </button>
                              <span className="text-[10px] text-gray-400 ml-1">
                                (Max {currentItem.maxQuantity})
                              </span>
                            </div>
                          </div>

                          {/* Condition Selection */}
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">
                              Item Condition
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateItemCondition(pId, "resellable")}
                                className={`rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                                  currentItem.condition === "resellable"
                                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs"
                                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                🟢 Resellable
                              </button>
                              <button
                                type="button"
                                onClick={() => updateItemCondition(pId, "damaged")}
                                className={`rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                                  currentItem.condition === "damaged"
                                    ? "border-rose-500 bg-rose-50 text-rose-800 shadow-xs"
                                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                🔴 Damaged
                              </button>
                            </div>
                          </div>

                          {/* Reason Selection */}
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">
                              Reason
                            </label>
                            <select
                              value={currentItem.reason}
                              onChange={(e) => updateItemReason(pId, e.target.value)}
                              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium outline-none focus:border-indigo-500"
                            >
                              <option value="customer_changed_mind">Customer Changed Mind</option>
                              <option value="defective">Defective / Damaged</option>
                              <option value="wrong_item">Wrong Size / Model</option>
                              <option value="not_as_described">Not As Described</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Direct Refund Expansion Options */}
            {directRefundMode && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
                  <Wallet size={16} /> Instant Refund Method
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setRefundMethod("cash")}
                    className={`rounded-lg border p-3 text-left transition ${
                      refundMethod === "cash"
                        ? "border-amber-500 bg-white shadow-sm ring-1 ring-amber-500"
                        : "border-amber-200 bg-white/50 hover:bg-white"
                    }`}
                  >
                    <p className="font-bold text-gray-900 text-xs">Cash Refund</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Deduct immediately from POS Cash Drawer
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundMethod("store_credit")}
                    className={`rounded-lg border p-3 text-left transition ${
                      refundMethod === "store_credit"
                        ? "border-amber-500 bg-white shadow-sm ring-1 ring-amber-500"
                        : "border-amber-200 bg-white/50 hover:bg-white"
                    }`}
                  >
                    <p className="font-bold text-gray-900 text-xs">Store Credit</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Add to Customer Account for future purchases
                    </p>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Notes (optional): Reason for refund..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-amber-500"
                />
              </div>
            )}

            {/* Total Return Credit Bar */}
            <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div>
                <span className="text-xs font-semibold text-purple-900 uppercase tracking-wider">
                  Total Return Value ({returnItemsList.length} items)
                </span>
                <p className="text-2xl font-black text-indigo-700 mt-0.5">
                  {money(totalReturnCredit)}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {!directRefundMode ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDirectRefundMode(true)}
                      disabled={returnItemsList.length === 0}
                      className="border-amber-300 text-amber-800 hover:bg-amber-100/50"
                    >
                      Direct Refund
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddToCartForExchange}
                      disabled={returnItemsList.length === 0}
                      className="bg-indigo-600 hover:bg-indigo-700 shadow-sm flex items-center gap-1.5"
                    >
                      <ArrowLeftRight size={15} />
                      Add to Cart for Exchange
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDirectRefundMode(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      loading={isSubmitting}
                      onClick={handleProcessDirectRefund}
                      className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                    >
                      Confirm Direct Refund
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
