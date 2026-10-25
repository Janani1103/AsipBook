import { apiHandler } from "../../../server/http/handler.js";
import {
  addProductSupplier,
  getProductSuppliers,
} from "../../../server/services/productSupplierService.js";

export const runtime = "nodejs";

export const GET = apiHandler(async (req) => {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");

  if (!productId) {
    throw new Error("productId is required");
  }

  return getProductSuppliers(productId);
}, { auth: true });

export const POST = apiHandler(addProductSupplier, {
  auth: true,
  roles: ["admin", "manager", "purchasing"],
});
