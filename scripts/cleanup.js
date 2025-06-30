require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');
const ServiceProvider = require('../models/ServiceProvider.model');
const Address = require('../models/Address.model');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Clean up database
const cleanupDatabase = async () => {
  try {
    // Delete all users except admin
    const resultUsers = await User.deleteMany({ 
      email: { $ne: 'admin@example.com' } 
    });
    console.log(`Deleted ${resultUsers.deletedCount} users`);

    // Delete all service providers except test provider
    const resultProviders = await ServiceProvider.deleteMany({ 
      email: { $ne: 'provider@example.com' } 
    });
    console.log(`Deleted ${resultProviders.deletedCount} service providers`);

    // Delete all addresses
    const resultAddresses = await Address.deleteMany({});
    console.log(`Deleted ${resultAddresses.deletedCount} addresses`);

    console.log('Database cleanup completed successfully');
  } catch (error) {
    console.error('Error cleaning up database:', error);
    throw error;
  }
};

// Main function
const runCleanup = async () => {
  try {
    await connectDB();
    
    // Confirm before deleting data
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('This will delete all data except admin and test accounts. Are you sure? (yes/no) ', async (answer) => {
      if (answer.toLowerCase() === 'yes') {
        await cleanupDatabase();
        console.log('Cleanup completed');
      } else {
        console.log('Cleanup cancelled');
      }
      readline.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
};

// Run the cleanup
runCleanup();
