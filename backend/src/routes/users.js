const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register/Login user
router.post('/register', async (req, res) => {
  try {
    const { name, email, pushToken, deviceInfo } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        error: 'Name and email are required'
      });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Update existing user
      if (pushToken) user.pushToken = pushToken;
      if (deviceInfo) user.deviceInfo = deviceInfo;
      user.lastActive = new Date();
      await user.save();

      return res.json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt
        },
        message: 'User updated successfully'
      });
    }

    // Create new user
    user = new User({
      name,
      email,
      pushToken,
      deviceInfo
    });

    await user.save();

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      message: 'User registered successfully'
    });

  } catch (error) {
    console.error('User registration error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'Email already exists'
      });
    }

    res.status(500).json({
      error: 'Registration failed',
      details: error.message
    });
  }
});

// Update push token
router.put('/push-token', authenticateToken, async (req, res) => {
  try {
    const { pushToken } = req.body;
    const userId = req.user.id;

    if (!pushToken) {
      return res.status(400).json({
        error: 'Push token is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    user.pushToken = pushToken;
    user.lastActive = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Push token updated successfully'
    });

  } catch (error) {
    console.error('Push token update error:', error);
    res.status(500).json({
      error: 'Failed to update push token',
      details: error.message
    });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-pushToken -__v');

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
        settings: user.settings,
        createdAt: user.createdAt,
        lastActive: user.lastActive
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      details: error.message
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, preferences, settings } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (name) updateData.name = name;
    if (preferences) updateData.preferences = preferences;
    if (settings) updateData.settings = settings;

    const user = await User.findByIdAndUpdate(
      userId,
      { ...updateData, lastActive: new Date() },
      { new: true, runValidators: true }
    ).select('-pushToken -__v');

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      details: error.message
    });
  }
});

// Update notification preferences
router.put('/notification-preferences', authenticateToken, async (req, res) => {
  try {
    const { enabled, reminderMinutes, types } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Update notification preferences
    if (enabled !== undefined) {
      user.preferences.notificationsEnabled = enabled;
    }
    if (reminderMinutes !== undefined) {
      user.preferences.defaultReminderMinutes = reminderMinutes;
    }
    if (types) {
      user.preferences.notificationTypes = types;
    }

    user.lastActive = new Date();
    await user.save();

    res.json({
      success: true,
      preferences: user.preferences,
      message: 'Notification preferences updated successfully'
    });

  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      error: 'Failed to update notification preferences',
      details: error.message
    });
  }
});

// Delete user account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete user and related data
    await User.findByIdAndDelete(userId);

    // Note: In a real app, you'd also delete related data:
    // - Attendance records
    // - Timetable entries
    // - Scheduled notifications

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      error: 'Failed to delete account',
      details: error.message
    });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get basic stats
    const AttendanceRecord = require('../models/AttendanceRecord');
    const TimetableEntry = require('../models/TimetableEntry');
    
    const [totalClasses, totalSubjects, recentAttendance] = await Promise.all([
      AttendanceRecord.countDocuments({ userId }),
      TimetableEntry.countDocuments({ userId, isActive: true }),
      AttendanceRecord.find({ userId })
        .sort({ date: -1 })
        .limit(30)
    ]);

    // Calculate attendance rate
    const presentCount = recentAttendance.filter(record => 
      record.status === 'present' || record.status === 'excused'
    ).length;

    const attendanceRate = recentAttendance.length > 0 
      ? Math.round((presentCount / recentAttendance.length) * 100)
      : 0;

    res.json({
      success: true,
      stats: {
        totalClasses,
        totalSubjects,
        attendanceRate,
        recentClassesCount: recentAttendance.length
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      details: error.message
    });
  }
});

module.exports = router;