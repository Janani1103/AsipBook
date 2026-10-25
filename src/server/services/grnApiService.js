import "server-only";
import mongoose from "mongoose";
import GoodsReceiptNote from "../models/GoodsReceiptNote.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import Product from "../models/Product.js";
import DamageRecord from "../models/DamageRecord.js";
import { increaseStock, decreaseStock } from "./stockService.js";
import { calculateExpiryDate } from "./fefoService.js";
import { generateBillForGrn } from "./billApiService.js";

function listPopulate(query) {
  return query.populate("purchaseOrderId", "poNumber").populate("supplierId", "displayName supplierCode").populate("warehouseId", "name warehouseCode");
}

export async function createGrn(req, res) {
  const { purchaseOrderId, supplierId, warehouseId, items, ...rest } = req.body;
  let po = null;
  if (purchaseOrderId) {
    po = await PurchaseOrder.findById(purchaseOrderId);
    if (!po) { res.status(404); throw new Error("Purchase order not found"); }
    if (!["approved", "sent", "partially_received"].includes(po.status)) { res.status(400); throw new Error(`Cannot receive against PO with status '${po.status}'`); }
  }
  if (!po && !supplierId) { res.status(400); throw new Error("Supplier ID is required for GRN without Purchase Order"); }
  const poItems = po ? new Map(po.items.map((item) => [item._id.toString(), item])) : null;

  try {
    const productIds = items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productsById = new Map(products.map((p) => [p._id.toString(), p]));

    const grnItems = items.map((item) => {
      const poLine = po && item.poLineItemId ? poItems.get(item.poLineItemId) : null;
      const product = productsById.get(item.productId.toString());

      let calculatedExpiryDate = item.expiryDate;
      if (product?.expiryTracking?.trackExpiry && item.manufactureDate && !item.expiryDate) {
        calculatedExpiryDate = calculateExpiryDate(
          item.manufactureDate,
          product.expiryTracking.expiryType,
          product.expiryTracking.customExpiryDays || product.expiryTracking.shelfLifeDays
        );
      }

      return {
        poLineItemId: item.poLineItemId,
        productId: item.productId,
        productCode: item.productCode || poLine?.productCode || "",
        productName: item.productName || poLine?.productName || "",
        orderedQuantity: poLine?.orderedQuantity || 0,
        receivedQuantity: item.receivedQuantity,
        acceptedQuantity: item.acceptedQuantity ?? item.receivedQuantity,
        rejectedQuantity: item.rejectedQuantity || 0,
        damagedQuantity: item.damagedQuantity || 0,
        discountPercent: item.discountPercent || 0,
        discountAmount: item.discountAmount || 0,
        freeQuantity: item.freeQuantity || 0,
        unitOfMeasure: item.unitOfMeasure || poLine?.unitOfMeasure || "",
        unitPrice: item.unitPrice || poLine?.unitPrice || 0,
        batchNumber: item.batchNumber || null,
        manufactureDate: item.manufactureDate || null,
        expiryDate: calculatedExpiryDate || null,
        rejectionReason: item.rejectionReason,
        notes: item.notes,
        qcStatus: item.rejectionReason || item.rejectedQuantity > 0 ? "failed" : "not_required",
      };
    });

    const grn = new GoodsReceiptNote({
      purchaseOrderId: po?._id,
      poNumber: po?.poNumber,
      supplierId: po?.supplierId || supplierId,
      supplierName: po?.supplierSnapshot?.name || rest.supplierName,
      warehouseId,
      items: grnItems,
      status: "received",
      receivedBy: req.user._id,
      createdBy: req.user._id,
      ...rest,
    });
    await grn.save();

    const rawAcceptedValue = grn.items.reduce((sum, item) => {
      const lineTotal = (item.acceptedQuantity || item.receivedQuantity || 0) * item.unitPrice;
      return sum + Math.max(0, lineTotal - (item.discountAmount || lineTotal * (item.discountPercent || 0) / 100));
    }, 0);

    for (const item of grn.items) {
      const quantity = item.acceptedQuantity + (item.freeQuantity || 0);
      if (quantity > 0) {
        const lineTotal = item.acceptedQuantity * item.unitPrice;
        const rawCost = Math.max(0, lineTotal - (item.discountAmount || lineTotal * (item.discountPercent || 0) / 100));
        let finalCost = rawCost;
        if (grn.billDiscountPercent > 0) finalCost -= (rawCost * grn.billDiscountPercent) / 100;
        if (grn.billDiscountAmount > 0 && rawAcceptedValue > 0) finalCost -= grn.billDiscountAmount * (rawCost / rawAcceptedValue);
        const result = await increaseStock({
          productId: item.productId,
          warehouseId,
          quantity,
          costPerUnit: Math.max(0, finalCost) / quantity,
          movementType: "purchase_receipt",
          batchNumber: item.batchNumber || null,
          manufactureDate: item.manufactureDate || null,
          expiryDate: item.expiryDate || null,
          sourceDocument: { type: "purchase_receipt", id: grn._id, number: grn.grnNumber },
          reason: po ? `GRN against PO ${po.poNumber}` : "GRN (direct)",
          userId: req.user._id,
        });
        item.stockMovementId = result.movement._id;
      }

      if (item.damagedQuantity > 0) {
        await DamageRecord.create([{
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          quantity: item.damagedQuantity,
          unitOfMeasure: item.unitOfMeasure,
          costPerUnit: item.unitPrice || 0,
          warehouseId,
          source: "supplier_delivery",
          disposition: "return_to_supplier",
          sourceDocument: { type: "goods_receipt_note", id: grn._id, number: grn.grnNumber },
          description: `Damaged on arrival from GRN ${grn.grnNumber}${item.batchNumber ? ` (Batch ${item.batchNumber})` : ""}`,
          reportedBy: req.user._id,
        }]);
      }
    }

    await grn.save();

    if (po) {
      for (const item of grn.items) {
        if (!item.poLineItemId) continue;
        const poLine = po.items.id(item.poLineItemId);
        if (poLine) poLine.receivedQuantity = (poLine.receivedQuantity || 0) + item.acceptedQuantity;
      }
      po.grns = [...(po.grns || []), grn._id];
      // PO status (partially_received / fully_received) is auto-updated by the PurchaseOrder pre-save hook
      await po.save();
    }

    try {
      await generateBillForGrn(grn, req.user._id);
    } catch (billErr) {
      console.error("Auto bill creation error:", billErr);
    }

    res.status(201).json({
      success: true,
      message: "Goods received and stock updated",
      data: await listPopulate(GoodsReceiptNote.findById(grn._id)).populate("items.productId", "name productCode"),
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message || "Failed to create GRN");
  }
}

export async function getGrns(req, res) {
  const { search, purchaseOrderId, supplierId, warehouseId, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (search) filter.grnNumber = { $regex: search, $options: "i" };
  if (purchaseOrderId) filter.purchaseOrderId = purchaseOrderId;
  if (supplierId) filter.supplierId = supplierId;
  if (warehouseId) filter.warehouseId = warehouseId;
  if (status) filter.status = status;
  const [grns, total] = await Promise.all([listPopulate(GoodsReceiptNote.find(filter)).sort({ receiptDate: -1 }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit)), GoodsReceiptNote.countDocuments(filter)]);
  res.json({ success: true, count: grns.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), data: grns });
}

