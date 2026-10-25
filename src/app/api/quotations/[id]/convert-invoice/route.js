import { apiHandler } from "../../../../../server/http/handler.js";
import { convertQuotationToInvoice } from "../../../../../server/services/quotationApiService.js";

export const runtime = "nodejs";

export const POST = apiHandler(convertQuotationToInvoice, { auth: true, roles: ["admin", "manager", "accountant", "sales_manager"] });
