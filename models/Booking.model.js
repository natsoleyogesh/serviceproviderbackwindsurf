const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    serviceProvider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceProvider',
        default: null
    },
    items: [{
        subSubSubService: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SubSubSubService',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        },
        total: {
            type: Number,
            required: true
        }
    }],
    status: {
        type: String,
        enum: ['created', 'accepted', 'pending', 'completed', 'canceled', 'in_progress'],
        default: 'pending'
    },
    paymentMode: {
        type: String,
        enum: ['credit_card', 'debit_card', 'paypal', 'cash', 'other', 'netbanking', 'card', 'razorpay', ''],
        default: ''
    },
    itemTotal: {
        type: Number,
        required: true
    },
    visitationFee: {
        type: Number,
        required: true
    },
    taxesAndFees: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    amountToPay: {
        type: Number,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    scheduledAt: {
        type: Date
    },
    address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address'
    },
    notes: {
        type: String,
        default: ""
    },
    verificationOtp: {
        type: String,
        default: null
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
bookingSchema.index({ user: 1 });
bookingSchema.index({ serviceProvider: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ isDeleted: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
