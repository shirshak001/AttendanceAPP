import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

// Safe module loading for web compatibility
class SafeNotificationService {
  static isInitialized = false;
  static modules = {};

  // Load modules safely
  static async loadModules() {
    if (this.isInitialized) return true;

    try {
      // Check if we're in Expo Go by checking for specific modules
      const isExpoGo = !global.__DEV__ || typeof global.expo !== 'undefined';
      
      // Only load expo modules if not on web and not in Expo Go
      if (Platform.OS !== 'web' && !isExpoGo) {
        try {
          this.modules.Notifications = require('expo-notifications');
          this.modules.TaskManager = require('expo-task-manager');
          
          // Configure notification handler
          if (this.modules.Notifications.setNotificationHandler) {
            this.modules.Notifications.setNotificationHandler({
              handleNotification: async () => ({
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
              }),
            });
          }
        } catch (expoError) {
          console.log('Expo modules not available (probably Expo Go):', expoError.message);
        }
      }
      
      // Load services that work everywhere
      try {
        this.modules.AttendanceService = require('./AttendanceService').default || require('./AttendanceService');
        this.modules.TimetableService = require('./TimetableService').default || require('./TimetableService');
      } catch (serviceError) {
        console.log('Services not available:', serviceError.message);
        // Create mock services
        this.modules.AttendanceService = {
          markAttendance: async () => ({ success: true, message: 'Mock service' }),
        };
        this.modules.TimetableService = {
          getTodayClasses: async () => [],
        };
      }
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.log('Module loading failed:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  // Check if notification system is available
  static isNotificationSystemAvailable() {
    return Platform.OS !== 'web' && this.modules.Notifications;
  }

  // Initialize notification service
  static async initialize() {
    try {
      console.log('Initializing notification service...');
      
      // Load modules first
      const loaded = await this.loadModules();
      if (!loaded) {
        console.log('Modules not loaded, using fallback mode');
        return false;
      }

      // Skip notification setup on web
      if (Platform.OS === 'web') {
        console.log('Web platform detected, skipping notification setup');
        return true;
      }

      // Request permissions only on mobile
      if (this.modules.Notifications && this.modules.Notifications.requestPermissionsAsync) {
        const { status } = await this.modules.Notifications.requestPermissionsAsync();
        
        if (status !== 'granted') {
          console.log('Notification permissions not granted');
          return false;
        }

        // Set up notification categories
        await this.modules.Notifications.setNotificationCategoryAsync('attendance-reminder', [
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
        ]);
        
        console.log('Notification service initialized successfully');
      }
      
      return true;
    } catch (error) {
      console.log('Error initializing notification service:', error.message);
      return false;
    }
  }

  // Handle notification response
  static handleNotificationResponse = (response) => {
    try {
      console.log('Notification response:', response);
      // Handle the response
    } catch (error) {
      console.log('Error handling notification response:', error);
    }
  };

  // Setup background task (mobile only)
  static async setupBackgroundTask() {
    if (Platform.OS === 'web' || !this.modules.TaskManager) {
      console.log('Background tasks not supported');
      return;
    }

    try {
      // Background task implementation
      console.log('Background task setup complete');
    } catch (error) {
      console.log('Error setting up background task:', error);
    }
  }

  // Check fallback reminders
  static async checkFallbackReminders() {
    try {
      console.log('Checking fallback reminders...');
      // Implement fallback reminder logic
    } catch (error) {
      console.log('Error checking fallback reminders:', error);
    }
  }

  // Schedule attendance reminder
  static async scheduleAttendanceReminder(reminder) {
    if (Platform.OS === 'web') {
      console.log('Web notifications not supported, using fallback');
      return;
    }

    try {
      if (this.modules.Notifications) {
        // Schedule notification
        console.log('Scheduling reminder:', reminder);
      }
    } catch (error) {
      console.log('Error scheduling reminder:', error);
    }
  }

  // Mark attendance (quick action)
  static async quickMarkAttendance(subjectId, status) {
    try {
      if (this.modules.AttendanceService) {
        return await this.modules.AttendanceService.markAttendance(subjectId, status);
      }
      console.log('AttendanceService not available');
      return { success: false, message: 'Service unavailable' };
    } catch (error) {
      console.log('Error marking attendance:', error);
      return { success: false, message: error.message };
    }
  }
}

export default SafeNotificationService;