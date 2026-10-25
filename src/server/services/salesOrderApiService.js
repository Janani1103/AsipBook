import "server-only";
import mongoose from "mongoose";
import SalesOrder from "../models/SalesOrder.js";
import Customer from "../models/Customer.js";
import Product from "../models/Product.js";
import Warehouse from "../models/Warehouse.js";
import StockItem from "../models/StockItem.js";
import PromoCode from "../models/PromoCode.js";
import GiftVoucher from "../models/GiftVoucher.js";
import CustomerReturn from "../models/CustomerReturn.js";
import DamageRecord from "../models/DamageRecord.js";
import { decreaseStock, decreaseStockWithFEFO, increaseStock } from "./stockService.js";
import { generateInvoiceFromOrders, updateCustomerBalance } from "./invoiceApiService.js";

const populatedOrder = (id) => SalesOrder.findById(id)
  .populate("customerId", "displayName customerCode")
  .populate("salesRepId", "firstName lastName")
  .populate("items.productId", "name productCode");

export async function createSalesOrder(req, res) {
  const { customerId, items, returnItems = [], refundToCustomer = 0, shippingAddressLabel, creditOverride, creditOverrideReason, ...rest } = req.body;
  const customer = await Customer.findById(customerId).populate("customerGroupId");
  if (!customer) { res.status(404); throw new Error("Customer not found"); }
  let warehouse = null;
  if (req.body.sourceWarehouseId) {
    warehouse = await Warehouse.findById(req.body.sourceWarehouseId);
    if (!warehouse) { res.status(404); throw new Error("Warehouse not found"); }
  } else if (req.user.role === "sales_rep") {
    warehouse = await Warehouse.findOne({ warehouseManager: req.user._id, isActive: true });
    if (!warehouse) warehouse = await Warehouse.findOne({ isDefault: true, isActive: true });
  } else warehouse = await Warehouse.findOne({ isDefault: true, isActive: true });
  if (customer.creditStatus?.onCreditHold && !creditOverride) { res.status(400); throw new Error(`Customer is on credit hold: ${customer.creditStatus.creditHoldReason || "No reason provided"}`); }
  if (customer.status === "blacklisted") { res.status(400); throw new Error("Cannot create order for blacklisted customer"); }
  const products = await Product.find({ _id: { $in: items.map((item) => item.productId) }, status: "active" });
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));
  const enrichedItems = [];
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) { res.status(400); throw new Error(`Product ${item.productId} not found or inactive`); }
    enrichedItems.push({ productId: product._id, productCode: product.productCode, productName: product.name, orderedQuantity: item.orderedQuantity, unitOfMeasure: product.unitOfMeasure, listPrice: product.basePrice, unitPrice: item.unitPrice ?? product.basePrice, discountPercent: item.discountPercent || 0, discountAmount: item.discountAmount || 0, taxRate: item.taxRate ?? (product.tax?.taxRate || 0), taxable: item.taxable ?? (product.tax?.taxable ?? true), notes: item.notes });
  }
  const billingAddress = customer.billingAddress?.toObject?.() || customer.billingAddress;
  let shippingAddress = billingAddress;
  if (shippingAddressLabel && customer.shippingAddresses?.length) {
    const match = customer.shippingAddresses.find((address) => address.label === shippingAddressLabel);
    if (match) shippingAddress = match.toObject?.() || match;
  } else if (customer.shippingAddresses?.length) {
    const defaultAddress = customer.shippingAddresses.find((address) => address.isDefault) || customer.shippingAddresses[0];
    if (defaultAddress) shippingAddress = defaultAddress.toObject?.() || defaultAddress;
  }
  const isExchange = Boolean(returnItems && returnItems.length > 0);
  const exchangeReturnItems = (returnItems || []).map((r) => ({
    productId: r.productId,
    productCode: r.productCode || "",
    productName: r.productName || r.name || "Returned Product",
    quantity: Number(r.quantity || r.qty) || 1,
    unitPrice: Number(r.unitPrice || r.price) || 0,
    lineTotal: +((Number(r.quantity || r.qty) || 1) * (Number(r.unitPrice || r.price) || 0)).toFixed(2),
    condition: r.condition || "resellable",
    reason: r.reason || "customer_changed_mind",
    originalInvoiceNumber: r.originalInvoiceNumber || "",
  }));
  const returnCreditAmount = +exchangeReturnItems.reduce((sum, r) => sum + r.lineTotal, 0).toFixed(2);

  const orderData = {
    ...rest,
    customerId: customer._id,
    sourceWarehouseId: warehouse?._id,
    sourceWarehouseSnapshot: warehouse ? { name: warehouse.name, warehouseCode: warehouse.warehouseCode } : undefined,
    customerSnapshot: { name: customer.displayName, code: customer.customerCode, taxRegistrationNumber: customer.taxRegistrationNumber, contactName: customer.primaryContact?.name, phone: customer.primaryContact?.phone },
    billingAddress,
    shippingAddress,
    shippingAddressLabel,
    salesRepId: customer.assignedSalesRep || req.user._id,
    items: enrichedItems,
    isExchange,
    exchangeReturnItems,
    returnCreditAmount,
    paymentTerms: { type: customer.paymentTerms?.type || "cod", creditDays: customer.paymentTerms?.creditDays || 0 },
    createdBy: req.user._id,
  };
  const order = new SalesOrder(orderData);
  let invoice;
  const temporaryStatus = orderData.status || "draft";
  order.status = "draft";
  await order.save();
  if (customer.paymentTerms?.type === "credit") {
    const available = customer.creditStatus?.availableCredit || 0;
    const required = order.grandTotal;
    const passed = required <= available;
    order.creditCheck = { performed: true, passed, creditAvailable: available, creditRequired: required, overridden: false };
    if (!passed) {
      if (creditOverride && ["admin", "manager", "accountant"].includes(req.user.role)) { order.creditCheck.overridden = true; order.creditCheck.overrideReason = creditOverrideReason; order.creditCheck.overrideBy = req.user._id; order.status = temporaryStatus; }
      else { order.status = "pending_approval"; order.holdReason = `Exceeds credit limit. Required: ${required}, Available: ${available}`; order.isOnHold = true; }
    } else order.status = temporaryStatus;
  } else order.status = temporaryStatus;
  if (order.status === "approved") {
    for (const item of order.items) {
      const product = productMap.get(item.productId.toString());

      if (product && product.expiryTracking?.trackExpiry) {
        // For expiry-tracked products stock lives in multiple batched StockItems — sum them all
        const batchedStockItems = await StockItem.find({ productId: item.productId, warehouseId: warehouse._id });
        const totalAvailable = batchedStockItems.reduce((sum, s) => sum + Math.max(0, s.quantities.onHand - s.quantities.reserved), 0);
        if (totalAvailable < item.orderedQuantity) throw new Error(`Insufficient stock for "${item.productName}". Available: ${totalAvailable}, ordered: ${item.orderedQuantity}`);
        await decreaseStockWithFEFO({
          productId: item.productId,
          warehouseId: warehouse._id,
          quantity: item.orderedQuantity,
          movementType: "sale_dispatch",
          sourceDocument: { type: "sales_order", id: order._id, number: order.orderNumber },
          reason: "Order created as approved",
          userId: req.user._id,
        });
      } else {
        const stockItem = await StockItem.findOne({ productId: item.productId, warehouseId: warehouse._id, batchNumber: null });
        if (!stockItem) throw new Error(`No stock record found for "${item.productName}" in the selected warehouse.`);
        const available = stockItem.quantities.onHand - stockItem.quantities.reserved;
        if (available < item.orderedQuantity) throw new Error(`Insufficient stock for "${item.productName}". Available: ${available}, ordered: ${item.orderedQuantity}`);
        await decreaseStock({
          productId: item.productId,
          warehouseId: warehouse._id,
          quantity: item.orderedQuantity,
          movementType: "sale_dispatch",
          sourceDocument: { type: "sales_order", id: order._id, number: order.orderNumber },
          reason: "Order created as approved",
          userId: req.user._id,
        });
      }
      item.dispatchedQuantity = item.orderedQuantity;
      item.lineStatus = "dispatched";
    }
    order.approvedBy = req.user._id;
    order.approvedAt = new Date();

    if (order.promoCodeApplied && order.promoCodeApplied.code) {
      await PromoCode.findOneAndUpdate(
        { code: order.promoCodeApplied.code.toUpperCase() },
        { $inc: { usageCount: 1 } }
      );
    }

    if (order.giftVoucherApplied && order.giftVoucherApplied.code) {
      await GiftVoucher.findOneAndUpdate(
        { code: order.giftVoucherApplied.code.toUpperCase() },
        { 
          $set: { 
            status: "used",
            usedAt: new Date(),
            usedBy: order.customerId,
            usedInOrder: order._id
          } 
        }
      );
    }
  }
  await order.save();
  if (order.source === "pos" && order.status === "approved") {
    invoice = await generateInvoiceFromOrders({ salesOrderIds: [order._id], createdBy: req.user._id });
    const Payment = (await import("../models/Payment.js")).default;
    const PosSession = (await import("../models/PosSession.js")).default;
    const BankAccount = (await import("../models/BankAccount.js")).default;
    const posPaymentMethod = req.body.paymentMethod || "cash";
    let receivingAccountId = req.body.bankAccountId;
    let receivingAccountDoc;
    if (receivingAccountId) {
      receivingAccountDoc = await BankAccount.findById(receivingAccountId);
    } else if (posPaymentMethod === "cash") {
      const { getOrCreateCashAccount } = await import("./cashAccountService.js");
      receivingAccountDoc = await getOrCreateCashAccount();
    } else {
      receivingAccountDoc = await BankAccount.findOne({ category: "received", isActive: true });
    }
    
    let appliedStoreCredit = Number(req.body.appliedStoreCredit) || 0;
    if (appliedStoreCredit > invoice.grandTotal) appliedStoreCredit = invoice.grandTotal;
    
    const remainingAmount = +(invoice.grandTotal - appliedStoreCredit).toFixed(2);

    if (remainingAmount > 0) {
      if (receivingAccountDoc) { receivingAccountId = receivingAccountDoc._id; receivingAccountDoc.currentBalance = +(receivingAccountDoc.currentBalance + remainingAmount).toFixed(2); await receivingAccountDoc.save(); }
      const payment = new Payment({ direction: "received", customerId: order.customerId, partyName: order.customerSnapshot.name, amount: remainingAmount, method: posPaymentMethod, bankAccountId: receivingAccountId, allocations: [{ documentType: "invoice", documentId: invoice._id, documentNumber: invoice.invoiceNumber, amount: remainingAmount }], status: "cleared", receivedBy: req.user._id, createdBy: req.user._id });
      await payment.save();
    }
    
    if (appliedStoreCredit > 0) {
      const Customer = (await import("../models/Customer.js")).default;
      await Customer.findByIdAndUpdate(order.customerId, { $inc: { 'creditStatus.storeCredit': -appliedStoreCredit } });
      const creditPayment = new Payment({ direction: "received", customerId: order.customerId, partyName: order.customerSnapshot.name, amount: appliedStoreCredit, method: "credit_note", allocations: [{ documentType: "invoice", documentId: invoice._id, documentNumber: invoice.invoiceNumber, amount: appliedStoreCredit }], status: "cleared", receivedBy: req.user._id, createdBy: req.user._id, notes: "Paid from store credit" });
      await creditPayment.save();
    }

    invoice.amountPaid = invoice.grandTotal; invoice.balanceDue = 0; invoice.paymentStatus = "paid"; invoice.fullyPaidAt = new Date(); invoice.cashReceived = order.cashReceived; invoice.changeReturned = order.changeReturned;
    await invoice.save();
    const creditToSave = Number(req.body.creditToSave) || 0;
    if (creditToSave > 0) {
      const Customer = (await import("../models/Customer.js")).default;
      await Customer.findByIdAndUpdate(order.customerId, { $inc: { 'creditStatus.storeCredit': creditToSave } });
    }

    await updateCustomerBalance(order.customerId);
    const activeSession = await PosSession.findOne({ userId: req.user._id, status: "open" });
    // Only count cash sales for cash transactions in POS session totals
    if (activeSession) { 
      if (posPaymentMethod === "cash") {
        activeSession.cashSales += invoice.grandTotal + creditToSave;
      }
      await activeSession.save(); 
    }

    // Process exchange return items if present
    if (returnItems && returnItems.length > 0) {
      try {
        const retProdIds = returnItems.map((r) => r.productId);
        const retProducts = await Product.find({ _id: { $in: retProdIds } });
        const retProdMap = new Map(retProducts.map((p) => [p._id.toString(), p]));
        const enrichedReturnItems = [];
        let totalReturnValue = 0;

        for (let idx = 0; idx < returnItems.length; idx++) {
          const rItem = returnItems[idx];
          const rProd = retProdMap.get(rItem.productId.toString());
          const qty = Number(rItem.quantity || rItem.qty) || 1;
          const price = Number(rItem.unitPrice || rItem.price) || 0;
          const condition = rItem.condition === "damaged" ? "damaged" : "resellable";
          const disposition = condition === "resellable" ? "restock" : "scrap";
          const val = +(qty * price).toFixed(2);
          totalReturnValue += val;

          enrichedReturnItems.push({
            lineNumber: idx + 1,
            productId: rProd ? rProd._id : rItem.productId,
            productCode: rProd?.productCode || rItem.productCode,
            productName: rProd?.name || rItem.name,
            quantityReturned: qty,
            unitOfMeasure: rProd?.unitOfMeasure,
            unitPrice: price,
            refundAmount: val,
            reason: rItem.reason || "customer_changed_mind",
            reasonDescription: rItem.reasonDescription || "POS Exchange",
            condition,
            disposition,
            invoiceId: rItem.originalInvoiceId || undefined,
          });

          if (disposition === "restock" && warehouse) {
            await increaseStock({
              productId: rItem.productId,
              warehouseId: warehouse._id,
              quantity: qty,
              costPerUnit: rProd?.costs?.averageCost || price,
              movementType: "sale_return",
              sourceDocument: { type: "sales_order", id: order._id, number: order.orderNumber },
              reason: `POS Exchange Restock (${order.orderNumber})`,
              userId: req.user._id,
            });
          } else if (disposition === "scrap" && warehouse) {
            const damage = new DamageRecord({
              productId: rItem.productId,
              productCode: rProd?.productCode || rItem.productCode,
              productName: rProd?.name || rItem.name,
              quantity: qty,
              unitOfMeasure: rProd?.unitOfMeasure,
              costPerUnit: price,
              warehouseId: warehouse._id,
              source: "customer_return",
              sourceDocument: { type: "sales_order", id: order._id, number: order.orderNumber },
              description: `Damaged item returned during POS exchange (${order.orderNumber})`,
              disposition: "scrap",
              reportedBy: req.user._id,
              approvedBy: req.user._id,
              approvedAt: new Date(),
            });
            await damage.save();
          }
        }

        const custReturn = new CustomerReturn({
          customerId: customer._id,
          customerSnapshot: { name: customer.displayName, code: customer.customerCode, phone: customer.primaryContact?.phone },
          salesOrderIds: [order._id],
          invoiceIds: invoice ? [invoice._id] : [],
          requestDate: new Date(),
          receivedDate: new Date(),
          completedDate: new Date(),
          items: enrichedReturnItems,
          totalReturnValue: +totalReturnValue.toFixed(2),
          totalRefundAmount: +totalReturnValue.toFixed(2),
          netRefundAmount: +totalReturnValue.toFixed(2),
          status: "completed",
          returnToWarehouseId: warehouse?._id,
          refundMethod: "invoice_adjustment",
          internalNotes: `POS Exchange in Order ${order.orderNumber}`,
          createdBy: req.user._id,
        });
        await custReturn.save();
        order.customerReturnId = custReturn._id;
        await order.save();
        if (invoice) {
          invoice.customerReturnId = custReturn._id;
          await invoice.save();
        }

        const excessRefund = Number(refundToCustomer) || 0;
        if (excessRefund > 0) {
          const refundMethod = req.body.refundMethod || "cash";
          if (refundMethod === "cash" && activeSession) {
            activeSession.cashExpenses = +(activeSession.cashExpenses + excessRefund).toFixed(2);
            await activeSession.save();
            const refundPay = new Payment({
              direction: "paid",
              customerId: customer._id,
              partyName: customer.displayName,
              amount: excessRefund,
              method: "cash",
              status: "cleared",
              receivedBy: req.user._id,
              createdBy: req.user._id,
              notes: `POS Cash Refund on Exchange (${order.orderNumber})`,
            });
            await refundPay.save();
          } else if (refundMethod === "store_credit") {
            const CustomerModel = (await import("../models/Customer.js")).default;
            await CustomerModel.findByIdAndUpdate(order.customerId, {
              $inc: { "creditStatus.storeCredit": excessRefund },
            });
          }
        }
      } catch (exchangeErr) {
        console.error("Failed to process exchange returns:", exchangeErr);
      }
    }
  }
  const invoiceIdStr = invoice ? (invoice._id?.toString() || invoice.id?.toString()) : undefined;
  res.status(201).json({
    success: true,
    data: await populatedOrder(order._id),
    invoiceId: invoiceIdStr,
    invoiceNumber: invoice?.invoiceNumber,
    invoice: invoice ? (invoice.toObject ? invoice.toObject() : invoice) : undefined,
  });
}

