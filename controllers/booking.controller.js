const Booking = require('../models/Booking.model');
const Cart = require('../models/Cart.model');
const User = require('../models/User.model');
const ServiceProvider = require('../models/ServiceProvider.model');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { sendEmail } = require('../utils/email');
// const sendEmail = require('../utils/email');

// @desc    Create a new booking from cart
// @route   POST /api/v1/bookings
// @access  Private
exports.createBooking = catchAsync(async (req, res, next) => {
    const { cartId, paymentMode, addressId, notes } = req.body;
    const { userId } = req.user;

    // Validate request
    if (!cartId || !addressId) {
        return next(new AppError('Cart ID and address ID are required', 400));
    }

    // Get cart with populated items
    const cart = await Cart.findOne({ _id: cartId, user: userId })
        .populate('items.subSubSubService');
    
    if (!cart) {
        return next(new AppError('No cart found with that ID', 404));
    }

    // Create booking
    const booking = await Booking.create({
        user: userId,
        items: cart.items.map(item => ({
            subSubSubService: item.subSubSubService._id,
            quantity: item.quantity,
            price: item.price,
            total: item.total
        })),
        status: 'created',
        paymentMode: paymentMode || '',
        itemTotal: cart.items.reduce((sum, item) => sum + item.total, 0),
        visitationFee: cart.visitationFee,
        taxesAndFees: cart.taxesAndFees,
        totalAmount: cart.totalAmount,
        amountToPay: cart.amountToPay,
        paymentStatus: 'pending',
        address: addressId,
        notes: notes || ''
    });

    // Remove cart after successful booking
    await Cart.findByIdAndDelete(cartId);

    // Populate the booking for response
    const populatedBooking = await Booking.findById(booking._id)
        .populate('user', 'name email phone')
        .populate('items.subSubSubService')
        .populate('address');

    res.status(201).json({
        status: 'success',
        data: {
            booking: populatedBooking
        }
    });
});

// @desc    Get all bookings (admin)
// @route   GET /api/v1/bookings
// @access  Private/Admin
exports.getAllBookings = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
        Booking.find({ isDeleted: false })
            .populate('user', 'name email')
            .populate('serviceProvider', 'user')
            .populate('items.subSubSubService')
            .populate('address')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Booking.countDocuments({ isDeleted: false })
    ]);

    res.status(200).json({
        status: 'success',
        results: bookings.length,
        total,
        data: {
            bookings
        }
    });
});

// @desc    Get booking details
// @route   GET /api/v1/bookings/:id
// @access  Private
exports.getBookingDetails = catchAsync(async (req, res, next) => {
    const booking = await Booking.findOne({
        _id: req.params.id,
        isDeleted: false
    })
    .populate('user', 'name email phone')
    .populate('serviceProvider', 'user')
    .populate('items.subSubSubService')
    .populate('address');

    if (!booking) {
        return next(new AppError('No booking found with that ID', 404));
    }

    // Check if user is authorized to view this booking
    if (req.user.role !== 'admin' && 
        booking.user._id.toString() !== req.user.userId && 
        (booking.serviceProvider && booking.serviceProvider.user.toString() !== req.user.userId)) {
        return next(new AppError('Not authorized to view this booking', 403));
    }

    res.status(200).json({
        status: 'success',
        data: {
            booking
        }
    });
});

// @desc    Get user's bookings
// @route   GET /api/v1/bookings/my-bookings
// @access  Private
exports.getMyBookings = catchAsync(async (req, res, next) => {
    const { userId } = req.user;
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const query = { user: userId, isDeleted: false };
    if (status) {
        query.status = status;
    }

    const [bookings, total] = await Promise.all([
        Booking.find(query)
            .populate('items.subSubSubService')
            .populate('serviceProvider', 'user')
            .populate('address')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Booking.countDocuments(query)
    ]);

    res.status(200).json({
        status: 'success',
        results: bookings.length,
        total,
        data: {
            bookings
        }
    });
});

