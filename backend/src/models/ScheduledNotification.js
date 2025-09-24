const mongoose = require('mongoose');

const scheduledNotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Notification Content
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  body: {
    type: String,
    required: true,
    maxlength: 500
  },
  data: {
    type: Object,
    default: {}
  },
  
  // Scheduling
  scheduledFor: {
    type: Date,
    required: true,
    index: true
  },
  
  // Notification Type
  type: {
    type: String,
    enum: ['attendance_reminder', 'daily_summary', 'achievement', 'system_update'],
    default: 'attendance_reminder'
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Processing Info
  processedAt: Date,
  receiptId: String, // Expo receipt ID
  error: String,
  
  // Retry Logic
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  nextRetryAt: Date,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
scheduledNotificationSchema.index({ userId: 1, scheduledFor: 1 });
scheduledNotificationSchema.index({ status: 1, scheduledFor: 1 });
scheduledNotificationSchema.index({ type: 1 });

// Methods
scheduledNotificationSchema.methods.markAsSent = function(receiptId) {
  this.status = 'sent';
  this.receiptId = receiptId;
  this.processedAt = new Date();
  return this.save();
};

scheduledNotificationSchema.methods.markAsFailed = function(error) {
  this.status = 'failed';
  this.error = error;
  this.processedAt = new Date();
  
  // Schedule retry if within retry limit
  if (this.retryCount < this.maxRetries) {
    this.retryCount++;
    this.nextRetryAt = new Date(Date.now() + (this.retryCount * 5 * 60 * 1000)); // 5 minutes * retry count
    this.status = 'pending';
  }
  
  return this.save();
};

scheduledNotificationSchema.methods.cancel = function() {
  this.status = 'cancelled';
  this.processedAt = new Date();
  return this.save();
};

// Static methods
scheduledNotificationSchema.statics.getPendingNotifications = function(limit = 100) {
  return this.find({
    status: 'pending',
    scheduledFor: { $lte: new Date() }
  })
  .populate('userId', 'pushToken notificationsEnabled')
  .limit(limit)
  .sort({ scheduledFor: 1 });
};

scheduledNotificationSchema.statics.getRetryNotifications = function(limit = 50) {
  return this.find({
    status: 'pending',
    retryCount: { $gt: 0 },
    nextRetryAt: { $lte: new Date() }
  })
  .populate('userId', 'pushToken notificationsEnabled')
  .limit(limit)
  .sort({ nextRetryAt: 1 });
};

scheduledNotificationSchema.statics.cleanupOldNotifications = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({
    status: { $in: ['sent', 'failed', 'cancelled'] },
    processedAt: { $lt: cutoffDate }
  });
};

module.exports = mongoose.model('ScheduledNotification', scheduledNotificationSchema);