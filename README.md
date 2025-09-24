# 📱 AttendanceApp - Smart Class Attendance Tracker

A comprehensive React Native attendance management application built with Expo SDK 54, featuring real-time notifications, timetable management, and cross-platform compatibility.

## 🌟 Features

### Core Functionality
- **📊 Dashboard Overview** - Visual attendance statistics and quick insights
- **✅ Smart Attendance Marking** - Easy check-in/check-out with validation
- **📅 Timetable Management** - Create and manage class schedules
- **📚 Subject Management** - Add, edit, and organize subjects
- **📈 Attendance Analytics** - Track attendance percentages and trends
- **📱 Real-time Notifications** - Class reminders and attendance alerts
- **👤 User Profiles** - Personal settings and account management
- **📜 History Tracking** - Complete attendance history with filtering

### Technical Features
- **🌐 Cross-Platform Support** - Web browsers, Expo Go, and native builds
- **🔔 Smart Notifications** - Environment-aware push notification system
- **💾 Local Storage** - Offline-first data persistence
- **🔒 Secure Authentication** - JWT-based user authentication
- **🎨 Modern UI/UX** - Clean, intuitive interface design
- **⚡ Performance Optimized** - Fast loading and smooth interactions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g @expo/cli`)
- For mobile testing: Expo Go app on your phone

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/shirshak001/AttendanceAPP.git
   cd AttendanceApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npx expo start
   ```

4. **Choose your platform**
   - Press `w` for web browser
   - Scan QR code with Expo Go for mobile
   - Press `a` for Android emulator
   - Press `i` for iOS simulator

## 📱 Platform Support

### ✅ Supported Platforms
- **Web Browsers** - Chrome, Firefox, Safari, Edge
- **Expo Go** - iOS and Android development builds
- **Development Builds** - Custom native builds with EAS Build
- **Production Builds** - APK/AAB and IPA files

### 🔧 Build Commands

**Web Export**
```bash
npx expo export --platform web
```

**Android Development Build**
```bash
npx expo run:android
```

**Production Build (EAS)**
```bash
eas build --platform android --profile production
```

## 🏗️ Project Structure

```
AttendanceApp/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/            # Application screens
│   ├── services/           # Business logic and APIs
│   ├── navigation/         # Navigation configuration
│   ├── context/           # React Context providers
│   └── utils/             # Utility functions
├── backend/               # Node.js backend server
│   ├── src/
│   │   ├── models/        # MongoDB data models
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Backend services
│   │   └── middleware/    # Express middleware
│   └── server.js          # Main server file
├── assets/               # Static assets (images, icons)
└── docs/                # Documentation files
```

## 🔧 Backend Setup

The app includes a complete Node.js backend with MongoDB integration.

### Backend Features
- **🗄️ MongoDB Integration** - User data and attendance records
- **🔐 JWT Authentication** - Secure user sessions
- **📬 Push Notifications** - Expo push notification service
- **📊 Analytics API** - Attendance statistics and reports
- **⚡ Rate Limiting** - API protection and performance
- **📝 Comprehensive Logging** - Request and error tracking

### Setup Backend Server

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI and other settings
   ```

4. **Start the backend server**
   ```bash
   npm start
   ```

## 📋 Key Screens

### 🏠 Dashboard
- Overview of today's classes
- Attendance percentage summary
- Quick action buttons
- Recent activity feed

### ✅ Attendance Marking
- Current class information
- One-tap check-in/check-out
- Manual time adjustment
- Attendance validation

### 📅 Timetable Management
- Weekly schedule view
- Add/edit class timings
- Subject assignment
- Recurring class setup

### 📚 Subject Management
- Subject creation and editing
- Color coding and icons
- Attendance requirements
- Progress tracking

### 📊 Analytics & History
- Detailed attendance reports
- Graphical representations
- Filterable history
- Export capabilities

## 🔔 Notification System

### Smart Notification Features
- **🎯 Context-Aware** - Different services for web and mobile
- **⏰ Scheduled Reminders** - Class start notifications
- **📱 Real-time Alerts** - Attendance deadline warnings
- **🔕 Configurable** - User-controlled notification preferences

### Notification Services
- **SafeNotificationService** - Environment detection and fallback
- **ExpoGoNotificationService** - Optimized for Expo Go
- **WebFallbackService** - Browser-compatible notifications

## ⚙️ Configuration

### App Configuration (`app.json`)
```json
{
  "expo": {
    "name": "AttendanceApp",
    "slug": "attendanceapp",
    "version": "1.0.0",
    "orientation": "portrait",
    "platforms": ["ios", "android", "web"]
  }
}
```

### Build Configuration (`eas.json`)
- Development builds for testing
- Preview builds for stakeholder review
- Production builds for app stores

## 🛠️ Development

### Code Quality
- **ESLint** - Code linting and formatting
- **Error Boundaries** - Graceful error handling
- **Type Safety** - PropTypes validation
- **Performance** - Optimized re-renders and memory usage

### Testing
```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Debugging
- **Flipper Integration** - Network and state debugging
- **React DevTools** - Component inspection
- **Console Logging** - Structured error reporting
- **Performance Monitor** - FPS and memory tracking

## 📦 Dependencies

### Core Dependencies
- **React Native** 0.76.5 (Expo SDK 54)
- **React** 19.1.0 - Latest React version
- **Expo** ~54.0.0 - Development platform
- **React Navigation** - Navigation system
- **Expo Notifications** - Push notification service

### Backend Dependencies
- **Express** - Web framework
- **MongoDB/Mongoose** - Database and ODM
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing
- **Winston** - Logging service

## 🚀 Deployment

### Production Builds

**Android APK**
```bash
eas build --platform android --profile production
```

**iOS IPA**
```bash
eas build --platform ios --profile production
```

**Web Deployment**
```bash
npx expo export --platform web
# Deploy dist/ folder to your web hosting service
```

### Backend Deployment
- **Heroku** - Easy Node.js deployment
- **Railway** - Modern hosting platform
- **DigitalOcean** - VPS deployment
- **AWS/Azure** - Enterprise cloud hosting

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure cross-platform compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Expo Team** - For the amazing development platform
- **React Native Community** - For continuous improvements
- **MongoDB** - For robust database solutions
- **Open Source Contributors** - For making this possible

## 📞 Support

### Get Help
- **📧 Email**: shirshak001@example.com
- **🐛 Issues**: [GitHub Issues](https://github.com/shirshak001/AttendanceAPP/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/shirshak001/AttendanceAPP/discussions)

### Documentation
- **📖 Setup Guide**: [PRODUCTION_BUILD_GUIDE.md](PRODUCTION_BUILD_GUIDE.md)
- **🔧 Backend Guide**: [backend/README.md](backend/README.md)
- **📱 Build Guide**: [build-apk.md](build-apk.md)

---

**Built with ❤️ using React Native and Expo**

*AttendanceApp - Making attendance tracking simple, smart, and reliable.*