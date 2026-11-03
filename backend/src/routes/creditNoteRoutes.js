import express from 'express';
import {
    createCreditNote, getCreditNotes, getCreditNoteById, applyCreditNote,
} from '../controllers/creditNoteController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
    .get(getCreditNotes)
    .post(authorize('admin', 'manager', 'accountant'), createCreditNote);

router.route('/:id').get(getCreditNoteById);
router.post('/:id/apply', authorize('admin', 'manager', 'accountant'), applyCreditNote);

export default router;