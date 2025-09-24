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

  // Request notification permissions
  static async requestPermissions() {
    try {
      if (!Notifications || !Notifications.requestPermissionsAsync) {
        console.log('Notifications not available for permission request');
        return false;
      }

      console.log('Requesting notification permissions...');
      const { status } = await Notifications.requestPermissionsAsync();
      console.log('Permission request result:', status);
      
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Enable attendance reminders (after permissions are granted)
  static async enableAttendanceReminders() {
    try {
      console.log('Enabling attendance reminders...');
      
      // Set notifications as enabled in storage
      await this.setNotificationsEnabled(true);
      
      // Schedule the actual reminders
      await this.scheduleAttendanceReminders();
      await this.scheduleDailyReminders();
      
      console.log('Attendance reminders enabled successfully');
      return true;
    } catch (error) {
      console.error('Error enabling attendance reminders:', error);
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
      
      console.log('Starting notification service initialization...');

      // Set up notification channel for Android
      if (Platform.OS === 'android') {
        console.log('Setting up Android notification channel...');
        await Notifications.setNotificationChannelAsync('attendance-reminder', {
          name: 'Attendance Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: true,
          enableVibrate: true,
          showBadge: true,
        });

        // Set up a default notification channel as well
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: true,
          enableVibrate: true,
        });
        console.log('Android notification channels created successfully');
      }
      
      // Don't automatically request permissions during initialization
      // Check current permission status instead
      const { status } = await Notifications.getPermissionsAsync();
      console.log('Current notification permission status:', status);

      // Set up notification categories for quick actions (not supported on web)
      if (Platform.OS !== 'web') {
        console.log('Setting up notification categories...');
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
        console.log('Notification categories set up successfully');
        
        // Set up notification response listener
        if (Notifications.addNotificationResponseReceivedListener) {
          Notifications.addNotificationResponseReceivedListener(this.handleNotificationResponse);
          console.log('Notification response listener set up');
        }
        
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

  // Schedule attendance reminders for all classes (works when app is closed)
  static async scheduleAttendanceReminders() {
    try {
      console.log('Scheduling attendance reminders for background notifications...');
      
      // Clean up expired notifications first
      await this.cleanupExpiredNotifications();
      
      // Cancel existing attendance reminders (keep other notifications)
      const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of existingNotifications) {
        if (notification.identifier?.startsWith('attendance_')) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
      
      // Get today's classes that need attendance reminders
      const todayClasses = await AttendanceService.getTodayClassesWithAttendance();
      const reminders = todayClasses.filter(classItem => !classItem.hasAttendance);
      
      // Schedule reminders for today
      for (const classItem of reminders) {
        await NotificationService.scheduleClassReminder(classItem);
      }

      // Also schedule reminders for the next 6 days
      for (let dayOffset = 1; dayOffset <= 6; dayOffset++) {
        try {
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + dayOffset);
          const futureDayName = futureDate.toLocaleDateString('en-US', { weekday: 'long' });
          
          // Get timetable for future day
          const futureClasses = await TimetableService.getClassesForDay(futureDayName);
          
          for (const classItem of futureClasses) {
            // Create a modified class item for the future date
            const futureClassItem = {
              ...classItem,
              date: futureDate.toISOString().split('T')[0],
              id: `${classItem.id}_${futureDate.toISOString().split('T')[0]}`
            };
            
            // Schedule for future date
            const classDateTime = new Date(futureDate);
            const [hours, minutes] = classItem.endTime.split(':');
            classDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            // Only schedule if it's in the future
            if (classDateTime > new Date()) {
              const reminderTime = new Date(classDateTime.getTime() + 5 * 60 * 1000);
              
              const trigger = {
                date: reminderTime,
                channelId: 'attendance-reminder',
              };

              const notificationId = `attendance_${futureClassItem.subjectId}_${futureClassItem.id}_${reminderTime.getTime()}`;

              await Notifications.scheduleNotificationAsync({
                identifier: notificationId,
                content: {
                  title: 'Attendance Reminder',
                  body: `Don't forget to mark attendance for ${classItem.subjectName}`,
                  data: {
                    type: 'attendance_reminder',
                    classId: futureClassItem.id,
                    subjectId: classItem.subjectId,
                    subjectName: classItem.subjectName,
                    scheduledFor: reminderTime.toISOString(),
                    date: futureClassItem.date,
                  },
                  categoryIdentifier: 'attendance-reminder',
                  sound: true,
                  badge: 1,
                  priority: Notifications.AndroidNotificationPriority.HIGH,
                },
                trigger,
              });
              
              console.log(`Scheduled future reminder for ${classItem.subjectName} on ${futureDayName} at ${reminderTime.toLocaleString()}`);
            }
          }
        } catch (error) {
          console.error(`Error scheduling reminders for day offset ${dayOffset}:`, error);
        }
      }

      // Schedule daily attendance checks
      await this.scheduleDailyAttendanceCheck();

      console.log(`Scheduled reminders for ${reminders.length} classes today + future classes for the week`);
    } catch (error) {
      console.error('Error scheduling attendance reminders:', error);
    }
  }

  // Schedule reminder for a specific class (works when app is closed)
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

      // Use exact time trigger for background notifications
      const trigger = {
        date: reminderTime,
        channelId: 'attendance-reminder',
      };

      const notificationId = `attendance_${classItem.subjectId}_${classItem.id}_${reminderTime.getTime()}`;

      await Notifications.scheduleNotificationAsync({
        identifier: notificationId,
        content: {
          title: 'Attendance Reminder',
          body: `Don't forget to mark attendance for ${classItem.subjectName}`,
          data: {
            type: 'attendance_reminder',
            classId: classItem.id,
            subjectId: classItem.subjectId,
            subjectName: classItem.subjectName,
            scheduledFor: reminderTime.toISOString(),
          },
          categoryIdentifier: 'attendance-reminder',
          sound: true,
          badge: 1,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger,
      });

      console.log(`Scheduled reminder for ${classItem.subjectName} at ${reminderTime.toLocaleTimeString()} (ID: ${notificationId})`);
      
      // Store scheduled notification for tracking
      await this.storeScheduledNotification(notificationId, {
        classItem,
        reminderTime: reminderTime.toISOString(),
        type: 'attendance_reminder'
      });
      
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
        title: 'Attendance Marked',
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
        title: 'Pending Attendance',
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

  // Schedule daily reminders (legacy method - now uses scheduleDailyAttendanceCheck)
  static async scheduleDailyReminders() {
    try {
      console.log('Setting up daily reminders...');
      await this.scheduleDailyAttendanceCheck();
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

  // Test notification (for debugging purposes)
  static async sendTestNotification() {
    try {
      console.log('Sending test notification...');
      await Notifications.presentNotificationAsync({
        title: 'Test Notification',
        body: 'This is a test to verify notifications are working',
        data: {
          type: 'test',
        },
      });
      console.log('Test notification sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }

  // Schedule a test reminder in 5 seconds (for debugging)
  static async scheduleTestReminder() {
    try {
      console.log('Scheduling test reminder...');
      const trigger = {
        seconds: 5,
        channelId: 'default',
      };

      await Notifications.scheduleNotificationAsync({
        identifier: `test_${Date.now()}`,
        content: {
          title: 'Test Reminder',
          body: 'This test reminder should appear in 5 seconds',
          data: {
            type: 'test_reminder',
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger,
      });

      console.log('Test reminder scheduled successfully');
      return true;
    } catch (error) {
      console.error('Error scheduling test reminder:', error);
      return false;
    }
  }

  // Debug: Get all scheduled notifications
  static async getAllScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('All scheduled notifications:');
      notifications.forEach((notification, index) => {
        console.log(`${index + 1}. ID: ${notification.identifier}`);
        console.log(`   Title: ${notification.content.title}`);
        console.log(`   Trigger: ${JSON.stringify(notification.trigger)}`);
        console.log(`   Data: ${JSON.stringify(notification.content.data)}`);
      });
      return notifications;
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Store scheduled notification for tracking
  static async storeScheduledNotification(notificationId, data) {
    try {
      const key = `scheduled_notification_${notificationId}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        ...data,
        scheduledAt: new Date().toISOString(),
        id: notificationId
      }));
    } catch (error) {
      console.error('Error storing scheduled notification:', error);
    }
  }

  // Get all scheduled notifications
  static async getScheduledNotifications() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const scheduledKeys = keys.filter(key => key.startsWith('scheduled_notification_'));
      const notifications = [];
      
      for (const key of scheduledKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          notifications.push(JSON.parse(data));
        }
      }
      
      return notifications;
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Clean up expired scheduled notifications
  static async cleanupExpiredNotifications() {
    try {
      const scheduled = await this.getScheduledNotifications();
      const now = new Date();
      
      for (const notification of scheduled) {
        const reminderTime = new Date(notification.reminderTime);
        if (reminderTime <= now) {
          // Remove expired notification from storage
          await AsyncStorage.removeItem(`scheduled_notification_${notification.id}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
    }
  }

  // Schedule daily attendance check (works in background)
  static async scheduleDailyAttendanceCheck() {
    try {
      // Cancel existing daily checks first
      const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of existingNotifications) {
        if (notification.identifier?.startsWith('daily_check_')) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }

      // Schedule daily check for the next 7 days
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() + i);
        checkDate.setHours(21, 0, 0, 0); // 9 PM daily

        if (checkDate > new Date()) { // Only schedule future dates
          const trigger = {
            date: checkDate,
            channelId: 'default',
          };

          await Notifications.scheduleNotificationAsync({
            identifier: `daily_check_${checkDate.toISOString().split('T')[0]}`,
            content: {
              title: 'Daily Attendance Check',
              body: 'Check if you have any pending attendance to mark today',
              data: {
                type: 'daily_check',
                date: checkDate.toISOString().split('T')[0],
              },
              sound: true,
              priority: Notifications.AndroidNotificationPriority.DEFAULT,
            },
            trigger,
          });
        }
      }

      console.log('Daily attendance checks scheduled for next 7 days');
    } catch (error) {
      console.error('Error scheduling daily attendance checks:', error);
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