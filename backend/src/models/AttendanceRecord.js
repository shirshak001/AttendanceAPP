const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
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
    required: true,
    index: true
  },
  subjectCode: String,
  instructor: String,
  
  // Timing
  date: {
    type: Date,
    required: true,
    index: true
  },
  startTime: String,
  endTime: String,
  duration: Number, // in minutes
  
  // Attendance Details
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    required: true,
    index: true
  },
  
  // Optional Details
  notes: String,
  location: String,
  classType: {
    type: String,
    enum: ['lecture', 'lab', 'tutorial', 'seminar', 'exam', 'other'],
    default: 'lecture'
  },
  
  // Metadata
  markedBy: {
    type: String,
    enum: ['user', 'system', 'instructor'],
    default: 'user'
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

// Compound indexes for common queries
attendanceRecordSchema.index({ userId: 1, date: -1 });
attendanceRecordSchema.index({ userId: 1, subject: 1, date: -1 });
attendanceRecordSchema.index({ userId: 1, status: 1, date: -1 });

// Update timestamp on save
attendanceRecordSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static methods for analytics
attendanceRecordSchema.statics.getAttendanceStats = function(userId, startDate, endDate) {
  const pipeline = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: '$subject',
        total: { $sum: 1 },
        present: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
        },
        absent: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
        },
        late: {
          $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
        },
        excused: {
          $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        subject: '$_id',
        total: 1,
        present: 1,
        absent: 1,
        late: 1,
        excused: 1,
        attendanceRate: {
          $round: [
            {
              $multiply: [
                {
                  $divide: [
                    { $add: ['$present', '$excused'] },
                    '$total'
                  ]
                },
                100
              ]
            },
            2
          ]
        }
      }
    },
    { $sort: { attendanceRate: -1 } }
  ];

  return this.aggregate(pipeline);
};

attendanceRecordSchema.statics.getTrendData = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const pipeline = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }
        },
        total: { $sum: 1 },
        present: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        date: '$_id.date',
        total: 1,
        present: 1,
        rate: {
          $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 2]
        }
      }
    },
    { $sort: { date: 1 } }
  ];

  return this.aggregate(pipeline);
};

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);