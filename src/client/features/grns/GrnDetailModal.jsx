"use client";

import { Printer, Edit, PackageCheck, AlertCircle, FileText, Truck, Calendar, Building, MapPin, User } from "lucide-react";
import Badge from "../../../components/ui/Badge.jsx";
import Button from "../../../components/ui/Button.jsx";
import Modal from "../../../components/ui/Modal.jsx";
import { useGrn } from "./useGrns.js";

const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(value || 0);

const statusVariants = {
  received: "success",
  completed: "success",
  draft: "default",
  qc_pending: "warning",
  rejected: "danger",
  cancelled: "danger",
};

export default function GrnDetailModal({ isOpen, onClose, grnId, onEdit }) {
  const { data: response, isLoading } = useGrn(grnId);
  const grn = response?.data;

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={grn ? `Goods Received Note: ${grn.grnNumber}` : "GRN Details"} size="2xl">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-gray-500">Loading GRN details...</div>
        </div>
      ) : !grn ? (
        <div className="p-6 text-center text-gray-500">GRN not found.</div>
      ) : (
        <div className="space-y-6 p-6">
          {/* Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/70 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                <PackageCheck size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold font-mono text-gray-900">{grn.grnNumber}</h3>
                  <Badge variant={statusVariants[grn.status] || "default"}>
                    {grn.status?.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Receipt Date: {new Date(grn.receiptDate).toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "numeric" })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer size={15} className="mr-1.5" /> Print Slip
              </Button>
              {grn.status !== "cancelled" && onEdit && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onEdit(grn);
                  }}
                >
                  <Edit size={15} className="mr-1.5" /> Edit GRN
                </Button>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Supplier Information */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                <Building size={14} /> Supplier
              </div>
              <p className="font-semibold text-gray-900">
                {grn.supplierName || grn.supplierId?.displayName || "—"}
              </p>
              {grn.supplierId?.supplierCode && (
                <p className="text-xs text-gray-500 mt-0.5">Code: {grn.supplierId.supplierCode}</p>
              )}
              {grn.purchaseOrderId ? (
                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                  <FileText size={12} />
                  PO: {grn.poNumber || grn.purchaseOrderId?.poNumber}
                </div>
              ) : (
                <div className="mt-2.5 inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  Direct Receipt (No PO)
                </div>
              )}
            </div>

            {/* Warehouse / Location */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                <MapPin size={14} /> Warehouse
              </div>
              <p className="font-semibold text-gray-900">{grn.warehouseId?.name || "—"}</p>
              {grn.warehouseId?.warehouseCode && (
                <p className="text-xs text-gray-500 mt-0.5">Code: {grn.warehouseId.warehouseCode}</p>
              )}
              {grn.receivedBy && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-600">
                  <User size={13} className="text-gray-400" />
                  Received by: {grn.receivedBy.firstName} {grn.receivedBy.lastName}
                </div>
              )}
            </div>

            {/* Delivery & Logistics */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                <Truck size={14} /> Delivery & Transport
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <div>
                  <span className="text-gray-400">Delivery Note #:</span>{" "}
                  <span className="font-medium text-gray-800">{grn.supplierDeliveryNoteNumber || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400">Supplier Invoice #:</span>{" "}
                  <span className="font-medium text-gray-800">{grn.supplierInvoiceNumber || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400">Vehicle:</span>{" "}
                  <span className="font-medium text-gray-800">{grn.vehicleNumber || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400">Driver / Transporter:</span>{" "}
                  <span className="font-medium text-gray-800">
                    {[grn.driverName, grn.transportCompany].filter(Boolean).join(" / ") || "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Received Items Table */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Received Items</h4>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2.5">#</th>
                    <th className="px-3 py-2.5">Product</th>
                    <th className="px-3 py-2.5">Batch / Expiry</th>
                    <th className="px-3 py-2.5 text-right">Received</th>
                    <th className="px-3 py-2.5 text-right">Accepted</th>
                    <th className="px-3 py-2.5 text-right">Rejected</th>
                    <th className="px-3 py-2.5 text-right">Free</th>
                    <th className="px-3 py-2.5 text-right">Unit Price</th>
                    <th className="px-3 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {grn.items?.map((item, index) => {
                    const lineTotal = (item.acceptedQuantity || 0) * (item.unitPrice || 0);
                    const discount = item.discountAmount || (lineTotal * (item.discountPercent || 0)) / 100;
                    const finalTotal = Math.max(0, lineTotal - discount);

                    return (
                      <tr key={item._id || index} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2.5 text-xs text-gray-400">{index + 1}</td>
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-gray-900">{item.productName || item.productId?.name}</p>
                          <p className="text-xs text-gray-500 font-mono">
                            {item.productCode || item.productId?.productCode || ""}
                          </p>
                          {item.rejectionReason && (
                            <p className="mt-0.5 text-xs text-red-600 font-medium">
                              Rejection: {item.rejectionReason}
                            </p>
                          )}
                          {item.notes && <p className="text-xs text-gray-400 italic">{item.notes}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          {item.batchNumber ? (
                            <span className="font-mono font-medium text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                              {item.batchNumber}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                          {item.expiryDate && (
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              Exp: {new Date(item.expiryDate).toLocaleDateString("en-LK")}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-gray-700">
                          {item.receivedQuantity} {item.unitOfMeasure || ""}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">
                          {item.acceptedQuantity}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {item.rejectedQuantity > 0 ? (
                            <span className="font-semibold text-red-600">{item.rejectedQuantity}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-600">
                          {item.freeQuantity || 0}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs">
                          {money(item.unitPrice)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-900">
                          {money(finalTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes and Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Notes & Remarks</h5>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{grn.notes || "No notes entered."}</p>

              {grn.hasDiscrepancy && grn.discrepancyNotes && (
                <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                  <div className="flex items-center gap-1 font-semibold">
                    <AlertCircle size={14} /> Discrepancy Note
                  </div>
                  <p className="mt-0.5">{grn.discrepancyNotes}</p>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Gross Received Value:</span>
                  <span className="font-mono font-medium">{money(grn.totalReceivedValue)}</span>
                </div>
                {grn.billDiscountPercent > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Bill Discount ({grn.billDiscountPercent}%):</span>
                    <span className="font-mono text-red-600">
                      -{money((grn.totalReceivedValue * grn.billDiscountPercent) / 100)}
                    </span>
                  </div>
                )}
                {grn.billDiscountAmount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Discount Amount:</span>
                    <span className="font-mono text-red-600">-{money(grn.billDiscountAmount)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center text-base font-bold text-gray-900">
                  <span>Total Accepted Value:</span>
                  <span className="font-mono text-emerald-700 text-lg">{money(grn.totalAcceptedValue)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