// @desc    Get service provider's bookings
// @route   GET /api/v1/bookings/service-provider/my-bookings
// @access  Private/ServiceProvider
exports.getServiceProviderBookings = catchAsync(async (req, res, next) => {
    const { userId } = req.user;
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    // Find service provider by user ID
    const serviceProvider = await ServiceProvider.findOne({ user: userId });
    if (!serviceProvider) {
        return next(new AppError('Service provider not found', 404));
    }

    const query = { 
        serviceProvider: serviceProvider._id, 
        isDeleted: false 
    };
    
    if (status) {
        query.status = status;
    }

    const [bookings, total] = await Promise.all([
        Booking.find(query)
            .populate('user', 'name email phone')
            .populate('items.subSubSubService')
            .populate('address')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Booking.countDocuments(query)
    ]);

    res.status(200).json({
        status: 'success',
        results: bookings.length,
        total,
        data: {
            bookings
        }
    });
});

// @desc    Get available bookings for service provider
// @route   GET /api/v1/bookings/service-provider/available
// @access  Private/ServiceProvider
exports.getAvailableBookings = catchAsync(async (req, res, next) => {
    const { userId } = req.user;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Find service provider by user ID and get their services
    const serviceProvider = await ServiceProvider.findOne({ user: userId })
        .populate('subSubSubServices');
    
    if (!serviceProvider) {
        return next(new AppError('Service provider not found', 404));
    }

    const serviceIds = serviceProvider.subSubSubServices.map(s => s._id);

    // Find bookings that match the service provider's services and are not yet assigned
    const query = {
        'items.subSubSubService': { $in: serviceIds },
        status: { $in: ['created', 'pending'] },
        isDeleted: false,
        serviceProvider: null
    };

    const [bookings, total] = await Promise.all([
        Booking.find(query)
            .populate('user', 'name email phone')
            .populate('items.subSubSubService')
            .populate('address')
            .sort({ createdAt: 1 }) // Oldest first
            .skip(skip)
            .limit(limit),
        Booking.countDocuments(query)
    ]);

    res.status(200).json({
        status: 'success',
        results: bookings.length,
        total,
        data: {
            bookings
        }
    });
});

// @desc    Accept a booking (service provider)
// @route   PATCH /api/v1/bookings/:id/accept
// @access  Private/ServiceProvider
exports.acceptBooking = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { userId } = req.user;

    // Find service provider
    const serviceProvider = await ServiceProvider.findOne({ user: userId });
    if (!serviceProvider) {
        return next(new AppError('Service provider not found', 404));
    }

    // Find and update booking
    const booking = await Booking.findOneAndUpdate(
        {
            _id: id,
            status: { $in: ['created', 'pending'] },
            isDeleted: false,
            serviceProvider: null
        },
        {
            status: 'accepted',
            serviceProvider: serviceProvider._id,
            verificationOtp: Math.floor(1000 + Math.random() * 9000).toString() // 4-digit OTP
        },
        { new: true, runValidators: true }
    )
    .populate('user', 'name email phone')
    .populate('items.subSubSubService')
    .populate('address');

    if (!booking) {
        return next(new AppError('No available booking found with that ID', 404));
    }

    // Send email to user with OTP
    const subject = `Booking Accepted by ${serviceProvider.businessName || 'Service Provider'}`;
    const htmlBody = `
        <h2>Your booking has been accepted!</h2>
        <p>Booking ID: ${booking._id}</p>
        <p>Service Provider: ${serviceProvider.businessName || 'Our Service Team'}</p>
        <p>Status: ${booking.status}</p>
        <p>Please use this OTP to verify service completion: <strong>${booking.verificationOtp}</strong></p>
    `;

    await sendEmail(booking.user.email, subject, htmlBody);

    res.status(200).json({
        status: 'success',
        data: {
            booking
        }
    });
});

// @desc    Update booking status
// @route   PATCH /api/v1/bookings/:id/status
// @access  Private
exports.updateBookingStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body;
    const { userId, role } = req.user;

    if (!status) {
        return next(new AppError('Status is required', 400));
    }

    // Find booking
    const booking = await Booking.findById(id)
        .populate('user', 'name email phone')
        .populate('serviceProvider')
        .populate('items.subSubSubService');

    if (!booking || booking.isDeleted) {
        return next(new AppError('No booking found with that ID', 404));
    }

    // Check authorization
    if (role === 'user' && booking.user._id.toString() !== userId) {
        return next(new AppError('Not authorized to update this booking', 403));
    }
    
    if (role === 'serviceProvider') {
        const serviceProvider = await ServiceProvider.findOne({ user: userId });
        if (!serviceProvider || booking.serviceProvider._id.toString() !== serviceProvider._id.toString()) {
            return next(new AppError('Not authorized to update this booking', 403));
        }
    }

    // Update status
    booking.status = status;
    await booking.save();

    // Send notification/email if needed
    if (status === 'completed') {
        const subject = 'Your Service Has Been Completed';
        const htmlBody = `
            <h2>Your service has been marked as completed!</h2>
            <p>Booking ID: ${booking._id}</p>
            <p>Status: ${status}</p>
            <p>Thank you for choosing our service!</p>
        `;
        await sendEmail(booking.user.email, subject, htmlBody);
    }

    res.status(200).json({
        status: 'success',
        data: {
            booking
        }
    });
});

