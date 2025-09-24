import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TimetableService from '../services/TimetableService';
import AttendanceService from '../services/AttendanceService';

const ClassDetailScreen = ({ navigation, route }) => {
  const { classId } = route.params;
  
  const [classData, setClassData] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMarkAttendance, setShowMarkAttendance] = useState(false);

  useEffect(() => {
    loadClassData();
  }, [classId]);

  const loadClassData = async () => {
    try {
      setLoading(true);
      
      const [classInfo, attendance, stats] = await Promise.all([
        TimetableService.getClassById(classId),
        AttendanceService.getClassAttendance(classId),
        AttendanceService.getClassAttendanceStats(classId),
      ]);
      
      if (classInfo) {
        setClassData(classInfo);
        setAttendanceRecords(attendance);
        setAttendanceStats(stats);
      } else {
        Alert.alert('Error', 'Class not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading class data:', error);
      Alert.alert('Error', 'Failed to load class information');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadClassData();
    setRefreshing(false);
  }, []);

  const handleMarkAttendance = async (status, notes = '') => {
    try {
      const result = await AttendanceService.markAttendance(
        classId,
        classData.subjectId,
        status,
        null,
        notes
      );

      if (result.success) {
        Alert.alert('Success', `Attendance marked as ${status}`);
        setShowMarkAttendance(false);
        loadClassData(); // Refresh data
      } else {
        Alert.alert('Error', result.error || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      Alert.alert('Error', 'Failed to mark attendance');
    }
  };

  const handleEditClass = () => {
    navigation.navigate('AddEditClass', {
      classId: classId,
      onSave: loadClassData,
    });
  };

  const handleDeleteClass = () => {
    Alert.alert(
      'Delete Class',
      'Are you sure you want to delete this class? This will also remove all attendance records.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const result = await TimetableService.deleteClass(classId);
            if (result.success) {
              Alert.alert('Success', 'Class deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } else {
              Alert.alert('Error', result.error || 'Failed to delete class');
            }
          }
        },
      ]
    );
  };

  const handleDeleteAttendance = (recordId) => {
    Alert.alert(
      'Delete Attendance',
      'Are you sure you want to delete this attendance record?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const result = await AttendanceService.deleteAttendanceRecord(classId, recordId);
            if (result.success) {
              loadClassData(); // Refresh data
            } else {
              Alert.alert('Error', result.error || 'Failed to delete attendance record');
            }
          }
        },
      ]
    );
  };

  const renderAttendanceItem = ({ item }) => {
    const statusInfo = AttendanceService.getStatusDisplayInfo(item.status);
    
    return (
      <TouchableOpacity 
        style={styles.attendanceItem}
        onLongPress={() => handleDeleteAttendance(item.id)}
      >
        <View style={styles.attendanceHeader}>
          <View style={styles.attendanceDate}>
            <Text style={styles.attendanceDateText}>
              {AttendanceService.formatDate(item.date)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Text style={styles.statusIcon}>{statusInfo.icon}</Text>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>
        
        {item.notes && (
          <Text style={styles.attendanceNotes}>{item.notes}</Text>
        )}
        
        <Text style={styles.attendanceTime}>
          Marked: {new Date(item.markedAt).toLocaleString()}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderMarkAttendanceModal = () => {
    const attendanceOptions = [
      { 
        status: AttendanceService.getAttendanceStatusValues().PRESENT,
        ...AttendanceService.getStatusDisplayInfo(AttendanceService.getAttendanceStatusValues().PRESENT)
      },
      { 
        status: AttendanceService.getAttendanceStatusValues().LATE,
        ...AttendanceService.getStatusDisplayInfo(AttendanceService.getAttendanceStatusValues().LATE)
      },
      { 
        status: AttendanceService.getAttendanceStatusValues().ABSENT,
        ...AttendanceService.getStatusDisplayInfo(AttendanceService.getAttendanceStatusValues().ABSENT)
      },
      { 
        status: AttendanceService.getAttendanceStatusValues().EXCUSED,
        ...AttendanceService.getStatusDisplayInfo(AttendanceService.getAttendanceStatusValues().EXCUSED)
      },
    ];

    return (
      <Modal visible={showMarkAttendance} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mark Attendance</Text>
              <TouchableOpacity onPress={() => setShowMarkAttendance(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              {classData?.subjectName} - {AttendanceService.formatDate(new Date().toISOString())}
            </Text>
            
            <View style={styles.attendanceOptions}>
              {attendanceOptions.map((option) => (
                <TouchableOpacity
                  key={option.status}
                  style={[styles.attendanceOption, { borderColor: option.color }]}
                  onPress={() => handleMarkAttendance(option.status)}
                >
                  <Text style={styles.optionIcon}>{option.icon}</Text>
                  <Text style={[styles.optionLabel, { color: option.color }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading class details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!classData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text>Class not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Class Details</Text>
        <TouchableOpacity onPress={handleEditClass}>
          <Text style={styles.editButton}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Class Information Card */}
        <View style={[styles.classCard, { borderLeftColor: classData.subjectColor }]}>
          <View style={styles.classHeader}>
            <View style={styles.classTitle}>
              <Text style={styles.classIcon}>{classData.subjectIcon}</Text>
              <View style={styles.classTitleText}>
                <Text style={styles.className}>{classData.subjectName}</Text>
                <Text style={styles.classDay}>{classData.day}</Text>
              </View>
            </View>
            <View style={styles.classTime}>
              <Text style={styles.timeText}>
                {TimetableService.formatTimeRange(classData.startTime, classData.endTime)}
              </Text>
            </View>
          </View>
          
          {classData.location && (
            <View style={styles.classDetail}>
              <Text style={styles.detailIcon}>📍</Text>
              <Text style={styles.detailText}>{classData.location}</Text>
            </View>
          )}
          
          {classData.notes && (
            <View style={styles.classDetail}>
              <Ionicons name="document-text" size={16} color="#666" />
              <Text style={styles.detailText}>{classData.notes}</Text>
            </View>
          )}
          
          <View style={styles.classDetail}>
            <Text style={styles.detailIcon}>🔄</Text>
            <Text style={styles.detailText}>
              {classData.repeatWeekly ? 'Repeats weekly' : 'One-time class'}
            </Text>
          </View>
        </View>

        {/* Attendance Statistics */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Attendance Overview</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{attendanceStats.total || 0}</Text>
              <Text style={styles.statLabel}>Total Classes</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                {attendanceStats.percentage || 0}%
              </Text>
              <Text style={styles.statLabel}>Attendance Rate</Text>
            </View>
          </View>
          
          <View style={styles.statusBreakdown}>
            <View style={styles.statusItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.statusCount}>{attendanceStats.present || 0} Present</Text>
            </View>
            <View style={styles.statusItem}>
              <Ionicons name="time" size={16} color="#f59e0b" />
              <Text style={styles.statusCount}>{attendanceStats.late || 0} Late</Text>
            </View>
            <View style={styles.statusItem}>
              <Ionicons name="close-circle" size={16} color="#ef4444" />
              <Text style={styles.statusCount}>{attendanceStats.absent || 0} Absent</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusIcon}>📝</Text>
              <Text style={styles.statusCount}>{attendanceStats.excused || 0} Excused</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={() => setShowMarkAttendance(true)}
          >
            <Text style={styles.primaryActionText}>Mark Attendance</Text>
          </TouchableOpacity>
          
          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.secondaryActionButton} onPress={handleEditClass}>
              <Text style={styles.secondaryActionText}>Edit Class</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.secondaryActionButton, styles.deleteButton]} 
              onPress={handleDeleteClass}
            >
              <Text style={[styles.secondaryActionText, styles.deleteButtonText]}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Attendance History */}
        <View style={styles.historyContainer}>
          <Text style={styles.sectionTitle}>Attendance History</Text>
          
          {attendanceRecords.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>No attendance records yet</Text>
              <Text style={styles.emptyHistorySubtext}>
                Start marking attendance to see your history here
              </Text>
            </View>
          ) : (
            <>
              <FlatList
                data={attendanceRecords}
                keyExtractor={(item) => item.id}
                renderItem={renderAttendanceItem}
                scrollEnabled={false}
                style={styles.attendanceList}
              />
              
              <Text style={styles.historyNote}>
                Long press on any record to delete it
              </Text>
            </>
          )}
        </View>
      </ScrollView>

      {/* Mark Attendance Modal */}
      {renderMarkAttendanceModal()}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    color: '#4f46e5',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    fontSize: 16,
    color: '#4f46e5',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  classCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  classTitle: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  classDay: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  classTime: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 16,
    color: '#4f46e5',
    fontWeight: '600',
  },
  classDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 20,
  },
  detailText: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  statsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4f46e5',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  statusBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  statusCount: {
    fontSize: 14,
    color: '#666',
  },
  actionsContainer: {
    marginBottom: 20,
  },
  primaryActionButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  secondaryActionText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    borderColor: '#f44336',
  },
  deleteButtonText: {
    color: '#f44336',
  },
  historyContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  attendanceList: {
    marginBottom: 10,
  },
  attendanceItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  attendanceDate: {
    flex: 1,
  },
  attendanceDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  attendanceNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  attendanceTime: {
    fontSize: 12,
    color: '#999',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  historyNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  attendanceOptions: {
    gap: 10,
  },
  attendanceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ClassDetailScreen;