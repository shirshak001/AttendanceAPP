import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const HolidayCalendarScreen = ({ navigation }) => {
  const [holidays, setHolidays] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
  });

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    try {
      const stored = await AsyncStorage.getItem('holidays');
      if (stored) {
        const parsedHolidays = JSON.parse(stored);
        // Sort by date
        parsedHolidays.sort((a, b) => new Date(a.date) - new Date(b.date));
        setHolidays(parsedHolidays);
      }
    } catch (error) {
      console.error('Error loading holidays:', error);
    }
  };

  const saveHolidays = async (updatedHolidays) => {
    try {
      await AsyncStorage.setItem('holidays', JSON.stringify(updatedHolidays));
      setHolidays(updatedHolidays);
    } catch (error) {
      console.error('Error saving holidays:', error);
      Alert.alert('Error', 'Failed to save holidays');
    }
  };

  const handleAddHoliday = () => {
    setEditingHoliday(null);
    setFormData({ name: '', date: '', description: '' });
    setModalVisible(true);
  };

  const handleEditHoliday = (holiday) => {
    setEditingHoliday(holiday);
    setFormData({ ...holiday });
    setModalVisible(true);
  };

  const handleSaveHoliday = () => {
    if (!formData.name.trim() || !formData.date.trim()) {
      Alert.alert('Error', 'Please fill in holiday name and date');
      return;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(formData.date)) {
      Alert.alert('Error', 'Please enter date in YYYY-MM-DD format');
      return;
    }

    const updatedHolidays = [...holidays];
    
    if (editingHoliday) {
      const index = holidays.findIndex(h => h.id === editingHoliday.id);
      if (index !== -1) {
        updatedHolidays[index] = { ...formData, id: editingHoliday.id };
      }
    } else {
      const newHoliday = {
        ...formData,
        id: Date.now().toString(),
      };
      updatedHolidays.push(newHoliday);
    }

    // Sort by date
    updatedHolidays.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    saveHolidays(updatedHolidays);
    setModalVisible(false);
  };

  const handleDeleteHoliday = (holidayId) => {
    Alert.alert(
      'Delete Holiday',
      'Are you sure you want to delete this holiday?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedHolidays = holidays.filter(h => h.id !== holidayId);
            saveHolidays(updatedHolidays);
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isHolidayToday = (dateString) => {
    const today = new Date().toDateString();
    const holidayDate = new Date(dateString).toDateString();
    return today === holidayDate;
  };

  const isHolidayUpcoming = (dateString) => {
    const today = new Date();
    const holidayDate = new Date(dateString);
    const daysDiff = Math.ceil((holidayDate - today) / (1000 * 60 * 60 * 24));
    return daysDiff >= 0 && daysDiff <= 7;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Holiday Calendar</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleAddHoliday}
        >
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {holidays.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyStateTitle}>No Holidays Added</Text>
            <Text style={styles.emptyStateMessage}>
              Tap the + button to add holidays and breaks
            </Text>
          </View>
        ) : (
          <View style={styles.holidaysList}>
            {holidays.map((holiday) => (
              <TouchableOpacity
                key={holiday.id}
                style={[
                  styles.holidayCard,
                  isHolidayToday(holiday.date) && styles.todayHoliday,
                  isHolidayUpcoming(holiday.date) && styles.upcomingHoliday,
                ]}
                onPress={() => handleEditHoliday(holiday)}
              >
                <View style={styles.holidayContent}>
                  <View style={styles.holidayInfo}>
                    <Text style={styles.holidayName}>{holiday.name}</Text>
                    <Text style={styles.holidayDate}>
                      {formatDate(holiday.date)}
                    </Text>
                    {holiday.description ? (
                      <Text style={styles.holidayDescription}>
                        {holiday.description}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.holidayActions}>
                    {isHolidayToday(holiday.date) && (
                      <View style={styles.todayBadge}>
                        <Text style={styles.todayBadgeText}>TODAY</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteHoliday(holiday.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Holiday Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Holiday Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="e.g., Christmas Day"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Date * (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.date}
                  onChangeText={(text) => setFormData({ ...formData, date: text })}
                  placeholder="2024-12-25"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Additional notes about this holiday"
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveHoliday}
              >
                <Text style={styles.saveButtonText}>
                  {editingHoliday ? 'Update Holiday' : 'Add Holiday'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  holidaysList: {
    gap: 12,
  },
  holidayCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  todayHoliday: {
    borderColor: '#34C759',
    backgroundColor: '#F0FFF4',
  },
  upcomingHoliday: {
    borderColor: '#FF9500',
    backgroundColor: '#FFF8F0',
  },
  holidayContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  holidayInfo: {
    flex: 1,
  },
  holidayName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  holidayDate: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 8,
  },
  holidayDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  holidayActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  todayBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  modalForm: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});