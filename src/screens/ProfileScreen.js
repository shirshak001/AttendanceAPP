import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { SignOutButton } from '../components/auth/SignOutButton';
import NotificationService from '../services/NotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileScreen = ({ navigation }) => {
  const { user } = useUser();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('5'); // minutes after class
  const [academicYear, setAcademicYear] = useState('2024-2025');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const notifEnabled = await NotificationService.areNotificationsEnabled();
      setNotificationsEnabled(notifEnabled);

      const reminderMinutes = await AsyncStorage.getItem('reminder_time');
      if (reminderMinutes) {
        setReminderTime(reminderMinutes);
      }

      const year = await AsyncStorage.getItem('academic_year');
      if (year) {
        setAcademicYear(year);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleNotificationToggle = async (value) => {
    try {
      setNotificationsEnabled(value);
      await NotificationService.setNotificationsEnabled(value);
      
      if (value) {
        Alert.alert(
          'Notifications Enabled',
          'You will receive attendance reminders after classes end.'
        );
      } else {
        Alert.alert(
          'Notifications Disabled',
          'You will not receive attendance reminders.'
        );
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const handleReminderTimeChange = () => {
    const options = ['1', '5', '10', '15', '30'];
    Alert.alert(
      'Reminder Time',
      'How many minutes after class ends should we remind you?',
      options.map(time => ({
        text: `${time} minutes`,
        onPress: async () => {
          setReminderTime(time);
          await AsyncStorage.setItem('reminder_time', time);
          if (notificationsEnabled) {
            await NotificationService.scheduleAttendanceReminders();
          }
        },
      })).concat([{ text: 'Cancel', style: 'cancel' }])
    );
  };

  const handleAcademicYearChange = () => {
    const currentYear = new Date().getFullYear();
    const years = [
      `${currentYear-1}-${currentYear}`,
      `${currentYear}-${currentYear+1}`,
      `${currentYear+1}-${currentYear+2}`,
    ];

    Alert.alert(
      'Academic Year',
      'Select your current academic year',
      years.map(year => ({
        text: year,
        onPress: async () => {
          setAcademicYear(year);
          await AsyncStorage.setItem('academic_year', year);
        },
      })).concat([{ text: 'Cancel', style: 'cancel' }])
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Choose export format',
      [
        {
          text: 'CSV',
          onPress: () => exportToCSV(),
        },
        {
          text: 'PDF',
          onPress: () => exportToPDF(),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const exportToCSV = () => {
    // This is a placeholder - implement actual CSV export
    Alert.alert(
      'CSV Export',
      'CSV export functionality will be implemented soon. Your attendance data will be exported to a CSV file.'
    );
  };

  const exportToPDF = () => {
    // This is a placeholder - implement actual PDF export
    Alert.alert(
      'PDF Export',
      'PDF export functionality will be implemented soon. Your attendance report will be generated as a PDF.'
    );
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'Password change functionality will be implemented based on your authentication method.'
    );
  };



  const renderSettingRow = (icon, title, subtitle, onPress, rightComponent = null) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon} size={20} color="#007AFF" />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightComponent || <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />}
    </TouchableOpacity>
  );

  const renderSectionHeader = (title) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

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
        <Text style={styles.headerTitle}>Profile & Settings</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileInfo}>
            <View style={styles.profileImageContainer}>
              {user?.profileImageUrl ? (
                <Image
                  source={{ uri: user.profileImageUrl }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={[styles.profileImage, styles.defaultProfileImage]}>
                  <Ionicons name="person" size={40} color="#6b7280" />
                </View>
              )}
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>
                {user?.fullName || user?.firstName || 'User'}
              </Text>
              {user?.username && (
                <Text style={styles.profileUsername}>
                  @{user.username}
                </Text>
              )}
              <Text style={styles.profileEmail}>
                {user?.primaryEmailAddress?.emailAddress || 'No email'}
              </Text>
              <View style={styles.loginMethodBadge}>
                <Ionicons
                  name="shield-checkmark"
                  size={12}
                  color="#fff"
                />
                <Text style={styles.loginMethodText}>
                  Clerk Auth
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Notification Settings */}
        {renderSectionHeader('Notifications')}
        <View style={styles.settingsSection}>
          {renderSettingRow(
            'notifications',
            'Attendance Reminders',
            notificationsEnabled ? 'Enabled' : 'Disabled',
            null,
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#fff"
            />
          )}

          {renderSettingRow(
            'time',
            'Reminder Timing',
            `${reminderTime} minutes after class`,
            handleReminderTimeChange
          )}
        </View>

        {/* Academic Settings */}
        {renderSectionHeader('Academic')}
        <View style={styles.settingsSection}>
          {renderSettingRow(
            'school',
            'Academic Year',
            academicYear,
            handleAcademicYearChange
          )}

          {renderSettingRow(
            'calendar',
            'Semester Settings',
            'Configure start/end dates',
            () => Alert.alert('Coming Soon', 'Semester settings will be available soon')
          )}

          {renderSettingRow(
            'calendar-outline',
            'Holiday Calendar',
            'Manage holiday list',
            () => Alert.alert('Coming Soon', 'Holiday calendar will be available soon')
          )}
        </View>

        {/* Data & Export */}
        {renderSectionHeader('Data Management')}
        <View style={styles.settingsSection}>
          {renderSettingRow(
            'download',
            'Export Attendance',
            'Download as CSV or PDF',
            handleExportData
          )}

          {renderSettingRow(
            'cloud-upload',
            'Backup Data',
            'Backup to cloud storage',
            () => Alert.alert('Coming Soon', 'Data backup will be available soon')
          )}

          {renderSettingRow(
            'refresh',
            'Sync Data',
            'Sync across devices',
            () => Alert.alert('Coming Soon', 'Data sync will be available soon')
          )}
        </View>

        {/* Account Settings */}
        {renderSectionHeader('Account')}
        <View style={styles.settingsSection}>
          {renderSettingRow(
            'key',
            'Change Password',
            'Update your password',
            handleChangePassword
          )}

          {renderSettingRow(
            'shield-checkmark',
            'Privacy Settings',
            'Manage data privacy',
            () => Alert.alert('Coming Soon', 'Privacy settings will be available soon')
          )}

          {renderSettingRow(
            'information-circle',
            'About App',
            'Version 1.0.0',
            () => Alert.alert('About', 'Attendance App v1.0.0\nBuilt for tracking class attendance efficiently.')
          )}
        </View>

        {/* Sign Out */}
        <SignOutButton navigation={navigation} />
      </ScrollView>
    </SafeAreaView>
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
  },
  profileSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5E5EA',
  },
  defaultProfileImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  profileDetails: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  loginMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  loginMethodText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '500',
    color: '#fff',
    textTransform: 'capitalize',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginLeft: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  settingsSection: {
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  signOutSection: {
    backgroundColor: '#fff',
    marginBottom: 40,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  signOutText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#FF3B30',
  },
});

export default ProfileScreen;