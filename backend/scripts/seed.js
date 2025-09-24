const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../src/models/User');
const TimetableEntry = require('../src/models/TimetableEntry');
const AttendanceRecord = require('../src/models/AttendanceRecord');
const ScheduledNotification = require('../src/models/ScheduledNotification');

// Sample data
const sampleUsers = [
  {
    name: 'John Doe',
    email: 'john@example.com',
    pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    preferences: {
      notificationsEnabled: true,
      defaultReminderMinutes: 15,
      notificationTypes: ['attendance_reminder', 'daily_summary']
    },
    settings: {
      theme: 'light',
      language: 'en'
    }
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    pushToken: 'ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]',
    preferences: {
      notificationsEnabled: true,
      defaultReminderMinutes: 10,
      notificationTypes: ['attendance_reminder']
    },
    settings: {
      theme: 'dark',
      language: 'en'
    }
  }
];

const sampleSubjects = [
  { code: 'MATH101', name: 'Calculus I', instructor: 'Dr. Sarah Johnson' },
  { code: 'PHYS201', name: 'Physics II', instructor: 'Prof. Michael Brown' },
  { code: 'CHEM150', name: 'General Chemistry', instructor: 'Dr. Emily Davis' },
  { code: 'ENG100', name: 'English Composition', instructor: 'Prof. Robert Wilson' },
  { code: 'CS201', name: 'Data Structures', instructor: 'Dr. Lisa Chen' }
];

const generateTimetableEntries = (userId) => {
  const entries = [];
  const timeSlots = [
    { start: '09:00', end: '10:30' },
    { start: '11:00', end: '12:30' },
    { start: '14:00', end: '15:30' },
    { start: '16:00', end: '17:30' }
  ];

  const locations = ['Room 101', 'Lab 205', 'Auditorium A', 'Room 302', 'Lab 150'];
  const classTypes = ['lecture', 'lab', 'tutorial'];

  // Generate random schedule for the week
  for (let day = 1; day <= 5; day++) { // Monday to Friday
    const numClasses = Math.floor(Math.random() * 3) + 1; // 1-3 classes per day
    const usedSlots = [];

    for (let i = 0; i < numClasses; i++) {
      let slotIndex;
      do {
        slotIndex = Math.floor(Math.random() * timeSlots.length);
      } while (usedSlots.includes(slotIndex));
      
      usedSlots.push(slotIndex);

      const subject = sampleSubjects[Math.floor(Math.random() * sampleSubjects.length)];
      const timeSlot = timeSlots[slotIndex];

      entries.push({
        userId,
        subject: subject.name,
        subjectCode: subject.code,
        instructor: subject.instructor,
        dayOfWeek: day,
        startTime: timeSlot.start,
        endTime: timeSlot.end,
        location: locations[Math.floor(Math.random() * locations.length)],
        classType: classTypes[Math.floor(Math.random() * classTypes.length)],
        notificationEnabled: Math.random() > 0.2, // 80% chance of notifications enabled
        reminderMinutes: [5, 10, 15, 30][Math.floor(Math.random() * 4)],
        semester: 'Fall 2024',
        academicYear: '2024-2025'
      });
    }
  }

  return entries;
};

const generateAttendanceRecords = (userId, timetableEntries) => {
  const records = [];
  const statuses = ['present', 'absent', 'late', 'excused'];
  const weights = [0.7, 0.15, 0.1, 0.05]; // Probability weights for each status

  // Generate records for the last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);

  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay();
    
    // Find classes for this day
    const dayClasses = timetableEntries.filter(entry => entry.dayOfWeek === dayOfWeek);
    
    dayClasses.forEach(classEntry => {
      // 90% chance of having an attendance record
      if (Math.random() > 0.1) {
        // Weighted random status selection
        const random = Math.random();
        let cumulativeWeight = 0;
        let status = statuses[0];

        for (let i = 0; i < statuses.length; i++) {
          cumulativeWeight += weights[i];
          if (random <= cumulativeWeight) {
            status = statuses[i];
            break;
          }
        }

        const notes = status === 'absent' 
          ? ['Sick', 'Personal emergency', 'Family matter'][Math.floor(Math.random() * 3)]
          : status === 'late'
          ? ['Traffic', 'Overslept', 'Previous class ran over'][Math.floor(Math.random() * 3)]
          : '';

        records.push({
          userId,
          subject: classEntry.subject,
          subjectCode: classEntry.subjectCode,
          instructor: classEntry.instructor,
          date: new Date(date),
          startTime: classEntry.startTime,
          endTime: classEntry.endTime,
          status,
          notes,
          location: classEntry.location,
          classType: classEntry.classType,
          markedBy: 'user'
        });
      }
    });
  }

  return records;
};

