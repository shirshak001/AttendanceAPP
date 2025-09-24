const express = require('express');
const mongoose = require('mongoose');
const TimetableEntry = require('../models/TimetableEntry');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all timetable entries for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { day, subject, active = true } = req.query;

    // Build filter
    const filter = { 
      userId: new mongoose.Types.ObjectId(userId),
      isActive: active === 'true'
    };

    if (day !== undefined) {
      filter.dayOfWeek = parseInt(day);
    }

    if (subject) {
      filter.subject = { $regex: subject, $options: 'i' };
    }

    const entries = await TimetableEntry.find(filter)
      .sort({ dayOfWeek: 1, startTime: 1 });

    res.json({
      success: true,
      data: entries
    });

  } catch (error) {
    console.error('Get timetable entries error:', error);
    res.status(500).json({
      error: 'Failed to get timetable entries',
      details: error.message
    });
  }
});

// Get timetable for specific day
router.get('/day/:dayOfWeek', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const dayOfWeek = parseInt(req.params.dayOfWeek);

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({
        error: 'Invalid day of week. Must be 0-6 (Sunday-Saturday)'
      });
    }

    const entries = await TimetableEntry.findByDay(userId, dayOfWeek);

    res.json({
      success: true,
      data: entries,
      dayOfWeek,
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]
    });

  } catch (error) {
    console.error('Get day timetable error:', error);
    res.status(500).json({
      error: 'Failed to get day timetable',
      details: error.message
    });
  }
});

// Get current week timetable
router.get('/week', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const entries = await TimetableEntry.findCurrentWeekClasses(userId);

    // Group by day
    const weekTimetable = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Initialize all days
    for (let i = 0; i < 7; i++) {
      weekTimetable[i] = {
        dayName: dayNames[i],
        classes: []
      };
    }

    // Group entries by day
    entries.forEach(entry => {
      weekTimetable[entry.dayOfWeek].classes.push(entry);
    });

    res.json({
      success: true,
      data: weekTimetable
    });

  } catch (error) {
    console.error('Get week timetable error:', error);
    res.status(500).json({
      error: 'Failed to get week timetable',
      details: error.message
    });
  }
});

// Get upcoming classes
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { hours = 24 } = req.query;

    const entries = await TimetableEntry.getUpcomingClasses(userId, parseInt(hours));

    // Calculate next occurrences
    const upcomingClasses = entries
      .map(entry => ({
        ...entry.toObject(),
        nextOccurrence: entry.getNextOccurrence(),
        timeRange: entry.getTimeRange(),
        dayName: entry.getDayName()
      }))
      .filter(entry => {
        const hoursUntil = (entry.nextOccurrence - new Date()) / (1000 * 60 * 60);
        return hoursUntil >= 0 && hoursUntil <= parseInt(hours);
      })
      .sort((a, b) => a.nextOccurrence - b.nextOccurrence);

    res.json({
      success: true,
      data: upcomingClasses
    });

  } catch (error) {
    console.error('Get upcoming classes error:', error);
    res.status(500).json({
      error: 'Failed to get upcoming classes',
      details: error.message
    });
  }
});

// Get list of subjects
router.get('/subjects', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const subjects = await TimetableEntry.getSubjectList(userId);

    res.json({
      success: true,
      data: subjects
    });

  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({
      error: 'Failed to get subjects',
      details: error.message
    });
  }
});

// Create new timetable entry
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      subject,
      subjectCode,
      instructor,
      dayOfWeek,
      startTime,
      endTime,
      location,
      room,
      building,
      classType,
      notificationEnabled,
      reminderMinutes,
      semester,
      academicYear
    } = req.body;

    // Validation
    if (!subject || !subjectCode || dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({
        error: 'Subject, subject code, day of week, start time, and end time are required'
      });
    }

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({
        error: 'Invalid day of week. Must be 0-6 (Sunday-Saturday)'
      });
    }

    // Check for time conflicts
    const conflictingEntry = await TimetableEntry.findOne({
      userId,
      dayOfWeek,
      isActive: true,
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ]
    });

    if (conflictingEntry) {
      return res.status(400).json({
        error: 'Time conflict with existing class',
        conflictingClass: conflictingEntry
      });
    }

    // Create new entry
    const timetableEntry = new TimetableEntry({
      userId,
      subject,
      subjectCode,
      instructor,
      dayOfWeek,
      startTime,
      endTime,
      location,
      room,
      building,
      classType: classType || 'lecture',
      notificationEnabled: notificationEnabled !== undefined ? notificationEnabled : true,
      reminderMinutes: reminderMinutes || 15,
      semester,
      academicYear
    });

    await timetableEntry.save();

    res.status(201).json({
      success: true,
      data: timetableEntry,
      message: 'Timetable entry created successfully'
    });

  } catch (error) {
    console.error('Create timetable entry error:', error);
    res.status(500).json({
      error: 'Failed to create timetable entry',
      details: error.message
    });
  }
});

