import express from 'express';
import { register, login, getMe, logout, changePassword, verifyAdmin } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { registerSchema, loginSchema } from '../validators/authValidator.js';

const router = express.Router();

// Register: first user is public (becomes admin), rest need auth
// The controller handles this logic — we conditionally apply `protect`
// Register: public can create first user (admin) or customer account; authenticated admins can create any role
router.post('/register', (req, res, next) => {
    // Optional auth: if token is present, decode it so req.user is set
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
        return protect(req, res, () => validate(registerSchema)(req, res, next));
    }
    return validate(registerSchema)(req, res, next);
}, register);

router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.post('/change-password', protect, changePassword);
router.post('/verify-admin', protect, verifyAdmin);

export default router;