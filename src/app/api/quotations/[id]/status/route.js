import { apiHandler } from "../../../../../server/http/handler.js";
import { changeQuotationStatus } from "../../../../../server/services/quotationApiService.js";
export const runtime = "nodejs";
export const PATCH = apiHandler(changeQuotationStatus, { auth: true, roles: ["admin", "manager", "sales_manager", "sales_rep"] });
