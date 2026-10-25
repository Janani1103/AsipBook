"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, PackageCheck, Save, Truck } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import { useGrn, useUpdateGrn } from "./useGrns.js";

const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(value || 0);

const formatDateForInput = (date) => {
  if (!date) return "";
  try {
    return new Date(date).toISOString().split("T")[0];
  } catch {
    return "";
  }
};

function EditGrnForm({ grn, onClose }) {
  const updateMutation = useUpdateGrn();

  const [header, setHeader] = useState(() => ({
    receiptDate: formatDateForInput(grn?.receiptDate),
    supplierDeliveryNoteNumber: grn?.supplierDeliveryNoteNumber || "",
    supplierInvoiceNumber: grn?.supplierInvoiceNumber || "",
    vehicleNumber: grn?.vehicleNumber || "",
    driverName: grn?.driverName || "",
    transportCompany: grn?.transportCompany || "",
    notes: grn?.notes || "",
    billDiscountPercent: grn?.billDiscountPercent || 0,
    billDiscountAmount: grn?.billDiscountAmount || 0,
  }));

  const [items, setItems] = useState(() =>
    (grn?.items || []).map((item) => ({
      _id: item._id,
      poLineItemId: item.poLineItemId,
      productId: item.productId?._id || item.productId,
      productName: item.productName || item.productId?.name || "Item",
      productCode: item.productCode || item.productId?.productCode || "",
      unitOfMeasure: item.unitOfMeasure || item.productId?.unitOfMeasure || "",
      orderedQuantity: item.orderedQuantity,
      unitPrice: item.unitPrice || 0,
      receivedQuantity: item.receivedQuantity || 0,
      acceptedQuantity: item.acceptedQuantity ?? item.receivedQuantity ?? 0,
      rejectedQuantity: item.rejectedQuantity || 0,
      freeQuantity: item.freeQuantity || 0,
      discountPercent: item.discountPercent || 0,
      discountAmount: item.discountAmount || 0,
      batchNumber: item.batchNumber || "",
      expiryDate: formatDateForInput(item.expiryDate),
      manufactureDate: formatDateForInput(item.manufactureDate),
      rejectionReason: item.rejectionReason || "",
      notes: item.notes || "",
    }))
  );

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };

      if (field === "receivedQuantity" || field === "rejectedQuantity") {
        const rec = field === "receivedQuantity" ? Number(value) || 0 : Number(item.receivedQuantity) || 0;
        const rej = field === "rejectedQuantity" ? Number(value) || 0 : Number(item.rejectedQuantity) || 0;
        item.acceptedQuantity = Math.max(0, rec - rej);
      }

      next[index] = item;
      return next;
    });
  };

  const calculateTotalAcceptedValue = () => {
    const rawTotal = items.reduce((sum, item) => {
      const lineTotal = (Number(item.acceptedQuantity) || 0) * (Number(item.unitPrice) || 0);
      const discount = Number(item.discountAmount) || (lineTotal * (Number(item.discountPercent) || 0)) / 100;
      return sum + Math.max(0, lineTotal - discount);
    }, 0);

    const discountP = Number(header.billDiscountPercent) || 0;
    const discountA = Number(header.billDiscountAmount) || 0;
    const afterPercent = rawTotal - (rawTotal * discountP) / 100;
    return Math.max(0, afterPercent - discountA);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!grn?._id) return;

    try {
      await updateMutation.mutateAsync({
        id: grn._id,
        data: {
          receiptDate: header.receiptDate ? new Date(header.receiptDate) : undefined,
          supplierDeliveryNoteNumber: header.supplierDeliveryNoteNumber,
          supplierInvoiceNumber: header.supplierInvoiceNumber,
          vehicleNumber: header.vehicleNumber,
          driverName: header.driverName,
          transportCompany: header.transportCompany,
          notes: header.notes,
          billDiscountPercent: Number(header.billDiscountPercent) || 0,
          billDiscountAmount: Number(header.billDiscountAmount) || 0,
          items: items.map((it) => ({
            _id: it._id,
            poLineItemId: it.poLineItemId,
            productId: it.productId,
            receivedQuantity: Number(it.receivedQuantity) || 0,
            acceptedQuantity: Number(it.acceptedQuantity) || 0,
            rejectedQuantity: Number(it.rejectedQuantity) || 0,
            freeQuantity: Number(it.freeQuantity) || 0,
            discountPercent: Number(it.discountPercent) || 0,
            discountAmount: Number(it.discountAmount) || 0,
            batchNumber: it.batchNumber || null,
            expiryDate: it.expiryDate || null,
            manufactureDate: it.manufactureDate || null,
            rejectionReason: it.rejectionReason || null,
            notes: it.notes || null,
          })),
        },
      });

      onClose();
    } catch {
      // Error handled in useUpdateGrn toast
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      {/* Informational banner about stock sync */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-800">
        <AlertCircle size={17} className="mt-0.5 shrink-0 text-blue-600" />
        <div>
          <span className="font-semibold">Automatic Stock & PO Synchronization:</span> Any adjustments made to
          accepted quantities will automatically adjust current warehouse inventory and reconcile the linked
          Purchase Order&apos;s received totals.
        </div>
      </div>

      {/* Delivery & Reference Information */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700 mb-3">
          <Truck size={15} /> Delivery & Reference Details
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Receipt Date"
            type="date"
            value={header.receiptDate}
            onChange={(e) => setHeader({ ...header, receiptDate: e.target.value })}
          />
          <Input
            label="Delivery Note #"
            placeholder="e.g. DN-9842"
            value={header.supplierDeliveryNoteNumber}
            onChange={(e) => setHeader({ ...header, supplierDeliveryNoteNumber: e.target.value })}
          />
          <Input
            label="Supplier Invoice #"
            placeholder="e.g. INV-2026-01"
            value={header.supplierInvoiceNumber}
            onChange={(e) => setHeader({ ...header, supplierInvoiceNumber: e.target.value })}
          />
          <Input
            label="Vehicle Number"
            placeholder="e.g. WP-CAD-4451"
            value={header.vehicleNumber}
            onChange={(e) => setHeader({ ...header, vehicleNumber: e.target.value })}
          />
          <Input
            label="Driver Name"
            placeholder="e.g. Kamal Perera"
            value={header.driverName}
            onChange={(e) => setHeader({ ...header, driverName: e.target.value })}
          />
          <Input
            label="Transport Company"
            placeholder="e.g. Express Logistics"
            value={header.transportCompany}
            onChange={(e) => setHeader({ ...header, transportCompany: e.target.value })}
          />
        </div>
      </div>

      {/* Line Items Section */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700">
          <PackageCheck size={15} /> Received Items & Quantities
        </h4>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item._id || index}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition hover:border-gray-300"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5 mb-3">
                <div>
                  <span className="font-semibold text-gray-900 text-sm">{item.productName}</span>
                  <span className="ml-2 font-mono text-xs text-gray-500">[{item.productCode}]</span>
                  {item.orderedQuantity && (
                    <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      Ordered: {item.orderedQuantity} {item.unitOfMeasure}
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs text-gray-600">
                  Unit Price: <span className="font-bold">{money(item.unitPrice)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Received Qty</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    value={item.receivedQuantity}
                    onChange={(e) => handleItemChange(index, "receivedQuantity", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-emerald-700 mb-1">Accepted Qty</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded border border-emerald-300 bg-emerald-50/30 px-2.5 py-1.5 text-xs font-bold text-emerald-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    value={item.acceptedQuantity}
                    onChange={(e) => handleItemChange(index, "acceptedQuantity", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-red-600 mb-1">Rejected Qty</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    value={item.rejectedQuantity}
                    onChange={(e) => handleItemChange(index, "rejectedQuantity", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Free Qty</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    value={item.freeQuantity}
                    onChange={(e) => handleItemChange(index, "freeQuantity", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Batch Number</label>
                  <input
                    type="text"
                    placeholder="Batch #"
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs font-mono outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    value={item.batchNumber}
                    onChange={(e) => handleItemChange(index, "batchNumber", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    value={item.expiryDate}
                    onChange={(e) => handleItemChange(index, "expiryDate", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-50">
                <div>
                  <input
                    type="text"
                    placeholder="Rejection reason (if any)..."
                    className="w-full rounded border border-gray-200 px-2.5 py-1 text-xs text-gray-700 outline-none focus:border-primary-500"
                    value={item.rejectionReason}
                    onChange={(e) => handleItemChange(index, "rejectionReason", e.target.value)}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Item remarks / condition..."
                    className="w-full rounded border border-gray-200 px-2.5 py-1 text-xs text-gray-700 outline-none focus:border-primary-500"
                    value={item.notes}
                    onChange={(e) => handleItemChange(index, "notes", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes and Discounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">GRN Notes & Remarks</label>
          <textarea
            rows={3}
            placeholder="Add any delivery notes or remarks..."
            className="w-full rounded-lg border border-gray-300 p-2.5 text-xs outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            value={header.notes}
            onChange={(e) => setHeader({ ...header, notes: e.target.value })}
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Bill Discount (%)"
              type="number"
              min="0"
              max="100"
              value={header.billDiscountPercent}
              onChange={(e) => setHeader({ ...header, billDiscountPercent: e.target.value })}
            />
            <Input
              label="Bill Discount (LKR)"
              type="number"
              min="0"
              value={header.billDiscountAmount}
              onChange={(e) => setHeader({ ...header, billDiscountAmount: e.target.value })}
            />
          </div>

          <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm font-bold text-gray-900">
            <span>Calculated Accepted Total:</span>
            <span className="font-mono text-emerald-700 text-base">
              {money(calculateTotalAcceptedValue())}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={updateMutation.isPending}>
          <Save size={16} className="mr-1.5" />
          {updateMutation.isPending ? "Saving Changes..." : "Save GRN Changes"}
        </Button>
      </div>
    </form>
  );
}

export default function EditGrnModal({ isOpen, onClose, grnId }) {
  const { data: response, isLoading } = useGrn(grnId);
  const grn = response?.data;

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Goods Received Note: ${grn?.grnNumber || ""}`} size="2xl">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-gray-500">Loading GRN...</div>
        </div>
      ) : !grn ? (
        <div className="p-6 text-center text-gray-500">GRN not found.</div>
      ) : (
        <EditGrnForm key={grn._id} grn={grn} onClose={onClose} />
      )}
    </Modal>
  );
}