export async function getSalesOrders(req, res) {
  const { search, customerId, status, salesRepId, startDate, endDate, page = 1, limit = 20, sortBy = "orderDate", sortOrder = "desc" } = req.query;
  const filter = {};
  if (search) filter.$or = [{ orderNumber: { $regex: search, $options: "i" } }, { "customerSnapshot.name": { $regex: search, $options: "i" } }, { "customerSnapshot.code": { $regex: search, $options: "i" } }];
  if (customerId) filter.customerId = customerId;
  if (status) filter.status = status;
  if (salesRepId) filter.salesRepId = salesRepId;
  if (startDate || endDate) { filter.orderDate = {}; if (startDate) filter.orderDate.$gte = new Date(startDate); if (endDate) filter.orderDate.$lte = new Date(endDate); }
  if (req.user.role === "sales_rep") filter.salesRepId = req.user._id;
  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([SalesOrder.find(filter).populate("customerId", "displayName customerCode customerGroupId").populate("salesRepId", "firstName lastName").sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 }).skip(skip).limit(Number(limit)), SalesOrder.countDocuments(filter)]);
  res.json({ success: true, count: orders.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), data: orders });
}

export async function getSalesOrderById(req, res) {
  const order = await SalesOrder.findById(req.params.id).populate("customerId", "displayName customerCode taxRegistrationNumber primaryContact").populate("salesRepId", "firstName lastName email phone").populate("items.productId", "name productCode sku basePrice").populate("createdBy", "firstName lastName").populate("approvedBy", "firstName lastName").populate("cancelledBy", "firstName lastName").populate("creditCheck.overrideBy", "firstName lastName");
  if (!order) { res.status(404); throw new Error("Sales order not found"); }
  if (req.user.role === "sales_rep" && order.salesRepId?._id.toString() !== req.user._id.toString()) { res.status(403); throw new Error("Not authorized to view this order"); }
  res.json({ success: true, data: order });
}

