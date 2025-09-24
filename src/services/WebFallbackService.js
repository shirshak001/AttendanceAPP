// Web-compatible fallback implementations for services that don't work in web
class WebFallbackService {
  // Mock AttendanceService for web
  static AttendanceService = {
    async markAttendance(subjectId, status, date = new Date()) {
      console.log(`Web fallback: Marking ${status} for subject ${subjectId} on ${date}`);
      return { success: true, message: 'Attendance marked (web fallback)' };
    },
    
    async getAttendanceForSubject(subjectId) {
      console.log(`Web fallback: Getting attendance for subject ${subjectId}`);
      return [];
    },
    
    async getAttendanceForDate(date) {
      console.log(`Web fallback: Getting attendance for date ${date}`);
      return [];
    },
    
    async calculateAttendancePercentage(subjectId) {
      console.log(`Web fallback: Calculating attendance for subject ${subjectId}`);
      return 85; // Mock percentage
    },
    
    async getOverallAttendance() {
      console.log('Web fallback: Getting overall attendance');
      return { total: 100, present: 85, percentage: 85 };
    }
  };

  // Mock TimetableService for web
  static TimetableService = {
    async addClass(classData) {
      console.log('Web fallback: Adding class', classData);
      return { success: true, id: Date.now().toString() };
    },
    
    async getClassesForDay(day) {
      console.log(`Web fallback: Getting classes for ${day}`);
      return [];
    },
    
    async getAllClasses() {
      console.log('Web fallback: Getting all classes');
      return [];
    },
    
    async updateClass(classId, classData) {
      console.log(`Web fallback: Updating class ${classId}`, classData);
      return { success: true };
    },
    
    async deleteClass(classId) {
      console.log(`Web fallback: Deleting class ${classId}`);
      return { success: true };
    },
    
    async getTodayClasses() {
      console.log('Web fallback: Getting today classes');
      return [];
    }
  };
}

export default WebFallbackService;