// @desc    Verify booking OTP
// @route   POST /api/v1/bookings/:id/verify-otp
// @access  Private
exports.verifyBookingOtp = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { otp } = req.body;
    const { userId, role } = req.user;

    if (!otp) {
        return next(new AppError('OTP is required', 400));
    }

    // Find booking
    const booking = await Booking.findOne({
        _id: id,
        isDeleted: false,
        status: 'accepted'
    })
    .populate('user', 'name email phone')
    .populate('serviceProvider')
    .populate('items.subSubSubService');

    if (!booking) {
        return next(new AppError('No valid booking found with that ID', 404));
    }

    // Check authorization (only service provider can verify OTP)
    if (role !== 'serviceProvider') {
        return next(new AppError('Not authorized to verify OTP', 403));
    }

    const serviceProvider = await ServiceProvider.findOne({ user: userId });
    if (!serviceProvider || booking.serviceProvider._id.toString() !== serviceProvider._id.toString()) {
        return next(new AppError('Not authorized to verify this booking', 403));
    }

    // Verify OTP
    if (booking.verificationOtp !== otp) {
        return next(new AppError('Invalid OTP', 400));
    }

    // Update booking status to completed
    booking.status = 'completed';
    booking.verificationOtp = undefined;
    await booking.save();

    // Send confirmation email
    const subject = 'Service Successfully Completed';
    const htmlBody = `
        <h2>Service Successfully Completed</h2>
        <p>Booking ID: ${booking._id}</p>
        <p>Status: ${booking.status}</p>
        <p>Thank you for using our service!</p>
    `;
    await sendEmail(booking.user.email, subject, htmlBody);

    res.status(200).json({
        status: 'success',
        message: 'OTP verified and service marked as completed',
        data: {
            booking
        }
    });
});

// @desc    Cancel a booking
// @route   PATCH /api/v1/bookings/:id/cancel
// @access  Private
exports.cancelBooking = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { reason } = req.body;
    const { userId, role } = req.user;

    // Find booking
    const booking = await Booking.findOne({
        _id: id,
        isDeleted: false,
        status: { $nin: ['completed', 'canceled'] }
    });

    if (!booking) {
        return next(new AppError('No active booking found with that ID', 404));
    }

    // Check authorization
    if (role === 'user' && booking.user.toString() !== userId) {
        return next(new AppError('Not authorized to cancel this booking', 403));
    }
    
    if (role === 'serviceProvider') {
        const serviceProvider = await ServiceProvider.findOne({ user: userId });
        if (!serviceProvider || booking.serviceProvider.toString() !== serviceProvider._id.toString()) {
            return next(new AppError('Not authorized to cancel this booking', 403));
        }
    }

    // Update booking status
    booking.status = 'canceled';
    booking.cancellationReason = reason || 'No reason provided';
    await booking.save();

    // Send cancellation email
    const user = await User.findById(booking.user);
    if (user) {
        const subject = 'Booking Cancellation';
        const htmlBody = `
            <h2>Your Booking Has Been Cancelled</h2>
            <p>Booking ID: ${booking._id}</p>
            <p>Status: ${booking.status}</p>
            <p>Reason: ${booking.cancellationReason}</p>
            <p>We're sorry for any inconvenience caused.</p>
        `;
        await sendEmail(user.email, subject, htmlBody);
    }

    res.status(200).json({
        status: 'success',
        message: 'Booking has been canceled',
        data: {
            booking
        }
    });
});

// @desc    Delete a booking (soft delete)
// @route   DELETE /api/v1/bookings/:id
// @access  Private/Admin
exports.deleteBooking = catchAsync(async (req, res, next) => {
    const booking = await Booking.findByIdAndUpdate(
        req.params.id,
        { isDeleted: true },
        { new: true }
    );

    if (!booking) {
        return next(new AppError('No booking found with that ID', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});
