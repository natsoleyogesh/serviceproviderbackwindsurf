const Transaction = require('../models/transaction.model');
const Booking = require('../models/Booking.model');
const axios = require('axios');

// Razorpay configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_AM8Edv0bZ6c7xR';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'qBtbMKV4h7ZrimyAoaqAZeyD';

/**
 * Create a new transaction
 */
const createTransaction = async (req, res) => {
    try {
        const { userId } = req.user;
        const { bookingId, amount, paymentMethod, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

        // Validate required fields
        if (!bookingId || !amount || !paymentMethod) {
            return res.status(400).json({ 
                success: false,
                message: 'Booking ID, amount and payment method are required' 
            });
        }

        // Check if booking exists
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ 
                success: false,
                message: 'Booking not found' 
            });
        }

        // Create transaction
        const transaction = new Transaction({
            user: userId,
            booking: bookingId,
            transactionId: razorpayPaymentId || `txn_${Date.now()}`,
            amount,
            paymentMethod,
            status: razorpayPaymentId ? 'captured' : 'created',
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature,
            metadata: req.body.metadata || {}
        });

        await transaction.save();

        // Update booking payment status if payment is captured
        if (razorpayPaymentId) {
            booking.paymentStatus = 'paid';
            booking.paymentId = razorpayPaymentId;
            await booking.save();
        }

        return res.status(201).json({
            success: true,
            data: transaction,
            message: 'Transaction created successfully'
        });

    } catch (error) {
        console.error('Create transaction error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error creating transaction',
            error: error.message
        });
    }
};

/**
 * Get all transactions with pagination and filters
 */
const getAllTransactions = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, paymentMethod, userId, bookingId } = req.query;
        const skip = (page - 1) * limit;

        // Build filters
        const filter = { isDeleted: false };
        if (status) filter.status = status;
        if (paymentMethod) filter.paymentMethod = paymentMethod;
        if (userId) filter.user = userId;
        if (bookingId) filter.booking = bookingId;

        // Get transactions with pagination
        const [transactions, total] = await Promise.all([
            Transaction.find(filter)
                .populate('user', 'name email phone')
                .populate('booking', 'bookingNumber service')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Transaction.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            data: transactions,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: Number(limit)
            }
        });

    } catch (error) {
        console.error('Get all transactions error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching transactions',
            error: error.message
        });
    }
};

/**
 * Get transaction by ID
 */
const getTransactionById = async (req, res) => {
    try {
        const { id } = req.params;

        const transaction = await Transaction.findById(id)
            .populate('user', 'name email phone')
            .populate('booking', 'bookingNumber service');

        if (!transaction || transaction.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: transaction
        });

    } catch (error) {
        console.error('Get transaction by ID error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching transaction',
            error: error.message
        });
    }
};

/**
 * Update transaction status
 */
const updateTransactionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, metadata } = req.body;

        const transaction = await Transaction.findById(id);
        if (!transaction || transaction.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Update status if provided
        if (status) {
            transaction.status = status;
        }

        // Update metadata if provided
        if (metadata) {
            transaction.metadata = { ...transaction.metadata, ...metadata };
        }

        await transaction.save();

        return res.status(200).json({
            success: true,
            data: transaction,
            message: 'Transaction updated successfully'
        });

    } catch (error) {
        console.error('Update transaction error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating transaction',
            error: error.message
        });
    }
};

/**
 * Get Razorpay payment details
 */
const getRazorpayPaymentDetails = async (req, res) => {
    try {
        const { paymentId } = req.params;

        if (!paymentId) {
            return res.status(400).json({
                success: false,
                message: 'Payment ID is required'
            });
        }

        // Basic authentication for Razorpay API
        const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

        // Make request to Razorpay API
        const response = await axios.get(`https://api.razorpay.com/v1/payments/${paymentId}`, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });

        // Extract relevant payment details
        const paymentDetails = {
            id: response.data.id,
            amount: response.data.amount / 100, // Convert from paisa to rupees
            currency: response.data.currency,
            status: response.data.status,
            method: response.data.method || 'online',
            card: response.data.card ? {
                last4: response.data.card.last4,
                network: response.data.card.network,
                type: response.data.card.type,
                issuer: response.data.card.issuer
            } : null,
            bank: response.data.bank,
            wallet: response.data.wallet,
            vpa: response.data.vpa,
            email: response.data.email,
            contact: response.data.contact,
            fee: response.data.fee ? response.data.fee / 100 : 0,
            tax: response.data.tax ? response.data.tax / 100 : 0,
            created_at: response.data.created_at,
            captured_at: response.data.captured_at
        };

        return res.status(200).json({
            success: true,
            data: paymentDetails
        });

    } catch (error) {
        console.error('Get payment details error:', error.response?.data || error.message);

        // Handle specific Razorpay API errors
        if (error.response?.status === 404) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found on Razorpay'
            });
        }

        if (error.response?.status === 401) {
            return res.status(500).json({
                success: false,
                message: 'Invalid Razorpay API credentials'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Error fetching payment details',
            error: error.response?.data?.error?.description || error.message
        });
    }
};

/**
 * Verify Razorpay payment signature
 */
const verifyRazorpaySignature = (params) => {
    try {
        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
        hmac.update(params.razorpay_order_id + '|' + params.razorpay_payment_id);
        const generatedSignature = hmac.digest('hex');
        return generatedSignature === params.razorpay_signature;
    } catch (error) {
        console.error('Verify signature error:', error);
        return false;
    }
};

module.exports = {
    createTransaction,
    getAllTransactions,
    getTransactionById,
    updateTransactionStatus,
    getRazorpayPaymentDetails,
    verifyRazorpaySignature
};
