import { apiHandler } from "../../../../server/http/handler.js";
import {
  getCreditNoteById,
  updateCreditNote,
  deleteCreditNote,
} from "../../../../server/services/creditNoteApiService.js";

export const runtime = "nodejs";
export const GET = apiHandler(getCreditNoteById, { auth: true });
export const PUT = apiHandler(updateCreditNote, {
  auth: true,
  roles: ["admin", "manager", "accountant"],
});
export const DELETE = apiHandler(deleteCreditNote, {
  auth: true,
  roles: ["admin", "manager"],
});

