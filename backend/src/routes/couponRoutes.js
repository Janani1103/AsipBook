import express from 'express';
import {
    validateCoupon,
    getCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
} from '../controllers/couponController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/validate', validateCoupon);

router.route('/')
    .get(getCoupons)
    .post(authorize('admin', 'manager'), createCoupon);

router.route('/:id')
    .put(authorize('admin', 'manager'), updateCoupon)
    .delete(authorize('admin', 'manager'), deleteCoupon);

export default router;

