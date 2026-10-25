import { apiHandler } from "../../../../server/http/handler.js";
import {
  getUnallocatedAdvances,
} from "../../../../server/services/supplierPaymentService.js";

export const runtime = "nodejs";

export const GET = apiHandler(async (req) => {
  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get("supplierId");

  if (!supplierId) {
    throw new Error("supplierId is required");
  }

  return getUnallocatedAdvances(supplierId);
}, { auth: true });
