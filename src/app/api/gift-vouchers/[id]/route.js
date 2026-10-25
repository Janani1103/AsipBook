import { apiHandler } from "../../../../server/http/handler.js";
import { getGiftVoucherById, updateGiftVoucher, deleteGiftVoucher } from "../../../../server/services/giftVoucherService.js";

export const runtime = "nodejs";
export const GET = apiHandler(getGiftVoucherById, { auth: true });
export const PUT = apiHandler(updateGiftVoucher, {
  auth: true,
  roles: ["admin", "manager"],
});
export const DELETE = apiHandler(deleteGiftVoucher, {
  auth: true,
  roles: ["admin", "manager"],
});
