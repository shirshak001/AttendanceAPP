import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  ATTENDANCE: 'attendance',
  SUBJECTS: 'subjects',
  TIMETABLE: 'timetable',
};

const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
};

class AttendanceService {
  // Get all attendance records
  static async getAllAttendance() {
    try {
      const attendanceData = await AsyncStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      return attendanceData ? JSON.parse(attendanceData) : {};
    } catch (error) {
      console.error('Error getting attendance:', error);
      return {};
    }
  }

  // Get attendance for a specific class
  static async getClassAttendance(classId) {
    try {
      const allAttendance = await this.getAllAttendance();
      return allAttendance[classId] || [];
    } catch (error) {
      console.error('Error getting class attendance:', error);
      return [];
    }
  }

  // Mark attendance for a class
  static async markAttendance(classId, subjectId, status, date = null, notes = '') {
    try {
      if (!classId || !subjectId || !status) {
        throw new Error('Missing required fields');
      }

      if (!Object.values(ATTENDANCE_STATUS).includes(status)) {
        throw new Error('Invalid attendance status');
      }

      const attendanceDate = date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const attendanceRecord = {
        id: `attendance_${classId}_${Date.now()}`,
        classId,
        subjectId,
        status,
        date: attendanceDate,
        timestamp: new Date().toISOString(),
        notes: notes || '',
        markedAt: new Date().toISOString(),
      };

      const allAttendance = await this.getAllAttendance();
      
      if (!allAttendance[classId]) {
        allAttendance[classId] = [];
      }

      // Check if attendance already exists for this date
      const existingIndex = allAttendance[classId].findIndex(
        record => record.date === attendanceDate
      );

      if (existingIndex !== -1) {
        // Update existing record
        allAttendance[classId][existingIndex] = {
          ...allAttendance[classId][existingIndex],
          ...attendanceRecord,
          updatedAt: new Date().toISOString(),
        };
      } else {
        // Add new record
        allAttendance[classId].push(attendanceRecord);
      }

      // Sort by date (newest first)
      allAttendance[classId].sort((a, b) => new Date(b.date) - new Date(a.date));

      await AsyncStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(allAttendance));

      return { success: true, record: attendanceRecord };
    } catch (error) {
      console.error('Error marking attendance:', error);
      return { success: false, error: error.message };
    }
  }

  // Get attendance statistics for a class
  static async getClassAttendanceStats(classId) {
    try {
      const classAttendance = await this.getClassAttendance(classId);
      
      const stats = {
        total: classAttendance.length,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        percentage: 0,
      };

      classAttendance.forEach(record => {
        stats[record.status]++;
      });

      if (stats.total > 0) {
        stats.percentage = Math.round(((stats.present + stats.late) / stats.total) * 100);
      }

      return stats;
    } catch (error) {
      console.error('Error getting attendance stats:', error);
      return {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        percentage: 0,
      };
    }
  }

  // Get attendance statistics for a subject
  static async getSubjectAttendanceStats(subjectId) {
    try {
      const allAttendance = await this.getAllAttendance();
      let allRecords = [];

      // Collect all attendance records for this subject
      for (const classId in allAttendance) {
        const classRecords = allAttendance[classId].filter(
          record => record.subjectId === subjectId
        );
        allRecords = [...allRecords, ...classRecords];
      }

      const stats = {
        total: allRecords.length,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        percentage: 0,
      };

      allRecords.forEach(record => {
        stats[record.status]++;
      });

      if (stats.total > 0) {
        stats.percentage = Math.round(((stats.present + stats.late) / stats.total) * 100);
      }

      return stats;
    } catch (error) {
      console.error('Error getting subject attendance stats:', error);
      return {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        percentage: 0,
      };
    }
  }

  // Get recent attendance records
  static async getRecentAttendance(limit = 10) {
    try {
      const allAttendance = await this.getAllAttendance();
      let allRecords = [];

      // Collect all attendance records
      for (const classId in allAttendance) {
        allRecords = [...allRecords, ...allAttendance[classId]];
      }

      // Sort by timestamp (newest first) and limit
      return allRecords
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recent attendance:', error);
      return [];
    }
  }

  // Get attendance for a specific date range
  static async getAttendanceByDateRange(startDate, endDate, subjectId = null) {
    try {
      const allAttendance = await this.getAllAttendance();
      let filteredRecords = [];

      for (const classId in allAttendance) {
        const classRecords = allAttendance[classId].filter(record => {
          const recordDate = new Date(record.date);
          const start = new Date(startDate);
          const end = new Date(endDate);
          
          const inDateRange = recordDate >= start && recordDate <= end;
          const matchesSubject = !subjectId || record.subjectId === subjectId;
          
          return inDateRange && matchesSubject;
        });
        
        filteredRecords = [...filteredRecords, ...classRecords];
      }

      return filteredRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      console.error('Error getting attendance by date range:', error);
      return [];
    }
  }

  // Delete attendance record
  static async deleteAttendanceRecord(classId, recordId) {
    try {
      const allAttendance = await this.getAllAttendance();
      
      if (!allAttendance[classId]) {
        throw new Error('Class not found');
      }

      const recordIndex = allAttendance[classId].findIndex(
        record => record.id === recordId
      );

      if (recordIndex === -1) {
        throw new Error('Attendance record not found');
      }

      allAttendance[classId].splice(recordIndex, 1);

      await AsyncStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(allAttendance));

      return { success: true };
    } catch (error) {
      console.error('Error deleting attendance record:', error);
      return { success: false, error: error.message };
    }
  }

  // Get today's classes with attendance status
  static async getTodayClassesWithAttendance() {
    try {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const todayDate = new Date().toISOString().split('T')[0];
      
      // Get today's timetable
      const timetableData = await AsyncStorage.getItem(STORAGE_KEYS.TIMETABLE);
      const timetable = timetableData ? JSON.parse(timetableData) : {};
      const todayClasses = timetable[today] || [];

      // Get attendance data
      const allAttendance = await this.getAllAttendance();

      // Combine timetable with attendance status
      const classesWithAttendance = todayClasses.map(classItem => {
        const classAttendance = allAttendance[classItem.id] || [];
        const todayAttendance = classAttendance.find(
          record => record.date === todayDate
        );

        return {
          ...classItem,
          attendanceStatus: todayAttendance?.status || null,
          attendanceId: todayAttendance?.id || null,
          hasAttendance: !!todayAttendance,
        };
      });

      return classesWithAttendance;
    } catch (error) {
      console.error('Error getting today classes with attendance:', error);
      return [];
    }
  }

  // Check if class time has passed (for notification triggering)
  static isClassTimePassed(classEndTime) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return currentTime > classEndTime;
  }

  // Get classes that need attendance marking
  static async getClassesNeedingAttendance() {
    try {
      const todayClasses = await this.getTodayClassesWithAttendance();
      
      return todayClasses.filter(classItem => {
        // Class has ended and no attendance marked
        return this.isClassTimePassed(classItem.endTime) && !classItem.hasAttendance;
      });
    } catch (error) {
      console.error('Error getting classes needing attendance:', error);
      return [];
    }
  }

  // Quick mark attendance (for notifications)
  static async quickMarkAttendance(classId, subjectId, status) {
    return await this.markAttendance(classId, subjectId, status);
  }

  // Get attendance status display info
  static getStatusDisplayInfo(status) {
    const statusInfo = {
      [ATTENDANCE_STATUS.PRESENT]: {
        label: 'Present',
        iconName: 'checkmark-circle',
        color: '#4CAF50',
        bgColor: '#E8F5E8',
      },
      [ATTENDANCE_STATUS.ABSENT]: {
        label: 'Absent',
        iconName: 'close-circle',
        color: '#F44336',
        bgColor: '#FFEBEE',
      },
      [ATTENDANCE_STATUS.LATE]: {
        label: 'Late',
        iconName: 'time',
        color: '#FF9800',
        bgColor: '#FFF3E0',
      },
      [ATTENDANCE_STATUS.EXCUSED]: {
        label: 'Excused',
        iconName: 'document-text',
        color: '#9C27B0',
        bgColor: '#F3E5F5',
      },
    };

    return statusInfo[status] || {
      label: 'Unknown',
      iconName: 'help-circle',
      color: '#757575',
      bgColor: '#F5F5F5',
    };
  }

  // Get all attendance records (for History screen)
  static async getAllAttendanceRecords() {
    try {
      const allAttendance = await this.getAllAttendance();
      const records = [];
      
      for (const [classId, attendanceArray] of Object.entries(allAttendance)) {
        for (const record of attendanceArray) {
          records.push({
            ...record,
            classId,
          });
        }
      }
      
      return records;
    } catch (error) {
      console.error('Error getting all attendance records:', error);
      return [];
    }
  }

  // Get attendance statistics for a subject
  static async getSubjectAttendanceStats(subjectId) {
    try {
      const allRecords = await this.getAllAttendanceRecords();
      const subjectRecords = allRecords.filter(record => record.subjectId === subjectId);
      
      const stats = {
        totalClasses: subjectRecords.length,
        presentClasses: 0,
        absentClasses: 0,
        lateClasses: 0,
        excusedClasses: 0,
      };
      
      subjectRecords.forEach(record => {
        switch (record.status) {
          case 'present':
            stats.presentClasses++;
            break;
          case 'absent':
            stats.absentClasses++;
            break;
          case 'late':
            stats.lateClasses++;
            break;
          case 'excused':
            stats.excusedClasses++;
            break;
        }
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting subject attendance stats:', error);
      return {
        totalClasses: 0,
        presentClasses: 0,
        absentClasses: 0,
        lateClasses: 0,
        excusedClasses: 0,
      };
    }
  }

  // Get attendance history for a subject
  static async getSubjectAttendanceHistory(subjectId) {
    try {
      const allRecords = await this.getAllAttendanceRecords();
      return allRecords
        .filter(record => record.subjectId === subjectId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      console.error('Error getting subject attendance history:', error);
      return [];
    }
  }

  // Utility functions
  static getAttendanceStatusValues() {
    return ATTENDANCE_STATUS;
  }

  static formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  static formatTime(timeString) {
    return new Date(`2000-01-01T${timeString}:00`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}

export default AttendanceService;