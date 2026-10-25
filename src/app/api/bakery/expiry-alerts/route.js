import "server-only";
import { NextResponse } from "next/server";
import { getExpiringStock, getLowStockItems } from "../../../../server/services/fefoService.js";
import Warehouse from "../../../../server/models/Warehouse.js";
import { verifyAuth } from "../../../../server/auth/guards.js";

export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouseId");
    const daysThreshold = parseInt(searchParams.get("daysThreshold")) || 3;

    if (!warehouseId) {
      const warehouses = await Warehouse.find({ status: "active" });
      if (warehouses.length === 0) {
        return NextResponse.json({ error: "No warehouses found" }, { status: 404 });
      }
      warehouseId = warehouses[0]._id.toString();
    }

    const expiringStock = await getExpiringStock(warehouseId, daysThreshold);
    const lowStockItems = await getLowStockItems(warehouseId);

    return NextResponse.json({
      expiringStock,
      lowStockItems,
      summary: {
        expiredCount: expiringStock.expired.length,
        expiringTodayCount: expiringStock.expiringToday.length,
        expiringSoonCount: expiringStock.expiringSoon.length,
        lowStockCount: lowStockItems.length,
      },
    });
  } catch (error) {
    console.error("Error fetching expiry alerts:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch expiry alerts" },
      { status: 500 }
    );
  }
}
