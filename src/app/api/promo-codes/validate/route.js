import { apiHandler } from "../../../../server/http/handler.js";
import { validatePromoCode } from "../../../../server/services/promoCodeService.js";

export const runtime = "nodejs";
export const POST = apiHandler(validatePromoCode, { auth: true });
