import express from 'express';
import {
    createBrand,
    getBrands,
    getBrandById,
    updateBrand,
    deleteBrand,
} from '../controllers/brandController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createBrandSchema, updateBrandSchema } from '../validators/productValidator.js';

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(getBrands)
    .post(authorize('admin', 'manager'), validate(createBrandSchema), createBrand);

router
    .route('/:id')
    .get(getBrandById)
    .put(authorize('admin', 'manager'), validate(updateBrandSchema), updateBrand)
    .delete(authorize('admin', 'manager'), deleteBrand);

export default router;