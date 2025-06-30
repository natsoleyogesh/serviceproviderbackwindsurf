const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const config = require('../config/config');
const logger = require('./logger');

// Connect to DB
mongoose.connect(config.mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const adminData = {
  username: 'admin',
  email: 'admin@example.com',
  password: 'Admin@123',
  role: 'admin',
};

const seedDatabase = async () => {
  try {
    // Clear existing admins
    await Admin.deleteMany({});
    logger.log('Cleared existing admin accounts');

    // Hash password
    const salt = await bcrypt.genSalt(10);
    adminData.password = await bcrypt.hash(adminData.password, salt);

    // Create admin
    const admin = await Admin.create(adminData);
    
    logger.log('Admin user created successfully:');
    logger.log(`Username: ${admin.username}`);
    logger.log(`Email: ${admin.email}`);
    logger.log('Password: Admin@123');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed function
seedDatabase();
