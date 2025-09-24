const { Expo } = require('expo-server-sdk');
const User = require('../models/User');
const ScheduledNotification = require('../models/ScheduledNotification');
const NotificationLog = require('../models/NotificationLog');

class NotificationScheduler {
  static expo = null;

  static async initialize() {
    try {
      // Initialize Expo SDK
      this.expo = new Expo();
      console.log('✅ Expo SDK initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Expo SDK:', error);
      return false;
    }
  }

  /**
   * Schedule a notification for a specific user
   */
  static async scheduleNotification({
    userId,
    title,
    body,
    data = {},
    scheduledFor,
    type = 'attendance_reminder',
    priority = 'normal'
  }) {
    try {
      const notification = new ScheduledNotification({
        userId,
        title,
        body,
        data,
        scheduledFor: new Date(scheduledFor),
        type,
        priority,
        status: 'pending'
      });

      await notification.save();
      console.log(`📅 Notification scheduled for user ${userId} at ${scheduledFor}`);
      return notification;
    } catch (error) {
      console.error('❌ Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Schedule attendance reminders for all users based on their timetables
   */
  static async scheduleAttendanceReminders() {
    try {
      const users = await User.find({ 
        pushToken: { $exists: true, $ne: null },
        notificationsEnabled: true 
      }).populate('timetable');

      let scheduledCount = 0;

      for (const user of users) {
        if (!user.timetable || !user.timetable.classes) continue;

        const today = new Date();
        const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
        const todayClasses = user.timetable.classes.filter(cls => 
          cls.dayOfWeek === dayOfWeek && cls.isActive
        );

        for (const classItem of todayClasses) {
          // Check if user already has attendance marked for this class today
          const hasAttendance = await this.checkExistingAttendance(user._id, classItem._id, today);
          
          if (!hasAttendance) {
            // Schedule notification 5 minutes after class ends
            const classEndTime = this.parseTime(classItem.endTime);
            const notificationTime = new Date(today);
            notificationTime.setHours(classEndTime.hours, classEndTime.minutes + 5, 0, 0);

            // Only schedule if notification time is in the future
            if (notificationTime > new Date()) {
              await this.scheduleNotification({
                userId: user._id,
                title: '📚 Attendance Reminder',
                body: `Don't forget to mark attendance for ${classItem.subjectName}`,
                data: {
                  type: 'attendance_reminder',
                  classId: classItem._id,
                  subjectId: classItem.subjectId,
                  subjectName: classItem.subjectName,
                  classTime: `${classItem.startTime} - ${classItem.endTime}`
                },
                scheduledFor: notificationTime,
                type: 'attendance_reminder'
              });
              scheduledCount++;
            }
          }
        }
      }

      console.log(`📅 Scheduled ${scheduledCount} attendance reminders`);
      return scheduledCount;
    } catch (error) {
      console.error('❌ Error scheduling attendance reminders:', error);
      throw error;
    }
  }

  /**
   * Process and send all pending notifications
   */
  static async processScheduledNotifications() {
    try {
      const now = new Date();
      
      // Get all pending notifications that are due
      const dueNotifications = await ScheduledNotification.find({
        status: 'pending',
        scheduledFor: { $lte: now }
      }).populate('userId');

      if (dueNotifications.length === 0) {
        console.log('📭 No notifications to send');
        return;
      }

      console.log(`📤 Processing ${dueNotifications.length} notifications`);

      // Group notifications by push token to send in batches
      const notificationsByToken = {};
      
      for (const notification of dueNotifications) {
        const user = notification.userId;
        
        if (!user.pushToken || !Expo.isExpoPushToken(user.pushToken)) {
          // Mark as failed due to invalid token
          notification.status = 'failed';
          notification.error = 'Invalid or missing push token';
          await notification.save();
          continue;
        }

        if (!notificationsByToken[user.pushToken]) {
          notificationsByToken[user.pushToken] = [];
        }

        notificationsByToken[user.pushToken].push({
          to: user.pushToken,
          sound: 'default',
          title: notification.title,
          body: notification.body,
          data: notification.data,
          priority: notification.priority === 'high' ? 'high' : 'normal',
          badge: 1,
          categoryId: notification.type === 'attendance_reminder' ? 'attendance-reminder' : undefined,
          _id: notification._id
        });
      }

      // Send notifications in batches
      const batchSize = parseInt(process.env.NOTIFICATION_BATCH_SIZE) || 100;
      const messages = Object.values(notificationsByToken).flat();
      
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        await this.sendNotificationBatch(batch);
      }

      console.log(`✅ Processed ${messages.length} notifications`);
    } catch (error) {
      console.error('❌ Error processing scheduled notifications:', error);
      throw error;
    }
  }

  /**
   * Send a batch of notifications
   */
  static async sendNotificationBatch(messages) {
    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      
      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          
          // Process tickets and update notification status
          for (let i = 0; i < ticketChunk.length; i++) {
            const ticket = ticketChunk[i];
            const message = chunk[i];
            
            await this.updateNotificationStatus(message._id, ticket);
            await this.logNotification(message, ticket);
          }
        } catch (error) {
          console.error('❌ Error sending notification chunk:', error);
          
          // Mark all notifications in this chunk as failed
          for (const message of chunk) {
            await this.updateNotificationStatus(message._id, { 
              status: 'error', 
              message: error.message 
            });
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in sendNotificationBatch:', error);
      throw error;
    }
  }

  /**
   * Update notification status based on ticket response
   */
  static async updateNotificationStatus(notificationId, ticket) {
    try {
      const update = { processedAt: new Date() };
      
      if (ticket.status === 'ok') {
        update.status = 'sent';
        update.receiptId = ticket.id;
      } else {
        update.status = 'failed';
        update.error = ticket.message || 'Unknown error';
      }

      await ScheduledNotification.findByIdAndUpdate(notificationId, update);
    } catch (error) {
      console.error('❌ Error updating notification status:', error);
    }
  }

  /**
   * Log notification for analytics
   */
  static async logNotification(message, ticket) {
    try {
      const log = new NotificationLog({
        pushToken: message.to,
        title: message.title,
        body: message.body,
        data: message.data,
        status: ticket.status,
        receiptId: ticket.id,
        error: ticket.message,
        sentAt: new Date()
      });

      await log.save();
    } catch (error) {
      console.error('❌ Error logging notification:', error);
    }
  }

  /**
   * Check if user has existing attendance for a class today
   */
  static async checkExistingAttendance(userId, classId, date) {
    // This would check your attendance collection
    // Implementation depends on your attendance data structure
    try {
      const Attendance = require('../models/Attendance');
      const dateStr = date.toISOString().split('T')[0];
      
      const existingAttendance = await Attendance.findOne({
        userId,
        classId,
        date: dateStr
      });

      return !!existingAttendance;
    } catch (error) {
      console.error('❌ Error checking existing attendance:', error);
      return false;
    }
  }

  /**
   * Parse time string to hours and minutes
   */
  static parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours, minutes };
  }

