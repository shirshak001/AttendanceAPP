import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SubjectService, { SUBJECT_COLORS, SUBJECT_ICONS } from '../services/SubjectService';

const { width } = Dimensions.get('window');

const AddEditSubjectScreen = ({ navigation, route }) => {
  const { mode, subject } = route.params;
  const isEditing = mode === 'edit';

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    teacher: '',
    color: SUBJECT_COLORS[0].color,
    icon: SUBJECT_ICONS[0],
    targetPercentage: '75',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEditing && subject) {
      setFormData({
        name: subject.name || '',
        code: subject.code || '',
        teacher: subject.teacher || '',
        color: subject.color || SUBJECT_COLORS[0].color,
        icon: subject.icon || SUBJECT_ICONS[0],
        targetPercentage: (subject.targetPercentage || 75).toString(),
      });
    }
  }, [isEditing, subject]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Subject name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Subject name must be at least 2 characters';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Subject code is required';
    } else if (formData.code.trim().length < 2) {
      newErrors.code = 'Subject code must be at least 2 characters';
    }

    const targetPercentage = parseInt(formData.targetPercentage);
    if (isNaN(targetPercentage) || targetPercentage < 1 || targetPercentage > 100) {
      newErrors.targetPercentage = 'Target percentage must be between 1 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const subjectData = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        teacher: formData.teacher.trim(),
        color: formData.color,
        icon: formData.icon,
        targetPercentage: parseInt(formData.targetPercentage),
      };

      let result;
      if (isEditing) {
        result = await SubjectService.updateSubject(subject.id, subjectData);
      } else {
        result = await SubjectService.addSubject(subjectData);
      }

      if (result.success) {
        Alert.alert(
          'Success',
          `Subject ${isEditing ? 'updated' : 'added'} successfully!`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', result.error || `Failed to ${isEditing ? 'update' : 'add'} subject`);
      }
    } catch (error) {
      console.error('Error saving subject:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const renderColorSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorLabel}>Color</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorContainer}>
        {SUBJECT_COLORS.map((colorOption) => (
          <TouchableOpacity
            key={colorOption.id}
            style={[
              styles.colorOption,
              { backgroundColor: colorOption.color },
              formData.color === colorOption.color && styles.selectedColorOption,
            ]}
            onPress={() => handleInputChange('color', colorOption.color)}
          >
            {formData.color === colorOption.color && (
              <Text style={styles.colorCheckmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderIconSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorLabel}>Icon</Text>
      <View style={styles.iconGrid}>
        {SUBJECT_ICONS.map((iconOption, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.iconOption,
              formData.icon === iconOption && styles.selectedIconOption,
            ]}
            onPress={() => handleInputChange('icon', iconOption)}
          >
            <Text style={styles.iconText}>{iconOption}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderInputField = (field, label, placeholder, keyboardType = 'default', multiline = false) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {label}
        {field === 'name' || field === 'code' ? ' *' : ''}
      </Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
          errors[field] && styles.inputError,
        ]}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        value={formData[field]}
        onChangeText={(value) => handleInputChange(field, value)}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Subject' : 'Add Subject'}
          </Text>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Preview Card */}
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <View style={[styles.previewIcon, { backgroundColor: formData.color }]}>
                  <Text style={styles.previewIconText}>{formData.icon}</Text>
                </View>
                <View style={styles.previewInfo}>
                  <Text style={styles.previewName}>
                    {formData.name || 'Subject Name'}
                  </Text>
                  <Text style={styles.previewCode}>
                    {formData.code || 'Subject Code'}
                  </Text>
                  {formData.teacher && (
                    <Text style={styles.previewTeacher}>{formData.teacher}</Text>
                  )}
                </View>
              </View>
              <Text style={styles.previewLabel}>Preview</Text>
            </View>

            {/* Form Fields */}
            {renderInputField('name', 'Subject Name', 'e.g., Mathematics, Physics')}
            {renderInputField('code', 'Subject Code', 'e.g., MATH101, PHY201')}
            {renderInputField('teacher', 'Teacher Name', 'e.g., Dr. Smith (Optional)')}
            {renderInputField('targetPercentage', 'Target Attendance (%)', 'e.g., 75', 'numeric')}

            {/* Color Selector */}
            {renderColorSelector()}

            {/* Icon Selector */}
            {renderIconSelector()}

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={16} color="#007AFF" />
              <Text style={styles.infoText}>
                Choose a color and icon that helps you quickly identify this subject.
                The target attendance percentage will be used to track your progress.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  saveButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
    gap: 24,
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewIconText: {
    fontSize: 24,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  previewCode: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  previewTeacher: {
    fontSize: 12,
    color: '#9ca3af',
  },
  previewLabel: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginTop: 4,
  },
  selectorContainer: {
    gap: 12,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  colorContainer: {
    flexDirection: 'row',
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: '#1f2937',
  },
  colorCheckmark: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconOption: {
    width: 48,
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  selectedIconOption: {
    borderColor: '#4f46e5',
    borderWidth: 2,
    backgroundColor: '#f0f9ff',
  },
  iconText: {
    fontSize: 24,
  },
  infoBox: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
});

export default AddEditSubjectScreen;