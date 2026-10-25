import { apiHandler } from "../../../../../server/http/handler.js";
import { getExpiringStock, getLowStockItems } from "../../../../../server/services/fefoService.js";
import Warehouse from "../../../../../server/models/Warehouse.js";

export const runtime = "nodejs";

export const GET = apiHandler(async (req, context) => {
  const { searchParams } = new URL(req.url);
  const warehouseId = searchParams.get("warehouseId");
  const daysThreshold = parseInt(searchParams.get("days")) || 3;

  let targetWarehouseId = warehouseId;

  if (!targetWarehouseId) {
    const warehouses = await Warehouse.find({ status: "active" });
    if (warehouses.length === 0) {
      return {
        data: {
          expired: [],
          expiringToday: [],
          expiringSoon: [],
          expiredCount: 0,
          expiringTodayCount: 0,
          expiringSoonCount: 0,
          lowStockItems: [],
          lowStockCount: 0,
        },
      };
    }
    targetWarehouseId = warehouses[0]._id.toString();
  }

  const expiringStock = await getExpiringStock(targetWarehouseId, daysThreshold);
  const lowStockItems = await getLowStockItems(targetWarehouseId);

  return {
    data: {
      ...expiringStock,
      expiredCount: expiringStock.expired.length,
      expiringTodayCount: expiringStock.expiringToday.length,
      expiringSoonCount: expiringStock.expiringSoon.length,
      lowStockItems,
      lowStockCount: lowStockItems.length,
    },
  };
}, { auth: true });
