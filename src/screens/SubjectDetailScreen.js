import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AttendanceService from '../services/AttendanceService';
import TimetableService from '../services/TimetableService';

const SubjectDetailScreen = ({ navigation, route }) => {
  const { subjectId } = route.params;
  const [subject, setSubject] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSubjectData();
    }, [subjectId])
  );

  const loadSubjectData = async () => {
    try {
      setLoading(true);
      const [subjectData, stats, history] = await Promise.all([
        getSubjectById(subjectId),
        AttendanceService.getSubjectAttendanceStats(subjectId),
        AttendanceService.getSubjectAttendanceHistory(subjectId)
      ]);

      setSubject(subjectData);
      setAttendanceStats(stats);
      setAttendanceHistory(history);
    } catch (error) {
      console.error('Error loading subject data:', error);
      Alert.alert('Error', 'Failed to load subject details');
    } finally {
      setLoading(false);
    }
  };

  const getSubjectById = async (id) => {
    const subjects = await TimetableService.getAllSubjects();
    return subjects.find(s => s.id === id);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSubjectData();
    setRefreshing(false);
  };

  const getAttendancePercentage = () => {
    if (!attendanceStats || attendanceStats.totalClasses === 0) return 0;
    return Math.round((attendanceStats.presentClasses / attendanceStats.totalClasses) * 100);
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 75) return '#34C759';
    if (percentage >= 60) return '#FF9500';
    return '#FF3B30';
  };

  const handleRecordPress = (record) => {
    navigation.navigate('AttendanceMarking', {
      classId: record.classId,
      subjectId: subjectId,
      date: record.date,
      editMode: true,
      existingRecord: record,
    });
  };

  const renderStatCard = (title, value, subtitle, icon, color) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderProgressChart = () => {
    const percentage = getAttendancePercentage();
    const color = getStatusColor(percentage);
    
    return (
      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>Attendance Progress</Text>
        
        <View style={styles.progressCircle}>
          <View style={styles.progressBackground}>
            <View 
              style={[
                styles.progressFill,
                { 
                  backgroundColor: color,
                  transform: [{ rotate: `${(percentage / 100) * 360}deg` }]
                }
              ]}
            />
          </View>
          <View style={styles.progressInner}>
            <Text style={[styles.progressPercentage, { color }]}>{percentage}%</Text>
            <Text style={styles.progressLabel}>Attendance</Text>
          </View>
        </View>

        <View style={styles.progressLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
            <Text style={styles.legendText}>Good (75%+)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
            <Text style={styles.legendText}>Warning (60-74%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF3B30' }]} />
            <Text style={styles.legendText}>Low (below 60%)</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHistoryItem = ({ item }) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'present': return '#34C759';
        case 'absent': return '#FF3B30';
        case 'late': return '#FF9500';
        case 'excused': return '#5856D6';
        default: return '#8E8E93';
      }
    };

    const getStatusIcon = (status) => {
      switch (status) {
        case 'present': return 'checkmark-circle';
        case 'absent': return 'close-circle';
        case 'late': return 'time';
        case 'excused': return 'information-circle';
        default: return 'help-circle';
      }
    };

    return (
      <TouchableOpacity style={styles.historyItem} onPress={() => handleRecordPress(item)}>
        <View style={styles.historyLeft}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]}>
            <Ionicons name={getStatusIcon(item.status)} size={16} color="#fff" />
          </View>
          
          <View style={styles.historyInfo}>
            <Text style={styles.historyDate}>
              {new Date(item.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <Text style={styles.historyStatus}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
            {item.notes && (
              <Text style={styles.historyNotes} numberOfLines={1}>
                {item.notes}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.historyRight}>
          {item.timestamp && (
            <Text style={styles.historyTime}>
              {new Date(item.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          )}
          <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass-outline" size={48} color="#007AFF" />
          <Text style={styles.loadingText}>Loading subject details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!subject) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>Subject not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {subject.name}
        </Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            // Navigate to edit subject or show options menu
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Progress Chart */}
        {renderProgressChart()}

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          {renderStatCard(
            'Total Classes',
            attendanceStats?.totalClasses || 0,
            'Classes conducted',
            'school',
            '#007AFF'
          )}
          
          {renderStatCard(
            'Present',
            attendanceStats?.presentClasses || 0,
            'Classes attended',
            'checkmark-circle',
            '#34C759'
          )}
          
          {renderStatCard(
            'Absent',
            attendanceStats?.absentClasses || 0,
            'Classes missed',
            'close-circle',
            '#FF3B30'
          )}
          
          {renderStatCard(
            'Late',
            attendanceStats?.lateClasses || 0,
            'Late arrivals',
            'time',
            '#FF9500'
          )}
        </View>

        {/* Subject Information */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Subject Information</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="book-outline" size={16} color="#8E8E93" />
            <Text style={styles.infoLabel}>Subject Name:</Text>
            <Text style={styles.infoValue}>{subject.name}</Text>
          </View>
          
          {subject.code && (
            <View style={styles.infoRow}>
              <Ionicons name="document-text-outline" size={16} color="#8E8E93" />
              <Text style={styles.infoLabel}>Subject Code:</Text>
              <Text style={styles.infoValue}>{subject.code}</Text>
            </View>
          )}
          
          {subject.instructor && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={16} color="#8E8E93" />
              <Text style={styles.infoLabel}>Instructor:</Text>
              <Text style={styles.infoValue}>{subject.instructor}</Text>
            </View>
          )}
          
          {subject.credits && (
            <View style={styles.infoRow}>
              <Ionicons name="star-outline" size={16} color="#8E8E93" />
              <Text style={styles.infoLabel}>Credits:</Text>
              <Text style={styles.infoValue}>{subject.credits}</Text>
            </View>
          )}
        </View>

        {/* Attendance History */}
        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Attendance History</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('History', { subjectId })}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {attendanceHistory.length > 0 ? (
            <FlatList
              data={attendanceHistory.slice(0, 5)} // Show only recent 5 records
              renderItem={renderHistoryItem}
              keyExtractor={(item) => `${item.date}-${item.timestamp}`}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyHistory}>
              <Ionicons name="document-outline" size={32} color="#C7C7CC" />
              <Text style={styles.emptyHistoryText}>No attendance records yet</Text>
              <Text style={styles.emptyHistorySubtext}>
                Start marking attendance to see your history here
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    marginTop: 16,
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 20,
  },
  progressCircle: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F2F2F7',
    position: 'absolute',
  },
  progressFill: {
    width: 60,
    height: 120,
    borderTopRightRadius: 60,
    borderBottomRightRadius: 60,
    transformOrigin: 'left center',
  },
  progressInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  progressLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  progressLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginLeft: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
    marginRight: 8,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  viewAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  historyStatus: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  historyNotes: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default SubjectDetailScreen;