import { apiHandler } from "../../../../server/http/handler.js";
import { getPromotionById, updatePromotion, deletePromotion } from "../../../../server/services/promotionService.js";

export const runtime = "nodejs";
export const GET = apiHandler(getPromotionById, { auth: true });
export const PUT = apiHandler(updatePromotion, {
  auth: true,
  roles: ["admin", "manager"],
});
export const DELETE = apiHandler(deletePromotion, {
  auth: true,
  roles: ["admin", "manager"],
});
