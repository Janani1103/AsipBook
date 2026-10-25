import { apiHandler } from "../../../../../server/http/handler.js";
import { convertQuotationToSalesOrder } from "../../../../../server/services/quotationApiService.js";
export const runtime = "nodejs";
export const POST = apiHandler(convertQuotationToSalesOrder, { auth: true, roles: ["admin", "manager", "sales_manager", "sales_rep"] });
