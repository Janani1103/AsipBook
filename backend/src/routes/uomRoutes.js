import express from 'express';
import {
    createUom,
    getUoms,
    updateUom,
    deleteUom,
} from '../controllers/uomController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createUomSchema, updateUomSchema } from '../validators/productValidator.js';

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(getUoms)
    .post(authorize('admin', 'manager'), validate(createUomSchema), createUom);

router
    .route('/:id')
    .put(authorize('admin', 'manager'), validate(updateUomSchema), updateUom)
    .delete(authorize('admin', 'manager'), deleteUom);

export default router;