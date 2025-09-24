import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AttendanceService from '../services/AttendanceService';
import TimetableService from '../services/TimetableService';

const AttendanceMarkingScreen = ({ route, navigation }) => {
  const { classId, subjectId, date, editMode = false, existingRecord = null } = route.params;
  const [classDetails, setClassDetails] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState(existingRecord?.status || 'present');
  const [notes, setNotes] = useState(existingRecord?.notes || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClassDetails();
  }, []);

  const loadClassDetails = async () => {
    try {
      const classes = await TimetableService.getAllClasses();
      const classData = classes.find(c => c.id === classId);
      setClassDetails(classData);
    } catch (error) {
      console.error('Error loading class details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const attendanceData = {
        subjectId,
        status: attendanceStatus,
        date: date || new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        notes: notes.trim(),
        method: editMode ? 'edit' : 'manual',
      };

      const result = await AttendanceService.markAttendance(attendanceData);
      
      if (result.success) {
        Alert.alert(
          'Success',
          `Attendance ${editMode ? 'updated' : 'marked'} successfully!`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to save attendance');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      Alert.alert('Error', 'Failed to save attendance');
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass-outline" size={48} color="#007AFF" />
          <Text style={styles.loadingText}>Loading class details...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editMode ? 'Edit Attendance' : 'Mark Attendance'}
        </Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
          <Ionicons name="checkmark" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Class Information Card */}
        <View style={styles.classInfoCard}>
          <View style={styles.classInfoHeader}>
            <Ionicons name="book" size={24} color="#007AFF" />
            <Text style={styles.classInfoTitle}>Class Details</Text>
          </View>
          
          {classDetails && (
            <View style={styles.classInfoContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Subject:</Text>
                <Text style={styles.infoValue}>{classDetails.subjectName}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date:</Text>
                <Text style={styles.infoValue}>
                  {new Date(date || new Date()).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Time:</Text>
                <Text style={styles.infoValue}>
                  {classDetails.startTime} - {classDetails.endTime}
                </Text>
              </View>
              
              {classDetails.room && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Room:</Text>
                  <Text style={styles.infoValue}>{classDetails.room}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Attendance Status Selection */}
        <View style={styles.statusCard}>
          <Text style={styles.sectionTitle}>Attendance Status</Text>
          
          <View style={styles.statusOptions}>
            {['present', 'absent', 'late', 'excused'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusOption,
                  attendanceStatus === status && styles.statusOptionSelected,
                  { borderColor: getStatusColor(status) }
                ]}
                onPress={() => setAttendanceStatus(status)}
              >
                <Ionicons
                  name={getStatusIcon(status)}
                  size={24}
                  color={attendanceStatus === status ? '#fff' : getStatusColor(status)}
                />
                <Text style={[
                  styles.statusOptionText,
                  attendanceStatus === status && styles.statusOptionTextSelected
                ]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes Section */}
        <View style={styles.notesCard}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <Text style={styles.notesSubtitle}>
            {attendanceStatus === 'absent' ? 'Reason for absence:' : 'Additional notes:'}
          </Text>
          
          <TextInput
            style={styles.notesInput}
            placeholder={
              attendanceStatus === 'absent'
                ? 'e.g., Sick, Emergency, etc.'
                : 'Add any additional notes...'
            }
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Ionicons name="close" size={20} color="#FF3B30" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>
              {editMode ? 'Update' : 'Save'}
            </Text>
          </TouchableOpacity>
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
  content: {
    flex: 1,
    padding: 20,
  },
  classInfoCard: {
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
  classInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  classInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginLeft: 12,
  },
  classInfoContent: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
  statusCard: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#fff',
    minWidth: '45%',
  },
  statusOptionSelected: {
    backgroundColor: '#007AFF',
  },
  statusOptionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  statusOptionTextSelected: {
    color: '#fff',
  },
  notesCard: {
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
  notesSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    backgroundColor: '#F8F8F8',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  cancelButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default AttendanceMarkingScreen;