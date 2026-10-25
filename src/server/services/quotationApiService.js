import "server-only";
import mongoose from "mongoose";
import Quotation from "../models/Quotation.js";
import Customer from "../models/Customer.js";
import Product from "../models/Product.js";
import Warehouse from "../models/Warehouse.js";
import SalesOrder from "../models/SalesOrder.js";
import CompanySettings from "../models/CompanySettings.js";
import Invoice from "../models/Invoice.js";
import Payment from "../models/Payment.js";

const populatedQuotation = (id) => Quotation.findById(id)
  .populate("customerId", "displayName customerCode")
  .populate("salesRepId", "firstName lastName")
  .populate("items.productId", "name productCode")
  .populate("convertedToSalesOrderId", "orderNumber");

export async function createQuotation(req, res) {
  const { customerId, items, shippingAddressLabel, ...rest } = req.body;
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
  if (customer.status === "blacklisted") { res.status(400); throw new Error("Cannot create quotation for blacklisted customer"); }
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
    shippingAddress = defaultAddress.toObject?.() || defaultAddress;
  }
  const quotationData = { ...rest, customerId: customer._id, sourceWarehouseId: warehouse?._id, sourceWarehouseSnapshot: warehouse ? { name: warehouse.name, warehouseCode: warehouse.warehouseCode } : undefined, customerSnapshot: { name: customer.displayName, code: customer.customerCode, taxRegistrationNumber: customer.taxRegistrationNumber, contactName: customer.primaryContact?.name, phone: customer.primaryContact?.phone }, billingAddress, shippingAddress, shippingAddressLabel, salesRepId: customer.assignedSalesRep || req.user._id, items: enrichedItems, paymentTerms: { type: customer.paymentTerms?.type || "cod", creditDays: customer.paymentTerms?.creditDays || 0 }, createdBy: req.user._id };
  const quotation = new Quotation(quotationData);
  await quotation.save();
  res.status(201).json({ success: true, data: await populatedQuotation(quotation._id) });
}

export async function getQuotations(req, res) {
  const { search, customerId, status, salesRepId, startDate, endDate, page = 1, limit = 20, sortBy = "quotationDate", sortOrder = "desc" } = req.query;
  const filter = {};
  if (search) filter.$or = [{ quotationNumber: { $regex: search, $options: "i" } }, { "customerSnapshot.name": { $regex: search, $options: "i" } }, { "customerSnapshot.code": { $regex: search, $options: "i" } }];
  if (customerId) filter.customerId = customerId;
  if (status) filter.status = status;
  if (salesRepId) filter.salesRepId = salesRepId;
  if (startDate || endDate) { filter.quotationDate = {}; if (startDate) filter.quotationDate.$gte = new Date(startDate); if (endDate) filter.quotationDate.$lte = new Date(endDate); }
  if (req.user.role === "sales_rep") filter.salesRepId = req.user._id;
  const skip = (Number(page) - 1) * Number(limit);
  const [quotations, total] = await Promise.all([Quotation.find(filter).populate("customerId", "displayName customerCode customerGroupId").populate("salesRepId", "firstName lastName").sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 }).skip(skip).limit(Number(limit)), Quotation.countDocuments(filter)]);
  res.json({ success: true, count: quotations.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), data: quotations });
}

export async function getQuotationById(req, res) {
  const quotation = await Quotation.findById(req.params.id).populate("customerId", "displayName customerCode taxRegistrationNumber primaryContact").populate("salesRepId", "firstName lastName email phone").populate("items.productId", "name productCode sku basePrice").populate("createdBy", "firstName lastName").populate("convertedToSalesOrderId", "orderNumber");
  if (!quotation) { res.status(404); throw new Error("Quotation not found"); }
  if (req.user.role === "sales_rep" && quotation.salesRepId?._id.toString() !== req.user._id.toString()) { res.status(403); throw new Error("Not authorized to view this quotation"); }
  res.json({ success: true, data: quotation });
}

