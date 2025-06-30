const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('./server');

let mongoServer;

// Set test environment
process.env.NODE_ENV = 'test';

// Start the test server with in-memory MongoDB
const startTestServer = async (port = 5001) => {
  try {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to in-memory database
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('Connected to in-memory MongoDB for testing');
    
    // Start the Express server
    const server = app.listen(port, () => {
      console.log(`Test server running on port ${port}`);
    });
    
    return server;
  } catch (error) {
    console.error('Failed to start test server:', error);
    throw error;
  }
};

// Stop the test server and close connections
const stopTestServer = async (server) => {
  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    
    if (mongoServer) {
      await mongoServer.stop();
    }
    
    console.log('Test server stopped');
  } catch (error) {
    console.error('Error stopping test server:', error);
    throw error;
  }
};

// If this file is run directly, start the test server
if (require.main === module) {
  const port = process.env.TEST_PORT || 5001;
  startTestServer(port).catch(console.error);
}

module.exports = {
  startTestServer,
  stopTestServer,
  app
};
