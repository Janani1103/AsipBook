import { apiHandler } from "../../../server/http/handler.js";
import {
  createSupplierPayment,
  getSupplierPayments,
} from "../../../server/services/supplierPaymentService.js";

export const runtime = "nodejs";

export const GET = apiHandler(async (req) => {
  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get("supplierId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const paymentType = searchParams.get("paymentType");

  if (!supplierId) {
    throw new Error("supplierId is required");
  }

  return getSupplierPayments(supplierId, { startDate, endDate, paymentType });
}, { auth: true });

export const POST = apiHandler(createSupplierPayment, {
  auth: true,
  roles: ["admin", "manager", "accountant"],
});
