const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
    },
    transactionId: {
        type: String,
        required: true,
        unique: true
    },
    paymentDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    paymentMethod: {
        type: String,
        enum: ['credit_card', 'debit_card', 'netbanking', 'upi', 'wallet', 'emi', 'card', 'razorpay', 'cash'],
        required: true
    },
    status: {
        type: String,
        enum: ['created', 'authorized', 'captured', 'refunded', 'failed'],
        default: 'created'
    },
    razorpayPaymentId: String,
    razorpayOrderId: String,
    razorpaySignature: String,
    isDeleted: {
        type: Boolean,
        default: false
    },
    metadata: {
        type: Object,
        default: {}
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
transactionSchema.index({ user: 1 });
transactionSchema.index({ booking: 1 });
transactionSchema.index({ transactionId: 1 }, { unique: true });
transactionSchema.index({ status: 1 });
transactionSchema.index({ paymentDate: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
