import { apiHandler } from "../../../server/http/handler.js";
import { createPromotion, getPromotions } from "../../../server/services/promotionService.js";

export const runtime = "nodejs";
export const GET = apiHandler(getPromotions, { auth: true });
export const POST = apiHandler(createPromotion, {
  auth: true,
  roles: ["admin", "manager"],
});