// Update timetable entry
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const entryId = req.params.id;
    const updateData = req.body;

    // If updating time, check for conflicts
    if (updateData.dayOfWeek !== undefined || updateData.startTime || updateData.endTime) {
      const existingEntry = await TimetableEntry.findOne({ _id: entryId, userId });
      if (!existingEntry) {
        return res.status(404).json({
          error: 'Timetable entry not found'
        });
      }

      const dayOfWeek = updateData.dayOfWeek !== undefined ? updateData.dayOfWeek : existingEntry.dayOfWeek;
      const startTime = updateData.startTime || existingEntry.startTime;
      const endTime = updateData.endTime || existingEntry.endTime;

      const conflictingEntry = await TimetableEntry.findOne({
        userId,
        _id: { $ne: entryId },
        dayOfWeek,
        isActive: true,
        $or: [
          {
            startTime: { $lt: endTime },
            endTime: { $gt: startTime }
          }
        ]
      });

      if (conflictingEntry) {
        return res.status(400).json({
          error: 'Time conflict with existing class',
          conflictingClass: conflictingEntry
        });
      }
    }

    // Update entry
    const entry = await TimetableEntry.findOneAndUpdate(
      { _id: entryId, userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!entry) {
      return res.status(404).json({
        error: 'Timetable entry not found'
      });
    }

    res.json({
      success: true,
      data: entry,
      message: 'Timetable entry updated successfully'
    });

  } catch (error) {
    console.error('Update timetable entry error:', error);
    res.status(500).json({
      error: 'Failed to update timetable entry',
      details: error.message
    });
  }
});

// Delete timetable entry (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const entryId = req.params.id;

    const entry = await TimetableEntry.findOneAndUpdate(
      { _id: entryId, userId },
      { isActive: false },
      { new: true }
    );

    if (!entry) {
      return res.status(404).json({
        error: 'Timetable entry not found'
      });
    }

    res.json({
      success: true,
      message: 'Timetable entry deleted successfully'
    });

  } catch (error) {
    console.error('Delete timetable entry error:', error);
    res.status(500).json({
      error: 'Failed to delete timetable entry',
      details: error.message
    });
  }
});

// Permanently delete timetable entry
router.delete('/:id/permanent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const entryId = req.params.id;

    const entry = await TimetableEntry.findOneAndDelete({
      _id: entryId,
      userId
    });

    if (!entry) {
      return res.status(404).json({
        error: 'Timetable entry not found'
      });
    }

    res.json({
      success: true,
      message: 'Timetable entry permanently deleted'
    });

  } catch (error) {
    console.error('Permanent delete timetable entry error:', error);
    res.status(500).json({
      error: 'Failed to permanently delete timetable entry',
      details: error.message
    });
  }
});

// Bulk create timetable entries
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { entries } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        error: 'Entries array is required'
      });
    }

    // Add userId to each entry
    const entriesWithUserId = entries.map(entry => ({
      ...entry,
      userId
    }));

    // Insert entries
    const createdEntries = await TimetableEntry.insertMany(entriesWithUserId, {
      ordered: false
    });

    res.status(201).json({
      success: true,
      data: createdEntries,
      message: `${createdEntries.length} timetable entries created successfully`
    });

  } catch (error) {
    console.error('Bulk create timetable entries error:', error);
    
    if (error.writeErrors) {
      const successCount = error.result.insertedCount || 0;
      return res.status(207).json({
        success: true,
        message: `${successCount} entries created, ${error.writeErrors.length} failed`,
        errors: error.writeErrors.map(err => ({
          index: err.index,
          error: err.errmsg
        }))
      });
    }

    res.status(500).json({
      error: 'Failed to create timetable entries',
      details: error.message
    });
  }
});

module.exports = router;