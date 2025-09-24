const rateLimit = require('express-rate-limit');

// General API rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Please wait before trying again'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for notification endpoints
const notificationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 notification requests per minute
  message: {
    error: 'Too many notification requests',
    message: 'Please slow down your notification requests'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for test endpoints
const testLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 5 test requests per 5 minutes
  message: {
    error: 'Too many test requests',
    message: 'Test endpoints are rate limited'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for bulk operations
const bulkLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // Limit each IP to 20 bulk operations per 10 minutes
  message: {
    error: 'Too many bulk operations',
    message: 'Please wait before performing more bulk operations'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  generalLimiter,
  authLimiter,
  notificationLimiter,
  testLimiter,
  bulkLimiter
};