import "server-only";
import Bill from "../models/Bill.js";
import GoodsReceiptNote from "../models/GoodsReceiptNote.js";
import Product from "../models/Product.js";
import "../models/PurchaseOrder.js";
import Supplier from "../models/Supplier.js";

export async function generateBillForGrn(grn, userId) {
  if (!grn || grn.status === "cancelled" || !grn.supplierId) return null;
  const existingBill = await Bill.findOne({ grnIds: grn._id, status: { $ne: "cancelled" } });
  if (existingBill) return existingBill;

  const supplier = await Supplier.findById(grn.supplierId);
  if (!supplier) return null;

  const billItems = [];
  for (const item of grn.items || []) {
    if ((item.acceptedQuantity || 0) <= 0) continue;
    let pName = item.productName;
    let pCode = item.productCode;
    let pUom = item.unitOfMeasure;
    if (!pName || !pCode) {
      const prod = await Product.findById(item.productId);
      if (prod) {
        pName = pName || prod.name;
        pCode = pCode || prod.productCode;
        pUom = pUom || prod.unitOfMeasure;
      }
    }
    billItems.push({
      productId: item.productId,
      productCode: pCode || "",
      productName: pName || "Item",
      quantity: item.acceptedQuantity,
      unitOfMeasure: pUom || "",
      unitPrice: item.unitPrice || 0,
      discountPercent: item.discountPercent || 0,
      discountAmount: item.discountAmount || 0,
      taxRate: 0,
      taxable: false,
      grnLineItemId: item._id,
    });
  }

  if (billItems.length === 0) return null;

  const date = new Date(grn.receiptDate || Date.now());
  const dueDate = new Date(date);
  if (supplier.paymentTerms?.type === "credit") {
    dueDate.setDate(dueDate.getDate() + (supplier.paymentTerms.creditDays || 0));
  }

  const bill = new Bill({
    supplierId: supplier._id,
    supplierSnapshot: {
      name: supplier.displayName,
      code: supplier.supplierCode,
      taxRegistrationNumber: supplier.taxRegistrationNumber,
    },
    supplierInvoiceNumber: grn.supplierInvoiceNumber || grn.supplierDeliveryNoteNumber || undefined,
    purchaseOrderIds: grn.purchaseOrderId ? [grn.purchaseOrderId] : [],
    purchaseOrderNumbers: grn.poNumber ? [grn.poNumber] : [],
    grnIds: [grn._id],
    grnNumbers: [grn.grnNumber],
    billDate: grn.receiptDate || new Date(),
    dueDate: supplier.paymentTerms?.type === "credit" ? dueDate : undefined,
    paymentTerms: {
      type: supplier.paymentTerms?.type || "credit",
      creditDays: supplier.paymentTerms?.creditDays || 0,
    },
    globalDiscountPercent: grn.billDiscountPercent || 0,
    globalDiscountAmount: grn.billDiscountAmount || 0,
    items: billItems,
    notes: grn.notes || undefined,
    approvedBy: userId || grn.receivedBy || grn.createdBy,
    approvedAt: new Date(),
    createdBy: userId || grn.createdBy,
  });

  await bill.save();
  return bill;
}

export async function syncUnbilledGrns() {
  try {
    const unbilledGrns = await GoodsReceiptNote.find({ status: "received", deletedAt: null });
    for (const grn of unbilledGrns) {
      await generateBillForGrn(grn);
    }
  } catch (err) {
    console.error("Failed to sync unbilled GRNs:", err);
  }
}


export async function createBill(req, res) {
  const { supplierId, items, dueDate, ...rest } = req.body;
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    res.status(404);
    throw new Error("Supplier not found");
  }

  let finalDueDate = dueDate;
  if (!finalDueDate && supplier.paymentTerms?.type === "credit") {
    const date = new Date(rest.billDate || Date.now());
    date.setDate(date.getDate() + (supplier.paymentTerms.creditDays || 0));
    finalDueDate = date;
  }

  const bill = new Bill({
    supplierId: supplier._id,
    supplierSnapshot: {
      name: supplier.displayName,
      code: supplier.supplierCode,
      taxRegistrationNumber: supplier.taxRegistrationNumber,
    },
    paymentTerms: {
      type: supplier.paymentTerms?.type || "credit",
      creditDays: supplier.paymentTerms?.creditDays || 0,
    },
    dueDate: finalDueDate,
    items,
    ...rest,
    approvedBy: req.user._id,
    approvedAt: new Date(),
    createdBy: req.user._id,
  });
  await bill.save();
  const populated = await Bill.findById(bill._id).populate("supplierId", "displayName supplierCode");
  res.status(201).json({ success: true, data: populated });
}

