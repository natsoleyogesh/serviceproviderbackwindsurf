const express = require('express');
const { 
  register, 
  login, 
  getMe, 
  logout 
} = require('../controllers/auth');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { 
  registerValidator, 
  loginValidator 
} = require('../validators/auth');

const router = express.Router();

router.post('/register', authLimiter, validate(registerValidator), register);

router.post('/login', authLimiter, validate(loginValidator), login);

router.use(protect);

router.get('/me', getMe);

router.get('/logout', logout);

module.exports = router;
