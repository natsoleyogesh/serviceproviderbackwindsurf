const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const config = require('../config/config');

let mongoServer;

// Mock the server's database connection
const connectDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  const mongooseOpts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  };

  await mongoose.connect(uri, mongooseOpts);
  
  // Store the connection URI for tests that need it
  process.env.TEST_MONGODB_URI = uri;
};

// Connect to the in-memory database before tests run
beforeAll(async () => {
  await connectDB();
  
  // Set a longer timeout for the beforeAll hook
  // since starting the in-memory DB can take some time
}, 30000);

// Clear all test data after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    try {
      await collection.deleteMany({});
    } catch (error) {
      // This can be ignored as it's just cleaning up test data
      if (error.message !== 'ns not found') {
        console.error('Error cleaning up test data:', error);
      }
    }
  }
});

// Disconnect from the in-memory database after all tests are done
afterAll(async () => {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error('Error cleaning up test database:', error);
  }
});

// Handle any unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection in test:', err);
});
