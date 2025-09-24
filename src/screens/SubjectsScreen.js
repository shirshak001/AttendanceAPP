import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import SubjectService from '../services/SubjectService';

const { width } = Dimensions.get('window');

const SubjectsScreen = ({ navigation }) => {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalSubjects: 0,
    overallPercentage: 0,
    subjectsAboveTarget: 0,
    subjectsBelowTarget: 0
  });

  // Helper method to get valid Ionicon name
  const getValidIconName = (icon) => {
    // If it's already a valid Ionicon name, return it
    if (icon && typeof icon === 'string' && !icon.includes('📚') && !icon.includes('🔬')) {
      return icon;
    }
    // Map old emojis to Ionicon names
    const iconMap = {
      '📚': 'book',
      '🔬': 'flask',
      '🧮': 'calculator',
      '🎨': 'color-palette',
      '🏃‍♂️': 'fitness',
      '💻': 'laptop',
      '🌍': 'earth',
      '📖': 'library',
      '⚗️': 'beaker',
      '🎵': 'musical-notes',
      '🏛️': 'library-outline',
      '📊': 'bar-chart',
      '🔭': 'telescope',
      '🧪': 'test-tube',
      '📐': 'triangle',
      '🎭': 'theater'
    };
    return iconMap[icon] || 'book';
  };

  const loadSubjects = async () => {
    try {
      const [subjectsData, statsData] = await Promise.all([
        SubjectService.getAllSubjects(),
        SubjectService.getSubjectsStats(),
      ]);
      
      setSubjects(subjectsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading subjects:', error);
      Alert.alert('Error', 'Failed to load subjects');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSubjects();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadSubjects();
  };

  const handleAddSubject = () => {
    navigation.navigate('AddEditSubject', { mode: 'add' });
  };

  const handleEditSubject = (subject) => {
    navigation.navigate('AddEditSubject', { mode: 'edit', subject });
  };

  const handleDeleteSubject = (subject) => {
    Alert.alert(
      'Delete Subject',
      `Are you sure you want to delete "${subject.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await SubjectService.deleteSubject(subject.id);
            if (result.success) {
              loadSubjects();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete subject');
            }
          },
        },
      ]
    );
  };

  const handleSubjectPress = (subject) => {
    navigation.navigate('SubjectDetail', { subject });
  };

  const getAttendancePercentage = (subject) => {
    if (subject.totalClasses === 0) return 0;
    return Math.round((subject.attendedClasses / subject.totalClasses) * 100);
  };

  const getAttendanceStatus = (percentage, targetPercentage) => {
    if (percentage >= targetPercentage) return 'good';
    if (percentage >= targetPercentage - 10) return 'warning';
    return 'danger';
  };

  const renderStatsCard = () => (
    <View style={styles.statsCard}>
      <Text style={styles.statsTitle}>Overview</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.totalSubjects}</Text>
          <Text style={styles.statLabel}>Subjects</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: getStatusColor(stats.overallPercentage, 75) }]}>
            {stats.overallPercentage}%
          </Text>
          <Text style={styles.statLabel}>Overall</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#10b981' }]}>
            {stats.subjectsAboveTarget}
          </Text>
          <Text style={styles.statLabel}>On Track</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#ef4444' }]}>
            {stats.subjectsBelowTarget}
          </Text>
          <Text style={styles.statLabel}>Below Target</Text>
        </View>
      </View>
    </View>
  );

  const getStatusColor = (percentage, target) => {
    if (percentage >= target) return '#10b981';
    if (percentage >= target - 10) return '#f59e0b';
    return '#ef4444';
  };

  const renderSubjectCard = (subject) => {
    const percentage = getAttendancePercentage(subject);
    const status = getAttendanceStatus(percentage, subject.targetPercentage);
    
    return (
      <TouchableOpacity
        key={subject.id}
        style={styles.subjectCard}
        onPress={() => handleSubjectPress(subject)}
        activeOpacity={0.7}
      >
        <View style={styles.subjectHeader}>
          <View style={styles.subjectIconContainer}>
            <View style={[styles.subjectIcon, { backgroundColor: subject.color }]}>
              <Ionicons name={getValidIconName(subject.icon)} size={24} color="#ffffff" />
            </View>
          </View>
          
          <View style={styles.subjectInfo}>
            <Text style={styles.subjectName} numberOfLines={1}>
              {subject.name}
            </Text>
            <Text style={styles.subjectCode} numberOfLines={1}>
              {subject.code}
            </Text>
            {subject.teacher && (
              <Text style={styles.subjectTeacher} numberOfLines={1}>
                {subject.teacher}
              </Text>
            )}
          </View>

          <View style={styles.subjectActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditSubject(subject)}
            >
              <Ionicons name="create" size={16} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteSubject(subject)}
            >
              <Text style={styles.actionButtonText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.subjectStats}>
          <View style={styles.attendanceInfo}>
            <Text style={styles.attendanceText}>
              {subject.attendedClasses}/{subject.totalClasses} classes
            </Text>
            <Text style={[styles.percentageText, { color: getStatusColor(percentage, subject.targetPercentage) }]}>
              {percentage}%
            </Text>
          </View>
          
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.min(percentage, 100)}%`,
                    backgroundColor: getStatusColor(percentage, subject.targetPercentage),
                  },
                ]}
              />
            </View>
            <Text style={styles.targetText}>Target: {subject.targetPercentage}%</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="school" size={48} color="#a1a1aa" />
      <Text style={styles.emptyStateTitle}>No Subjects Added</Text>
      <Text style={styles.emptyStateText}>
        Add your first subject to start tracking attendance
      </Text>
      <TouchableOpacity style={styles.emptyStateButton} onPress={handleAddSubject}>
        <Text style={styles.emptyStateButtonText}>Add Subject</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading subjects...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Subjects</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddSubject}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {subjects.length > 0 && renderStatsCard()}
        
        {subjects.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.subjectsContainer}>
            <Text style={styles.sectionTitle}>
              Your Subjects ({subjects.length})
            </Text>
            {subjects.map(renderSubjectCard)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
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
    color: '#6b7280',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  subjectsContainer: {
    gap: 16,
  },
  subjectCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectIconContainer: {
    marginRight: 12,
  },
  subjectIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectIconText: {
    fontSize: 24,
  },
  subjectInfo: {
    flex: 1,
    marginRight: 8,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  subjectCode: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  subjectTeacher: {
    fontSize: 12,
    color: '#9ca3af',
  },
  subjectActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  actionButtonText: {
    fontSize: 14,
  },
  subjectStats: {
    gap: 8,
  },
  attendanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceText: {
    fontSize: 14,
    color: '#6b7280',
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    gap: 4,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  targetText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SubjectsScreen;