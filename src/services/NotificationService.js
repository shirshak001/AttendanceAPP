import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

// Conditional imports for better web compatibility
let Notifications, TaskManager;

try {
  Notifications = require('expo-notifications');
  TaskManager = require('expo-task-manager');
  
  // Configure notification behavior for development builds only if available
  if (Notifications && Notifications.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
} catch (error) {
  console.log('Some modules not available in web environment:', error.message);
  // Fallback implementations
  Notifications = null;
  TaskManager = null;
}

// Import services that should be available in all environments
let AttendanceService, TimetableService;
try {
  AttendanceService = require('./AttendanceService').default || require('./AttendanceService');
  TimetableService = require('./TimetableService').default || require('./TimetableService');
} catch (error) {
  console.log('Service modules not available, using fallbacks:', error.message);
  try {
    const WebFallbackService = require('./WebFallbackService').default;
    AttendanceService = WebFallbackService.AttendanceService;
    TimetableService = WebFallbackService.TimetableService;
  } catch (fallbackError) {
    console.log('Fallback service not available either:', fallbackError.message);
    AttendanceService = null;
    TimetableService = null;
  }
}

const BACKGROUND_NOTIFICATION_TASK = 'background-notification-task';
const ATTENDANCE_NOTIFICATION_KEY = 'attendance_notifications';

class NotificationService {
  // Check if notification system is available
  static isNotificationSystemAvailable() {
    try {
      return Notifications && typeof Notifications.requestPermissionsAsync === 'function';
    } catch (error) {
      console.log('Notifications not available:', error);
      return false;
    }
  }
  // Initialize notification service for development builds
  static async initialize() {
    try {
      if (!Notifications || !Notifications.requestPermissionsAsync) {
        console.log('Notifications not available, using fallback');
        return false;
      }
      
      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      // Set up notification categories for quick actions (not supported on web)
      if (Platform.OS !== 'web') {
        await Notifications.setNotificationCategoryAsync('attendance-reminder', [
          {
            identifier: 'mark-present',
            buttonTitle: 'Present',
            options: { opensAppToForeground: false },
          },
          {
            identifier: 'mark-absent',
            buttonTitle: 'Absent',
            options: { opensAppToForeground: false },
          },
          {
            identifier: 'open-app',
            buttonTitle: 'Open App',
            options: { opensAppToForeground: true },
          },
        ]);
        console.log('Notification service initialized with full push notification support');
      } else {
        console.log('Notification service initialized for web (limited functionality)');
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing notification service:', error);
      return false;
    }
  }

  // Schedule attendance reminders for all classes
  static async scheduleAttendanceReminders() {
    try {
      // Cancel all existing notifications first
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      const todayClasses = await AttendanceService.getTodayClassesWithAttendance();
      const reminders = todayClasses.filter(classItem => !classItem.hasAttendance);
      
      for (const classItem of reminders) {
        await NotificationService.scheduleClassReminder(classItem);
      }

      console.log(`Scheduled reminders for ${reminders.length} classes`);
    } catch (error) {
      console.error('Error scheduling attendance reminders:', error);
    }
  }

  // Schedule reminder for a specific class
  static async scheduleClassReminder(classItem) {
    try {
      const now = new Date();
      const classEndTime = new Date();
      const [hours, minutes] = classItem.endTime.split(':');
      classEndTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Schedule notification 5 minutes after class ends
      const reminderTime = new Date(classEndTime.getTime() + 5 * 60 * 1000);

      // Only schedule if the reminder time is in the future
      if (reminderTime <= now) {
        console.log(`Skipping past reminder for ${classItem.subjectName}`);
        return;
      }

      const trigger = {
        date: reminderTime,
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📚 Attendance Reminder',
          body: `Don't forget to mark attendance for ${classItem.subjectName}`,
          data: {
            type: 'attendance_reminder',
            classId: classItem.id,
            subjectId: classItem.subjectId,
            subjectName: classItem.subjectName,
          },
          categoryIdentifier: 'attendance-reminder',
        },
        trigger,
      });

      console.log(`Scheduled reminder for ${classItem.subjectName} at ${reminderTime.toLocaleTimeString()}`);
    } catch (error) {
      console.error(`Error scheduling reminder for ${classItem.subjectName}:`, error);
    }
  }

  // Handle notification responses (when user taps notification or actions)
  static async handleNotificationResponse(response) {
    try {
      const { data } = response.notification.request.content;
      
      if (data.type === 'attendance_reminder') {
        const { actionIdentifier } = response;
        
        if (actionIdentifier === 'mark-present') {
          await NotificationService.quickMarkAttendance(data.classId, data.subjectId, 'present');
          await NotificationService.showCompletionNotification(data.subjectName, 'present');
        } else if (actionIdentifier === 'mark-absent') {
          await NotificationService.quickMarkAttendance(data.classId, data.subjectId, 'absent');
          await NotificationService.showCompletionNotification(data.subjectName, 'absent');
        }
        // If 'open-app' or default tap, the app will open automatically
      }
    } catch (error) {
      console.error('Error handling notification response:', error);
    }
  }

  // Quick mark attendance from notification
  static async quickMarkAttendance(classId, subjectId, status) {
    try {
      const result = await AttendanceService.markAttendance({
        subjectId,
        status,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        method: 'notification',
      });

      if (result.success) {
        console.log(`Attendance marked as ${status} for subject ${subjectId}`);
      }
      
      return result;
    } catch (error) {
      console.error('Error marking attendance from notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Show completion notification after marking attendance
  static async showCompletionNotification(subjectName, status) {
    try {
      await Notifications.presentNotificationAsync({
        title: '✅ Attendance Marked',
        body: `Marked as ${status.charAt(0).toUpperCase() + status.slice(1)} for ${subjectName}`,
        data: {
          type: 'attendance_completion',
        },
      });
    } catch (error) {
      console.error('Error showing completion notification:', error);
    }
  }

  // Check for pending attendance and show reminders
  static async checkPendingAttendance() {
    try {
      const todayClasses = await AttendanceService.getTodayClassesWithAttendance();
      const pendingClasses = todayClasses.filter(classItem => !classItem.hasAttendance);
      
      for (const classItem of pendingClasses) {
        const now = new Date();
        const classEndTime = new Date();
        const [hours, minutes] = classItem.endTime.split(':');
        classEndTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Show reminder if class ended more than 5 minutes ago
        if (now.getTime() - classEndTime.getTime() > 5 * 60 * 1000) {
          await NotificationService.showImmediateAttendanceReminder(classItem);
        }
      }
    } catch (error) {
      console.error('Error checking pending attendance:', error);
    }
  }

  // Show immediate attendance reminder
  static async showImmediateAttendanceReminder(classItem) {
    try {
      await Notifications.presentNotificationAsync({
        title: '⚠️ Pending Attendance',
        body: `Please mark attendance for ${classItem.subjectName}`,
        data: {
          type: 'pending_attendance',
          classId: classItem.id,
          subjectId: classItem.subjectId,
          subjectName: classItem.subjectName,
        },
        categoryIdentifier: 'attendance-reminder',
      });
    } catch (error) {
      console.error('Error showing immediate reminder:', error);
    }
  }

  // Schedule daily reminders
  static async scheduleDailyReminders() {
    try {
      // Schedule a daily check at 9 PM
      const trigger = {
        hour: 21,
        minute: 0,
        repeats: true,
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📊 Daily Attendance Check',
          body: 'Check if you have any pending attendance to mark',
          data: {
            type: 'daily_check',
          },
        },
        trigger,
      });

      console.log('Daily reminders scheduled');
    } catch (error) {
      console.error('Error scheduling daily reminders:', error);
    }
  }

  // Enable/disable notifications
  static async setNotificationsEnabled(enabled) {
    try {
      await AsyncStorage.setItem(ATTENDANCE_NOTIFICATION_KEY, JSON.stringify(enabled));
      
      if (enabled) {
        await NotificationService.scheduleAttendanceReminders();
        await NotificationService.scheduleDailyReminders();
      } else {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
      
      return true;
    } catch (error) {
      console.error('Error setting notification state:', error);
      return false;
    }
  }

  // Check if notifications are enabled
  static async areNotificationsEnabled() {
    try {
      const enabled = await AsyncStorage.getItem(ATTENDANCE_NOTIFICATION_KEY);
      return enabled ? JSON.parse(enabled) : true; // Default to enabled
    } catch (error) {
      console.error('Error checking notification state:', error);
      return true;
    }
  }

  // Get notification token for push notifications
  static async getNotificationToken() {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      console.log('Push notification token:', token.data);
      return token.data;
    } catch (error) {
      console.error('Error getting notification token:', error);
      return null;
    }
  }

  // Clear all notifications
  static async clearAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
      console.log('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  // Check fallback reminders (fallback method for compatibility)
  static async checkFallbackReminders() {
    try {
      await this.checkPendingAttendance();
    } catch (error) {
      console.error('Error checking fallback reminders:', error);
    }
  }
}

// Define background notification task
if (TaskManager) {
  TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error, executionInfo }) => {
    console.log('Background notification task received data:', data);
    // Handle background notification processing here
  });
}

export default NotificationService;