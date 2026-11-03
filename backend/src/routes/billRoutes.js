import express from 'express';
import {
    createBill, createFromGrn, getBills, getBillById,
    getPayablesAging, changeBillStatus,
} from '../controllers/billController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createBillSchema, createFromGrnSchema } from '../validators/billValidator.js';

const router = express.Router();
router.use(protect);

router.get('/aging/summary', getPayablesAging);

router
    .route('/')
    .get(getBills)
    .post(authorize('admin', 'manager', 'accountant'), validate(createBillSchema), createBill);

router.post('/from-grn',
    authorize('admin', 'manager', 'accountant'),
    validate(createFromGrnSchema),
    createFromGrn);

router.route('/:id').get(getBillById);
router.patch('/:id/status', authorize('admin', 'manager', 'accountant'), changeBillStatus);

export default router;