export async function updateQuotation(req, res) {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) { res.status(404); throw new Error("Quotation not found"); }
  if (quotation.status === "converted") { res.status(400); throw new Error("Cannot edit quotation that has already been converted"); }
  if (req.body.items) {
    const products = await Product.find({ _id: { $in: req.body.items.map((item) => item.productId) } });
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));
    req.body.items = req.body.items.map((item) => { const product = productMap.get(item.productId); return { ...item, productCode: product?.productCode, productName: product?.name, unitOfMeasure: product?.unitOfMeasure, listPrice: product?.basePrice, unitPrice: item.unitPrice ?? product?.basePrice, taxRate: item.taxRate ?? (product?.tax?.taxRate || 0), taxable: item.taxable ?? (product?.tax?.taxable ?? true) }; });
  }
  Object.assign(quotation, req.body); quotation.updatedBy = req.user._id; await quotation.save();
  res.json({ success: true, data: await populatedQuotation(quotation._id) });
}

export async function changeQuotationStatus(req, res) {
  const { status, reason } = req.body;
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) { res.status(404); throw new Error("Quotation not found"); }
  const allowedTransitions = { draft: ["sent", "cancelled"], sent: ["accepted", "rejected", "cancelled"], accepted: ["converted", "cancelled"], rejected: ["cancelled"], expired: ["cancelled"] };
  if (!allowedTransitions[quotation.status]?.includes(status)) { res.status(400); throw new Error(`Cannot change status from '${quotation.status}' to '${status}'`); }
  quotation.status = status; quotation.updatedBy = req.user._id;
  if (status === "accepted") { quotation.acceptedAt = new Date(); }
  if (status === "rejected") { quotation.rejectedAt = new Date(); quotation.rejectedReason = reason; }
  await quotation.save();
  res.json({ success: true, message: `Quotation status changed to ${status}`, data: quotation });
}

export async function convertQuotationToSalesOrder(req, res) {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) { res.status(404); throw new Error("Quotation not found"); }
  if (quotation.status !== "accepted") { res.status(400); throw new Error("Only accepted quotations can be converted to sales orders"); }
  if (quotation.convertedToSalesOrderId) { res.status(400); throw new Error("This quotation has already been converted to a sales order"); }
  const SalesOrderService = (await import("./salesOrderApiService.js"));
  try {
    const salesOrderData = {
      source: "quotation",
      customerId: quotation.customerId,
      sourceWarehouseId: quotation.sourceWarehouseId,
      billingAddress: quotation.billingAddress,
      shippingAddress: quotation.shippingAddress,
      shippingAddressLabel: quotation.shippingAddressLabel,
      salesRepId: quotation.salesRepId,
      items: quotation.items.map((item) => ({
        productId: item.productId,
        orderedQuantity: item.orderedQuantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        discountAmount: item.discountAmount,
        taxRate: item.taxRate,
        taxable: item.taxable,
        notes: item.notes,
      })),
      orderDiscount: quotation.orderDiscount,
      paymentTerms: quotation.paymentTerms,
      customerNotes: quotation.customerNotes,
      internalNotes: quotation.internalNotes,
      specialInstructions: quotation.specialInstructions,
      priority: quotation.priority,
      status: "draft",
    };
    const mockReq = { body: salesOrderData, user: req.user };
    const mockRes = { status: (code) => ({ json: (data) => data }) };
    const result = await SalesOrderService.createSalesOrder(mockReq, mockRes);
    const salesOrder = result.data;
    quotation.convertedToSalesOrderId = salesOrder._id;
    quotation.convertedAt = new Date();
    quotation.status = "converted";
    await quotation.save();
    res.json({ success: true, message: "Quotation converted to sales order", data: await populatedQuotation(quotation._id) });
  } catch (error) { res.status(400); throw new Error(error.message || "Failed to convert quotation to sales order"); }
}

export async function deleteQuotation(req, res) {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) { res.status(404); throw new Error("Quotation not found"); }
  quotation.deletedAt = new Date(); await quotation.save();
  res.json({ success: true, message: "Quotation deleted" });
}

