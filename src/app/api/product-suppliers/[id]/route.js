import { apiHandler } from "../../../../server/http/handler.js";
import {
  updateProductSupplier,
  deleteProductSupplier,
} from "../../../../server/services/productSupplierService.js";

export const runtime = "nodejs";

export const PUT = apiHandler(updateProductSupplier, {
  auth: true,
  roles: ["admin", "manager", "purchasing"],
});

export const DELETE = apiHandler(deleteProductSupplier, {
  auth: true,
  roles: ["admin", "manager"],
});
