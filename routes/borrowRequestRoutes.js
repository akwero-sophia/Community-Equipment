const express = require('express');
const controller = require('../controllers/borrowRequestController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.get('/', controller.getBorrowRequests);
router.post('/', controller.createBorrowRequest);
router.patch('/:id/review', requireAdmin, controller.reviewBorrowRequest);
router.patch('/:id/return', controller.returnBorrowRequest);

module.exports = router;