export async function getGrnById(req, res) {
  const grn = await GoodsReceiptNote.findById(req.params.id)
    .populate("purchaseOrderId", "poNumber poDate status")
    .populate("supplierId", "displayName supplierCode")
    .populate("warehouseId", "name warehouseCode")
    .populate("items.productId", "name productCode unitOfMeasure")
    .populate("items.stockMovementId", "movementNumber")
    .populate("receivedBy", "firstName lastName")
    .populate("createdBy", "firstName lastName");
  if (!grn) { res.status(404); throw new Error("GRN not found"); }
  res.json({ success: true, data: grn });
}

export async function updateGrn(req, res) {
  const grn = await GoodsReceiptNote.findById(req.params.id);
  if (!grn) {
    res.status(404);
    throw new Error("GRN not found");
  }
  if (grn.status === "cancelled") {
    res.status(400);
    throw new Error("Cannot edit cancelled GRN");
  }

  const {
    supplierDeliveryNoteNumber,
    supplierInvoiceNumber,
    vehicleNumber,
    driverName,
    transportCompany,
    notes,
    billDiscountPercent,
    billDiscountAmount,
    receiptDate,
    items: updatedItems,
  } = req.body;

  if (supplierDeliveryNoteNumber !== undefined) grn.supplierDeliveryNoteNumber = supplierDeliveryNoteNumber;
  if (supplierInvoiceNumber !== undefined) grn.supplierInvoiceNumber = supplierInvoiceNumber;
  if (vehicleNumber !== undefined) grn.vehicleNumber = vehicleNumber;
  if (driverName !== undefined) grn.driverName = driverName;
  if (transportCompany !== undefined) grn.transportCompany = transportCompany;
  if (notes !== undefined) grn.notes = notes;
  if (billDiscountPercent !== undefined) grn.billDiscountPercent = +billDiscountPercent || 0;
  if (billDiscountAmount !== undefined) grn.billDiscountAmount = +billDiscountAmount || 0;
  if (receiptDate !== undefined) grn.receiptDate = new Date(receiptDate);

  let po = null;
  if (grn.purchaseOrderId) {
    po = await PurchaseOrder.findById(grn.purchaseOrderId);
  }

  if (updatedItems && Array.isArray(updatedItems)) {
    for (const itemUpdate of updatedItems) {
      const grnItem = grn.items.find(
        (it) => (itemUpdate._id && it._id?.toString() === itemUpdate._id.toString()) ||
                (itemUpdate.poLineItemId && it.poLineItemId?.toString() === itemUpdate.poLineItemId.toString()) ||
                (it.productId?.toString() === itemUpdate.productId?.toString())
      );

      if (!grnItem) continue;

      const oldAccepted = +(grnItem.acceptedQuantity ?? grnItem.receivedQuantity ?? 0);
      const newReceived = itemUpdate.receivedQuantity !== undefined ? +itemUpdate.receivedQuantity : grnItem.receivedQuantity;
      const newRejected = itemUpdate.rejectedQuantity !== undefined ? +itemUpdate.rejectedQuantity : grnItem.rejectedQuantity;
      const newAccepted = itemUpdate.acceptedQuantity !== undefined ? +itemUpdate.acceptedQuantity : Math.max(0, newReceived - newRejected);
      const diff = newAccepted - oldAccepted;

      if (diff !== 0) {
        if (diff > 0) {
          await increaseStock({
            productId: grnItem.productId,
            warehouseId: grn.warehouseId,
            quantity: diff,
            costPerUnit: grnItem.unitPrice || 0,
            movementType: "purchase_receipt",
            batchNumber: itemUpdate.batchNumber || grnItem.batchNumber || null,
            expiryDate: itemUpdate.expiryDate || grnItem.expiryDate || null,
            sourceDocument: { type: "purchase_receipt", id: grn._id, number: grn.grnNumber },
            reason: `GRN ${grn.grnNumber} quantity adjustment`,
            userId: req.user._id,
          });
        } else {
          await decreaseStock({
            productId: grnItem.productId,
            warehouseId: grn.warehouseId,
            quantity: Math.abs(diff),
            movementType: "adjustment_out",
            batchNumber: grnItem.batchNumber || null,
            sourceDocument: { type: "purchase_receipt", id: grn._id, number: grn.grnNumber },
            reason: `GRN ${grn.grnNumber} quantity adjustment`,
            userId: req.user._id,
          });
        }

        if (po && grnItem.poLineItemId) {
          const poLine = po.items.id(grnItem.poLineItemId);
          if (poLine) {
            poLine.receivedQuantity = Math.max(0, (poLine.receivedQuantity || 0) + diff);
          }
        }
      }

      grnItem.receivedQuantity = newReceived;
      grnItem.acceptedQuantity = newAccepted;
      grnItem.rejectedQuantity = newRejected;
      if (itemUpdate.freeQuantity !== undefined) grnItem.freeQuantity = +itemUpdate.freeQuantity;
      if (itemUpdate.discountPercent !== undefined) grnItem.discountPercent = +itemUpdate.discountPercent;
      if (itemUpdate.discountAmount !== undefined) grnItem.discountAmount = +itemUpdate.discountAmount;
      if (itemUpdate.batchNumber !== undefined) grnItem.batchNumber = itemUpdate.batchNumber;
      if (itemUpdate.expiryDate !== undefined) grnItem.expiryDate = itemUpdate.expiryDate ? new Date(itemUpdate.expiryDate) : null;
      if (itemUpdate.manufactureDate !== undefined) grnItem.manufactureDate = itemUpdate.manufactureDate ? new Date(itemUpdate.manufactureDate) : null;
      if (itemUpdate.rejectionReason !== undefined) grnItem.rejectionReason = itemUpdate.rejectionReason;
      if (itemUpdate.notes !== undefined) grnItem.notes = itemUpdate.notes;
    }
  }

  await grn.save();
  if (po) await po.save();

  try {
    const Bill = (await import("../models/Bill.js")).default;
    const bill = await Bill.findOne({ grnIds: grn._id, paymentStatus: "unpaid" });
    if (bill) {
      bill.items = (grn.items || []).filter((it) => (it.acceptedQuantity || 0) > 0).map((item) => ({
        productId: item.productId,
        productCode: item.productCode || "",
        productName: item.productName || "Item",
        quantity: item.acceptedQuantity,
        unitOfMeasure: item.unitOfMeasure || "",
        unitPrice: item.unitPrice || 0,
        discountPercent: item.discountPercent || 0,
        discountAmount: item.discountAmount || 0,
        taxRate: 0,
        taxable: false,
        grnLineItemId: item._id,
      }));
      bill.globalDiscountPercent = grn.billDiscountPercent || 0;
      bill.globalDiscountAmount = grn.billDiscountAmount || 0;
      if (grn.supplierInvoiceNumber) bill.supplierInvoiceNumber = grn.supplierInvoiceNumber;
      await bill.save();
    }
  } catch (syncErr) {
    console.error("Bill update sync error:", syncErr);
  }

  res.json({
    success: true,
    message: "GRN updated successfully",
    data: await listPopulate(GoodsReceiptNote.findById(grn._id)).populate("items.productId", "name productCode unitOfMeasure"),
  });
}

