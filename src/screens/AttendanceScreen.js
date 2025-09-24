import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AttendanceService from '../services/AttendanceService';
import NotificationService from '../services/NotificationService';

const AttendanceScreen = ({ navigation }) => {
  const [todayClasses, setTodayClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    loadTodayClasses();
    initializeNotifications();
  }, []);

  const loadTodayClasses = async () => {
    try {
      setLoading(true);
      const classes = await AttendanceService.getTodayClassesWithAttendance();
      setTodayClasses(classes);
    } catch (error) {
      console.error('Error loading today classes:', error);
      Alert.alert('Error', 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const initializeNotifications = async () => {
    try {
      const initialized = await NotificationService.initialize();
      setNotificationsEnabled(initialized);
      
      if (initialized) {
        await NotificationService.scheduleAttendanceReminders();
      }

      // Check notification system availability
      const isAvailable = NotificationService.isNotificationSystemAvailable();
      if (!isAvailable) {
        console.log('Using fallback notification system (compatible with Expo Go)');
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTodayClasses();
    setRefreshing(false);
  }, []);

  const handleMarkAttendance = async (classItem, status) => {
    try {
      const result = await AttendanceService.markAttendance(
        classItem.id,
        classItem.subjectId,
        status
      );

      if (result.success) {
        Alert.alert('Success', `Attendance marked as ${status}`);
        loadTodayClasses(); // Refresh the list
      } else {
        Alert.alert('Error', result.error || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      Alert.alert('Error', 'Failed to mark attendance');
    }
  };

  const handleQuickMark = (classItem, status) => {
    Alert.alert(
      'Confirm Attendance',
      `Mark ${classItem.subjectName} as ${status}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => handleMarkAttendance(classItem, status)
        },
      ]
    );
  };

  const toggleNotifications = async (value) => {
    setNotificationsEnabled(value);
    
    if (value) {
      const initialized = await NotificationService.initialize();
      if (initialized) {
        await NotificationService.scheduleAttendanceReminders();
        Alert.alert('Success', 'Attendance reminders enabled');
      } else {
        setNotificationsEnabled(false);
        Alert.alert('Error', 'Failed to enable notifications. Please check your settings.');
      }
    } else {
      await NotificationService.cancelAllNotifications();
      Alert.alert('Success', 'Attendance reminders disabled');
    }
  };

  const renderClassItem = (classItem) => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const isUpcoming = currentTime < classItem.startTime;
    const isOngoing = currentTime >= classItem.startTime && currentTime <= classItem.endTime;
    const isPast = currentTime > classItem.endTime;
    
    let statusColor = '#666';
    let statusText = 'Upcoming';
    let statusIcon = '⏰';
    
    if (isOngoing) {
      statusColor = '#4CAF50';
      statusText = 'Ongoing';
      statusIcon = '🟢';
    } else if (isPast) {
      statusColor = '#666';
      statusText = 'Ended';
      statusIcon = '⏹️';
    }

    const attendanceStatusInfo = classItem.hasAttendance 
      ? AttendanceService.getStatusDisplayInfo(classItem.attendanceStatus)
      : null;

    return (
      <View key={classItem.id} style={[styles.classCard, { borderLeftColor: classItem.subjectColor }]}>
        <View style={styles.classHeader}>
          <View style={styles.classTitle}>
            <Text style={styles.classIcon}>{classItem.subjectIcon}</Text>
            <View style={styles.classTitleText}>
              <Text style={styles.className}>{classItem.subjectName}</Text>
              <Text style={styles.classTime}>
                {AttendanceService.formatTime(classItem.startTime)} - {AttendanceService.formatTime(classItem.endTime)}
              </Text>
              {classItem.location && (
                <Text style={styles.classLocation}>📍 {classItem.location}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.classStatus}>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Text style={styles.statusIcon}>{statusIcon}</Text>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
            </View>
          </View>
        </View>

        {/* Attendance Status or Actions */}
        {classItem.hasAttendance ? (
          <View style={styles.attendanceStatus}>
            <View style={[styles.attendanceBadge, { backgroundColor: attendanceStatusInfo.bgColor }]}>
              <Text style={styles.attendanceIcon}>{attendanceStatusInfo.icon}</Text>
              <Text style={[styles.attendanceText, { color: attendanceStatusInfo.color }]}>
                Marked as {attendanceStatusInfo.label}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.changeButton}
              onPress={() => navigation.navigate('ClassDetail', { classId: classItem.id })}
            >
              <Text style={styles.changeButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.attendanceActions}>
            <TouchableOpacity
              style={[styles.attendanceButton, styles.presentButton]}
              onPress={() => handleQuickMark(classItem, AttendanceService.getAttendanceStatusValues().PRESENT)}
            >
              <Text style={styles.attendanceButtonText}>✅ Present</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.attendanceButton, styles.lateButton]}
              onPress={() => handleQuickMark(classItem, AttendanceService.getAttendanceStatusValues().LATE)}
            >
              <Text style={styles.attendanceButtonText}>⏰ Late</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.attendanceButton, styles.absentButton]}
              onPress={() => handleQuickMark(classItem, AttendanceService.getAttendanceStatusValues().ABSENT)}
            >
              <Text style={styles.attendanceButtonText}>❌ Absent</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📅</Text>
      <Text style={styles.emptyTitle}>No Classes Today</Text>
      <Text style={styles.emptyText}>You have no scheduled classes for today.</Text>
      <TouchableOpacity
        style={styles.addClassButton}
        onPress={() => navigation.navigate('Timetable')}
      >
        <Text style={styles.addClassButtonText}>View Timetable</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading today's classes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📝 Mark Attendance</Text>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Notification Settings */}
      <View style={styles.notificationCard}>
        <View style={styles.notificationHeader}>
          <View style={styles.notificationTitle}>
            <Text style={styles.notificationIcon}>🔔</Text>
            <Text style={styles.notificationText}>Attendance Reminders</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: '#e0e0e0', true: '#4f46e5' }}
            thumbColor={notificationsEnabled ? '#ffffff' : '#f4f3f4'}
          />
        </View>
        <Text style={styles.notificationSubtext}>
          {NotificationService.isNotificationSystemAvailable() 
            ? 'Get reminded to mark attendance after each class ends' 
            : 'Using in-app reminders (Expo Go compatible)'
          }
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {todayClasses.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {/* Today's Classes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today's Classes ({todayClasses.length})</Text>
              {todayClasses.map(renderClassItem)}
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsContainer}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => navigation.navigate('Timetable')}
              >
                <Text style={styles.quickActionIcon}>📅</Text>
                <Text style={styles.quickActionText}>View Full Timetable</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => navigation.navigate('Subjects')}
              >
                <Text style={styles.quickActionIcon}>📚</Text>
                <Text style={styles.quickActionText}>Manage Subjects</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={async () => {
                  await NotificationService.sendTestNotification();
                  Alert.alert('Success', 'Test notification sent!');
                }}
              >
                <Text style={styles.quickActionIcon}>🧪</Text>
                <Text style={styles.quickActionText}>Test Notification</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  notificationCard: {
    backgroundColor: '#ffffff',
    margin: 20,
    marginBottom: 10,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  notificationTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  notificationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  notificationSubtext: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  classCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  classTitle: {
    flexDirection: 'row',
    flex: 1,
  },
  classIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  classTitleText: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  classTime: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '500',
    marginBottom: 2,
  },
  classLocation: {
    fontSize: 14,
    color: '#666',
  },
  classStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  attendanceStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    flex: 1,
  },
  attendanceIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  attendanceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#4f46e5',
    marginLeft: 10,
  },
  changeButtonText: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '500',
  },
  attendanceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  attendanceButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  presentButton: {
    backgroundColor: '#E8F5E8',
  },
  lateButton: {
    backgroundColor: '#FFF3E0',
  },
  absentButton: {
    backgroundColor: '#FFEBEE',
  },
  attendanceButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  addClassButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addClassButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  quickActionsContainer: {
    marginBottom: 30,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  quickActionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});

export default AttendanceScreen;