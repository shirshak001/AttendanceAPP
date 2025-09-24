const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
  // Target
  pushToken: {
    type: String,
    required: true,
    index: true
  },
  
  // Notification Content
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  data: Object,
  
  // Delivery Status
  status: {
    type: String,
    enum: ['ok', 'error'],
    required: true,
    index: true
  },
  receiptId: String,
  error: String,
  
  // Analytics
  type: {
    type: String,
    enum: ['attendance_reminder', 'daily_summary', 'achievement', 'system_update'],
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high']
  },
  
  // Timing
  sentAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Device Info (optional)
  platform: String,
  appVersion: String,
  deviceId: String
});

// Indexes for analytics queries
notificationLogSchema.index({ sentAt: -1 });
notificationLogSchema.index({ status: 1, sentAt: -1 });
notificationLogSchema.index({ type: 1, sentAt: -1 });

// Static methods for analytics
notificationLogSchema.statics.getDeliveryStats = function(startDate, endDate) {
  const pipeline = [
    {
      $match: {
        sentAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: {
          status: '$status',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$sentAt' } }
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        stats: {
          $push: {
            status: '$_id.status',
            count: '$count'
          }
        },
        total: { $sum: '$count' }
      }
    },
    { $sort: { _id: -1 } }
  ];

  return this.aggregate(pipeline);
};

notificationLogSchema.statics.getTypeStats = function(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const pipeline = [
    {
      $match: {
        sentAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: 1 },
        successful: {
          $sum: { $cond: [{ $eq: ['$status', 'ok'] }, 1, 0] }
        },
        failed: {
          $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        type: '$_id',
        total: 1,
        successful: 1,
        failed: 1,
        successRate: {
          $round: [{ $multiply: [{ $divide: ['$successful', '$total'] }, 100] }, 2]
        }
      }
    }
  ];

  return this.aggregate(pipeline);
};

notificationLogSchema.statics.getFailedNotifications = function(limit = 100) {
  return this.find({ status: 'error' })
    .sort({ sentAt: -1 })
    .limit(limit)
    .select('pushToken title error sentAt');
};

module.exports = mongoose.model('NotificationLog', notificationLogSchema);