  /**
   * Send immediate notification (for testing or urgent notifications)
   */
  static async sendImmediateNotification(userId, title, body, data = {}) {
    try {
      const user = await User.findById(userId);
      
      if (!user.pushToken || !Expo.isExpoPushToken(user.pushToken)) {
        throw new Error('Invalid or missing push token');
      }

      const message = {
        to: user.pushToken,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        badge: 1
      };

      const ticket = await this.expo.sendPushNotificationsAsync([message]);
      await this.logNotification(message, ticket[0]);

      console.log(`📤 Immediate notification sent to user ${userId}`);
      return ticket[0];
    } catch (error) {
      console.error('❌ Error sending immediate notification:', error);
      throw error;
    }
  }

  /**
   * Clean up old notifications and logs
   */
  static async cleanup() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Remove old processed notifications
      const deletedNotifications = await ScheduledNotification.deleteMany({
        status: { $in: ['sent', 'failed'] },
        processedAt: { $lt: thirtyDaysAgo }
      });

      // Remove old logs
      const deletedLogs = await NotificationLog.deleteMany({
        sentAt: { $lt: thirtyDaysAgo }
      });

      console.log(`🧹 Cleanup completed: ${deletedNotifications.deletedCount} notifications, ${deletedLogs.deletedCount} logs`);
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

module.exports = NotificationScheduler;