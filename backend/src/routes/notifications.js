const express = require('express');
const mongoose = require('mongoose');
const ScheduledNotification = require('../models/ScheduledNotification');
const NotificationLog = require('../models/NotificationLog');
const NotificationScheduler = require('../services/NotificationScheduler');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Test notification endpoint
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { pushToken, message = 'Test notification from Attendance App!' } = req.body;
    
    if (!pushToken) {
      return res.status(400).json({
        error: 'Push token is required for testing'
      });
    }

    // Send test notification
    const result = await NotificationScheduler.sendNotificationBatch([{
      pushToken,
      title: 'Test Notification',
      body: message,
      data: { type: 'test' }
    }]);

    res.json({
      success: true,
      result,
      message: 'Test notification sent successfully'
    });

  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      error: 'Failed to send test notification',
      details: error.message
    });
  }
});

// Schedule attendance reminder
router.post('/schedule-reminder', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      subject,
      classTime,
      reminderTime,
      message,
      recurring = true
    } = req.body;

    if (!subject || !classTime || !reminderTime) {
      return res.status(400).json({
        error: 'Subject, class time, and reminder time are required'
      });
    }

    // Create scheduled notification
    const notification = new ScheduledNotification({
      userId,
      type: 'attendance_reminder',
      scheduledTime: new Date(reminderTime),
      title: `Class Reminder: ${subject}`,
      body: message || `Your ${subject} class starts at ${classTime}`,
      data: {
        subject,
        classTime,
        type: 'attendance_reminder'
      },
      recurring: recurring ? {
        type: 'weekly',
        interval: 1
      } : undefined
    });

    await notification.save();

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Attendance reminder scheduled successfully'
    });

  } catch (error) {
    console.error('Schedule reminder error:', error);
    res.status(500).json({
      error: 'Failed to schedule reminder',
      details: error.message
    });
  }
});

// Get user's scheduled notifications
router.get('/scheduled', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      type, 
      status = 'pending',
      page = 1,
      limit = 20 
    } = req.query;

    // Build filter
    const filter = { userId: new mongoose.Types.ObjectId(userId) };

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    // Execute query
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [notifications, totalCount] = await Promise.all([
      ScheduledNotification.find(filter)
        .sort({ scheduledTime: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ScheduledNotification.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasNext: skip + notifications.length < totalCount,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get scheduled notifications error:', error);
    res.status(500).json({
      error: 'Failed to get scheduled notifications',
      details: error.message
    });
  }
});

// Update scheduled notification
router.put('/scheduled/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    const updateData = req.body;

    // Only allow updating pending notifications
    const notification = await ScheduledNotification.findOneAndUpdate(
      { 
        _id: notificationId, 
        userId, 
        status: 'pending' 
      },
      updateData,
      { new: true, runValidators: true }
    );

    if (!notification) {
      return res.status(404).json({
        error: 'Scheduled notification not found or already processed'
      });
    }

    res.json({
      success: true,
      data: notification,
      message: 'Scheduled notification updated successfully'
    });

  } catch (error) {
    console.error('Update scheduled notification error:', error);
    res.status(500).json({
      error: 'Failed to update scheduled notification',
      details: error.message
    });
  }
});

// Cancel scheduled notification
router.delete('/scheduled/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const notification = await ScheduledNotification.findOneAndUpdate(
      { 
        _id: notificationId, 
        userId, 
        status: 'pending' 
      },
      { status: 'cancelled' },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        error: 'Scheduled notification not found or already processed'
      });
    }

    res.json({
      success: true,
      message: 'Scheduled notification cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel scheduled notification error:', error);
    res.status(500).json({
      error: 'Failed to cancel scheduled notification',
      details: error.message
    });
  }
});

// Get notification logs (delivery history)
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      status, 
      type,
      startDate,
      endDate,
      page = 1,
      limit = 50 
    } = req.query;

    // Get user's push token to filter logs
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (!user || !user.pushToken) {
      return res.json({
        success: true,
        data: [],
        message: 'No push token registered'
      });
    }

    // Build filter
    const filter = { pushToken: user.pushToken };

    if (status) {
      filter.status = status;
    }

    if (type) {
      filter.type = type;
    }

    if (startDate || endDate) {
      filter.sentAt = {};
      if (startDate) filter.sentAt.$gte = new Date(startDate);
      if (endDate) filter.sentAt.$lte = new Date(endDate);
    }

    // Execute query
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [logs, totalCount] = await Promise.all([
      NotificationLog.find(filter)
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-pushToken'), // Don't expose push token
      NotificationLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasNext: skip + logs.length < totalCount,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get notification logs error:', error);
    res.status(500).json({
      error: 'Failed to get notification logs',
      details: error.message
    });
  }
});

// Batch schedule notifications
router.post('/batch-schedule', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notifications } = req.body;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({
        error: 'Notifications array is required'
      });
    }

    // Add userId to each notification
    const notificationsWithUserId = notifications.map(notification => ({
      ...notification,
      userId,
      scheduledTime: new Date(notification.scheduledTime)
    }));

    // Insert notifications
    const scheduledNotifications = await ScheduledNotification.insertMany(
      notificationsWithUserId,
      { ordered: false }
    );

    res.status(201).json({
      success: true,
      data: scheduledNotifications,
      message: `${scheduledNotifications.length} notifications scheduled successfully`
    });

  } catch (error) {
    console.error('Batch schedule notifications error:', error);
    
    if (error.writeErrors) {
      const successCount = error.result.insertedCount || 0;
      return res.status(207).json({
        success: true,
        message: `${successCount} notifications scheduled, ${error.writeErrors.length} failed`,
        errors: error.writeErrors.map(err => ({
          index: err.index,
          error: err.errmsg
        }))
      });
    }

    res.status(500).json({
      error: 'Failed to schedule notifications',
      details: error.message
    });
  }
});

// Get notification statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;

    // Get user's push token
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (!user || !user.pushToken) {
      return res.json({
        success: true,
        stats: {
          total: 0,
          successful: 0,
          failed: 0,
          successRate: 0,
          byType: []
        }
      });
    }

    // Get stats from logs
    const [typeStats, totalStats] = await Promise.all([
      NotificationLog.getTypeStats(parseInt(days)),
      NotificationLog.aggregate([
        {
          $match: {
            pushToken: user.pushToken,
            sentAt: {
              $gte: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            successful: {
              $sum: { $cond: [{ $eq: ['$status', 'ok'] }, 1, 0] }
            },
            failed: {
              $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    const overallStats = totalStats[0] || { total: 0, successful: 0, failed: 0 };
    const successRate = overallStats.total > 0 
      ? Math.round((overallStats.successful / overallStats.total) * 100)
      : 0;

    res.json({
      success: true,
      stats: {
        ...overallStats,
        successRate,
        byType: typeStats
      }
    });

  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      error: 'Failed to get notification statistics',
      details: error.message
    });
  }
});

module.exports = router;