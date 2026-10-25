import { apiHandler } from "../../../../server/http/handler.js";
import {
  updateSupplierPayment,
  deleteSupplierPayment,
} from "../../../../server/services/supplierPaymentService.js";

export const runtime = "nodejs";

export const PUT = apiHandler(updateSupplierPayment, {
  auth: true,
  roles: ["admin", "manager", "accountant"],
});

export const DELETE = apiHandler(deleteSupplierPayment, {
  auth: true,
  roles: ["admin", "manager"],
});
