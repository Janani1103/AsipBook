import { apiHandler } from "../../../../../server/http/handler.js";
import { receivePaymentForQuotation } from "../../../../../server/services/quotationApiService.js";

export const runtime = "nodejs";

export const POST = apiHandler(receivePaymentForQuotation, { auth: true, roles: ["admin", "manager", "sales_manager", "sales_rep", "accountant"] });