export async function getQuotationPrintJson(req, res) {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) {
    res.status(404);
    throw new Error("Quotation not found");
  }

  const settings = (await CompanySettings.findOne()) || {
    companyName: "RC TRADERS",
    address: "Colombo, Sri Lanka",
    phone: "+94 11 XXX XXXX",
    receiptFooterMessage: "THANK YOU FOR YOUR BUSINESS!\nPLEASE VISIT AGAIN.",
  };

  const printSequence = [];
  const addText = (content, bold = 0, align = 0, format = 0) => {
    printSequence.push({ type: 0, content: content || " ", bold, align, format });
  };
  const formatLine = (left, right, width = 38) => {
    const spaces = width - left.length - right.length;
    return spaces > 0 ? left + " ".repeat(spaces) + right : left + " " + right;
  };

  addText(settings.companyName, 1, 1, 0);
  if (settings.address) addText(settings.address, 0, 1, 0);
  if (settings.phone) addText(`TEL: ${settings.phone}`, 0, 1, 0);
  if (settings.email) addText(settings.email, 0, 1, 0);
  if (settings.taxRegistrationNumber) addText(`VAT NO: ${settings.taxRegistrationNumber}`, 1, 1, 0);
  addText("======================================", 0, 1, 0);
  addText("QUOTATION", 1, 1, 0);
  addText("======================================", 0, 1, 0);
  addText(formatLine("Quote No:", quotation.quotationNumber || ""), 1, 0, 0);
  const date = quotation.quotationDate
    ? new Date(quotation.quotationDate).toLocaleString("en-LK", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    })
    : "—";
  addText(formatLine("Date:", date), 0, 0, 0);
  const validUntil = quotation.validUntil
    ? new Date(quotation.validUntil).toLocaleDateString("en-LK", {
      year: "numeric", month: "short", day: "numeric",
    })
    : "—";
  addText(formatLine("Valid Until:", validUntil), 0, 0, 0);

  const customer = quotation.customerSnapshot || {};
  if (customer.name) addText(formatLine("Customer:", customer.name), 1, 0, 0);
  if (customer.code) addText(formatLine("Code:", customer.code), 0, 0, 0);
  if (customer.phone) addText(formatLine("Contact:", customer.phone), 0, 0, 0);
  addText("--------------------------------------", 0, 1, 0);
  addText(formatLine("Description", "Amount"), 1, 0, 0);
  addText("--------------------------------------", 0, 1, 0);
  for (const item of quotation.items || []) {
    addText(item.productName, 1, 0, 0);
    addText(formatLine(`  ${item.orderedQuantity} x ${item.unitPrice.toFixed(2)}`, (item.orderedQuantity * item.unitPrice).toFixed(2)), 0, 0, 0);
    if (item.discountPercent > 0) {
      const discountAmount = (item.orderedQuantity * item.unitPrice * item.discountPercent / 100);
      addText(`    Disc: ${item.discountPercent}% (-${discountAmount.toFixed(2)})`, 0, 0, 4);
    }
  }

  addText("--------------------------------------", 0, 1, 0);
  addText(formatLine("Subtotal", quotation.subtotal.toFixed(2)), 0, 0, 0);
  const discount = (quotation.totalDiscount || 0) + (quotation.orderDiscount?.amount || 0);
  if (discount > 0) addText(formatLine("Discount", `-${discount.toFixed(2)}`), 0, 0, 0);
  if (quotation.totalTax > 0) addText(formatLine("Tax", quotation.totalTax.toFixed(2)), 0, 0, 0);
  if (quotation.shippingCost > 0) addText(formatLine("Shipping", quotation.shippingCost.toFixed(2)), 0, 0, 0);
  addText("======================================", 0, 1, 0);
  addText(formatLine("TOTAL", quotation.grandTotal.toFixed(2)), 1, 0, 0);
  addText("======================================", 0, 1, 0);

  if (quotation.customerNotes) {
    addText("Notes:", 1, 0, 0);
    addText(quotation.customerNotes, 0, 0, 0);
  }

  if (settings.receiptFooterMessage) {
    addText("======================================", 0, 1, 0);
    addText(settings.receiptFooterMessage, 0, 1, 0);
  }

  res.json({ success: true, data: printSequence });
}

