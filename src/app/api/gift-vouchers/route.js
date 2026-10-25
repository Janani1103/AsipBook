import { apiHandler } from "../../../server/http/handler.js";
import { createGiftVoucher, getGiftVouchers } from "../../../server/services/giftVoucherService.js";

export const runtime = "nodejs";
export const GET = apiHandler(getGiftVouchers, { auth: true });
export const POST = apiHandler(createGiftVoucher, {
  auth: true,
  roles: ["admin", "manager"],
});
