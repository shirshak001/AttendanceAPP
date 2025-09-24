import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TimetableService from '../services/TimetableService';
import SubjectService from '../services/SubjectService';

const AddEditClassScreen = ({ navigation, route }) => {
  const { classId, day, suggestedStartTime, onSave } = route.params || {};
  const isEditing = !!classId;

  // Helper function to get valid Ionicon name
  const getValidIconName = (icon) => {
    const iconMap = {
      '📚': 'book', '🔬': 'flask', '🧮': 'calculator', '🎨': 'color-palette',
      '🏃‍♂️': 'fitness', '💻': 'laptop', '🌍': 'earth', '📖': 'library',
      '⚗️': 'beaker', '🎵': 'musical-notes', '🏛️': 'library-outline',
      '📊': 'bar-chart', '🔭': 'telescope', '🧪': 'test-tube',
      '📐': 'triangle', '🎭': 'theater'
    };
    return iconMap[icon] || icon || 'book';
  };

  const [formData, setFormData] = useState({
    subjectId: '',
    day: day || 'Monday',
    startTime: suggestedStartTime || '09:00',
    endTime: '10:00',
    location: '',
    notes: '',
    repeatWeekly: true,
  });

  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState({ show: false, type: null });

  const daysOfWeek = TimetableService.getDaysOfWeek();
  const timeSlots = TimetableService.getTimeSlots();

  useEffect(() => {
    loadSubjects();
    if (isEditing) {
      loadClassData();
    }
  }, []);

  const loadSubjects = async () => {
    try {
      const subjectsData = await SubjectService.getAllSubjects();
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Error loading subjects:', error);
      Alert.alert('Error', 'Failed to load subjects');
    }
  };

  const loadClassData = async () => {
    try {
      const classData = await TimetableService.getClassById(classId);
      if (classData) {
        setFormData({
          subjectId: classData.subjectId,
          day: classData.day,
          startTime: classData.startTime,
          endTime: classData.endTime,
          location: classData.location || '',
          notes: classData.notes || '',
          repeatWeekly: classData.repeatWeekly !== false,
        });

        const subject = subjects.find(s => s.id === classData.subjectId);
        setSelectedSubject(subject);
      }
    } catch (error) {
      console.error('Error loading class data:', error);
      Alert.alert('Error', 'Failed to load class data');
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      let result;
      if (isEditing) {
        result = await TimetableService.updateClass(classId, formData);
      } else {
        result = await TimetableService.addClass(formData);
      }

      if (result.success) {
        Alert.alert(
          'Success',
          `Class ${isEditing ? 'updated' : 'added'} successfully!`,
          [
            {
              text: 'OK',
              onPress: () => {
                if (onSave) onSave();
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || `Failed to ${isEditing ? 'update' : 'add'} class`);
      }
    } catch (error) {
      console.error('Error saving class:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.subjectId) {
      Alert.alert('Error', 'Please select a subject');
      return false;
    }

    if (!formData.day) {
      Alert.alert('Error', 'Please select a day');
      return false;
    }

    if (!formData.startTime || !formData.endTime) {
      Alert.alert('Error', 'Please select start and end times');
      return false;
    }

    if (formData.startTime >= formData.endTime) {
      Alert.alert('Error', 'Start time must be before end time');
      return false;
    }

    const duration = TimetableService.timeToMinutes(formData.endTime) - TimetableService.timeToMinutes(formData.startTime);
    if (duration < 30) {
      Alert.alert('Error', 'Class duration must be at least 30 minutes');
      return false;
    }

    if (duration > 240) {
      Alert.alert('Error', 'Class duration cannot exceed 4 hours');
      return false;
    }

    return true;
  };

  const handleSubjectSelect = (subject) => {
    setSelectedSubject(subject);
    setFormData({ ...formData, subjectId: subject.id });
    setShowSubjectPicker(false);
  };

  const handleDaySelect = (selectedDay) => {
    setFormData({ ...formData, day: selectedDay });
    setShowDayPicker(false);
  };

  const handleTimeSelect = (time) => {
    if (showTimePicker.type === 'start') {
      // Auto-adjust end time if it's before or too close to start time
      let endTime = formData.endTime;
      const startMinutes = TimetableService.timeToMinutes(time);
      const endMinutes = TimetableService.timeToMinutes(endTime);
      
      if (endMinutes <= startMinutes) {
        endTime = TimetableService.minutesToTime(startMinutes + 60); // 1 hour default
      }
      
      setFormData({ ...formData, startTime: time, endTime });
    } else {
      setFormData({ ...formData, endTime: time });
    }
    setShowTimePicker({ show: false, type: null });
  };

  const renderSubjectPicker = () => (
    <Modal visible={showSubjectPicker} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Subject</Text>
            <TouchableOpacity onPress={() => setShowSubjectPicker(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={subjects}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.subjectOption, { borderLeftColor: item.color }]}
                onPress={() => handleSubjectSelect(item)}
              >
                <Text style={styles.subjectIcon}>{item.icon}</Text>
                <Text style={styles.subjectName}>{item.name}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No subjects available</Text>
                <TouchableOpacity
                  style={styles.addSubjectButton}
                  onPress={() => {
                    setShowSubjectPicker(false);
                    navigation.navigate('AddEditSubject');
                  }}
                >
                  <Text style={styles.addSubjectButtonText}>+ Add Subject</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );

  const renderDayPicker = () => (
    <Modal visible={showDayPicker} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Day</Text>
            <TouchableOpacity onPress={() => setShowDayPicker(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {daysOfWeek.map((day) => (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayOption,
                formData.day === day && styles.selectedOption
              ]}
              onPress={() => handleDaySelect(day)}
            >
              <Text style={[
                styles.dayOptionText,
                formData.day === day && styles.selectedOptionText
              ]}>
                {day}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  const renderTimePicker = () => (
    <Modal visible={showTimePicker.show} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Select {showTimePicker.type === 'start' ? 'Start' : 'End'} Time
            </Text>
            <TouchableOpacity onPress={() => setShowTimePicker({ show: false, type: null })}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.timePickerScroll}>
            {timeSlots.map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeOption,
                  ((showTimePicker.type === 'start' && formData.startTime === time) ||
                   (showTimePicker.type === 'end' && formData.endTime === time)) && styles.selectedOption
                ]}
                onPress={() => handleTimeSelect(time)}
              >
                <Text style={[
                  styles.timeOptionText,
                  ((showTimePicker.type === 'start' && formData.startTime === time) ||
                   (showTimePicker.type === 'end' && formData.endTime === time)) && styles.selectedOptionText
                ]}>
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {isEditing ? 'Edit Class' : 'Add Class'}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text style={[styles.saveButton, loading && styles.saveButtonDisabled]}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form}>
        {/* Subject Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Subject *</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowSubjectPicker(true)}
          >
            {selectedSubject ? (
              <View style={styles.selectedSubject}>
                <Ionicons name={getValidIconName(selectedSubject.icon)} size={20} color="#007AFF" />
                <Text style={styles.selectedSubjectText}>{selectedSubject.name}</Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>Select a subject</Text>
            )}
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Day Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Day *</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowDayPicker(true)}
          >
            <Text style={styles.selectedText}>{formData.day}</Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Time Selection */}
        <View style={styles.timeRow}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Start Time *</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowTimePicker({ show: true, type: 'start' })}
            >
              <Text style={styles.selectedText}>{formData.startTime}</Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.formGroup, { flex: 1, marginLeft: 10 }]}>
            <Text style={styles.label}>End Time *</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowTimePicker({ show: true, type: 'end' })}
            >
              <Text style={styles.selectedText}>{formData.endTime}</Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Duration Display */}
        <View style={styles.durationContainer}>
          <Text style={styles.durationText}>
            Duration: {Math.floor((TimetableService.timeToMinutes(formData.endTime) - TimetableService.timeToMinutes(formData.startTime)) / 60)}h {(TimetableService.timeToMinutes(formData.endTime) - TimetableService.timeToMinutes(formData.startTime)) % 60}m
          </Text>
        </View>

        {/* Location */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={formData.location}
            onChangeText={(text) => setFormData({ ...formData, location: text })}
            placeholder="e.g., Room 101, Building A"
            placeholderTextColor="#999"
          />
        </View>

        {/* Notes */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Additional notes..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Repeat Weekly Toggle */}
        <View style={styles.formGroup}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Text style={styles.label}>Repeat Weekly</Text>
              <Text style={styles.sublabel}>Class occurs every week</Text>
            </View>
            <Switch
              value={formData.repeatWeekly}
              onValueChange={(value) => setFormData({ ...formData, repeatWeekly: value })}
              trackColor={{ false: '#e0e0e0', true: '#4f46e5' }}
              thumbColor={formData.repeatWeekly ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Class Preview */}
        {selectedSubject && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Preview</Text>
            <View style={[styles.previewCard, { borderLeftColor: selectedSubject.color }]}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewSubject}>
                  <Ionicons name={getValidIconName(selectedSubject.icon)} size={16} color="#007AFF" /> {selectedSubject.name}
                </Text>
                <Text style={styles.previewTime}>
                  {TimetableService.formatTimeRange(formData.startTime, formData.endTime)}
                </Text>
              </View>
              <Text style={styles.previewDay}>{formData.day}</Text>
              {formData.location && (
                <Text style={styles.previewLocation}>📍 {formData.location}</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      {renderSubjectPicker()}
      {renderDayPicker()}
      {renderTimePicker()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    fontSize: 16,
    color: '#4f46e5',
    fontWeight: '600',
  },
  saveButtonDisabled: {
    color: '#ccc',
  },
  form: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sublabel: {
    fontSize: 14,
    color: '#666',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  picker: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedSubject: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedSubjectIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  selectedSubjectText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectedText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#666',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationContainer: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  durationText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    flex: 1,
  },
  previewContainer: {
    marginTop: 20,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  previewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 15,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  previewSubject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  previewTime: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '600',
  },
  previewDay: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  previewLocation: {
    fontSize: 14,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  subjectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderLeftWidth: 4,
  },
  subjectIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  subjectName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dayOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayOptionText: {
    fontSize: 16,
    color: '#333',
  },
  timeOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  selectedOption: {
    backgroundColor: '#4f46e5',
  },
  selectedOptionText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  timePickerScroll: {
    maxHeight: 300,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  addSubjectButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addSubjectButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default AddEditClassScreen;