import "server-only";
import StockItem from "../models/StockItem.js";
import Product from "../models/Product.js";

export const selectStockByFEFO = async (productId, warehouseId, quantity) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error("Product not found");
  }

  if (!product.expiryTracking?.trackExpiry) {
    const stockItem = await StockItem.findOne({
      productId,
      warehouseId,
      "quantities.available": { $gte: quantity },
    }).sort({ createdAt: 1 });

    if (!stockItem) {
      throw new Error("Insufficient stock");
    }

    return [
      {
        stockItemId: stockItem._id,
        batchNumber: stockItem.batchNumber,
        quantity,
        expiryDate: stockItem.expiryDate,
        manufactureDate: stockItem.manufactureDate,
        costPerUnit: stockItem.costPerUnit,
      },
    ];
  }

  const stockItems = await StockItem.find({
    productId,
    warehouseId,
    "quantities.available": { $gt: 0 },
    expiryDate: { $ne: null },
  })
    .sort({ expiryDate: 1 })
    .lean();

  if (stockItems.length === 0) {
    const nonExpiryStock = await StockItem.find({
      productId,
      warehouseId,
      "quantities.available": { $gt: 0 },
      expiryDate: null,
    }).sort({ createdAt: 1 });

    if (nonExpiryStock.length === 0) {
      throw new Error("Insufficient stock");
    }

    const stockItem = nonExpiryStock[0];
    if (stockItem.quantities.available < quantity) {
      throw new Error("Insufficient stock");
    }

    return [
      {
        stockItemId: stockItem._id,
        batchNumber: stockItem.batchNumber,
        quantity,
        expiryDate: stockItem.expiryDate,
        manufactureDate: stockItem.manufactureDate,
        costPerUnit: stockItem.costPerUnit,
      },
    ];
  }

  const selections = [];
  let remainingQuantity = quantity;

  for (const stockItem of stockItems) {
    if (remainingQuantity <= 0) break;

    const availableQuantity = stockItem.quantities.available;
    const quantityToTake = Math.min(availableQuantity, remainingQuantity);

    selections.push({
      stockItemId: stockItem._id,
      batchNumber: stockItem.batchNumber,
      quantity: quantityToTake,
      expiryDate: stockItem.expiryDate,
      manufactureDate: stockItem.manufactureDate,
      costPerUnit: stockItem.costPerUnit,
    });

    remainingQuantity -= quantityToTake;
  }

  if (remainingQuantity > 0) {
    const nonExpiryStock = await StockItem.find({
      productId,
      warehouseId,
      "quantities.available": { $gt: 0 },
      expiryDate: null,
    }).sort({ createdAt: 1 });

    for (const stockItem of nonExpiryStock) {
      if (remainingQuantity <= 0) break;

      const availableQuantity = stockItem.quantities.available;
      const quantityToTake = Math.min(availableQuantity, remainingQuantity);

      selections.push({
        stockItemId: stockItem._id,
        batchNumber: stockItem.batchNumber,
        quantity: quantityToTake,
        expiryDate: stockItem.expiryDate,
        manufactureDate: stockItem.manufactureDate,
        costPerUnit: stockItem.costPerUnit,
      });

      remainingQuantity -= quantityToTake;
    }
  }

  if (remainingQuantity > 0) {
    throw new Error("Insufficient stock");
  }

  return selections;
};

export const getExpiringStock = async (warehouseId, daysThreshold = 3) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thresholdDate = new Date(today);
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  const expiringStock = await StockItem.find({
    warehouseId,
    expiryDate: { $ne: null, $lte: thresholdDate },
    "quantities.available": { $gt: 0 },
  })
    .populate("productId", "name productCode")
    .sort({ expiryDate: 1 })
    .lean();

  const expired = [];
  const expiringToday = [];
  const expiringSoon = [];

  expiringStock.forEach((stock) => {
    const expiryDate = new Date(stock.expiryDate);
    expiryDate.setHours(0, 0, 0, 0);

    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      expired.push({
        ...stock,
        daysUntilExpiry,
        status: "expired",
      });
    } else if (daysUntilExpiry === 0) {
      expiringToday.push({
        ...stock,
        daysUntilExpiry,
        status: "expiring_today",
      });
    } else {
      expiringSoon.push({
        ...stock,
        daysUntilExpiry,
        status: "expiring_soon",
      });
    }
  });

  return {
    expired,
    expiringToday,
    expiringSoon,
    total: expiringStock.length,
  };
};

export const getLowStockItems = async (warehouseId) => {
  const lowStockItems = await StockItem.find({
    warehouseId,
    "quantities.available": { $gt: 0 },
  })
    .populate("productId", "name productCode stockLevels")
    .lean();

  const lowStock = lowStockItems.filter((stock) => {
    const reorderLevel = stock.productId?.stockLevels?.reorderLevel || 0;
    return stock.quantities.available <= reorderLevel;
  });

  return lowStock;
};

export const calculateExpiryDate = (manufactureDate, expiryType, customDays) => {
  if (!manufactureDate) return null;

  const mfgDate = new Date(manufactureDate);
  const expiryDate = new Date(mfgDate);

  switch (expiryType) {
    case "same_day":
      expiryDate.setDate(mfgDate.getDate());
      break;
    case "daily":
      expiryDate.setDate(mfgDate.getDate() + 1);
      break;
    case "weekly":
      expiryDate.setDate(mfgDate.getDate() + 7);
      break;
    case "monthly":
      expiryDate.setMonth(mfgDate.getMonth() + 1);
      break;
    case "custom_days":
      if (customDays && customDays > 0) {
        expiryDate.setDate(mfgDate.getDate() + customDays);
      }
      break;
    default:
      return null;
  }

  return expiryDate;
};
