import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TimetableService from '../services/TimetableService';

const { width } = Dimensions.get('window');

const TimetableScreen = ({ navigation }) => {
  const [timetable, setTimetable] = useState({});
  const [selectedDay, setSelectedDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState({});

  const daysOfWeek = TimetableService.getDaysOfWeek();
  const timeSlots = TimetableService.getTimeSlots();

  useEffect(() => {
    loadTimetable();
  }, []);

  const loadTimetable = async () => {
    try {
      setLoading(true);
      const [timetableData, summary] = await Promise.all([
        TimetableService.getTimetable(),
        TimetableService.getWeeklySummary(),
      ]);
      setTimetable(timetableData);
      setWeeklySummary(summary);
    } catch (error) {
      console.error('Error loading timetable:', error);
      Alert.alert('Error', 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTimetable();
    setRefreshing(false);
  }, []);

  const handleAddClass = (day, timeSlot) => {
    navigation.navigate('AddEditClass', {
      day,
      suggestedStartTime: timeSlot,
      onSave: loadTimetable,
    });
  };

  const handleClassPress = (classItem) => {
    Alert.alert(
      classItem.subjectName,
      `${TimetableService.formatTimeRange(classItem.startTime, classItem.endTime)}\n${classItem.location || 'No location specified'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'View Details', 
          onPress: () => navigation.navigate('ClassDetail', { classId: classItem.id })
        },
        { 
          text: 'Edit', 
          onPress: () => navigation.navigate('AddEditClass', {
            classId: classItem.id,
            onSave: loadTimetable,
          })
        },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => handleDeleteClass(classItem.id)
        },
      ]
    );
  };

  const handleDeleteClass = async (classId) => {
    Alert.alert(
      'Delete Class',
      'Are you sure you want to delete this class?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const result = await TimetableService.deleteClass(classId);
            if (result.success) {
              loadTimetable();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete class');
            }
          }
        },
      ]
    );
  };

  const getClassForTimeSlot = (day, timeSlot) => {
    const dayClasses = timetable[day] || [];
    return dayClasses.find(classItem => {
      const classStart = TimetableService.timeToMinutes(classItem.startTime);
      const classEnd = TimetableService.timeToMinutes(classItem.endTime);
      const slotTime = TimetableService.timeToMinutes(timeSlot);
      
      return slotTime >= classStart && slotTime < classEnd;
    });
  };

  const getClassHeight = (classItem) => {
    const startMinutes = TimetableService.timeToMinutes(classItem.startTime);
    const endMinutes = TimetableService.timeToMinutes(classItem.endTime);
    const duration = endMinutes - startMinutes;
    return Math.max(40, (duration / 30) * 40); // 40px for 30min slots
  };

  const renderTimeGrid = () => {
    return (
      <View style={styles.gridContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.grid}>
            {/* Time column */}
            <View style={styles.timeColumn}>
              <View style={styles.timeHeaderCell} />
              {timeSlots.map((time) => (
                <View key={time} style={styles.timeCell}>
                  <Text style={styles.timeText}>{time}</Text>
                </View>
              ))}
            </View>

            {/* Day columns */}
            {daysOfWeek.map((day) => (
              <View key={day} style={styles.dayColumn}>
                <TouchableOpacity
                  style={[
                    styles.dayHeaderCell,
                    selectedDay === day && styles.selectedDayHeader,
                  ]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[
                    styles.dayHeaderText,
                    selectedDay === day && styles.selectedDayHeaderText,
                  ]}>
                    {day.substring(0, 3)}
                  </Text>
                  <Text style={[
                    styles.dayCountText,
                    selectedDay === day && styles.selectedDayCountText,
                  ]}>
                    {(timetable[day] || []).length}
                  </Text>
                </TouchableOpacity>

                {/* Time slots for this day */}
                {timeSlots.map((timeSlot, index) => {
                  const classItem = getClassForTimeSlot(day, timeSlot);
                  
                  if (classItem) {
                    // Check if this is the first slot of the class
                    const isFirstSlot = TimetableService.timeToMinutes(classItem.startTime) === TimetableService.timeToMinutes(timeSlot);
                    
                    if (isFirstSlot) {
                      return (
                        <TouchableOpacity
                          key={`${day}-${timeSlot}`}
                          style={[
                            styles.classBlock,
                            { 
                              backgroundColor: classItem.subjectColor,
                              height: getClassHeight(classItem),
                            },
                          ]}
                          onPress={() => handleClassPress(classItem)}
                        >
                          <Text style={styles.classTitle} numberOfLines={1}>
                            {classItem.subjectIcon} {classItem.subjectName}
                          </Text>
                          <Text style={styles.classTime}>
                            {TimetableService.formatTimeRange(classItem.startTime, classItem.endTime)}
                          </Text>
                          {classItem.location && (
                            <Text style={styles.classLocation} numberOfLines={1}>
                              📍 {classItem.location}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    } else {
                      // This slot is occupied by a class that started earlier
                      return null;
                    }
                  } else {
                    // Empty slot
                    return (
                      <TouchableOpacity
                        key={`${day}-${timeSlot}`}
                        style={styles.emptySlot}
                        onPress={() => handleAddClass(day, timeSlot)}
                      >
                        <Text style={styles.addIcon}>+</Text>
                      </TouchableOpacity>
                    );
                  }
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderSelectedDayView = () => {
    const dayClasses = (timetable[selectedDay] || []).sort((a, b) => 
      a.startTime.localeCompare(b.startTime)
    );

    return (
      <View style={styles.selectedDayContainer}>
        <Text style={styles.selectedDayTitle}>{selectedDay} Classes</Text>
        
        {dayClasses.length === 0 ? (
          <View style={styles.emptyDayContainer}>
            <Text style={styles.emptyDayText}>No classes scheduled</Text>
            <TouchableOpacity
              style={styles.addClassButton}
              onPress={() => handleAddClass(selectedDay, '09:00')}
            >
              <Text style={styles.addClassButtonText}>+ Add Class</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={styles.dayClassesList}>
            {dayClasses.map((classItem) => (
              <TouchableOpacity
                key={classItem.id}
                style={[styles.classCard, { borderLeftColor: classItem.subjectColor }]}
                onPress={() => navigation.navigate('ClassDetail', { classId: classItem.id })}
              >
                <View style={styles.classCardHeader}>
                  <Text style={styles.classCardTitle}>
                    {classItem.subjectIcon} {classItem.subjectName}
                  </Text>
                  <Text style={styles.classCardTime}>
                    {TimetableService.formatTimeRange(classItem.startTime, classItem.endTime)}
                  </Text>
                </View>
                
                {classItem.location && (
                  <Text style={styles.classCardLocation}>
                    📍 {classItem.location}
                  </Text>
                )}
                
                {classItem.notes && (
                  <Text style={styles.classCardNotes} numberOfLines={2}>
                    📝 {classItem.notes}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.addClassButton}
              onPress={() => handleAddClass(selectedDay, '09:00')}
            >
              <Text style={styles.addClassButtonText}>+ Add Another Class</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading timetable...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>📅 Timetable</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddEditClass', { onSave: loadTimetable })}
          >
            <Text style={styles.addButtonText}>+ Add Class</Text>
          </TouchableOpacity>
        </View>

        {/* Weekly Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>This Week</Text>
            <Text style={styles.summaryValue}>{weeklySummary.totalClasses || 0}</Text>
            <Text style={styles.summaryLabel}>Total Classes</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Busiest Day</Text>
            <Text style={styles.summaryValue}>{weeklySummary.busiestDay || 'None'}</Text>
            <Text style={styles.summaryLabel}>
              {weeklySummary.daysSummary?.[weeklySummary.busiestDay] || 0} classes
            </Text>
          </View>
        </View>

        {/* Timetable Grid */}
        {renderTimeGrid()}

        {/* Selected Day View */}
        {renderSelectedDayView()}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 15,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4f46e5',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888',
  },
  gridContainer: {
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  grid: {
    flexDirection: 'row',
  },
  timeColumn: {
    width: 60,
  },
  timeHeaderCell: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  timeCell: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  dayColumn: {
    width: 100,
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
  },
  dayHeaderCell: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  selectedDayHeader: {
    backgroundColor: '#4f46e5',
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  selectedDayHeaderText: {
    color: '#ffffff',
  },
  dayCountText: {
    fontSize: 10,
    color: '#666',
  },
  selectedDayCountText: {
    color: '#ffffff',
  },
  emptySlot: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  addIcon: {
    fontSize: 16,
    color: '#ccc',
  },
  classBlock: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    margin: 2,
    minHeight: 40,
    justifyContent: 'center',
  },
  classTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 1,
  },
  classTime: {
    fontSize: 8,
    color: '#ffffff',
    opacity: 0.9,
  },
  classLocation: {
    fontSize: 8,
    color: '#ffffff',
    opacity: 0.8,
    marginTop: 1,
  },
  selectedDayContainer: {
    margin: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedDayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  emptyDayContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyDayText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  addClassButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 15,
  },
  addClassButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
  dayClassesList: {
    maxHeight: 300,
  },
  classCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  classCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  classCardTime: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '600',
  },
  classCardLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  classCardNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default TimetableScreen;