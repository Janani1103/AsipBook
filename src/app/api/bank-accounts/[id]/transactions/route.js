import { apiHandler } from "../../../../../server/http/handler.js";
import { getBankAccountTransactions } from "../../../../../server/services/bankAccountApiService.js";

export const runtime = "nodejs";

export const GET = apiHandler(getBankAccountTransactions, { auth: true });
