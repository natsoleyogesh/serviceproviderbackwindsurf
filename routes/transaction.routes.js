const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { protect } = require('../middleware/auth.middleware');
// const { protect, authorize } = require('../middleware/auth');

// Public routes (if any)

// Protected routes (require authentication)
router.use(protect);

// Create a new transaction
router.post('/', transactionController.createTransaction);

// Get all transactions (with filters)
router.get('/', transactionController.getAllTransactions);

// Get transaction by ID
router.get('/:id', transactionController.getTransactionById);

// Update transaction status
router.patch('/:id/status', transactionController.updateTransactionStatus);

// Razorpay specific routes
router.get('/razorpay/:paymentId', transactionController.getRazorpayPaymentDetails);

// Admin only routes
// router.use(authorize(['admin']));

// Add any admin-only transaction routes here

module.exports = router;
