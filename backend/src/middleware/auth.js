const jwt = require('jsonwebtoken');

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      message: 'Please provide a valid authentication token'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'attendance_app_secret_key_2024', (err, user) => {
    if (err) {
      console.error('Token verification failed:', err.message);
      return res.status(403).json({
        error: 'Invalid or expired token',
        message: 'Please login again'
      });
    }

    req.user = user;
    next();
  });
};

// Optional authentication - doesn't fail if no token
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // Continue without user
  }

  jwt.verify(token, process.env.JWT_SECRET || 'attendance_app_secret_key_2024', (err, user) => {
    if (!err) {
      req.user = user;
    }
    next(); // Continue regardless of token validity
  });
};

// Generate JWT token for user
const generateToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    name: user.name
  };

  return jwt.sign(
    payload, 
    process.env.JWT_SECRET || 'attendance_app_secret_key_2024',
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '30d',
      issuer: 'AttendanceApp',
      audience: 'AttendanceApp-Users'
    }
  );
};

// Verify and decode token without middleware
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'attendance_app_secret_key_2024');
  } catch (error) {
    return null;
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  generateToken,
  verifyToken
};