export async function createFromGrn(req, res) {
  const { grnIds, supplierInvoiceNumber, billDate, notes, globalDiscountPercent, globalDiscountAmount } = req.body;
  const grns = await GoodsReceiptNote.find({ _id: { $in: grnIds } })
    .populate("supplierId")
    .populate("purchaseOrderId");
  if (grns.length === 0) {
    res.status(400);
    throw new Error("No GRNs found");
  }

  const supplierIds = [...new Set(grns.map((grn) => grn.supplierId._id.toString()))];
  if (supplierIds.length > 1) {
    res.status(400);
    throw new Error("All GRNs must belong to the same supplier");
  }
  const supplier = grns[0].supplierId;
  const billItems = [];
  grns.forEach((grn) => {
    grn.items.forEach((item) => {
      if (item.acceptedQuantity <= 0) return;
      billItems.push({
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        quantity: item.acceptedQuantity,
        unitOfMeasure: item.unitOfMeasure,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent || 0,
        discountAmount: item.discountAmount || 0,
        taxRate: 18,
        taxable: true,
        grnLineItemId: item._id,
      });
    });
  });

  const date = new Date(billDate || Date.now());
  if (supplier.paymentTerms?.type === "credit") date.setDate(date.getDate() + (supplier.paymentTerms.creditDays || 0));

  let finalGlobalDiscountPercent = globalDiscountPercent;
  let finalGlobalDiscountAmount = globalDiscountAmount;
  if (finalGlobalDiscountPercent === undefined && finalGlobalDiscountAmount === undefined) {
    if (grns.length === 1) {
      finalGlobalDiscountPercent = grns[0].billDiscountPercent || 0;
      finalGlobalDiscountAmount = grns[0].billDiscountAmount || 0;
    } else {
      finalGlobalDiscountAmount = grns.reduce((sum, grn) => sum + (grn.billDiscountAmount || 0), 0);
      finalGlobalDiscountPercent = 0;
    }
  }

  const bill = new Bill({
    supplierId: supplier._id,
    supplierSnapshot: { name: supplier.displayName, code: supplier.supplierCode, taxRegistrationNumber: supplier.taxRegistrationNumber },
    supplierInvoiceNumber,
    purchaseOrderIds: [...new Set(grns.map((grn) => grn.purchaseOrderId?._id).filter(Boolean))],
    purchaseOrderNumbers: [...new Set(grns.map((grn) => grn.poNumber).filter(Boolean))],
    grnIds: grns.map((grn) => grn._id),
    grnNumbers: grns.map((grn) => grn.grnNumber),
    billDate: billDate || new Date(),
    dueDate: supplier.paymentTerms?.type === "credit" ? date : undefined,
    paymentTerms: { type: supplier.paymentTerms?.type || "credit", creditDays: supplier.paymentTerms?.creditDays || 0 },
    globalDiscountPercent: finalGlobalDiscountPercent || 0,
    globalDiscountAmount: finalGlobalDiscountAmount || 0,
    items: billItems,
    notes,
    approvedBy: req.user._id,
    approvedAt: new Date(),
    createdBy: req.user._id,
  });
  await bill.save();
  const populated = await Bill.findById(bill._id).populate("supplierId", "displayName supplierCode");
  res.status(201).json({ success: true, data: populated });
}

let lastBillAgingUpdate = null;

