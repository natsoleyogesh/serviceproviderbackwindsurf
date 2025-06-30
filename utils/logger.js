const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

// Ensure logs directory exists
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Create a write stream (in append mode)
const accessLogStream = fs.createWriteStream(
  path.join(logDir, 'access.log'),
  { flags: 'a' }
);

const errorLogStream = fs.createWriteStream(
  path.join(logDir, 'error.log'),
  { flags: 'a' }
);

const logger = {
  log: (message) => {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const logMessage = `[${timestamp}] ${message}\n`;
    process.stdout.write(logMessage);
    accessLogStream.write(logMessage);
  },
  
  error: (message, error = '') => {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const errorMessage = `[${timestamp}] ERROR: ${message} ${error instanceof Error ? error.stack : error}\n`;
    process.stderr.write(errorMessage);
    errorLogStream.write(errorMessage);
  },
  
  requestLogger: (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logMessage = `[${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms\n`;
      
      if (res.statusCode >= 400) {
        errorLogStream.write(logMessage);
      } else {
        accessLogStream.write(logMessage);
      }
    });
    
    next();
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Close server & exit process
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Close server & exit process
  process.exit(1);
});

module.exports = logger;
