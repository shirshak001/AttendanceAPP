const express = require('express');
const mongoose = require('mongoose');
const AttendanceRecord = require('../models/AttendanceRecord');
const TimetableEntry = require('../models/TimetableEntry');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all attendance records for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 50, 
      subject, 
      status, 
      startDate, 
      endDate,
      sortBy = 'date',
      order = 'desc'
    } = req.query;

    // Build filter
    const filter = { userId: new mongoose.Types.ObjectId(userId) };

    if (subject) {
      filter.subject = { $regex: subject, $options: 'i' };
    }

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Build sort
    const sortOrder = order === 'desc' ? -1 : 1;
    const sort = { [sortBy]: sortOrder };

    // Execute query
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [records, totalCount] = await Promise.all([
      AttendanceRecord.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      AttendanceRecord.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: records,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasNext: skip + records.length < totalCount,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get attendance records error:', error);
    res.status(500).json({
      error: 'Failed to get attendance records',
      details: error.message
    });
  }
});

// Create new attendance record
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      subject,
      subjectCode,
      instructor,
      date,
      startTime,
      endTime,
      status,
      notes,
      location,
      classType
    } = req.body;

    // Validation
    if (!subject || !date || !status) {
      return res.status(400).json({
        error: 'Subject, date, and status are required'
      });
    }

    // Check if record already exists for this date and subject
    const existingRecord = await AttendanceRecord.findOne({
      userId,
      subject,
      date: new Date(date)
    });

    if (existingRecord) {
      return res.status(400).json({
        error: 'Attendance record already exists for this subject and date'
      });
    }

    // Create new record
    const attendanceRecord = new AttendanceRecord({
      userId,
      subject,
      subjectCode,
      instructor,
      date: new Date(date),
      startTime,
      endTime,
      status,
      notes,
      location,
      classType: classType || 'lecture'
    });

    await attendanceRecord.save();

    res.status(201).json({
      success: true,
      data: attendanceRecord,
      message: 'Attendance record created successfully'
    });

  } catch (error) {
    console.error('Create attendance record error:', error);
    res.status(500).json({
      error: 'Failed to create attendance record',
      details: error.message
    });
  }
});

// Update attendance record
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const recordId = req.params.id;
    const updateData = req.body;

    // Find and update record
    const record = await AttendanceRecord.findOneAndUpdate(
      { _id: recordId, userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!record) {
      return res.status(404).json({
        error: 'Attendance record not found'
      });
    }

    res.json({
      success: true,
      data: record,
      message: 'Attendance record updated successfully'
    });

  } catch (error) {
    console.error('Update attendance record error:', error);
    res.status(500).json({
      error: 'Failed to update attendance record',
      details: error.message
    });
  }
});

// Delete attendance record
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const recordId = req.params.id;

    const record = await AttendanceRecord.findOneAndDelete({
      _id: recordId,
      userId
    });

    if (!record) {
      return res.status(404).json({
        error: 'Attendance record not found'
      });
    }

    res.json({
      success: true,
      message: 'Attendance record deleted successfully'
    });

  } catch (error) {
    console.error('Delete attendance record error:', error);
    res.status(500).json({
      error: 'Failed to delete attendance record',
      details: error.message
    });
  }
});

// Get attendance statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    // Default to current month if no dates provided
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await AttendanceRecord.getAttendanceStats(userId, start, end);

    // Get overall stats
    const totalRecords = await AttendanceRecord.countDocuments({
      userId,
      date: { $gte: start, $lte: end }
    });

    const presentRecords = await AttendanceRecord.countDocuments({
      userId,
      status: { $in: ['present', 'excused'] },
      date: { $gte: start, $lte: end }
    });

    const overallRate = totalRecords > 0 
      ? Math.round((presentRecords / totalRecords) * 100)
      : 0;

    res.json({
      success: true,
      stats: {
        overall: {
          total: totalRecords,
          present: presentRecords,
          attendanceRate: overallRate
        },
        bySubject: stats
      }
    });

  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({
      error: 'Failed to get attendance statistics',
      details: error.message
    });
  }
});

// Get attendance trend data
router.get('/trends', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const trendData = await AttendanceRecord.getTrendData(userId, parseInt(days));

    res.json({
      success: true,
      data: trendData
    });

  } catch (error) {
    console.error('Get attendance trends error:', error);
    res.status(500).json({
      error: 'Failed to get attendance trends',
      details: error.message
    });
  }
});

// Bulk create attendance records
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        error: 'Records array is required'
      });
    }

    // Add userId to each record
    const recordsWithUserId = records.map(record => ({
      ...record,
      userId,
      date: new Date(record.date)
    }));

    // Insert records
    const createdRecords = await AttendanceRecord.insertMany(recordsWithUserId, {
      ordered: false // Continue on duplicate key errors
    });

    res.status(201).json({
      success: true,
      data: createdRecords,
      message: `${createdRecords.length} attendance records created successfully`
    });

  } catch (error) {
    console.error('Bulk create attendance records error:', error);
    
    if (error.writeErrors) {
      // Handle partial success
      const successCount = error.result.insertedCount || 0;
      return res.status(207).json({
        success: true,
        message: `${successCount} records created, ${error.writeErrors.length} failed`,
        errors: error.writeErrors.map(err => ({
          index: err.index,
          error: err.errmsg
        }))
      });
    }

    res.status(500).json({
      error: 'Failed to create attendance records',
      details: error.message
    });
  }
});

module.exports = router;