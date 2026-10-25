import { apiHandler } from "../../../../server/http/handler.js";
import { validateGiftVoucher } from "../../../../server/services/giftVoucherService.js";

export const runtime = "nodejs";
export const POST = apiHandler(validateGiftVoucher, { auth: true });
