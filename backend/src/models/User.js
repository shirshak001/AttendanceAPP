const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Basic Info
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password not required for Google auth
    }
  },
  
  // Authentication
  googleId: {
    type: String,
    sparse: true
  },
  loginMethod: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  
  // Profile
  avatar: String,
  photoURL: String,
  
  // Push Notifications
  pushToken: {
    type: String,
    sparse: true
  },
  notificationsEnabled: {
    type: Boolean,
    default: true
  },
  reminderTimeMinutes: {
    type: Number,
    default: 5 // Minutes after class ends
  },
  
  // Academic Settings
  academicYear: {
    type: String,
    default: '2024-2025'
  },
  semester: {
    type: String,
    enum: ['Fall', 'Spring', 'Summer'],
    default: 'Fall'
  },
  
  // App Settings
  isFirstTime: {
    type: Boolean,
    default: true
  },
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  lastLoginAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ pushToken: 1 });

// Middleware
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Methods
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

userSchema.methods.updatePushToken = function(token) {
  this.pushToken = token;
  return this.save();
};

userSchema.methods.updateNotificationSettings = function(settings) {
  if (settings.notificationsEnabled !== undefined) {
    this.notificationsEnabled = settings.notificationsEnabled;
  }
  if (settings.reminderTimeMinutes !== undefined) {
    this.reminderTimeMinutes = settings.reminderTimeMinutes;
  }
  return this.save();
};

module.exports = mongoose.model('User', userSchema);