require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./config/config');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const cityRoutes = require('./routes/cities');
const serviceRoutes = require('./routes/service.routes');
const userRoutes = require('./routes/user.routes');
const serviceProviderRoutes = require('./routes/serviceProvider.routes');
const adminRoutes = require('./routes/admin.routes');
const taxConfigRoutes = require('./routes/taxConfig.routes');
const cartRoutes = require('./routes/cart.routes');
const bookingRoutes = require('./routes/booking.routes');
const transactionRoutes = require('./routes/transaction.routes');

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors(config.cors));

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: ['name', 'description']
  })
);

// Test route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rate limiting
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/cities', cityRoutes);
app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/service-providers', serviceProviderRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/taxconfig', taxConfigRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/transactions', transactionRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}
app.use(express.static(path.join(__dirname, 'public')));

// Request logging
app.use(logger.requestLogger);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'client', 'build', 'index.html'));
  });
}

// Handle 404 - MUST be after all other routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Error handling middleware
app.use(errorHandler);

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    logger.log('MongoDB connected successfully');
    
    // Start the server only after DB connection is established
    const server = app.listen(config.port, () => {
      logger.log(`Server running in ${config.env} mode on port ${config.port}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.error('Unhandled Rejection:', err);
      // Close server & exit process
      server.close(() => process.exit(1));
    });

    // Handle SIGTERM
    process.on('SIGTERM', () => {
      logger.log('SIGTERM received. Shutting down gracefully');
      server.close(() => {
        logger.log('Process terminated');
      });
    });
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  connectDB();
}

module.exports = app;

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Export the Express API for testing
module.exports = app;
