import { apiHandler } from "../../../../../server/http/handler.js";
import { getQuotationPrintJson } from "../../../../../server/services/quotationApiService.js";

export const runtime = "nodejs";

export const GET = apiHandler(getQuotationPrintJson);
