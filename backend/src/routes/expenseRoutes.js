import express from 'express';
import { createExpense, getExpenses, deleteExpense, getExpenseCategories, updateExpenseStatus } from '../controllers/expenseController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/categories', getExpenseCategories);

router.route('/')
    .post(createExpense)
    .get(getExpenses);

router.route('/:id')
    .delete(authorize('admin', 'manager', 'accountant'), deleteExpense);

router.put('/:id/status', authorize('admin', 'manager', 'accountant'), updateExpenseStatus);

export default router;
