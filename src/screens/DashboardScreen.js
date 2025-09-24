import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import NotificationService from '../services/NotificationService';

const DashboardScreen = ({ navigation }) => {
  const { user } = useUser();
  const [overallAttendance, setOverallAttendance] = React.useState(0);
  const [todaysClasses, setTodaysClasses] = React.useState(0);
  const [todaySchedule, setTodaySchedule] = React.useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(false);

  React.useEffect(() => {
    loadDashboardData();
    checkNotificationStatus();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load attendance data from backend
      const AttendanceService = require('../services/AttendanceService').default || require('../services/AttendanceService');
      const TimetableService = require('../services/TimetableService').default || require('../services/TimetableService');
      
      console.log('Loading dashboard data...');
      
      // Get attendance data with error handling
      try {
        const attendance = await AttendanceService.getOverallAttendance();
        setOverallAttendance(Math.round(attendance.percentage || 0));
      } catch (attendanceError) {
        console.error('Error loading attendance:', attendanceError);
        setOverallAttendance(0);
      }
      
      // Get today's classes with enhanced error handling
      try {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        console.log('Today is:', today);
        
        const classes = await TimetableService.getClassesForDay(today);
        console.log('Classes found for today:', classes);
        
        // Ensure classes is an array and has proper structure
        const validClasses = Array.isArray(classes) ? classes.filter(c => c && c.subjectName) : [];
        
        setTodaysClasses(validClasses.length);
        setTodaySchedule(validClasses);
        
        console.log('Dashboard updated with', validClasses.length, 'classes');
      } catch (timetableError) {
        console.error('Error loading timetable:', timetableError);
        setTodaysClasses(0);
        setTodaySchedule([]);
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Fallback to default values on error
      setOverallAttendance(0);
      setTodaysClasses(0);
      setTodaySchedule([]);
    }
  };

  const checkNotificationStatus = async () => {
    try {
      const enabled = await NotificationService.areNotificationsEnabled();
      setNotificationsEnabled(enabled);
    } catch (error) {
      console.error('Error checking notification status:', error);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const granted = await NotificationService.requestPermissions();
      if (granted) {
        await NotificationService.enableAttendanceReminders();
        setNotificationsEnabled(true);
        Alert.alert(
          'Notifications Enabled',
          'You will now receive attendance reminders for your classes!',
          [{ text: 'Great!' }]
        );
      } else {
        Alert.alert(
          'Permission Denied',
          'Please enable notifications in your device settings to receive attendance reminders.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      Alert.alert('Error', 'Failed to enable notifications. Please try again.');
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>
            {user?.username || user?.firstName || user?.fullName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Student'}!
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person-circle" size={32} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{overallAttendance}%</Text>
            <Text style={styles.statLabel}>Overall Attendance</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{todaysClasses}</Text>
            <Text style={styles.statLabel}>Today's Classes</Text>
          </View>
        </View>

        {!notificationsEnabled && (
          <View style={styles.notificationPrompt}>
            <View style={styles.notificationContent}>
              <Ionicons name="notifications" size={24} color="#FF9500" />
              <View style={styles.notificationText}>
                <Text style={styles.notificationTitle}>Enable Notifications</Text>
                <Text style={styles.notificationSubtitle}>
                  Get reminders for your classes and never miss attendance
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.enableButton} 
              onPress={handleEnableNotifications}
            >
              <Text style={styles.enableButtonText}>Enable</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.todaySection}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          {todaySchedule.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {todaySchedule.map((classItem, index) => (
                <View key={index} style={styles.scheduleCard}>
                  <View style={[styles.subjectIcon, { backgroundColor: classItem.color || '#007AFF' }]}>
                    <Ionicons name={classItem.icon || 'book'} size={20} color="#ffffff" />
                  </View>
                  <Text style={styles.scheduleSubject}>{classItem.subjectName}</Text>
                  <Text style={styles.scheduleTime}>
                    {classItem.startTime} - {classItem.endTime}
                  </Text>
                  <Text style={styles.scheduleRoom}>{classItem.room || 'Room TBA'}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#a1a1aa" />
              <Text style={styles.emptyStateTitle}>No classes today</Text>
              <Text style={styles.emptyStateSubtitle}>
                Add subjects and create your timetable to see today's schedule
              </Text>
            </View>
          )}
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => navigation.navigate('Subjects')}
            >
              <Ionicons name="book" size={24} color="#007AFF" />
              <Text style={styles.actionButtonText}>Manage Subjects</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Timetable')}
            >
              <Ionicons name="calendar" size={24} color="#007AFF" />
              <Text style={styles.actionButtonText}>Timetable</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Attendance')}
            >
              <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
              <Text style={styles.actionButtonText}>Mark Attendance</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('History')}
            >
              <Ionicons name="document-text" size={24} color="#007AFF" />
              <Text style={styles.actionButtonText}>View History</Text>
            </TouchableOpacity>
          </View>
        </View>




      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  profileButton: {
    padding: 8,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  welcomeText: {
    fontSize: 18,
    color: '#a1a1aa',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#252545',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4f46e5',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#a1a1aa',
    textAlign: 'center',
  },
  todaySection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: '#252545',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 20,
  },
  quickActions: {
    marginBottom: 30,
  },

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#252545',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '47%',
    minHeight: 80,
    justifyContent: 'center',
  },

  actionButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  scheduleCard: {
    backgroundColor: '#252545',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 140,
    alignItems: 'center',
  },
  subjectIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  scheduleTime: {
    fontSize: 12,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 2,
  },
  scheduleRoom: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  notificationPrompt: {
    backgroundColor: '#252545',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationText: {
    marginLeft: 12,
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  notificationSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 18,
  },
  enableButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  enableButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DashboardScreen;