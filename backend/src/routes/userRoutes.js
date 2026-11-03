import express from 'express';
import { getUsers, getUserById, updateUser, deleteUser } from '../controllers/userController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/').get(getUsers);
router.route('/:id')
    .get(getUserById)
    .put(authorize('admin'), updateUser)
    .delete(authorize('admin'), deleteUser);

export default router;