const generateScheduledNotifications = (userId, timetableEntries) => {
  const notifications = [];
  
  timetableEntries.forEach(entry => {
    if (entry.notificationEnabled) {
      // Calculate next class occurrence
      const now = new Date();
      const currentDay = now.getDay();
      let daysUntilNext = entry.dayOfWeek - currentDay;
      
      if (daysUntilNext <= 0) {
        daysUntilNext += 7; // Next week
      }
      
      const nextClassDate = new Date(now);
      nextClassDate.setDate(now.getDate() + daysUntilNext);
      
      // Set the class time
      const [hours, minutes] = entry.startTime.split(':').map(Number);
      nextClassDate.setHours(hours, minutes, 0, 0);
      
      // Calculate reminder time
      const reminderTime = new Date(nextClassDate);
      reminderTime.setMinutes(reminderTime.getMinutes() - entry.reminderMinutes);
      
      // Only schedule if reminder time is in the future
      if (reminderTime > now) {
        notifications.push({
          userId,
          type: 'attendance_reminder',
          scheduledTime: reminderTime,
          title: `Class Reminder: ${entry.subject}`,
          body: `Your ${entry.subject} class starts in ${entry.reminderMinutes} minutes at ${entry.location}`,
          data: {
            subject: entry.subject,
            subjectCode: entry.subjectCode,
            classTime: entry.startTime,
            location: entry.location,
            type: 'attendance_reminder'
          },
          recurring: {
            type: 'weekly',
            interval: 1
          }
        });
      }
    }
  });

  return notifications;
};

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_app');
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      TimetableEntry.deleteMany({}),
      AttendanceRecord.deleteMany({}),
      ScheduledNotification.deleteMany({})
    ]);

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = await User.insertMany(sampleUsers);
    console.log(`✅ Created ${createdUsers.length} users`);

    // Generate and create data for each user
    for (const user of createdUsers) {
      console.log(`📅 Generating timetable for ${user.name}...`);
      const timetableEntries = generateTimetableEntries(user._id);
      const createdEntries = await TimetableEntry.insertMany(timetableEntries);
      console.log(`✅ Created ${createdEntries.length} timetable entries for ${user.name}`);

      console.log(`📊 Generating attendance records for ${user.name}...`);
      const attendanceRecords = generateAttendanceRecords(user._id, timetableEntries);
      const createdRecords = await AttendanceRecord.insertMany(attendanceRecords);
      console.log(`✅ Created ${createdRecords.length} attendance records for ${user.name}`);

      console.log(`🔔 Generating scheduled notifications for ${user.name}...`);
      const scheduledNotifications = generateScheduledNotifications(user._id, timetableEntries);
      if (scheduledNotifications.length > 0) {
        const createdNotifications = await ScheduledNotification.insertMany(scheduledNotifications);
        console.log(`✅ Created ${createdNotifications.length} scheduled notifications for ${user.name}`);
      } else {
        console.log(`ℹ️ No future notifications to schedule for ${user.name}`);
      }
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`👥 Users: ${await User.countDocuments()}`);
    console.log(`📅 Timetable Entries: ${await TimetableEntry.countDocuments()}`);
    console.log(`📊 Attendance Records: ${await AttendanceRecord.countDocuments()}`);
    console.log(`🔔 Scheduled Notifications: ${await ScheduledNotification.countDocuments()}`);

    console.log('\n🔐 Test Users:');
    for (const user of sampleUsers) {
      console.log(`Email: ${user.email} | Name: ${user.name}`);
    }

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };