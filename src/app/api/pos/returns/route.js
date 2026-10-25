import { apiHandler } from "../../../../server/http/handler.js";
import { processPosDirectReturn } from "../../../../server/services/posReturnApiService.js";

export const runtime = "nodejs";

export const POST = apiHandler(processPosDirectReturn, {
  auth: true,
});
