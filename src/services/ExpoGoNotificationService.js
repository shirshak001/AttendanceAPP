// Minimal notification service for Expo Go compatibility
class ExpoGoNotificationService {
  static async initialize() {
    console.log('Expo Go mode: Notifications disabled');
    return true;
  }

  static async scheduleAttendanceReminder() {
    console.log('Expo Go mode: Reminder scheduling disabled');
    return false;
  }

  static async quickMarkAttendance(subjectId, status) {
    console.log('Expo Go mode: Quick attendance disabled');
    return { success: false, message: 'Feature not available in Expo Go' };
  }

  static handleNotificationResponse = () => {
    console.log('Expo Go mode: Notification responses disabled');
  };

  static async setupBackgroundTask() {
    console.log('Expo Go mode: Background tasks disabled');
  }

  static async checkFallbackReminders() {
    console.log('Expo Go mode: Fallback reminders disabled');
  }

  static isNotificationSystemAvailable() {
    return false;
  }
}

export default ExpoGoNotificationService;