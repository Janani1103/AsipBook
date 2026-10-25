import "server-only";
import mongoose from "mongoose";
import CreditNote from "../models/CreditNote.js";
import Customer from "../models/Customer.js";
import "../models/CustomerReturn.js";
import Invoice from "../models/Invoice.js";
import { updateCustomerBalance } from "./invoiceApiService.js";

export async function createCreditNote(req, res) {
  const {
    customerId,
    amount,
    reason,
    description,
    invoiceId,
    issueDate,
    notes,
  } = req.body;

  if (!customerId) {
    res.status(400);
    throw new Error("Customer is required");
  }

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    res.status(400);
    throw new Error("A valid positive amount is required");
  }

  const customer = await Customer.findById(customerId);
  if (!customer) {
    res.status(404);
    throw new Error("Customer not found");
  }

  const creditNote = new CreditNote({
    customerId: customer._id,
    customerSnapshot: {
      name: customer.displayName,
      code: customer.customerCode,
    },
    amount: numAmount,
    reason: reason || "other",
    description,
    invoiceId: invoiceId || undefined,
    issueDate: issueDate ? new Date(issueDate) : new Date(),
    notes,
    createdBy: req.user._id,
  });

  await creditNote.save();
  await updateCustomerBalance(customer._id);
  res.status(201).json({ success: true, data: creditNote });
}

export async function getCreditNotes(req, res) {
  const { customerId, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (customerId) filter.customerId = customerId;
  if (status) filter.status = status;
  const skip = (Number(page) - 1) * Number(limit);
  const [notes, total] = await Promise.all([
    CreditNote.find(filter)
      .populate("customerId", "displayName customerCode")
      .populate("customerReturnId", "rmaNumber")
      .sort({ issueDate: -1 })
      .skip(skip)
      .limit(Number(limit)),
    CreditNote.countDocuments(filter),
  ]);
  res.json({
    success: true,
    count: notes.length,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data: notes,
  });
}

export async function getCreditNoteById(req, res) {
  const creditNote = await CreditNote.findById(req.params.id)
    .populate("customerId", "displayName customerCode")
    .populate("customerReturnId", "rmaNumber")
    .populate("applications.invoiceId", "invoiceNumber")
    .populate("applications.appliedBy", "firstName lastName")
    .populate("createdBy", "firstName lastName");
  if (!creditNote) {
    res.status(404);
    throw new Error("Credit note not found");
  }
  res.json({ success: true, data: creditNote });
}

export async function applyCreditNote(req, res) {
  const { invoiceId, amount } = req.body;
  const creditNote = await CreditNote.findById(req.params.id);
  if (!creditNote) {
    res.status(404);
    throw new Error("Credit note not found");
  }
  if (["fully_applied", "cancelled"].includes(creditNote.status)) {
    res.status(400);
    throw new Error(`Credit note is ${creditNote.status}`);
  }
  if (amount > creditNote.remainingAmount) {
    res.status(400);
    throw new Error(`Cannot apply more than remaining (${creditNote.remainingAmount})`);
  }
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    res.status(404);
    throw new Error("Invoice not found");
  }
  if (invoice.customerId.toString() !== creditNote.customerId.toString()) {
    res.status(400);
    throw new Error("Credit note and invoice must be for the same customer");
  }
  if (amount > invoice.balanceDue) {
    res.status(400);
    throw new Error(`Cannot apply more than invoice balance (${invoice.balanceDue})`);
  }

  // Normal sequential database operations for standalone MongoDB compatibility
  creditNote.applications.push({
    invoiceId: invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    amountApplied: amount,
    appliedBy: req.user._id,
  });
  await creditNote.save();

  invoice.amountPaid = +(invoice.amountPaid + amount).toFixed(2);
  invoice.lastPaymentDate = new Date();
  await invoice.save();

  await updateCustomerBalance(creditNote.customerId);
  res.json({
    success: true,
    message: "Credit applied to invoice",
    data: creditNote,
  });
}

export async function updateCreditNote(req, res) {
  const creditNote = await CreditNote.findById(req.params.id);
  if (!creditNote) {
    res.status(404);
    throw new Error("Credit note not found");
  }

  if (creditNote.status === "cancelled") {
    res.status(400);
    throw new Error("Cannot edit a cancelled credit note");
  }

  const {
    customerId,
    amount,
    reason,
    description,
    invoiceId,
    issueDate,
    notes,
  } = req.body;

  const totalApplied = (creditNote.applications || []).reduce(
    (sum, app) => sum + (app.amountApplied || 0),
    0
  );

  // If amount is updated
  if (amount !== undefined) {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      res.status(400);
      throw new Error("A valid positive amount is required");
    }
    if (numAmount < totalApplied) {
      res.status(400);
      throw new Error(
        `Cannot reduce credit amount below already applied amount (LKR ${totalApplied.toLocaleString()})`
      );
    }
    creditNote.amount = numAmount;
  }

  // If customer is changed
  let oldCustomerId = null;
  if (customerId && customerId.toString() !== creditNote.customerId.toString()) {
    if (totalApplied > 0) {
      res.status(400);
      throw new Error("Cannot change customer after credit note has been applied to invoices");
    }
    const customer = await Customer.findById(customerId);
    if (!customer) {
      res.status(404);
      throw new Error("Customer not found");
    }
    oldCustomerId = creditNote.customerId;
    creditNote.customerId = customer._id;
    creditNote.customerSnapshot = {
      name: customer.displayName,
      code: customer.customerCode,
    };
  }

  if (reason !== undefined) creditNote.reason = reason;
  if (description !== undefined) creditNote.description = description;
  if (invoiceId !== undefined) creditNote.invoiceId = invoiceId || undefined;
  if (issueDate !== undefined) creditNote.issueDate = new Date(issueDate);
  if (notes !== undefined) creditNote.notes = notes;

  await creditNote.save();

  await updateCustomerBalance(creditNote.customerId);
  if (oldCustomerId) {
    await updateCustomerBalance(oldCustomerId);
  }

  res.json({
    success: true,
    message: "Credit note updated successfully",
    data: creditNote,
  });
}

export async function deleteCreditNote(req, res) {
  const creditNote = await CreditNote.findById(req.params.id);
  if (!creditNote) {
    res.status(404);
    throw new Error("Credit note not found");
  }

  // Reverse any applications on invoices
  if (creditNote.applications && creditNote.applications.length > 0) {
    for (const app of creditNote.applications) {
      const invoice = await Invoice.findById(app.invoiceId);
      if (invoice) {
        invoice.amountPaid = Math.max(0, +(invoice.amountPaid - app.amountApplied).toFixed(2));
        await invoice.save();
      }
    }
  }

  // Reset return reference if created from customer return
  if (creditNote.customerReturnId) {
    const CustomerReturn = mongoose.model("CustomerReturn");
    const ret = await CustomerReturn.findById(creditNote.customerReturnId);
    if (ret) {
      ret.creditNoteId = null;
      ret.refundMethod = undefined;
      ret.status = "processed";
      await ret.save();
    }
  }

  creditNote.status = "cancelled";
  creditNote.deletedAt = new Date();
  await creditNote.save();

  await updateCustomerBalance(creditNote.customerId);

  res.json({
    success: true,
    message: "Credit note deleted and invoice allocations reversed successfully",
  });
}