export async function updateSalesOrder(req, res) {
  const order = await SalesOrder.findById(req.params.id);
  if (!order) { res.status(404); throw new Error("Sales order not found"); }
  if (!["draft", "pending_approval"].includes(order.status)) { res.status(400); throw new Error(`Cannot edit order with status '${order.status}'`); }
  if (req.body.items) {
    const products = await Product.find({ _id: { $in: req.body.items.map((item) => item.productId) } });
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));
    req.body.items = req.body.items.map((item) => { const product = productMap.get(item.productId); return { ...item, productCode: product?.productCode, productName: product?.name, unitOfMeasure: product?.unitOfMeasure, listPrice: product?.basePrice, unitPrice: item.unitPrice ?? product?.basePrice, taxRate: item.taxRate ?? (product?.tax?.taxRate || 0), taxable: item.taxable ?? (product?.tax?.taxable ?? true) }; });
  }
  Object.assign(order, req.body); order.updatedBy = req.user._id; await order.save();
  res.json({ success: true, data: await populatedOrder(order._id) });
}

export async function changeSalesOrderStatus(req, res) {
  const { status, reason } = req.body;
  const order = await SalesOrder.findById(req.params.id);
  if (!order) { res.status(404); throw new Error("Sales order not found"); }
  const allowedTransitions = { draft: ["approved", "cancelled"], pending_approval: ["approved", "cancelled"], approved: ["dispatched", "cancelled", "on_hold"], on_hold: ["approved", "cancelled"], dispatched: ["delivered", "cancelled"], delivered: ["completed"] };
  if (!allowedTransitions[order.status]?.includes(status)) { res.status(400); throw new Error(`Cannot change status from '${order.status}' to '${status}'`); }
  if (status === "approved" && !["admin", "manager", "sales_manager", "accountant"].includes(req.user.role)) { res.status(403); throw new Error("Not authorized to approve orders"); }
  let warehouseId = order.sourceWarehouseId;
  if (!warehouseId) { const defaultWarehouse = await Warehouse.findOne({ isDefault: true, isActive: true }); if (!defaultWarehouse && status === "approved") { res.status(400); throw new Error("Order has no warehouse set and no default warehouse exists. Please set a warehouse before approving."); } warehouseId = defaultWarehouse?._id; }
  if (status === "approved" && order.status !== "approved") {
    for (const item of order.items) {
      // Skip items already dispatched (e.g. on_hold → approved re-approval) to prevent double stock decrease
      if ((item.dispatchedQuantity || 0) >= item.orderedQuantity) {
        order.approvedBy = req.user._id; order.approvedAt = new Date(); order.isOnHold = false; order.holdReason = null;
        continue;
      }
      const product = await (await import("../models/Product.js")).default.findById(item.productId).select("expiryTracking");
      if (product?.expiryTracking?.trackExpiry) {
        // For expiry-tracked products, sum all batched stock
        const batchedStockItems = await StockItem.find({ productId: item.productId, warehouseId });
        const totalAvailable = batchedStockItems.reduce((sum, s) => sum + Math.max(0, s.quantities.onHand - s.quantities.reserved), 0);
        if (totalAvailable < item.orderedQuantity) throw new Error(`Insufficient stock for "${item.productName}". Available: ${totalAvailable}, ordered: ${item.orderedQuantity}`);
        await decreaseStockWithFEFO({ productId: item.productId, warehouseId, quantity: item.orderedQuantity, movementType: "sale_dispatch", sourceDocument: { type: "sales_order", id: order._id, number: order.orderNumber }, reason: "Sales order approved", userId: req.user._id });
      } else {
        const stockItem = await StockItem.findOne({ productId: item.productId, warehouseId, batchNumber: null });
        if (!stockItem) throw new Error(`No stock record found for "${item.productName}" in the selected warehouse. Please enter opening stock first.`);
        const available = stockItem.quantities.onHand - stockItem.quantities.reserved;
        if (available < item.orderedQuantity) throw new Error(`Insufficient stock for "${item.productName}". Available: ${available}, ordered: ${item.orderedQuantity}`);
        await decreaseStock({ productId: item.productId, warehouseId, quantity: item.orderedQuantity, movementType: "sale_dispatch", sourceDocument: { type: "sales_order", id: order._id, number: order.orderNumber }, reason: "Sales order approved", userId: req.user._id });
      }
      item.dispatchedQuantity = item.orderedQuantity; item.lineStatus = "dispatched";
    }
    order.approvedBy = req.user._id; order.approvedAt = new Date(); order.isOnHold = false; order.holdReason = null;
  }
  if (status === "dispatched" && order.status !== "dispatched") for (const item of order.items) if (item.lineStatus !== "dispatched") { item.dispatchedQuantity = item.orderedQuantity; item.lineStatus = "dispatched"; }
  if (status === "delivered" && order.status !== "delivered") for (const item of order.items) { item.deliveredQuantity = item.dispatchedQuantity || item.orderedQuantity; item.lineStatus = "delivered"; }
  if (status === "cancelled" && ["approved", "dispatched", "on_hold"].includes(order.status)) for (const item of order.items) { try { const qtyToRestore = item.dispatchedQuantity || 0; if (qtyToRestore > 0) await increaseStock({ productId: item.productId, warehouseId, quantity: qtyToRestore, costPerUnit: 0, movementType: "sale_return", sourceDocument: { type: "sales_order", id: order._id, number: order.orderNumber }, reason: reason || "Order cancelled — stock restored", userId: req.user._id }); } catch (stockError) { console.warn(`Stock restore failed for ${item.productName}:`, stockError.message); } }
  order.status = status; order.updatedBy = req.user._id;
  if (status === "cancelled") { order.cancelledBy = req.user._id; order.cancelledAt = new Date(); order.cancellationReason = reason; }
  if (status === "on_hold") { order.isOnHold = true; order.holdReason = reason; }
  await order.save();
  res.json({ success: true, message: `Order status changed to ${status}`, data: order });
}

export async function deleteSalesOrder(req, res) {
  const order = await SalesOrder.findById(req.params.id);
  if (!order) { res.status(404); throw new Error("Sales order not found"); }
  if (order.status !== "draft") { res.status(400); throw new Error("Only draft orders can be deleted. Cancel non-draft orders instead."); }
  order.deletedAt = new Date(); await order.save();
  res.json({ success: true, message: "Draft order deleted" });
}
