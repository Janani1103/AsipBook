import "server-only";
import mongoose from "mongoose";
import CustomerReturn from "../models/CustomerReturn.js";
import Customer from "../models/Customer.js";
import Product from "../models/Product.js";
import Invoice from "../models/Invoice.js";
import DamageRecord from "../models/DamageRecord.js";
import CreditNote from "../models/CreditNote.js";
import Payment from "../models/Payment.js";
import PosSession from "../models/PosSession.js";
import { increaseStock } from "./stockService.js";
import { updateCustomerBalance } from "./invoiceApiService.js";

/**
 * Process an immediate POS Customer Return (Pure Return or Refund)
 */
export async function processPosDirectReturn(req, res) {
  const { invoiceId, warehouseId, items, refundMethod = "cash", notes } = req.body;

  if (!items || !items.length) {
    res.status(400);
    throw new Error("No items provided for return");
  }

  if (!warehouseId) {
    res.status(400);
    throw new Error("Return warehouse is required");
  }

  const invoice = invoiceId ? await Invoice.findById(invoiceId) : null;
  const customerId = invoice ? invoice.customerId : req.body.customerId;

  if (!customerId) {
    res.status(400);
    throw new Error("Customer information is required for return");
  }

  const customer = await Customer.findById(customerId);
  if (!customer) {
    res.status(404);
    throw new Error("Customer not found");
  }

  const productIds = items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const enrichedItems = [];
  let totalReturnValue = 0;

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const product = productMap.get(item.productId.toString());
    if (!product) {
      res.status(400);
      throw new Error(`Product ${item.productId} not found`);
    }

    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unitPrice ?? product.basePrice) || 0;
    const condition = item.condition === "damaged" ? "damaged" : "resellable";
    const disposition = condition === "resellable" ? "restock" : "scrap";
    const lineTotal = +(qty * unitPrice).toFixed(2);
    totalReturnValue += lineTotal;

    enrichedItems.push({
      lineNumber: idx + 1,
      productId: product._id,
      productCode: product.productCode,
      productName: product.name,
      quantityReturned: qty,
      unitOfMeasure: product.unitOfMeasure,
      unitPrice,
      refundAmount: lineTotal,
      refundable: true,
      reason: item.reason || "customer_changed_mind",
      reasonDescription: item.reasonDescription || "",
      condition,
      disposition,
      invoiceId: invoice?._id,
      salesOrderId: invoice?.salesOrderIds?.[0],
    });
  }

  totalReturnValue = +totalReturnValue.toFixed(2);

  // 1. Create completed CustomerReturn document
  const customerReturn = new CustomerReturn({
    customerId: customer._id,
    customerSnapshot: {
      name: customer.displayName,
      code: customer.customerCode,
      phone: customer.primaryContact?.phone,
    },
    salesOrderIds: invoice?.salesOrderIds || [],
    invoiceIds: invoice ? [invoice._id] : [],
    requestDate: new Date(),
    receivedDate: new Date(),
    completedDate: new Date(),
    items: enrichedItems,
    totalReturnValue,
    totalRefundAmount: totalReturnValue,
    netRefundAmount: totalReturnValue,
    status: "completed",
    returnToWarehouseId: warehouseId,
    receivedBy: req.user._id,
    inspectedBy: req.user._id,
    approvedBy: req.user._id,
    approvedAt: new Date(),
    refundMethod: refundMethod === "store_credit" ? "credit_note" : "cash_refund",
    customerNotes: notes,
    internalNotes: `Processed at POS Terminal by ${req.user.firstName || req.user.email}`,
    createdBy: req.user._id,
  });

  await customerReturn.save();

  // 2. Adjust Stock or Log Damage for each item
  for (const item of customerReturn.items) {
    if (item.disposition === "restock") {
      const product = productMap.get(item.productId.toString());
      const restockResult = await increaseStock({
        productId: item.productId,
        warehouseId,
        quantity: item.quantityReturned,
        costPerUnit: product?.costs?.averageCost || product?.costs?.lastPurchaseCost || item.unitPrice,
        movementType: "sale_return",
        sourceDocument: {
          type: "customer_return",
          id: customerReturn._id,
          number: customerReturn.rmaNumber,
        },
        reason: `POS Return Restock (${customerReturn.rmaNumber})`,
        userId: req.user._id,
      });
      item.stockMovementId = restockResult.movement._id;
      item.restockedAt = new Date();
      item.restockedToWarehouseId = warehouseId;
    } else if (item.disposition === "scrap") {
      const damage = new DamageRecord({
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        quantity: item.quantityReturned,
        unitOfMeasure: item.unitOfMeasure,
        costPerUnit: item.unitPrice,
        warehouseId,
        source: "customer_return",
        sourceDocument: {
          type: "customer_return",
          id: customerReturn._id,
          number: customerReturn.rmaNumber,
        },
        description: item.reasonDescription || `Damaged return at POS (${customerReturn.rmaNumber})`,
        disposition: "scrap",
        reportedBy: req.user._id,
        approvedBy: req.user._id,
        approvedAt: new Date(),
      });
      await damage.save();
      item.damageRecordId = damage._id;
    }
  }
  await customerReturn.save();

  // 3. Handle Settlement
  if (refundMethod === "cash") {
    // Deduct cash from active cashier POS session
    const activeSession = await PosSession.findOne({ userId: req.user._id, status: "open" });
    if (activeSession) {
      activeSession.cashExpenses = +(activeSession.cashExpenses + totalReturnValue).toFixed(2);
      await activeSession.save();
    }

    // Record Payment paid out
    const payment = new Payment({
      direction: "paid",
      customerId: customer._id,
      partyName: customer.displayName,
      amount: totalReturnValue,
      method: "cash",
      status: "cleared",
      receivedBy: req.user._id,
      createdBy: req.user._id,
      notes: `POS Cash Refund for Return ${customerReturn.rmaNumber}`,
    });
    await payment.save();
    customerReturn.refundPaymentId = payment._id;
    await customerReturn.save();
  } else if (refundMethod === "store_credit") {
    // Add to customer's store credit balance
    await Customer.findByIdAndUpdate(customer._id, {
      $inc: { "creditStatus.storeCredit": totalReturnValue },
    });

    // Create Credit Note
    const creditNote = new CreditNote({
      customerId: customer._id,
      customerSnapshot: {
        name: customer.displayName,
        code: customer.customerCode,
      },
      amount: totalReturnValue,
      reason: "return",
      description: `POS Return store credit for ${customerReturn.rmaNumber}`,
      customerReturnId: customerReturn._id,
      invoiceId: invoice?._id,
      createdBy: req.user._id,
    });
    await creditNote.save();
    customerReturn.creditNoteId = creditNote._id;
    await customerReturn.save();
    await updateCustomerBalance(customer._id);
  }

  res.status(200).json({
    success: true,
    message: "Return processed successfully",
    data: {
      rmaNumber: customerReturn.rmaNumber,
      returnId: customerReturn._id,
      refundMethod,
      totalRefundAmount: totalReturnValue,
      itemsCount: customerReturn.items.length,
    },
  });
}
