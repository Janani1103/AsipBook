import { apiHandler } from "../../../server/http/handler.js";
import { createQuotation, getQuotations } from "../../../server/services/quotationApiService.js";
import { createQuotationSchema } from "../../../server/validators/quotationValidator.js";
export const runtime = "nodejs";
export const GET = apiHandler(getQuotations, { auth: true });
export const POST = apiHandler(createQuotation, { auth: true, roles: ["admin", "manager", "sales_manager", "sales_rep"], schema: createQuotationSchema });
