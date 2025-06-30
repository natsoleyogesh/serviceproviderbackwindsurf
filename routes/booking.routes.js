const express = require('express');
const bookingController = require('../controllers/booking.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

const router = express.Router();

// Protect all routes with authentication
router.use(protect);

// User routes
router.get('/my-bookings', bookingController.getMyBookings);
router.post('/', bookingController.createBooking);
router.get('/:id', bookingController.getBookingDetails);
router.patch('/:id/cancel', bookingController.cancelBooking);

// Service Provider routes
router.get('/service-provider/my-bookings', 
    restrictTo('serviceProvider', 'admin'), 
    bookingController.getServiceProviderBookings
);

router.get('/service-provider/available', 
    restrictTo('serviceProvider', 'admin'),
    bookingController.getAvailableBookings
);

router.patch('/:id/accept', 
    restrictTo('serviceProvider', 'admin'),
    bookingController.acceptBooking
);

router.patch('/:id/status', 
    restrictTo('serviceProvider', 'admin'),
    bookingController.updateBookingStatus
);

router.post('/:id/verify-otp', 
    restrictTo('serviceProvider', 'admin'),
    bookingController.verifyBookingOtp
);

// Admin routes
router.get('/', 
    restrictTo('admin'), 
    bookingController.getAllBookings
);

router.delete('/:id', 
    restrictTo('admin'),
    bookingController.deleteBooking
);

module.exports = router;
