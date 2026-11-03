import express from 'express';
import {
    createCustomerGroup, getCustomerGroups, getCustomerGroupById,
    updateCustomerGroup, deleteCustomerGroup,
} from '../controllers/customerGroupController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
    createCustomerGroupSchema, updateCustomerGroupSchema,
} from '../validators/customerValidator.js';

const router = express.Router();
router.use(protect);

router
    .route('/')
    .get(getCustomerGroups)
    .post(authorize('admin', 'manager'), validate(createCustomerGroupSchema), createCustomerGroup);

router
    .route('/:id')
    .get(getCustomerGroupById)
    .put(authorize('admin', 'manager'), validate(updateCustomerGroupSchema), updateCustomerGroup)
    .delete(authorize('admin', 'manager'), deleteCustomerGroup);

export default router;