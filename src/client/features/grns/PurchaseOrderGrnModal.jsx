"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AlertCircle, PackageCheck } from "lucide-react";
import Button from "../../../components/ui/Button.jsx";
import Input from "../../../components/ui/Input.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import Select from "../../../components/ui/Select.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";
import { useCreateGrn } from "./useGrns.js";
import { usePurchaseOrders } from "../purchaseOrders/usePurchaseOrders.js";

const emptyItems = (po) =>
  (po?.items || [])
    .filter((item) => item.orderedQuantity - (item.receivedQuantity || 0) > 0)
    .map((item) => ({
      poLineItemId: item._id,
      productId: item.productId?._id || item.productId,
      productName: item.productName,
      productCode: item.productCode,
      orderedQuantity: item.orderedQuantity,
      alreadyReceived: item.receivedQuantity || 0,
      pending: +(item.orderedQuantity - (item.receivedQuantity || 0)).toFixed(2),
      receivedQuantity: +(item.orderedQuantity - (item.receivedQuantity || 0)).toFixed(2),
      acceptedQuantity: +(item.orderedQuantity - (item.receivedQuantity || 0)).toFixed(2),
      rejectedQuantity: 0,
      rejectionReason: "",
      discountPercent: 0,
      discountAmount: 0,
      freeQuantity: 0,
      unitPrice: item.unitPrice,
      batchNumber: item.batchNumber || "",
      expiryDate: item.expectedExpiryDate
        ? new Date(item.expectedExpiryDate).toISOString().slice(0, 10)
        : "",
      unitOfMeasure: item.unitOfMeasure,
    }));

