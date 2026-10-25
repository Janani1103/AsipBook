import { apiHandler } from "../../../../server/http/handler.js";
import {
  deleteExpense,
  getExpenseById,
  updateExpense,
} from "../../../../server/services/expenseApiService.js";

export const runtime = "nodejs";

export const GET = apiHandler(getExpenseById, {
  auth: true,
  roles: ["admin", "manager", "accountant", "cashier"],
});

export const PUT = apiHandler(updateExpense, {
  auth: true,
  roles: ["admin", "manager", "accountant"],
});

export const DELETE = apiHandler(deleteExpense, {
  auth: true,
  roles: ["admin", "manager", "accountant"],
});
