const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  subSubSubService: {
    type: mongoose.Schema.ObjectId,
    ref: 'SubSubSubService',
    required: [true, 'A cart item must belong to a service']
  },
  name: {
    type: String,
    required: [true, 'A cart item must have a name']
  },
  quantity: {
    type: Number,
    required: [true, 'Please provide quantity'],
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },
  price: {
    type: Number,
    required: [true, 'A cart item must have a price']
  },
  total: {
    type: Number,
    required: [true, 'A cart item must have a total']
  }
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Cart must belong to a user'],
      unique: true // One cart per user
    },
    items: [cartItemSchema],
    subTotal: {
      type: Number,
      default: 0,
      min: [0, 'Subtotal cannot be negative']
    },
    visitationFee: {
      type: Number,
      default: 0
    },
    taxesAndFees: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    amountToPay: {
      type: Number,
      default: 0
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Calculate totals before saving
cartSchema.pre('save', function(next) {
  // Calculate subtotal from items
  this.subTotal = this.items.reduce((sum, item) => sum + item.total, 0);
  
  // Calculate total amount (subtotal + visitation fee + taxes)
  const taxAmount = (this.subTotal + this.visitationFee) * (this.taxesAndFees / 100);
  this.totalAmount = this.subTotal + this.visitationFee + taxAmount;
  this.amountToPay = this.totalAmount; // Can be modified for discounts later
  
  next();
});

// Query middleware to exclude deleted carts
cartSchema.pre(/^find/, function(next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

// Update cart totals when items are modified
cartSchema.methods.calculateTotals = async function() {
  const subTotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxAmount = (subTotal + this.visitationFee) * (this.taxesAndFees / 100);
  
  this.subTotal = subTotal;
  this.totalAmount = subTotal + this.visitationFee + taxAmount;
  this.amountToPay = this.totalAmount;
  
  return this.save();
};

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;
