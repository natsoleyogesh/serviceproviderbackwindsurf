const TaxConfig = require('../models/TaxConfig.model');
const AppError = require('./appError');

/**
 * Get the active tax configuration
 * @returns {Promise<Object>} Active tax configuration
 */
exports.getActiveTaxConfig = async () => {
  const taxConfig = await TaxConfig.findOne({ isActive: true, isDeleted: false });
  
  if (!taxConfig) {
    // Return default values if no active config is found
    return {
      visitationFee: 50, // Default fee
      taxesPercentage: 15 // Default percentage
    };
  }
  
  return {
    visitationFee: taxConfig.visitationFee,
    taxesPercentage: taxConfig.taxesPercentage
  };
};

/**
 * Calculate cart totals based on items and tax configuration
 * @param {Array} items - Array of cart items
 * @param {Object} taxConfig - Tax configuration object
 * @returns {Object} Calculated totals
 */
exports.calculateCartTotals = (items, taxConfig) => {
  const subTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxAmount = (subTotal + taxConfig.visitationFee) * (taxConfig.taxesPercentage / 100);
  const totalAmount = subTotal + taxConfig.visitationFee + taxAmount;
  
  return {
    subTotal,
    taxAmount,
    totalAmount,
    amountToPay: totalAmount // Can be modified for discounts later
  };
};