export default function PurchaseOrderGrnModal({ isOpen, onClose, purchaseOrder }) {
  const [selectedPoId, setSelectedPoId] = useState("");
  const [items, setItems] = useState([]);
  const [supplierDeliveryNoteNumber, setSupplierDeliveryNoteNumber] = useState("");
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [notes, setNotes] = useState("");
  const [billDiscountPercent, setBillDiscountPercent] = useState("");
  const [billDiscountAmount, setBillDiscountAmount] = useState("");

  const create = useCreateGrn();

  // If purchaseOrder prop is not provided, fetch eligible POs
  const { data: poResponse, isLoading: loadingPos } = usePurchaseOrders(
    isOpen && !purchaseOrder ? { limit: 100 } : {}
  );

  const eligibleOrders = useMemo(() => {
    if (purchaseOrder) return [purchaseOrder];
    return (poResponse?.data || []).filter(
      (order) =>
        ["approved", "sent", "partially_received"].includes(order.status) &&
        (order.receiptCompletionPercent || 0) < 100
    );
  }, [purchaseOrder, poResponse?.data]);

  const activePo = useMemo(() => {
    if (purchaseOrder) return purchaseOrder;
    return eligibleOrders.find((p) => p._id === selectedPoId) || null;
  }, [purchaseOrder, eligibleOrders, selectedPoId]);

  /* eslint-disable react-hooks/set-state-in-effect -- Form values intentionally hydrate when modal opens or PO is selected. */
  useEffect(() => {
    if (!isOpen) {
      setSelectedPoId("");
      setItems([]);
      return;
    }

    if (purchaseOrder) {
      setSelectedPoId(purchaseOrder._id);
      setItems(emptyItems(purchaseOrder));
    } else if (selectedPoId) {
      const found = eligibleOrders.find((p) => p._id === selectedPoId);
      setItems(found ? emptyItems(found) : []);
    } else {
      setItems([]);
    }

    setSupplierDeliveryNoteNumber("");
    setSupplierInvoiceNumber("");
    setVehicleNumber("");
    setDriverName("");
    setNotes("");
    setBillDiscountPercent("");
    setBillDiscountAmount("");
  }, [isOpen, purchaseOrder, selectedPoId, eligibleOrders]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const poOptions = eligibleOrders.map((p) => ({
    value: p._id,
    label: `${p.poNumber} — ${p.supplierSnapshot?.name || "Supplier"} (${p.deliverTo?.warehouseName || "Warehouse"} · ${p.items?.length || 0} items)`,
  }));

  const updateItem = (index, field, value) => {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, [field]: value };
        const received = +next.receivedQuantity || 0;
        const rejected = +next.rejectedQuantity || 0;
        if (field === "receivedQuantity" || field === "rejectedQuantity") {
          next.acceptedQuantity = Math.max(0, received - rejected);
        }
        const lineTotal = (+next.acceptedQuantity || 0) * (+next.unitPrice || 0);
        if (["receivedQuantity", "rejectedQuantity", "discountPercent"].includes(field)) {
          next.discountAmount =
            +next.discountPercent > 0
              ? ((lineTotal * +next.discountPercent) / 100).toFixed(2)
              : "";
        }
        if (field === "discountAmount")
          next.discountPercent =
            value && lineTotal > 0 ? ((+value / lineTotal) * 100).toFixed(2) : "";
        return next;
      })
    );
  };

  const submit = async () => {
    if (!activePo) return toast.error("Please select a purchase order");
    const toReceive = items.filter((item) => +item.receivedQuantity > 0);
    if (!toReceive.length)
      return toast.error("At least one item must have a received quantity greater than 0");

    await create.mutateAsync({
      purchaseOrderId: activePo._id,
      warehouseId: activePo.deliverTo?.warehouseId?._id || activePo.deliverTo?.warehouseId,
      supplierDeliveryNoteNumber: supplierDeliveryNoteNumber || undefined,
      supplierInvoiceNumber: supplierInvoiceNumber || undefined,
      vehicleNumber: vehicleNumber || undefined,
      driverName: driverName || undefined,
      notes: notes || undefined,
      billDiscountPercent: +billDiscountPercent || 0,
      billDiscountAmount: +billDiscountAmount || 0,
      items: toReceive.map((item) => ({
        poLineItemId: item.poLineItemId,
        productId: item.productId,
        receivedQuantity: +item.receivedQuantity,
        acceptedQuantity: +item.acceptedQuantity,
        rejectedQuantity: +item.rejectedQuantity || 0,
        rejectionReason: item.rejectionReason || undefined,
        discountPercent: +item.discountPercent || 0,
        discountAmount: +item.discountAmount || 0,
        freeQuantity: +item.freeQuantity || 0,
        unitPrice: +item.unitPrice,
        batchNumber: item.batchNumber || undefined,
        expiryDate: item.expiryDate || undefined,
      })),
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <PackageCheck size={20} className="text-primary-600" />
          {activePo ? `Receive Goods — PO ${activePo.poNumber}` : "Receive Goods from Purchase Order"}
        </span>
      }
      size="xl"
    >
      <div className="space-y-4 p-6">
        {/* PO Selector if not pre-provided */}
        {!purchaseOrder && (
          <div className="rounded-lg border border-primary-200 bg-primary-50/50 p-4">
            <Select
              label="Select Purchase Order"
              required
              placeholder={
                loadingPos ? "Loading purchase orders..." : "Choose an approved PO to receive..."
              }
              options={poOptions}
              value={selectedPoId}
              onChange={(event) => setSelectedPoId(event.target.value)}
            />
            {eligibleOrders.length === 0 && !loadingPos && (
              <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                <span>
                  No approved purchase orders pending goods receipt found. Make sure the Purchase
                  Order status is &quot;Approved&quot;, &quot;Sent&quot;, or &quot;Partially Received&quot;.
                </span>
              </div>
            )}
          </div>
        )}

        {/* PO Info Bar */}
        {activePo && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm">
            <div>
              <span className="font-semibold text-gray-800">PO: {activePo.poNumber}</span>
              <span className="mx-2 text-gray-300">|</span>
              <span className="text-gray-600">
                Supplier: <strong className="text-gray-800">{activePo.supplierSnapshot?.name}</strong>
              </span>
            </div>
            <div>
              <span className="text-gray-600">
                Deliver To:{" "}
                <strong className="text-gray-800">{activePo.deliverTo?.warehouseName}</strong>
              </span>
              <span className="mx-2 text-gray-300">|</span>
              <span className="font-medium text-primary-600">
                {Math.round(activePo.receiptCompletionPercent || 0)}% received
              </span>
            </div>
          </div>
        )}

        {/* Delivery Details */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Supplier Delivery Note #"
            placeholder="e.g., DN-12345"
            value={supplierDeliveryNoteNumber}
            onChange={(event) => setSupplierDeliveryNoteNumber(event.target.value)}
          />
          <Input
            label="Supplier Invoice #"
            placeholder="e.g., INV-98765"
            value={supplierInvoiceNumber}
            onChange={(event) => setSupplierInvoiceNumber(event.target.value)}
          />
          <Input
            label="Vehicle Number"
            placeholder="e.g., WP CA-1234"
            value={vehicleNumber}
            onChange={(event) => setVehicleNumber(event.target.value)}
          />
          <Input
            label="Driver Name"
            placeholder="e.g., Nimal Silva"
            value={driverName}
            onChange={(event) => setDriverName(event.target.value)}
          />
        </div>

        {/* Items Section */}
        {!activePo ? (
          <div className="py-8 text-center text-sm text-gray-500">
            Please select a Purchase Order above to view items and enter receipt quantities.
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            All items have been fully received on this PO.
          </p>
        ) : (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-700">Items to Receive</h4>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.poLineItemId} className="rounded-lg border bg-white p-3 shadow-sm">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{item.productName}</p>
                      <p className="font-mono text-xs text-gray-500">{item.productCode}</p>
                    </div>
                    <div className="text-xs text-gray-500">
                      Ordered: <strong className="text-gray-700">{item.orderedQuantity}</strong> {item.unitOfMeasure} · Already received:{" "}
                      <strong className="text-gray-700">{item.alreadyReceived}</strong> · Pending:{" "}
                      <strong className="text-primary-600">{item.pending}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <Input
                      label="Received Qty"
                      type="number"
                      step="0.01"
                      min="0"
                      max={item.pending}
                      value={item.receivedQuantity}
                      onChange={(event) => updateItem(index, "receivedQuantity", event.target.value)}
                    />
                    <Input
                      label="Rejected Qty"
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.rejectedQuantity}
                      onChange={(event) => updateItem(index, "rejectedQuantity", event.target.value)}
                    />
                    <Input
                      label="Accepted"
                      type="number"
                      value={item.acceptedQuantity}
                      disabled
                    />
                    <Input
                      label="Batch #"
                      placeholder="e.g. B-01"
                      value={item.batchNumber}
                      onChange={(event) => updateItem(index, "batchNumber", event.target.value)}
                    />
                    <Input
                      label="Expiry Date"
                      type="date"
                      value={item.expiryDate}
                      onChange={(event) => updateItem(index, "expiryDate", event.target.value)}
                    />
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2 border-t pt-2">
                    <Input
                      label="Free Qty"
                      type="number"
                      min="0"
                      value={item.freeQuantity}
                      onChange={(event) => updateItem(index, "freeQuantity", event.target.value)}
                    />
                    <Input
                      label="Discount (%)"
                      type="number"
                      min="0"
                      max="100"
                      value={item.discountPercent}
                      onChange={(event) => updateItem(index, "discountPercent", event.target.value)}
                    />
                    <Input
                      label="Discount (Rs)"
                      type="number"
                      min="0"
                      value={item.discountAmount}
                      onChange={(event) => updateItem(index, "discountAmount", event.target.value)}
                    />
                  </div>

                  {+item.rejectedQuantity > 0 && (
                    <div className="mt-2">
                      <Input
                        label="Rejection Reason"
                        placeholder="Reason for rejecting damaged / sub-standard goods..."
                        value={item.rejectionReason}
                        onChange={(event) => updateItem(index, "rejectionReason", event.target.value)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overall Bill Discount & Notes */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Bill Discount (%)"
            type="number"
            min="0"
            max="100"
            value={billDiscountPercent}
            onChange={(event) => {
              setBillDiscountPercent(event.target.value);
              if (event.target.value) setBillDiscountAmount("");
            }}
          />
          <Input
            label="Bill Discount (Rs)"
            type="number"
            min="0"
            value={billDiscountAmount}
            onChange={(event) => {
              setBillDiscountAmount(event.target.value);
              if (event.target.value) setBillDiscountPercent("");
            }}
          />
        </div>

        <Textarea
          label="Notes"
          rows={2}
          placeholder="Delivery notes, comments on received items, etc."
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={submit}
          loading={create.isPending}
          disabled={!activePo || items.length === 0 || !items.some((item) => +item.receivedQuantity > 0)}
        >
          Confirm Receipt
        </Button>
      </div>
    </Modal>
  );
}