export async function convertQuotationToInvoice(req, res) {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) { res.status(404); throw new Error("Quotation not found"); }
  if (quotation.status !== "accepted") { res.status(400); throw new Error("Only accepted quotations can be converted to invoices"); }
  if (quotation.convertedToSalesOrderId) { res.status(400); throw new Error("This quotation has already been converted to a sales order. Please create invoice from the sales order instead."); }

  const customer = await Customer.findById(quotation.customerId);
  if (!customer) { res.status(404); throw new Error("Customer not found"); }

  const invoiceDate = new Date();
  const dueDate = new Date(invoiceDate);
  if (customer.paymentTerms?.type === "credit") {
    dueDate.setDate(dueDate.getDate() + (customer.paymentTerms.creditDays || 0));
  }

  const invoice = new Invoice({
    customerId: quotation.customerId,
    customerSnapshot: quotation.customerSnapshot,
    billingAddress: quotation.billingAddress,
    shippingAddress: quotation.shippingAddress,
    salesRepId: quotation.salesRepId,
    items: quotation.items.map((item) => ({
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      description: item.description,
      quantity: item.orderedQuantity,
      unitOfMeasure: item.unitOfMeasure,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent,
      discountAmount: item.discountAmount,
      taxRate: item.taxRate,
      taxable: item.taxable,
      lineTotal: item.orderedQuantity * item.unitPrice * (1 - item.discountPercent / 100),
    })),
    orderDiscount: quotation.orderDiscount,
    paymentTerms: quotation.paymentTerms,
    invoiceDate,
    dueDate: customer.paymentTerms?.type === "credit" ? dueDate : undefined,
    customerNotes: quotation.customerNotes,
    internalNotes: quotation.internalNotes,
    specialInstructions: quotation.specialInstructions,
    status: "approved",
    createdBy: req.user._id,
  });

  await invoice.save();

  quotation.status = "converted";
  quotation.convertedAt = new Date();
  await quotation.save();

  const populated = await Invoice.findById(invoice._id)
    .populate("customerId", "displayName customerCode")
    .populate("salesRepId", "firstName lastName");

  res.json({ success: true, message: "Quotation converted to invoice", data: populated });
}