export async function cancelGrn(req, res) {
  try {
    const grn = await GoodsReceiptNote.findById(req.params.id);
    if (!grn) { res.status(404); throw new Error("GRN not found"); }
    if (grn.status === "cancelled") { res.status(400); throw new Error("GRN already cancelled"); }

    for (const item of grn.items) {
      const quantity = item.acceptedQuantity + (item.freeQuantity || 0);
      if (quantity <= 0) continue;
      await decreaseStock({
        productId: item.productId,
        warehouseId: grn.warehouseId,
        quantity,
        movementType: "adjustment_out",
        batchNumber: item.batchNumber || null,
        sourceDocument: { type: "grn_cancellation", id: grn._id, number: grn.grnNumber },
        reason: `Cancellation of GRN ${grn.grnNumber}`,
        userId: req.user._id,
      });
    }

    if (grn.purchaseOrderId) {
      const po = await PurchaseOrder.findById(grn.purchaseOrderId);
      if (po) {
        for (const item of grn.items) {
          const poLine = item.poLineItemId && po.items.id(item.poLineItemId);
          if (poLine) {
            poLine.receivedQuantity = Math.max(0, (poLine.receivedQuantity || 0) - item.acceptedQuantity);
          }
        }
        await po.save();
      }
    }

    grn.status = "cancelled";
    grn.cancelledAt = new Date();
    grn.cancelledBy = req.user._id;
    await grn.save();

    try {
      const Bill = (await import("../models/Bill.js")).default;
      await Bill.updateMany(
        { grnIds: grn._id, paymentStatus: "unpaid" },
        { status: "cancelled", paymentStatus: "cancelled", cancellationReason: `GRN ${grn.grnNumber} was cancelled` }
      );
    } catch (cancelBillErr) {
      console.error("Bill cancellation sync error:", cancelBillErr);
    }

    res.json({ success: true, message: "GRN cancelled and stock reversed" });
  } catch (error) {
    res.status(400);
    throw new Error(error.message || "Failed to cancel GRN");
  }
}