export async function updateBillAging(force = false) {
  const today = new Date().toDateString();
  if (!force && lastBillAgingUpdate === today) return;
  const bills = await Bill.find({ paymentStatus: { $in: ["unpaid", "partially_paid", "overdue"] }, deletedAt: null })
    .select("_id dueDate daysPastDue paymentStatus agingBucket");
  const now = new Date();
  const bulkOps = [];
  for (const bill of bills) {
    if (!bill.dueDate) continue;
    const daysPastDue = Math.max(0, Math.floor((now - new Date(bill.dueDate)) / (1000 * 60 * 60 * 24)));
    let paymentStatus = bill.paymentStatus;
    if (daysPastDue > 0 && bill.paymentStatus === "unpaid") paymentStatus = "overdue";
    let agingBucket = "current";
    if (daysPastDue <= 30 && daysPastDue > 0) agingBucket = "1_30";
    else if (daysPastDue <= 60 && daysPastDue > 0) agingBucket = "31_60";
    else if (daysPastDue <= 90 && daysPastDue > 0) agingBucket = "61_90";
    else if (daysPastDue > 90) agingBucket = "91_plus";
    if (bill.daysPastDue !== daysPastDue || bill.paymentStatus !== paymentStatus || bill.agingBucket !== agingBucket) {
      bulkOps.push({ updateOne: { filter: { _id: bill._id }, update: { $set: { daysPastDue, paymentStatus, agingBucket } } } });
    }
  }
  if (bulkOps.length > 0) await Bill.bulkWrite(bulkOps);
  lastBillAgingUpdate = today;
}

export async function getBills(req, res) {
  await syncUnbilledGrns();
  await updateBillAging();
  const { search, supplierId, paymentStatus, agingBucket, startDate, endDate, page = 1, limit = 20, sortBy = "billDate", sortOrder = "desc" } = req.query;
  const filter = {};
  if (search) filter.$or = [{ billNumber: { $regex: search, $options: "i" } }, { supplierInvoiceNumber: { $regex: search, $options: "i" } }, { "supplierSnapshot.name": { $regex: search, $options: "i" } }];
  if (supplierId) filter.supplierId = supplierId;
  if (paymentStatus) {
    const statuses = paymentStatus.split(",").map((status) => status.trim()).filter(Boolean);
    filter.paymentStatus = statuses.length > 1 ? { $in: statuses } : statuses[0];
  }
  if (agingBucket) filter.agingBucket = agingBucket;
  if (startDate || endDate) {
    filter.billDate = {};
    if (startDate) filter.billDate.$gte = new Date(startDate);
    if (endDate) filter.billDate.$lte = new Date(endDate);
  }
  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
  const [bills, total] = await Promise.all([
    Bill.find(filter).populate("supplierId", "displayName supplierCode").sort(sort).skip(skip).limit(Number(limit)),
    Bill.countDocuments(filter),
  ]);
  res.json({ success: true, count: bills.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), data: bills });
}

export async function getBillById(req, res) {
  const bill = await Bill.findById(req.params.id)
    .populate("supplierId", "displayName supplierCode taxRegistrationNumber paymentTerms bankDetails")
    .populate("purchaseOrderIds", "poNumber")
    .populate("grnIds", "grnNumber receiptDate")
    .populate("approvedBy", "firstName lastName")
    .populate("cancelledBy", "firstName lastName");
  if (!bill) {
    res.status(404);
    throw new Error("Bill not found");
  }
  res.json({ success: true, data: bill });
}

export async function getPayablesAging(req, res) {
  await syncUnbilledGrns();
  await updateBillAging();

  const aggregation = await Bill.aggregate([
    { $match: { paymentStatus: { $in: ["unpaid", "partially_paid", "overdue"] }, deletedAt: null } },
    { $group: { _id: "$agingBucket", count: { $sum: 1 }, total: { $sum: "$balanceDue" } } },
  ]);
  const buckets = { current: 0, "1_30": 0, "31_60": 0, "61_90": 0, "91_plus": 0 };
  const counts = { ...buckets };
  aggregation.forEach((result) => {
    if (result._id in buckets) {
      buckets[result._id] = result.total;
      counts[result._id] = result.count;
    }
  });
  res.json({ success: true, data: { buckets, counts, totalPayable: Object.values(buckets).reduce((sum, value) => sum + value, 0) } });
}

export async function changeBillStatus(req, res) {
  const { status, reason } = req.body;
  const bill = await Bill.findById(req.params.id);
  if (!bill) {
    res.status(404);
    throw new Error("Bill not found");
  }
  bill.status = status;
  if (status === "cancelled") {
    bill.cancelledBy = req.user._id;
    bill.cancelledAt = new Date();
    bill.cancellationReason = reason;
    bill.paymentStatus = "cancelled";
  }
  if (status === "disputed") {
    bill.paymentStatus = "disputed";
    bill.disputeReason = reason;
  }
  await bill.save();
  res.json({ success: true, data: bill });
}
