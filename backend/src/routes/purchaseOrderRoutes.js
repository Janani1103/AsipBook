import express from 'express';
import {
    createPurchaseOrder, getPurchaseOrders, getPurchaseOrderById,
    updatePurchaseOrder, changePurchaseOrderStatus, deletePurchaseOrder,
} from '../controllers/purchaseOrderController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createPurchaseOrderSchema, updatePurchaseOrderSchema } from '../validators/purchaseOrderValidator.js';

const router = express.Router();
router.use(protect);

router
    .route('/')
    .get(getPurchaseOrders)
    .post(authorize('admin', 'manager', 'accountant'), validate(createPurchaseOrderSchema), createPurchaseOrder);

router
    .route('/:id')
    .get(getPurchaseOrderById)
    .put(authorize('admin', 'manager', 'accountant'), validate(updatePurchaseOrderSchema), updatePurchaseOrder)
    .delete(authorize('admin', 'manager'), deletePurchaseOrder);

router.patch('/:id/status',
    authorize('admin', 'manager', 'accountant'),
    changePurchaseOrderStatus
);

export default router;