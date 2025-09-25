import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export class ExportService {
  static async exportToCSV() {
    try {
      // Get all attendance data
      const attendance = await AsyncStorage.getItem('attendance');
      const subjects = await AsyncStorage.getItem('subjects');
      
      if (!attendance || !subjects) {
        Alert.alert('No Data', 'No attendance data found to export');
        return;
      }

      const attendanceData = JSON.parse(attendance);
      const subjectsData = JSON.parse(subjects);

      // Create subject name mapping
      const subjectMap = {};
      subjectsData.forEach(subject => {
        subjectMap[subject.id] = subject.name;
      });

      // Create CSV content
      let csvContent = 'Date,Subject,Status,Notes\n';
      
      Object.keys(attendanceData).forEach(date => {
        const dayAttendance = attendanceData[date];
        Object.keys(dayAttendance).forEach(subjectId => {
          const record = dayAttendance[subjectId];
          const subjectName = subjectMap[subjectId] || 'Unknown Subject';
          const status = record.status || 'Not Marked';
          const notes = (record.notes || '').replace(/,/g, ';'); // Replace commas with semicolons
          
          csvContent += `${date},"${subjectName}","${status}","${notes}"\n`;
        });
      });

      // Save to file
      const filename = `attendance_export_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Attendance Data',
        });
      } else {
        Alert.alert(
          'Export Complete',
          `Attendance data exported to: ${filename}\nFile saved in app documents.`
        );
      }

      return fileUri;
    } catch (error) {
      console.error('Export to CSV error:', error);
      Alert.alert('Export Error', 'Failed to export attendance data to CSV');
    }
  }

  static async exportToPDF() {
    try {
      // Get all attendance data
      const attendance = await AsyncStorage.getItem('attendance');
      const subjects = await AsyncStorage.getItem('subjects');
      
      if (!attendance || !subjects) {
        Alert.alert('No Data', 'No attendance data found to export');
        return;
      }

      const attendanceData = JSON.parse(attendance);
      const subjectsData = JSON.parse(subjects);

      // Create subject name mapping
      const subjectMap = {};
      subjectsData.forEach(subject => {
        subjectMap[subject.id] = subject.name;
      });

      // Calculate attendance statistics
      const stats = this.calculateAttendanceStats(attendanceData, subjectsData);

      // Create HTML content for PDF
      const htmlContent = this.createAttendanceReport(attendanceData, subjectMap, stats);

      // For now, we'll create an HTML file that can be converted to PDF
      // In a full implementation, you'd use a library like react-native-html-to-pdf
      const filename = `attendance_report_${new Date().toISOString().split('T')[0]}.html`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share the HTML file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/html',
          dialogTitle: 'Attendance Report (HTML)',
        });
      } else {
        Alert.alert(
          'Report Generated',
          `Attendance report saved as: ${filename}\nOpen with a browser to view/print.`
        );
      }

      return fileUri;
    } catch (error) {
      console.error('Export to PDF error:', error);
      Alert.alert('Export Error', 'Failed to generate attendance report');
    }
  }

  static calculateAttendanceStats(attendanceData, subjectsData) {
    const stats = {};
    
    // Initialize stats for each subject
    subjectsData.forEach(subject => {
      stats[subject.id] = {
        name: subject.name,
        totalClasses: 0,
        presentClasses: 0,
        absentClasses: 0,
        percentage: 0,
      };
    });

    // Calculate statistics
    Object.keys(attendanceData).forEach(date => {
      const dayAttendance = attendanceData[date];
      Object.keys(dayAttendance).forEach(subjectId => {
        if (stats[subjectId]) {
          stats[subjectId].totalClasses++;
          const status = dayAttendance[subjectId].status;
          if (status === 'present') {
            stats[subjectId].presentClasses++;
          } else if (status === 'absent') {
            stats[subjectId].absentClasses++;
          }
        }
      });
    });

    // Calculate percentages
    Object.keys(stats).forEach(subjectId => {
      const subject = stats[subjectId];
      if (subject.totalClasses > 0) {
        subject.percentage = Math.round((subject.presentClasses / subject.totalClasses) * 100);
      }
    });

    return stats;
  }

  static createAttendanceReport(attendanceData, subjectMap, stats) {
    const currentDate = new Date().toLocaleDateString();
    
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Attendance Report</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px;
            color: #333;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px;
            border-bottom: 2px solid #007AFF;
            padding-bottom: 20px;
        }
        .title { 
            font-size: 24px; 
            font-weight: bold;
            color: #007AFF;
            margin-bottom: 10px;
        }
        .subtitle { 
            font-size: 14px; 
            color: #666;
        }
        .stats-section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #007AFF;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat-card {
            border: 1px solid #E5E5EA;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        .stat-subject {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 8px;
        }
        .stat-percentage {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .stat-percentage.good { color: #34C759; }
        .stat-percentage.warning { color: #FF9500; }
        .stat-percentage.poor { color: #FF3B30; }
        .stat-details {
            font-size: 12px;
            color: #666;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
        }
        th, td { 
            border: 1px solid #E5E5EA; 
            padding: 8px; 
            text-align: left;
        }
        th { 
            background-color: #F8F8F8; 
            font-weight: bold;
        }
        .present { background-color: #E8F5E8; color: #34C759; }
        .absent { background-color: #FFF0F0; color: #FF3B30; }
        .late { background-color: #FFF8E0; color: #FF9500; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">Attendance Report</div>
        <div class="subtitle">Generated on ${currentDate}</div>
    </div>
    
    <div class="stats-section">
        <div class="section-title">Attendance Summary</div>
        <div class="stats-grid">`;

    // Add statistics cards
    Object.values(stats).forEach(subject => {
      let percentageClass = 'poor';
      if (subject.percentage >= 75) percentageClass = 'good';
      else if (subject.percentage >= 65) percentageClass = 'warning';

      htmlContent += `
            <div class="stat-card">
                <div class="stat-subject">${subject.name}</div>
                <div class="stat-percentage ${percentageClass}">${subject.percentage}%</div>
                <div class="stat-details">
                    Present: ${subject.presentClasses}/${subject.totalClasses}<br>
                    Absent: ${subject.absentClasses}
                </div>
            </div>`;
    });

    htmlContent += `
        </div>
    </div>

    <div class="section-title">Detailed Attendance Record</div>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Notes</th>
            </tr>
        </thead>
        <tbody>`;

    // Add detailed records
    const sortedDates = Object.keys(attendanceData).sort();
    sortedDates.forEach(date => {
      const dayAttendance = attendanceData[date];
      Object.keys(dayAttendance).forEach(subjectId => {
        const record = dayAttendance[subjectId];
        const subjectName = subjectMap[subjectId] || 'Unknown Subject';
        const status = record.status || 'Not Marked';
        const notes = record.notes || '';
        
        const statusClass = status.toLowerCase();
        
        htmlContent += `
            <tr>
                <td>${new Date(date).toLocaleDateString()}</td>
                <td>${subjectName}</td>
                <td class="${statusClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</td>
                <td>${notes}</td>
            </tr>`;
      });
    });

    htmlContent += `
        </tbody>
    </table>
</body>
</html>`;

    return htmlContent;
  }

  static async getAttendanceSummary() {
    try {
      const attendance = await AsyncStorage.getItem('attendance');
      const subjects = await AsyncStorage.getItem('subjects');
      
      if (!attendance || !subjects) {
        return null;
      }

      const attendanceData = JSON.parse(attendance);
      const subjectsData = JSON.parse(subjects);

      return this.calculateAttendanceStats(attendanceData, subjectsData);
    } catch (error) {
      console.error('Error getting attendance summary:', error);
      return null;
    }
  }
}