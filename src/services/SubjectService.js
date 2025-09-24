import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './AuthService';

// Predefined color options for subjects
export const SUBJECT_COLORS = [
  { id: 'blue', color: '#3b82f6', name: 'Blue' },
  { id: 'green', color: '#10b981', name: 'Green' },
  { id: 'purple', color: '#8b5cf6', name: 'Purple' },
  { id: 'red', color: '#ef4444', name: 'Red' },
  { id: 'orange', color: '#f97316', name: 'Orange' },
  { id: 'pink', color: '#ec4899', name: 'Pink' },
  { id: 'teal', color: '#14b8a6', name: 'Teal' },
  { id: 'indigo', color: '#6366f1', name: 'Indigo' },
  { id: 'yellow', color: '#eab308', name: 'Yellow' },
  { id: 'slate', color: '#64748b', name: 'Slate' },
];

// Subject icons
export const SUBJECT_ICONS = [
  '📚', '🔬', '🧮', '🎨', '🏃‍♂️', '💻', '🌍', '📖', 
  '⚗️', '🎵', '🏛️', '📊', '🔭', '🧪', '📐', '🎭'
];

class SubjectService {
  // Get all subjects
  static async getAllSubjects() {
    try {
      const subjects = await AsyncStorage.getItem(STORAGE_KEYS.SUBJECTS);
      return subjects ? JSON.parse(subjects) : [];
    } catch (error) {
      console.error('Error getting subjects:', error);
      return [];
    }
  }

  // Add a new subject
  static async addSubject(subjectData) {
    try {
      const subjects = await this.getAllSubjects();
      
      // Check if subject name already exists
      const existingSubject = subjects.find(
        s => s.name.toLowerCase() === subjectData.name.toLowerCase()
      );
      
      if (existingSubject) {
        return { success: false, error: 'A subject with this name already exists' };
      }

      const newSubject = {
        id: Date.now().toString(),
        name: subjectData.name.trim(),
        code: subjectData.code.trim(),
        teacher: subjectData.teacher ? subjectData.teacher.trim() : '',
        color: subjectData.color,
        icon: subjectData.icon,
        createdAt: new Date().toISOString(),
        totalClasses: 0,
        attendedClasses: 0,
        targetPercentage: subjectData.targetPercentage || 75,
      };

      subjects.push(newSubject);
      await AsyncStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
      
      console.log('Subject added successfully:', newSubject);
      return { success: true, subject: newSubject };
    } catch (error) {
      console.error('Error adding subject:', error);
      return { success: false, error: 'Failed to add subject' };
    }
  }

  // Update an existing subject
  static async updateSubject(subjectId, subjectData) {
    try {
      const subjects = await this.getAllSubjects();
      const subjectIndex = subjects.findIndex(s => s.id === subjectId);
      
      if (subjectIndex === -1) {
        return { success: false, error: 'Subject not found' };
      }

      // Check if new name conflicts with existing subjects (excluding current one)
      const nameConflict = subjects.find(
        s => s.id !== subjectId && s.name.toLowerCase() === subjectData.name.toLowerCase()
      );
      
      if (nameConflict) {
        return { success: false, error: 'A subject with this name already exists' };
      }

      const updatedSubject = {
        ...subjects[subjectIndex],
        name: subjectData.name.trim(),
        code: subjectData.code.trim(),
        teacher: subjectData.teacher ? subjectData.teacher.trim() : '',
        color: subjectData.color,
        icon: subjectData.icon,
        targetPercentage: subjectData.targetPercentage || subjects[subjectIndex].targetPercentage,
        updatedAt: new Date().toISOString(),
      };

      subjects[subjectIndex] = updatedSubject;
      await AsyncStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
      
      console.log('Subject updated successfully:', updatedSubject);
      return { success: true, subject: updatedSubject };
    } catch (error) {
      console.error('Error updating subject:', error);
      return { success: false, error: 'Failed to update subject' };
    }
  }

  // Delete a subject
  static async deleteSubject(subjectId) {
    try {
      const subjects = await this.getAllSubjects();
      const filteredSubjects = subjects.filter(s => s.id !== subjectId);
      
      if (subjects.length === filteredSubjects.length) {
        return { success: false, error: 'Subject not found' };
      }

      await AsyncStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(filteredSubjects));
      
      console.log('Subject deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Error deleting subject:', error);
      return { success: false, error: 'Failed to delete subject' };
    }
  }

  // Get subject by ID
  static async getSubjectById(subjectId) {
    try {
      const subjects = await this.getAllSubjects();
      return subjects.find(s => s.id === subjectId) || null;
    } catch (error) {
      console.error('Error getting subject by ID:', error);
      return null;
    }
  }

  // Get subjects statistics
  static async getSubjectsStats() {
    try {
      const subjects = await this.getAllSubjects();
      
      const stats = {
        totalSubjects: subjects.length,
        totalClasses: subjects.reduce((sum, s) => sum + s.totalClasses, 0),
        totalAttended: subjects.reduce((sum, s) => sum + s.attendedClasses, 0),
        overallPercentage: 0,
        subjectsAboveTarget: 0,
        subjectsBelowTarget: 0,
      };

      if (stats.totalClasses > 0) {
        stats.overallPercentage = Math.round((stats.totalAttended / stats.totalClasses) * 100);
      }

      subjects.forEach(subject => {
        if (subject.totalClasses > 0) {
          const percentage = (subject.attendedClasses / subject.totalClasses) * 100;
          if (percentage >= subject.targetPercentage) {
            stats.subjectsAboveTarget++;
          } else {
            stats.subjectsBelowTarget++;
          }
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting subjects stats:', error);
      return {
        totalSubjects: 0,
        totalClasses: 0,
        totalAttended: 0,
        overallPercentage: 0,
        subjectsAboveTarget: 0,
        subjectsBelowTarget: 0,
      };
    }
  }
}

export default SubjectService;