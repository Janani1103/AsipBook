import { apiHandler } from "../../../../server/http/handler.js";
import {
  deleteCheque,
  getChequeById,
  updateCheque,
} from "../../../../server/services/chequeApiService.js";

export const runtime = "nodejs";

export const GET = apiHandler(getChequeById, { auth: true });
export const PUT = apiHandler(updateCheque, { auth: true });
export const DELETE = apiHandler(deleteCheque, { auth: true });
