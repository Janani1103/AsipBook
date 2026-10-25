import { apiHandler } from "../../../../../server/http/handler.js";
import {
  getSupplierLedger,
  getSupplierStatement,
} from "../../../../../server/services/supplierLedgerService.js";

export const runtime = "nodejs";

export const GET = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const type = searchParams.get("type") || "ledger";

  if (type === "statement") {
    return getSupplierStatement(id, { startDate, endDate });
  }

  return getSupplierLedger(id, { startDate, endDate });
}, { auth: true });
