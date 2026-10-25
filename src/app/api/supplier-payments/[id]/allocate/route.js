import { apiHandler } from "../../../../../server/http/handler.js";
import {
  allocatePayment,
} from "../../../../../server/services/supplierPaymentService.js";

export const runtime = "nodejs";

export const POST = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const body = await req.json();
  const { allocations } = body;

  if (!allocations || !Array.isArray(allocations)) {
    throw new Error("allocations array is required");
  }

  return allocatePayment(id, allocations);
}, { auth: true, roles: ["admin", "manager", "accountant"] });
