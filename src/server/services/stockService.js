import "server-only";
import StockItem from "../models/StockItem.js";
import StockMovement from "../models/StockMovement.js";
import StockReservation from "../models/StockReservation.js";
import Product from "../models/Product.js";
import Warehouse from "../models/Warehouse.js";
import { selectStockByFEFO } from "./fefoService.js";

const sessionOption = (session) => ({ session: session || undefined });

export async function increaseStock({ productId, warehouseId, quantity, costPerUnit = 0, movementType, batchNumber = null, manufactureDate = null, expiryDate = null, sourceDocument, reason, notes, userId, session }) {
  if (!quantity || quantity <= 0) throw new Error("Quantity must be greater than 0");
  const product = await Product.findById(productId);
  if (!product) throw new Error(`Product ${productId} not found`);
  const warehouse = await Warehouse.findById(warehouseId);
  if (!warehouse) throw new Error(`Warehouse ${warehouseId} not found`);
  let stockItem = await StockItem.findOne({ productId, warehouseId, batchNumber });
  const balanceBefore = stockItem?.quantities?.onHand || 0;
  if (!stockItem) {
    stockItem = new StockItem({
      productId,
      productCode: product.productCode,
      productName: product.name,
      warehouseId,
      batchNumber,
      manufactureDate: manufactureDate ? new Date(manufactureDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      unitOfMeasure: product.unitOfMeasure,
      costPerUnit,
      quantities: { onHand: quantity, reserved: 0, available: quantity }
    });
  } else {
    if (manufactureDate && !stockItem.manufactureDate) stockItem.manufactureDate = new Date(manufactureDate);
    if (expiryDate && !stockItem.expiryDate) stockItem.expiryDate = new Date(expiryDate);
    const totalQty = stockItem.quantities.onHand + quantity;
    stockItem.costPerUnit = totalQty > 0 ? +(((stockItem.quantities.onHand * stockItem.costPerUnit) + (quantity * costPerUnit)) / totalQty).toFixed(2) : costPerUnit;
    stockItem.quantities.onHand += quantity;
  }
  stockItem.lastMovementDate = new Date();
  await stockItem.save();
  const movement = new StockMovement({ productId, productCode: product.productCode, productName: product.name, batchNumber, movementType, direction: "in", quantity, unitOfMeasure: product.unitOfMeasure, warehouseId, costPerUnit, totalCost: +(quantity * costPerUnit).toFixed(2), balanceBefore, balanceAfter: stockItem.quantities.onHand, sourceDocument, reason, notes, performedBy: userId });
  await movement.save();
  if (movementType === "purchase_receipt" || movementType === "opening_stock") await Product.findByIdAndUpdate(productId, { "costs.lastPurchaseCost": costPerUnit, "costs.averageCost": stockItem.costPerUnit });
  return { stockItem, movement };
}

export async function decreaseStock({ productId, warehouseId, quantity, movementType, batchNumber = null, sourceDocument, reason, notes, userId, session, allowNegative = false }) {
  if (!quantity || quantity <= 0) throw new Error("Quantity must be greater than 0");
  const stockItem = await StockItem.findOne({ productId, warehouseId, batchNumber });
  if (!stockItem) throw new Error("No stock found for this product in the selected warehouse");
  const balanceBefore = stockItem.quantities.onHand;
  const available = stockItem.quantities.onHand - stockItem.quantities.reserved;
  if (!allowNegative && available < quantity) throw new Error(`Insufficient stock. Available: ${available} (On hand: ${stockItem.quantities.onHand}, Reserved: ${stockItem.quantities.reserved}), requested: ${quantity}`);
  stockItem.quantities.onHand -= quantity;
  stockItem.lastMovementDate = new Date();
  await stockItem.save();
  const product = await Product.findById(productId);
  const movement = new StockMovement({ productId, productCode: product?.productCode, productName: product?.name, batchNumber, movementType, direction: "out", quantity, unitOfMeasure: stockItem.unitOfMeasure, warehouseId, costPerUnit: stockItem.costPerUnit, totalCost: +(quantity * stockItem.costPerUnit).toFixed(2), balanceBefore, balanceAfter: stockItem.quantities.onHand, sourceDocument, reason, notes, performedBy: userId });
  await movement.save();
  return { stockItem, movement };
}

export async function decreaseStockWithFEFO({ productId, warehouseId, quantity, movementType, sourceDocument, reason, notes, userId, session, allowNegative = false }) {
  if (!quantity || quantity <= 0) throw new Error("Quantity must be greater than 0");

  const product = await Product.findById(productId);
  if (!product) throw new Error(`Product ${productId} not found`);

  if (!product.expiryTracking?.trackExpiry) {
    return decreaseStock({
      productId,
      warehouseId,
      quantity,
      movementType,
      batchNumber: null,
      sourceDocument,
      reason,
      notes,
      userId,
      session,
      allowNegative,
    });
  }

  const selections = await selectStockByFEFO(productId, warehouseId, quantity);

  const movements = [];
  const stockItems = [];

  for (const selection of selections) {
    const { stockItemId, batchNumber, quantity: qtyToDeduct, costPerUnit } = selection;

    const stockItem = await StockItem.findById(stockItemId);
    if (!stockItem) continue;

    const balanceBefore = stockItem.quantities.onHand;
    if (!allowNegative && stockItem.quantities.onHand < qtyToDeduct) {
      throw new Error(`Insufficient stock in batch ${batchNumber}. On hand: ${stockItem.quantities.onHand}, requested: ${qtyToDeduct}`);
    }

    stockItem.quantities.onHand -= qtyToDeduct;
    stockItem.lastMovementDate = new Date();
    await stockItem.save();

    const movement = new StockMovement({
      productId,
      productCode: product.productCode,
      productName: product.name,
      batchNumber,
      movementType,
      direction: "out",
      quantity: qtyToDeduct,
      unitOfMeasure: stockItem.unitOfMeasure,
      warehouseId,
      costPerUnit,
      totalCost: +(qtyToDeduct * costPerUnit).toFixed(2),
      balanceBefore,
      balanceAfter: stockItem.quantities.onHand,
      sourceDocument,
      reason: `${reason} (Batch: ${batchNumber || 'N/A'})`,
      notes,
      performedBy: userId,
    });

    await movement.save();

    movements.push(movement);
    stockItems.push(stockItem);
  }

  return { stockItems, movements };
}

export async function reserveStock({ productId, warehouseId, quantity, sourceDocument, userId, session }) {
  const stockItem = await StockItem.findOne({ productId, warehouseId, batchNumber: null });
  if (!stockItem) throw new Error("No stock found for product in selected warehouse");
  const available = stockItem.quantities.onHand - stockItem.quantities.reserved;
  if (available < quantity) throw new Error(`Insufficient available stock. Available: ${available}, requested: ${quantity}`);
  stockItem.quantities.reserved += quantity;
  await stockItem.save();
  const reservation = new StockReservation({ productId, warehouseId, quantity, unitOfMeasure: stockItem.unitOfMeasure, sourceDocument, reservedBy: userId });
  await reservation.save();
  return { stockItem, reservation };
}

export async function releaseReservations({ sourceDocumentId, reason = "", session }) {
  const reservations = await StockReservation.find({ "sourceDocument.id": sourceDocumentId, status: "active" });
  for (const reservation of reservations) {
    const item = await StockItem.findOne({ productId: reservation.productId, warehouseId: reservation.warehouseId, batchNumber: reservation.batchNumber });
    if (item) { item.quantities.reserved = Math.max(0, item.quantities.reserved - reservation.quantity); await item.save(); }
    reservation.status = "cancelled"; reservation.cancelledAt = new Date(); reservation.cancellationReason = reason;
    await reservation.save();
  }
  return reservations.length;
}

export async function fulfillReservations({ sourceDocumentId, sourceDocumentNumber, userId, session }) {
  const reservations = await StockReservation.find({ "sourceDocument.id": sourceDocumentId, status: "active" });
  for (const reservation of reservations) {
    const item = await StockItem.findOne({ productId: reservation.productId, warehouseId: reservation.warehouseId, batchNumber: reservation.batchNumber });
    // Release reservation count before decreaseStock so the available check passes correctly
    if (item) { item.quantities.reserved = Math.max(0, item.quantities.reserved - reservation.quantity); await item.save(); }
    // decreaseStock handles its own save — no double-save needed
    await decreaseStock({ productId: reservation.productId, warehouseId: reservation.warehouseId, quantity: reservation.quantity, movementType: "sale_dispatch", batchNumber: reservation.batchNumber, sourceDocument: { type: "sales_order", id: sourceDocumentId, number: sourceDocumentNumber }, userId, session, allowNegative: false });
    reservation.status = "fulfilled"; reservation.fulfilledAt = new Date(); await reservation.save();
  }
  return reservations.length;
}

export async function getAvailableStock(productId, warehouseId) {
  // Aggregate across all batches (including non-batched) to get total stock
  const items = await StockItem.find({ productId, warehouseId });
  if (!items.length) return { onHand: 0, reserved: 0, available: 0 };
  const onHand = items.reduce((sum, i) => sum + i.quantities.onHand, 0);
  const reserved = items.reduce((sum, i) => sum + i.quantities.reserved, 0);
  return { onHand: +onHand.toFixed(2), reserved: +reserved.toFixed(2), available: +Math.max(0, onHand - reserved).toFixed(2) };
}
