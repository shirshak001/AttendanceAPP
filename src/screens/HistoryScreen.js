import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AttendanceService from '../services/AttendanceService';
import TimetableService from '../services/TimetableService';

const HistoryScreen = ({ navigation }) => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [records, subjectsList] = await Promise.all([
        AttendanceService.getAllAttendanceRecords(),
        TimetableService.getAllSubjects()
      ]);
      setAttendanceRecords(records);
      setSubjects(subjectsList);
    } catch (error) {
      console.error('Error loading history data:', error);
      Alert.alert('Error', 'Failed to load attendance history');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getFilteredRecords = () => {
    let filtered = [...attendanceRecords];

    // Filter by subject
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(record => record.subjectId === selectedSubject);
    }

    // Filter by status
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(record => record.status === selectedFilter);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    return filtered;
  };

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

  const handleRecordPress = (record) => {
    navigation.navigate('AttendanceMarking', {
      classId: record.classId,
      subjectId: record.subjectId,
      date: record.date,
      editMode: true,
      existingRecord: record,
    });
  };

  const handleSubjectPress = (subjectId) => {
    navigation.navigate('SubjectDetail', { subjectId });
  };

  const renderFilterButton = (filterType, label, icon) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === filterType && styles.filterButtonActive,
      ]}
      onPress={() => setSelectedFilter(filterType)}
    >
      <Ionicons
        name={icon}
        size={16}
        color={selectedFilter === filterType ? '#fff' : '#007AFF'}
      />
      <Text style={[
        styles.filterButtonText,
        selectedFilter === filterType && styles.filterButtonTextActive,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderSubjectFilter = () => (
    <View style={styles.subjectFilterContainer}>
      <Text style={styles.filterLabel}>Subject:</Text>
      <TouchableOpacity
        style={styles.subjectSelector}
        onPress={() => {
          // You can implement a modal or dropdown here
          Alert.alert(
            'Select Subject',
            'Choose a subject to filter by',
            [
              { text: 'All Subjects', onPress: () => setSelectedSubject('all') },
              ...subjects.map(subject => ({
                text: subject.name,
                onPress: () => setSelectedSubject(subject.id),
              })),
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        }}
      >
        <Text style={styles.subjectSelectorText}>
          {selectedSubject === 'all' 
            ? 'All Subjects' 
            : subjects.find(s => s.id === selectedSubject)?.name || 'All Subjects'
          }
        </Text>
        <Ionicons name="chevron-down" size={16} color="#8E8E93" />
      </TouchableOpacity>
    </View>
  );

  const renderRecord = ({ item }) => {
    const subject = subjects.find(s => s.id === item.subjectId);
    
    return (
      <TouchableOpacity
        style={styles.recordCard}
        onPress={() => handleRecordPress(item)}
      >
        <View style={styles.recordHeader}>
          <View style={styles.recordSubject}>
            <TouchableOpacity
              onPress={() => handleSubjectPress(item.subjectId)}
              style={styles.subjectNameContainer}
            >
              <Ionicons name="book-outline" size={16} color="#007AFF" />
              <Text style={styles.subjectName}>{subject?.name || 'Unknown Subject'}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Ionicons
              name={getStatusIcon(item.status)}
              size={12}
              color="#fff"
            />
            <Text style={styles.statusText}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.recordDetails}>
          <View style={styles.recordInfo}>
            <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
            <Text style={styles.recordDate}>
              {new Date(item.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>

          {item.timestamp && (
            <View style={styles.recordInfo}>
              <Ionicons name="time-outline" size={14} color="#8E8E93" />
              <Text style={styles.recordTime}>
                {new Date(item.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}
        </View>

        {item.notes && (
          <View style={styles.notesContainer}>
            <Ionicons name="document-text-outline" size={14} color="#8E8E93" />
            <Text style={styles.notesText} numberOfLines={2}>
              {item.notes}
            </Text>
          </View>
        )}

        <View style={styles.recordFooter}>
          <Text style={styles.methodText}>
            via {item.method || 'manual'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-outline" size={64} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>No Records Found</Text>
      <Text style={styles.emptySubtitle}>
        {selectedFilter !== 'all' || selectedSubject !== 'all'
          ? 'Try adjusting your filters'
          : 'Start marking attendance to see your history here'
        }
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass-outline" size={48} color="#007AFF" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredRecords = getFilteredRecords();

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
        <Text style={styles.headerTitle}>Attendance History</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {renderSubjectFilter()}
        
        <View style={styles.statusFilters}>
          {renderFilterButton('all', 'All', 'list')}
          {renderFilterButton('present', 'Present', 'checkmark-circle')}
          {renderFilterButton('absent', 'Absent', 'close-circle')}
          {renderFilterButton('late', 'Late', 'time')}
          {renderFilterButton('excused', 'Excused', 'information-circle')}
        </View>
      </View>

      {/* Records List */}
      <FlatList
        data={filteredRecords}
        renderItem={renderRecord}
        keyExtractor={(item) => `${item.subjectId}-${item.date}-${item.timestamp}`}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
      />
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
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  subjectFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginRight: 12,
  },
  subjectSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  subjectSelectorText: {
    fontSize: 14,
    color: '#000',
  },
  statusFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 20,
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordSubject: {
    flex: 1,
  },
  subjectNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  recordDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recordInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordDate: {
    marginLeft: 4,
    fontSize: 14,
    color: '#8E8E93',
  },
  recordTime: {
    marginLeft: 4,
    fontSize: 14,
    color: '#8E8E93',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notesText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#8E8E93',
    flex: 1,
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  methodText: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
});

export default HistoryScreen;