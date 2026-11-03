import express from 'express';
import {
    createRepair, getRepairs, getRepairById, updateRepair,
    startRepair, completeRepair,
} from '../controllers/repairOrderController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
    .get(getRepairs)
    .post(authorize('admin', 'manager', 'warehouse_staff', 'production_staff'), createRepair);

router.route('/:id')
    .get(getRepairById)
    .put(authorize('admin', 'manager', 'warehouse_staff', 'production_staff'), updateRepair);

router.patch('/:id/start', authorize('admin', 'manager', 'warehouse_staff', 'production_staff'), startRepair);
router.patch('/:id/complete', authorize('admin', 'manager', 'warehouse_staff', 'production_staff'), completeRepair);

export default router;