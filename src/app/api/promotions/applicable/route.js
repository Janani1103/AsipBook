import { apiHandler } from "../../../../server/http/handler.js";
import { getApplicablePromotions } from "../../../../server/services/promotionService.js";

export const runtime = "nodejs";
export const POST = apiHandler(getApplicablePromotions, { auth: true });