export async function receivePaymentForQuotation(req, res) {
  const { amount, method, bankAccountId, transactionReference, notes, isPartial } = req.body;
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) { res.status(404); throw new Error("Quotation not found"); }
  if (quotation.status !== "accepted") { res.status(400); throw new Error("Only accepted quotations can receive payments"); }

  try {
    let invoice;
    let invoiceId;

    if (!quotation.convertedToSalesOrderId) {
      const customer = await Customer.findById(quotation.customerId);
      if (!customer) { throw new Error("Customer not found"); }

      const invoiceDate = new Date();
      const dueDate = new Date(invoiceDate);
      if (customer.paymentTerms?.type === "credit") {
        dueDate.setDate(dueDate.getDate() + (customer.paymentTerms.creditDays || 0));
      }

      invoice = new Invoice({
        customerId: quotation.customerId,
        customerSnapshot: quotation.customerSnapshot,
        billingAddress: quotation.billingAddress,
        shippingAddress: quotation.shippingAddress,
        salesRepId: quotation.salesRepId,
        items: quotation.items.map((item) => ({
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          description: item.description,
          quantity: item.orderedQuantity,
          unitOfMeasure: item.unitOfMeasure,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          discountAmount: item.discountAmount,
          taxRate: item.taxRate,
          taxable: item.taxable,
          lineTotal: item.orderedQuantity * item.unitPrice * (1 - item.discountPercent / 100),
        })),
        orderDiscount: quotation.orderDiscount,
        paymentTerms: quotation.paymentTerms,
        invoiceDate,
        dueDate: customer.paymentTerms?.type === "credit" ? dueDate : undefined,
        customerNotes: quotation.customerNotes,
        internalNotes: quotation.internalNotes,
        specialInstructions: quotation.specialInstructions,
        status: "approved",
        createdBy: req.user._id,
      });

      await invoice.save();
      invoiceId = invoice._id;

      quotation.status = "converted";
      quotation.convertedAt = new Date();
      await quotation.save();
    } else {
      const SalesOrder = (await import("../models/SalesOrder.js")).default;
      const salesOrder = await SalesOrder.findById(quotation.convertedToSalesOrderId);
      if (salesOrder) {
        const existingInvoice = await Invoice.findOne({ salesOrderId: salesOrder._id });
        if (existingInvoice) {
          invoice = existingInvoice;
          invoiceId = invoice._id;
        } else {
          const customer = await Customer.findById(quotation.customerId);
          const invoiceDate = new Date();
          const dueDate = new Date(invoiceDate);
          if (customer.paymentTerms?.type === "credit") {
            dueDate.setDate(dueDate.getDate() + (customer.paymentTerms.creditDays || 0));
          }

          invoice = new Invoice({
            customerId: quotation.customerId,
            customerSnapshot: quotation.customerSnapshot,
            billingAddress: quotation.billingAddress,
            shippingAddress: quotation.shippingAddress,
            salesRepId: quotation.salesRepId,
            salesOrderId: salesOrder._id,
            items: salesOrder.items.map((item) => ({
              productId: item.productId,
              productCode: item.productCode,
              productName: item.productName,
              description: item.description,
              quantity: item.orderedQuantity,
              unitOfMeasure: item.unitOfMeasure,
              unitPrice: item.unitPrice,
              discountPercent: item.discountPercent,
              discountAmount: item.discountAmount,
              taxRate: item.taxRate,
              taxable: item.taxable,
              lineTotal: item.orderedQuantity * item.unitPrice * (1 - item.discountPercent / 100),
            })),
            orderDiscount: salesOrder.orderDiscount,
            paymentTerms: salesOrder.paymentTerms,
            invoiceDate,
            dueDate: customer.paymentTerms?.type === "credit" ? dueDate : undefined,
            customerNotes: salesOrder.customerNotes,
            internalNotes: salesOrder.internalNotes,
            specialInstructions: salesOrder.specialInstructions,
            status: "approved",
            createdBy: req.user._id,
          });

          await invoice.save();
          invoiceId = invoice._id;
        }
      }
    }

    if (!invoiceId) {
      throw new Error("Could not create or find invoice for payment");
    }

    const payment = new Payment({
      direction: "received",
      customerId: quotation.customerId,
      partyName: quotation.customerSnapshot?.name,
      amount: Number(amount),
      method,
      paymentDate: new Date(),
      bankAccountId: bankAccountId || undefined,
      transactionReference: transactionReference || undefined,
      allocations: [{
        documentType: "invoice",
        documentId: invoiceId,
        documentNumber: invoice.invoiceNumber,
        amount: Number(amount),
      }],
      notes: notes || `Payment for quotation ${quotation.quotationNumber}`,
      receivedBy: req.user._id,
      createdBy: req.user._id,
      status: "confirmed",
    });

    await payment.save();

    invoice.amountPaid = +(invoice.amountPaid + Number(amount)).toFixed(2);
    await invoice.save();

    const customer = await Customer.findById(quotation.customerId);
    if (customer) {
      customer.creditStatus = customer.creditStatus || {};
      customer.creditStatus.usedCredit = +(customer.creditStatus.usedCredit || 0) - Number(amount);
      customer.creditStatus.availableCredit = +(customer.creditStatus.creditLimit || 0) - (customer.creditStatus.usedCredit || 0);
      await customer.save();
    }

    res.json({
      success: true,
      message: "Payment received successfully",
      data: { message: "Payment recorded and quotation converted to invoice" },
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message || "Failed to receive payment");
  }
}

