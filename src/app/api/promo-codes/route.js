import { apiHandler } from "../../../server/http/handler.js";
import { createPromoCode, getPromoCodes } from "../../../server/services/promoCodeService.js";

export const runtime = "nodejs";
export const GET = apiHandler(getPromoCodes, { auth: true });
export const POST = apiHandler(createPromoCode, {
  auth: true,
  roles: ["admin", "manager"],
});
