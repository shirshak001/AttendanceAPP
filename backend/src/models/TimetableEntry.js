const mongoose = require('mongoose');

const timetableEntrySchema = new mongoose.Schema({
  // User Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Class Information
  subject: {
    type: String,
    required: true
  },
  subjectCode: {
    type: String,
    required: true
  },
  instructor: String,
  
  // Schedule Information
  dayOfWeek: {
    type: Number, // 0 = Sunday, 1 = Monday, etc.
    required: true,
    min: 0,
    max: 6,
    index: true
  },
  startTime: {
    type: String, // "09:00"
    required: true,
    index: true
  },
  endTime: {
    type: String, // "10:30"
    required: true
  },
  
  // Class Details
  location: String,
  room: String,
  building: String,
  classType: {
    type: String,
    enum: ['lecture', 'lab', 'tutorial', 'seminar', 'other'],
    default: 'lecture'
  },
  
  // Metadata
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  semester: String,
  academicYear: String,
  
  // Notification Settings
  notificationEnabled: {
    type: Boolean,
    default: true
  },
  reminderMinutes: {
    type: Number,
    default: 15, // remind 15 minutes before class
    min: 0,
    max: 120
  },
  
  // Tracking
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for efficient queries
timetableEntrySchema.index({ userId: 1, dayOfWeek: 1, startTime: 1 });
timetableEntrySchema.index({ userId: 1, isActive: 1 });
timetableEntrySchema.index({ userId: 1, subject: 1 });

// Update timestamp on save
timetableEntrySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance methods
timetableEntrySchema.methods.getNextOccurrence = function() {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
  
  let daysUntilNext = this.dayOfWeek - currentDay;
  
  // If it's the same day, check if the class time has passed
  if (daysUntilNext === 0 && currentTime >= this.startTime) {
    daysUntilNext = 7; // Next week
  }
  
  // If the day has already passed this week
  if (daysUntilNext < 0) {
    daysUntilNext += 7;
  }
  
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysUntilNext);
  
  // Set the time
  const [hours, minutes] = this.startTime.split(':').map(Number);
  nextDate.setHours(hours, minutes, 0, 0);
  
  return nextDate;
};

timetableEntrySchema.methods.getTimeRange = function() {
  return `${this.startTime} - ${this.endTime}`;
};

timetableEntrySchema.methods.getDayName = function() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[this.dayOfWeek];
};

// Static methods
timetableEntrySchema.statics.findByDay = function(userId, dayOfWeek) {
  return this.find({
    userId: new mongoose.Types.ObjectId(userId),
    dayOfWeek: dayOfWeek,
    isActive: true
  }).sort({ startTime: 1 });
};

timetableEntrySchema.statics.findCurrentWeekClasses = function(userId) {
  return this.find({
    userId: new mongoose.Types.ObjectId(userId),
    isActive: true
  }).sort({ dayOfWeek: 1, startTime: 1 });
};

timetableEntrySchema.statics.getUpcomingClasses = function(userId, hours = 24) {
  return this.find({
    userId: new mongoose.Types.ObjectId(userId),
    isActive: true,
    notificationEnabled: true
  });
};

timetableEntrySchema.statics.getSubjectList = function(userId) {
  return this.distinct('subject', {
    userId: new mongoose.Types.ObjectId(userId),
    isActive: true
  });
};

module.exports = mongoose.model('TimetableEntry', timetableEntrySchema);