import { apiHandler } from "../../../../server/http/handler.js";
import { calculateDiscounts } from "../../../../server/services/discountEngine.js";

const handler = async (req, res) => {
  const { items, customerId, paymentMethod, promoCode, voucherCode } = req.body;
  const result = await calculateDiscounts(items, customerId, paymentMethod, promoCode, voucherCode);
  res.json({ success: true, data: result });
};

export const runtime = "nodejs";
export const POST = apiHandler(handler, { auth: true });
