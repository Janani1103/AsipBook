import { apiHandler } from "../../../../server/http/handler.js";
import { cancelGrn, getGrnById, updateGrn } from "../../../../server/services/grnApiService.js";
import { updateGrnSchema } from "../../../../server/validators/grnValidator.js";

export const runtime = "nodejs";
export const GET = apiHandler(getGrnById, { auth: true });
export const PUT = apiHandler(updateGrn, { auth: true, roles: ["admin", "manager", "warehouse_staff"], schema: updateGrnSchema });
export const DELETE = apiHandler(cancelGrn, { auth: true, roles: ["admin", "manager"] });

