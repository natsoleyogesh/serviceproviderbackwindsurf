const express = require('express');
const userController = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { upload, uploadSingle } = require('../utils/multer');

const router = express.Router();

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.patch('/reset-password/:token', userController.resetPassword);
router.get('/verify-email/:otp', userController.verifyEmail);
router.post('/resend-verification', userController.resendVerification);

// Protected routes (require authentication)
router.use(protect);

// User profile routes
router.get('/me', userController.getMe);
router.patch('/update-me', userController.updateMe);
router.patch('/update-password', userController.updatePassword);

// Address management routes
router.post('/addresses', userController.addAddress);
router.patch('/addresses/:id', userController.updateAddress);
router.delete('/addresses/:id', userController.deleteAddress);

// // Profile picture upload
// router.post(
//   '/upload-profile-picture',
//   uploadSingle('profilePicture'),
//   userController.uploadProfilePicture
// );

module.exports = router;
