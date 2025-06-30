const mongoose = require('mongoose');
const request = require('supertest');
const server = require('../server');
const City = require('../models/City');
const Admin = require('../models/Admin');

// Set test environment
process.env.NODE_ENV = 'test';

// Get app and startServer from server
const { app, startServer } = server;

// Use a different port for tests
const TEST_PORT = 5002;
let serverInstance;

// Test data
const testAdmin = {
  username: 'cityadmin',
  email: 'cityadmin@example.com',
  password: 'Admin@123',
  role: 'admin'
};

const testCity = {
  name: 'Test City',
  description: 'A test city description',
  location: {
    type: 'Point',
    coordinates: [72.8777, 19.0760], // Mumbai coordinates
    address: 'Mumbai, India'
  }
};

describe('Cities API', () => {
  // Start the test server before all tests
  beforeAll(async () => {
    // Start the server with in-memory MongoDB
    serverInstance = await startServer();
    
    // Wait for the server to be ready
    await new Promise((resolve) => {
      serverInstance.on('listening', resolve);
    });
  }, 10000); // Increase timeout for server startup

  // Close the server after all tests
  afterAll(async () => {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
    // Close the MongoDB connection
    await mongoose.connection.close();
  }, 10000); // Increase timeout for cleanup

  let token;
  let cityId;

  // Before all tests, create a test admin and get auth token
  beforeAll(async () => {
    // Clear any existing data
    await City.deleteMany({});
    await Admin.deleteMany({});

    // Create test admin
    await Admin.create(testAdmin);

    // Login to get token
    const loginRes = await request(`http://localhost:${TEST_PORT}`)
      .post('/api/v1/auth/login')
      .send({
        email: testAdmin.email,
        password: testAdmin.password
      });
    
    token = loginRes.body.token;
  }, 10000); // Increase timeout for beforeAll

  // Clear database before each test
  beforeEach(async () => {
    await City.deleteMany({});
  });

  describe('POST /api/v1/cities', () => {
    it('should create a new city with valid data', async () => {
      const res = await request(app)
        .post('/api/v1/cities')
        .set('Authorization', `Bearer ${token}`)
        .send(testCity);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('name', testCity.name);
      expect(res.body.data).toHaveProperty('description', testCity.description);
      
      // Save city ID for future tests
      cityId = res.body.data._id;
    });

    it('should not create a city without required fields', async () => {
      const res = await request(app)
        .post('/api/v1/cities')
        .set('Authorization', `Bearer ${token}`)
        .send({
          // Missing required 'name' field
          description: 'A city without a name'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not allow non-admin users to create cities', async () => {
      // Create a regular user
      const user = {
        username: 'regularuser',
        email: 'user@example.com',
        password: 'User@123'
      };
      
      await request(app).post('/api/v1/auth/register').send(user);
      
      // Login as regular user
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: user.password
        });
      
      const userToken = loginRes.body.token;
      
      // Try to create a city
      const res = await request(app)
        .post('/api/v1/cities')
        .set('Authorization', `Bearer ${userToken}`)
        .send(testCity);
      
      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/cities', () => {
    it('should get all cities', async () => {
      const res = await request(app)
        .get('/api/v1/cities')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should filter cities by name', async () => {
      const res = await request(app)
        .get('/api/v1/cities?name=Test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.data[0]).toHaveProperty('name', 'Test City');
    });

    it('should paginate results', async () => {
      // Create multiple cities for pagination test
      const cities = [];
      for (let i = 0; i < 15; i++) {
        cities.push({
          name: `City ${i + 1}`,
          description: `Description for city ${i + 1}`,
          location: {
            type: 'Point',
            coordinates: [72.8 + (i * 0.1), 19.0 + (i * 0.1)]
          }
        });
      }
      await City.insertMany(cities);

      // Test pagination
      const page1 = await request(app)
        .get('/api/v1/cities?page=1&limit=5')
        .set('Authorization', `Bearer ${token}`);
      
      expect(page1.statusCode).toEqual(200);
      expect(page1.body.data).toHaveLength(5);
      expect(page1.body.pagination).toHaveProperty('page', 1);
      expect(page1.body.pagination).toHaveProperty('limit', 5);
    });
  });

  describe('GET /api/v1/cities/:id', () => {
    it('should get a single city by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/cities/${cityId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('_id', cityId);
    });

    it('should return 404 for non-existent city', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/cities/${nonExistentId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/v1/cities/:id', () => {
    it('should update a city with valid data', async () => {
      const updates = {
        name: 'Updated City Name',
        description: 'Updated description'
      };
      
      const res = await request(app)
        .put(`/api/v1/cities/${cityId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updates);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('name', updates.name);
      expect(res.body.data).toHaveProperty('description', updates.description);
    });

    it('should return 400 for invalid update data', async () => {
      const res = await request(app)
        .put(`/api/v1/cities/${cityId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '' // Empty name is invalid
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/v1/cities/:id', () => {
    it('should delete a city', async () => {
      // First create a city to delete
      const cityRes = await request(app)
        .post('/api/v1/cities')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'City to delete',
          description: 'This city will be deleted',
          location: {
            type: 'Point',
            coordinates: [72.9, 19.1]
          }
        });
      
      const cityToDeleteId = cityRes.body.data._id;
      
      // Now delete it
      const res = await request(app)
        .delete(`/api/v1/cities/${cityToDeleteId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      
      // Verify it's deleted
      const getRes = await request(app)
        .get(`/api/v1/cities/${cityToDeleteId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(getRes.statusCode).toEqual(404);
    });

    it('should return 404 for non-existent city', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/v1/cities/${nonExistentId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('success', false);
    });
  });
});
