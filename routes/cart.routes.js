const express = require('express');
const cartController = require('../controllers/cart.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Protect all routes with authentication
router.use(protect);

// GET /api/v1/cart - Get user's cart
router.get('/', cartController.getCart);

// POST /api/v1/cart/items - Add item to cart
router.post('/items', cartController.addItemToCart);

// PATCH /api/v1/cart/items/:itemId - Update cart item quantity
router.patch('/items/:itemId', cartController.updateCartItem);

// DELETE /api/v1/cart/items/:itemId - Remove item from cart
router.delete('/items/:itemId', cartController.removeItemFromCart);

// DELETE /api/v1/cart - Clear cart
router.delete('/', cartController.clearCart);

// POST /api/v1/cart/checkout - Proceed to checkout
router.post('/checkout', cartController.checkout);

module.exports = router;
