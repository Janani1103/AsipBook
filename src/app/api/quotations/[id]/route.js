import { apiHandler } from "../../../../server/http/handler.js";
import { deleteQuotation, getQuotationById, updateQuotation } from "../../../../server/services/quotationApiService.js";
import { updateQuotationSchema } from "../../../../server/validators/quotationValidator.js";
export const runtime = "nodejs";
export const GET = apiHandler(getQuotationById, { auth: true });
export const PUT = apiHandler(updateQuotation, { auth: true, roles: ["admin", "manager", "sales_manager", "sales_rep"], schema: updateQuotationSchema });
export const DELETE = apiHandler(deleteQuotation, { auth: true, roles: ["admin", "manager", "sales_manager", "sales_rep"] });
