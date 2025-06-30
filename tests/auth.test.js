const mongoose = require('mongoose');
const request = require('supertest');
const server = require('../server');
const Admin = require('../models/Admin');

// Use a different port for tests
const TEST_PORT = 5001;

// Set test environment
process.env.NODE_ENV = 'test';

// Get app and startServer from server
const { app, startServer } = server;
let serverInstance;

// Test data
const testAdmin = {
  username: 'testadmin',
  email: 'test@example.com',
  password: 'Test@123',
};

describe('Authentication API', () => {
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

  // Clear database before each test
  beforeEach(async () => {
    await Admin.deleteMany({});
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new admin user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testAdmin);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
    });

    it('should not register with duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/v1/auth/register')
        .send(testAdmin);
      
      // Second registration with same email
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testAdmin,
          username: 'anotherusername'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not register with invalid data', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'a', // Too short
          email: 'invalid-email',
          password: '123' // Too short
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Register a test user first
      await request(app)
        .post('/api/v1/auth/register')
        .send(testAdmin);
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testAdmin.email,
          password: testAdmin.password
        });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
    });

    it('should not login with invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testAdmin.email,
          password: 'wrongpassword'
        });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'somepassword'
        });
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let token;

    beforeEach(async () => {
      // Register and login to get token
      await request(app)
        .post('/api/v1/auth/register')
        .send(testAdmin);
      
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testAdmin.email,
          password: testAdmin.password
        });
      
      token = loginRes.body.token;
    });

    it('should get current user with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('email', testAdmin.email);
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should not get current user without token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not get current user with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalidtoken');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/auth/logout', () => {
    let token;

    beforeEach(async () => {
      // Register and login to get token
      await request(app)
        .post('/api/v1/auth/register')
        .send(testAdmin);
      
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testAdmin.email,
          password: testAdmin.password
        });
      
      token = loginRes.body.token;
    });

    it('should logout user and clear token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      
      // Try to access protected route after logout
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      
      expect(meRes.statusCode).toEqual(401);
    });
  });
});
