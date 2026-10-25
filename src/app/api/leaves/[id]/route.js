import { apiHandler } from "../../../../server/http/handler.js";
import {
  getLeaveRequestById,
  updateLeaveRequest,
  deleteLeaveRequest,
} from "../../../../server/services/hrApiService.js";

export const runtime = "nodejs";

export const GET = apiHandler(getLeaveRequestById, { auth: true });
export const PUT = apiHandler(updateLeaveRequest, { auth: true });
export const DELETE = apiHandler(deleteLeaveRequest, { auth: true });
