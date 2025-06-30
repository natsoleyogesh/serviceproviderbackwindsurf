const Cart = require('../models/Cart.model');
const SubSubSubService = require('../models/subSubSubService.model');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { getActiveTaxConfig } = require('../utils/taxConfigHelper');

// @desc    Get user's cart
// @route   GET /api/v1/cart
// @access  Private
exports.getCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user.id });

  if (!cart) {
    return res.status(200).json({
      status: 'success',
      data: {
        cart: null,
        message: 'No cart found. Your cart is empty.'
      }
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      cart
    }
  });
});

// @desc    Add item to cart
// @route   POST /api/v1/cart/items
// @access  Private
exports.addItemToCart = catchAsync(async (req, res, next) => {
  const { subSubSubServiceId, quantity = 1 } = req.body;

  // 1) Get the service to get its details
  const service = await SubSubSubService.findById(subSubSubServiceId);
  if (!service) {
    return next(new AppError('No service found with that ID', 404));
  }

  // 2) Get or create user's cart
  let cart = await Cart.findOne({ user: req.user.id });
  
  if (!cart) {
    // Create new cart if it doesn't exist
    const taxConfig = await getActiveTaxConfig();
    
    cart = await Cart.create({
      user: req.user.id,
      items: [],
      visitationFee: taxConfig.visitationFee,
      taxesAndFees: taxConfig.taxesPercentage,
      subTotal: 0,
      totalAmount: 0,
      amountToPay: 0
    });
  }

  // 3) Check if item already exists in cart
  const existingItemIndex = cart.items.findIndex(
    item => item.subSubSubService.toString() === subSubSubServiceId
  );

  if (existingItemIndex > -1) {
    // Update quantity if item exists
    cart.items[existingItemIndex].quantity += quantity;
    cart.items[existingItemIndex].total = 
      cart.items[existingItemIndex].price * cart.items[existingItemIndex].quantity;
  } else {
    // Add new item
    cart.items.push({
      subSubSubService: service._id,
      name: service.name,
      quantity,
      price: service.price,
      total: service.price * quantity
    });
  }

  // 4) Recalculate totals and save
  await cart.calculateTotals();
  
  // 5) Populate the cart with service details
  const populatedCart = await Cart.findById(cart._id).populate('items.subSubSubService');

  res.status(200).json({
    status: 'success',
    data: {
      cart: populatedCart
    }
  });
});

// @desc    Update cart item quantity
// @route   PATCH /api/v1/cart/items/:itemId
// @access  Private
exports.updateCartItem = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity < 1) {
    return next(new AppError('Please provide a valid quantity', 400));
  }

  const cart = await Cart.findOne({ 
    user: req.user.id,
    'items._id': itemId
  });

  if (!cart) {
    return next(new AppError('No cart item found with that ID', 404));
  }

  // Update item quantity
  const item = cart.items.id(itemId);
  item.quantity = quantity;
  item.total = item.price * quantity;

  await cart.calculateTotals();
  
  const updatedCart = await Cart.findById(cart._id).populate('items.subSubSubService');

  res.status(200).json({
    status: 'success',
    data: {
      cart: updatedCart
    }
  });
});

// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/items/:itemId
// @access  Private
exports.removeItemFromCart = catchAsync(async (req, res, next) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.user.id });

  if (!cart) {
    return next(new AppError('No cart found', 404));
  }

  // Remove the item
  cart.items = cart.items.filter(item => item._id.toString() !== itemId);
  
  // If no items left, delete the cart
  if (cart.items.length === 0) {
    await Cart.findByIdAndDelete(cart._id);
    return res.status(200).json({
      status: 'success',
      data: {
        cart: null,
        message: 'Cart is now empty and has been deleted.'
      }
    });
  }

  // Otherwise, recalculate and save
  await cart.calculateTotals();
  
  const updatedCart = await Cart.findById(cart._id).populate('items.subSubSubService');

  res.status(200).json({
    status: 'success',
    data: {
      cart: updatedCart
    }
  });
});

// @desc    Clear cart
// @route   DELETE /api/v1/cart
// @access  Private
exports.clearCart = catchAsync(async (req, res, next) => {
  await Cart.findOneAndDelete({ user: req.user.id });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Proceed to checkout
// @route   POST /api/v1/cart/checkout
// @access  Private
exports.checkout = catchAsync(async (req, res, next) => {
  // 1) Get user's cart
  const cart = await Cart.findOne({ user: req.user.id }).populate('items.subSubSubService');
  
  if (!cart || cart.items.length === 0) {
    return next(new AppError('Your cart is empty', 400));
  }

  // 2) Validate cart items (check availability, etc.)
  // This is where you'd add validation logic for items in the cart
  
  // 3) Create order (implementation depends on your Order model)
  // const order = await Order.create({
  //   user: req.user.id,
  //   items: cart.items,
  //   subTotal: cart.subTotal,
  //   visitationFee: cart.visitationFee,
  //   taxesAndFees: cart.taxesAndFees,
  //   totalAmount: cart.totalAmount,
  //   amountToPay: cart.amountToPay
  // });

  // 4) Clear the cart
  await Cart.findByIdAndDelete(cart._id);

  // 5) Return success response with order details
  res.status(200).json({
    status: 'success',
    data: {
      // order,
      message: 'Checkout successful! Your order has been placed.'
    }
  });
});
