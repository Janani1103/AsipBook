import { apiHandler } from "../../../../server/http/handler.js";
import { getPromoCodeById, updatePromoCode, deletePromoCode } from "../../../../server/services/promoCodeService.js";

export const runtime = "nodejs";
export const GET = apiHandler(getPromoCodeById, { auth: true });
export const PUT = apiHandler(updatePromoCode, {
  auth: true,
  roles: ["admin", "manager"],
});
export const DELETE = apiHandler(deletePromoCode, {
  auth: true,
  roles: ["admin", "manager"],
});
