import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  TIMETABLE: 'timetable',
  SUBJECTS: 'subjects',
};

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00'
];

class TimetableService {
  // Get all timetable data
  static async getTimetable() {
    try {
      const timetableData = await AsyncStorage.getItem(STORAGE_KEYS.TIMETABLE);
      if (timetableData) {
        return JSON.parse(timetableData);
      }
      return {};
    } catch (error) {
      console.error('Error getting timetable:', error);
      return {};
    }
  }

  // Get classes for a specific day
  static async getClassesForDay(day) {
    try {
      const timetable = await this.getTimetable();
      return timetable[day] || [];
    } catch (error) {
      console.error('Error getting classes for day:', error);
      return [];
    }
  }

  // Add a new class
  static async addClass(classData) {
    try {
      // Validate required fields
      if (!classData.day || !classData.startTime || !classData.endTime || !classData.subjectId) {
        throw new Error('Missing required fields');
      }

      // Validate time format and logic
      if (!this.isValidTimeSlot(classData.startTime) || !this.isValidTimeSlot(classData.endTime)) {
        throw new Error('Invalid time format');
      }

      if (classData.startTime >= classData.endTime) {
        throw new Error('Start time must be before end time');
      }

      // Check for conflicts
      const hasConflict = await this.checkTimeConflict(
        classData.day, 
        classData.startTime, 
        classData.endTime, 
        classData.id
      );

      if (hasConflict) {
        throw new Error('Time slot conflicts with existing class');
      }

      // Get subject details
      const subjects = await AsyncStorage.getItem(STORAGE_KEYS.SUBJECTS);
      const subjectsArray = subjects ? JSON.parse(subjects) : [];
      const subject = subjectsArray.find(s => s.id === classData.subjectId);

      if (!subject) {
        throw new Error('Subject not found');
      }

      const newClass = {
        id: classData.id || `class_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        subjectId: classData.subjectId,
        subjectName: subject.name,
        subjectColor: subject.color,
        subjectIcon: subject.icon,
        day: classData.day,
        startTime: classData.startTime,
        endTime: classData.endTime,
        location: classData.location || '',
        notes: classData.notes || '',
        repeatWeekly: classData.repeatWeekly !== false, // Default to true
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const timetable = await this.getTimetable();
      if (!timetable[classData.day]) {
        timetable[classData.day] = [];
      }

      // Remove existing class if updating
      if (classData.id) {
        timetable[classData.day] = timetable[classData.day].filter(c => c.id !== classData.id);
      }

      timetable[classData.day].push(newClass);

      // Sort classes by start time
      timetable[classData.day].sort((a, b) => a.startTime.localeCompare(b.startTime));

      await AsyncStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(timetable));

      return { success: true, class: newClass };
    } catch (error) {
      console.error('Error adding class:', error);
      return { success: false, error: error.message };
    }
  }

  // Update an existing class
  static async updateClass(classId, updatedData) {
    try {
      const timetable = await this.getTimetable();
      let classFound = false;
      let updatedClass = null;

      for (const day in timetable) {
        const classIndex = timetable[day].findIndex(c => c.id === classId);
        if (classIndex !== -1) {
          const existingClass = timetable[day][classIndex];
          
          // If day has changed, move the class
          if (updatedData.day && updatedData.day !== day) {
            // Remove from old day
            timetable[day].splice(classIndex, 1);
            
            // Add to new day with updated data
            const updateResult = await this.addClass({
              ...existingClass,
              ...updatedData,
              id: classId,
            });
            
            if (updateResult.success) {
              return updateResult;
            } else {
              throw new Error(updateResult.error);
            }
          } else {
            // Update in the same day
            updatedClass = {
              ...existingClass,
              ...updatedData,
              updatedAt: new Date().toISOString(),
            };
            
            timetable[day][classIndex] = updatedClass;
            classFound = true;
            break;
          }
        }
      }

      if (!classFound) {
        throw new Error('Class not found');
      }

      await AsyncStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(timetable));
      return { success: true, class: updatedClass };
    } catch (error) {
      console.error('Error updating class:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete a class
  static async deleteClass(classId) {
    try {
      const timetable = await this.getTimetable();
      let classFound = false;

      for (const day in timetable) {
        const classIndex = timetable[day].findIndex(c => c.id === classId);
        if (classIndex !== -1) {
          timetable[day].splice(classIndex, 1);
          classFound = true;
          break;
        }
      }

      if (!classFound) {
        throw new Error('Class not found');
      }

      await AsyncStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(timetable));
      return { success: true };
    } catch (error) {
      console.error('Error deleting class:', error);
      return { success: false, error: error.message };
    }
  }

  // Get a specific class by ID
  static async getClassById(classId) {
    try {
      const timetable = await this.getTimetable();
      
      for (const day in timetable) {
        const classItem = timetable[day].find(c => c.id === classId);
        if (classItem) {
          return classItem;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting class by ID:', error);
      return null;
    }
  }

  // Check for time conflicts
  static async checkTimeConflict(day, startTime, endTime, excludeClassId = null) {
    try {
      const classes = await this.getClassesForDay(day);
      
      return classes.some(classItem => {
        if (excludeClassId && classItem.id === excludeClassId) {
          return false;
        }
        
        // Check if times overlap
        const newStart = this.timeToMinutes(startTime);
        const newEnd = this.timeToMinutes(endTime);
        const existingStart = this.timeToMinutes(classItem.startTime);
        const existingEnd = this.timeToMinutes(classItem.endTime);
        
        return (newStart < existingEnd && newEnd > existingStart);
      });
    } catch (error) {
      console.error('Error checking time conflict:', error);
      return false;
    }
  }

  // Get weekly summary
  static async getWeeklySummary() {
    try {
      const timetable = await this.getTimetable();
      let totalClasses = 0;
      const daysSummary = {};

      DAYS_OF_WEEK.forEach(day => {
        const dayClasses = timetable[day] || [];
        daysSummary[day] = dayClasses.length;
        totalClasses += dayClasses.length;
      });

      return {
        totalClasses,
        daysSummary,
        busiestDay: Object.entries(daysSummary).reduce((a, b) => 
          daysSummary[a[0]] > daysSummary[b[0]] ? a : b
        )[0],
      };
    } catch (error) {
      console.error('Error getting weekly summary:', error);
      return {
        totalClasses: 0,
        daysSummary: {},
        busiestDay: 'Monday',
      };
    }
  }

  // Get today's classes
  static async getTodayClasses() {
    try {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      return await this.getClassesForDay(today);
    } catch (error) {
      console.error('Error getting today classes:', error);
      return [];
    }
  }

  // Get next class
  static async getNextClass() {
    try {
      const todayClasses = await this.getTodayClasses();
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const upcomingClasses = todayClasses.filter(classItem => 
        classItem.startTime > currentTime
      );
      
      return upcomingClasses.length > 0 ? upcomingClasses[0] : null;
    } catch (error) {
      console.error('Error getting next class:', error);
      return null;
    }
  }

  // Utility functions
  static isValidTimeSlot(time) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  static timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  static minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  static formatTimeRange(startTime, endTime) {
    return `${startTime} - ${endTime}`;
  }

  // Get all subjects
  static async getAllSubjects() {
    try {
      const subjectsData = await AsyncStorage.getItem(STORAGE_KEYS.SUBJECTS);
      return subjectsData ? JSON.parse(subjectsData) : [];
    } catch (error) {
      console.error('Error getting all subjects:', error);
      return [];
    }
  }

  // Get subject by ID
  static async getSubjectById(subjectId) {
    try {
      const subjects = await this.getAllSubjects();
      return subjects.find(subject => subject.id === subjectId) || null;
    } catch (error) {
      console.error('Error getting subject by ID:', error);
      return null;
    }
  }

  static getDaysOfWeek() {
    return DAYS_OF_WEEK;
  }

  static getTimeSlots() {
    return TIME_SLOTS;
  }
}

export default TimetableService;