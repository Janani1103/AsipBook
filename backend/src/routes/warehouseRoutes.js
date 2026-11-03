import express from 'express';
import {
    createWarehouse, getWarehouses, getWarehouseById,
    updateWarehouse, deleteWarehouse,
} from '../controllers/warehouseController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createWarehouseSchema, updateWarehouseSchema } from '../validators/warehouseValidator.js';

const router = express.Router();
router.use(protect);

router
    .route('/')
    .get(getWarehouses)
    .post(authorize('admin', 'manager'), validate(createWarehouseSchema), createWarehouse);

router
    .route('/:id')
    .get(getWarehouseById)
    .put(authorize('admin', 'manager'), validate(updateWarehouseSchema), updateWarehouse)
    .delete(authorize('admin', 'manager'), deleteWarehouse);

export default router;