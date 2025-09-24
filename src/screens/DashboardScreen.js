import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [overallAttendance, setOverallAttendance] = React.useState(0);
  const [todaysClasses, setTodaysClasses] = React.useState(0);
  const [todaySchedule, setTodaySchedule] = React.useState([]);

  React.useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load attendance data from backend
      const AttendanceService = require('../services/AttendanceService').default || require('../services/AttendanceService');
      const TimetableService = require('../services/TimetableService').default || require('../services/TimetableService');
      
      const attendance = await AttendanceService.getOverallAttendance();
      setOverallAttendance(Math.round(attendance.percentage || 0));
      
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const classes = await TimetableService.getClassesForDay(today);
      setTodaysClasses(classes.length);
      setTodaySchedule(classes);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Fallback to default values on error
      setOverallAttendance(0);
      setTodaysClasses(0);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Student'}!</Text>
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

        <View style={styles.todaySection}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#a1a1aa" />
            <Text style={styles.emptyStateTitle}>No classes today</Text>
            <Text style={styles.emptyStateSubtitle}>
              Add subjects and create your timetable to see today's schedule
            </Text>
          </View>
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
});

export default DashboardScreen;