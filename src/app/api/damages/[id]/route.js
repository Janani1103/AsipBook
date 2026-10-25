import { apiHandler } from "../../../../server/http/handler.js";
import { getDamageById, updateDamage, deleteDamage } from "../../../../server/services/damageApiService.js";
export const runtime = "nodejs";
export const GET = apiHandler(getDamageById, { auth: true });
export const PUT = apiHandler(updateDamage, { auth: true, roles: ["admin", "manager", "warehouse_staff"] });
export const DELETE = apiHandler(deleteDamage, { auth: true, roles: ["admin", "manager"] });
