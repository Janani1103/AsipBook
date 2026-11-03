import express from 'express';
import {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
} from '../controllers/categoryController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
    createCategorySchema,
    updateCategorySchema,
} from '../validators/productValidator.js';

const router = express.Router();

router.use(protect); // all routes require auth

router
    .route('/')
    .get(getCategories)
    .post(authorize('admin', 'manager'), validate(createCategorySchema), createCategory);

router
    .route('/:id')
    .get(getCategoryById)
    .put(authorize('admin', 'manager'), validate(updateCategorySchema), updateCategory)
    .delete(authorize('admin', 'manager'), deleteCategory);

export default router;