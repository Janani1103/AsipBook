import "server-only";
import mongoose from "mongoose";
import DamageRecord from "../models/DamageRecord.js";
import Product from "../models/Product.js";
import { decreaseStock } from "./stockService.js";

export async function createDamage(req, res) {
  const { productId, quantity, warehouseId, source, description, disposition, costPerUnit, adjustStock, isRefundable, refundAmount, refundNotes } = req.body;
  const product = await Product.findById(productId);
  if (!product) { res.status(404); throw new Error("Product not found"); }
  
  try { 
    const damage = new DamageRecord({ 
      productId: product._id, 
      productCode: product.productCode, 
      productName: product.name, 
      quantity, 
      unitOfMeasure: product.unitOfMeasure, 
      costPerUnit: costPerUnit ?? (product.costs?.averageCost || product.costs?.lastPurchaseCost || 0), 
      warehouseId, 
      source: source || "warehouse_damage", 
      description, 
      disposition: disposition || "pending", 
      isRefundable: isRefundable || false,
      refundAmount: refundAmount || 0,
      refundNotes: refundNotes || "",
      reportedBy: req.user._id 
    }); 
    await damage.save(); 
    
    if (adjustStock) { 
      const result = await decreaseStock({ 
        productId: product._id, 
        warehouseId, 
        quantity, 
        movementType: "damage", 
        sourceDocument: { type: "damage_record", id: damage._id, number: damage.damageNumber }, 
        reason: description || "Damage recorded", 
        userId: req.user._id 
      }); 
      damage.stockMovementId = result.movement._id; 
      damage.stockAdjusted = true; 
      await damage.save(); 
    } 
    res.status(201).json({ success: true, data: damage }); 
  } catch (error) { 
    res.status(400); 
    throw new Error(error.message); 
  }
}
export async function getDamages(req, res) { const { productId, warehouseId, source, disposition, startDate, endDate, page = 1, limit = 20 } = req.query; const filter = {}; if (productId) filter.productId = productId; if (warehouseId) filter.warehouseId = warehouseId; if (source) filter.source = source; if (disposition) filter.disposition = disposition; if (startDate || endDate) { filter.createdAt = {}; if (startDate) filter.createdAt.$gte = new Date(startDate); if (endDate) filter.createdAt.$lte = new Date(endDate); } const [damages, total] = await Promise.all([DamageRecord.find(filter).populate("productId", "name productCode").populate("warehouseId", "name warehouseCode").populate("reportedBy", "firstName lastName").sort({ createdAt: -1 }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit)), DamageRecord.countDocuments(filter)]); res.json({ success: true, count: damages.length, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)), data: damages }); }
export async function getDamageById(req, res) { const damage = await DamageRecord.findById(req.params.id).populate("productId", "name productCode").populate("warehouseId", "name warehouseCode").populate("reportedBy", "firstName lastName").populate("approvedBy", "firstName lastName"); if (!damage) { res.status(404); throw new Error("Damage record not found"); } res.json({ success: true, data: damage }); }
export async function writeOffDamage(req, res) { const damage = await DamageRecord.findById(req.params.id); if (!damage) { res.status(404); throw new Error("Damage record not found"); } damage.writtenOff = true; damage.writtenOffAt = new Date(); damage.writeOffValue = damage.totalValue; damage.approvedBy = req.user._id; damage.approvedAt = new Date(); await damage.save(); res.json({ success: true, data: damage }); }
export async function getDamageSummary(req, res) { const result = await DamageRecord.aggregate([{ $match: { deletedAt: null } }, { $group: { _id: "$source", count: { $sum: 1 }, totalValue: { $sum: "$totalValue" } } }]); const totalCount = result.reduce((sum, item) => sum + item.count, 0); const totalValue = result.reduce((sum, item) => sum + item.totalValue, 0); res.json({ success: true, data: { bySource: result, totalCount, totalValue } }); }

import { increaseStock } from "./stockService.js";

export async function updateDamage(req, res) {
  const { id } = req.params;
  const { description, disposition, isRefundable, refundAmount, refundNotes } = req.body;
  const damage = await DamageRecord.findById(id);
  if (!damage) { res.status(404); throw new Error("Damage record not found"); }
  
  if (description !== undefined) damage.description = description;
  if (disposition !== undefined) damage.disposition = disposition;
  if (isRefundable !== undefined) damage.isRefundable = isRefundable;
  if (refundAmount !== undefined) damage.refundAmount = refundAmount;
  if (refundNotes !== undefined) damage.refundNotes = refundNotes;
  
  await damage.save();
  res.json({ success: true, data: damage });
}

export async function deleteDamage(req, res) {
  const { id } = req.params;
  const damage = await DamageRecord.findById(id);
  if (!damage) { res.status(404); throw new Error("Damage record not found"); }
  
  if (damage.stockAdjusted) {
    await increaseStock({
      productId: damage.productId,
      warehouseId: damage.warehouseId,
      quantity: damage.quantity,
      costPerUnit: damage.costPerUnit,
      movementType: "adjustment_in",
      sourceDocument: { type: "damage_record", id: damage._id, number: damage.damageNumber },
      reason: "Damage record deleted",
      userId: req.user._id
    });
  }
  
  await DamageRecord.findByIdAndDelete(id);
  res.json({ success: true, message: "Damage record deleted" });
}
