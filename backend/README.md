# Attendance App Backend

A comprehensive backend server for the Attendance App with offline push notification capabilities.

## Features

- 🔐 **User Authentication**: JWT-based authentication system
- 📅 **Timetable Management**: Create and manage class schedules
- 📊 **Attendance Tracking**: Record and analyze attendance data
- 🔔 **Push Notifications**: Offline notification system using Expo Server SDK
- 📈 **Analytics**: Detailed attendance statistics and trends
- 🛡️ **Security**: Rate limiting, CORS, security headers
- 🗄️ **Database**: MongoDB with Mongoose ODM
- 📋 **Logging**: Comprehensive logging system with Winston

## Quick Start

### Prerequisites

- Node.js (>= 16.0.0)
- MongoDB
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/attendance-app-backend.git
   cd attendance-app-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/attendance_app
   
   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=30d
   
   # Logging
   LOG_LEVEL=info
   
   # Optional: Expo Push Notifications
   EXPO_ACCESS_TOKEN=your_expo_access_token
   ```

4. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start at `http://localhost:3000`

## API Documentation

### Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Endpoints Overview

#### Users
- `POST /api/users/register` - Register/login user
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/push-token` - Update push notification token
- `GET /api/users/stats` - Get user statistics

#### Timetable
- `GET /api/timetable` - Get all timetable entries
- `POST /api/timetable` - Create new timetable entry
- `GET /api/timetable/day/:dayOfWeek` - Get timetable for specific day
- `GET /api/timetable/week` - Get current week timetable
- `GET /api/timetable/upcoming` - Get upcoming classes
- `PUT /api/timetable/:id` - Update timetable entry
- `DELETE /api/timetable/:id` - Delete timetable entry

#### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Create attendance record
- `PUT /api/attendance/:id` - Update attendance record
- `DELETE /api/attendance/:id` - Delete attendance record
- `GET /api/attendance/stats` - Get attendance statistics
- `GET /api/attendance/trends` - Get attendance trends

#### Notifications
- `POST /api/notifications/test` - Send test notification
- `POST /api/notifications/schedule-reminder` - Schedule attendance reminder
- `GET /api/notifications/scheduled` - Get scheduled notifications
- `GET /api/notifications/logs` - Get notification delivery logs
- `GET /api/notifications/stats` - Get notification statistics

### Example API Usage

#### Register a User
```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "pushToken": "ExponentPushToken[xxxxxx]"
  }'
```

#### Create Timetable Entry
```bash
curl -X POST http://localhost:3000/api/timetable \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{
    "subject": "Mathematics",
    "subjectCode": "MATH101",
    "instructor": "Dr. Smith",
    "dayOfWeek": 1,
    "startTime": "09:00",
    "endTime": "10:30",
    "location": "Room 101"
  }'
```

#### Mark Attendance
```bash
curl -X POST http://localhost:3000/api/attendance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{
    "subject": "Mathematics",
    "subjectCode": "MATH101",
    "date": "2024-01-15",
    "status": "present",
    "notes": "Completed all exercises"
  }'
```

## Database Schema

### User Model
```javascript
{
  name: String,
  email: String, // unique
  pushToken: String,
  preferences: {
    notificationsEnabled: Boolean,
    defaultReminderMinutes: Number,
    notificationTypes: [String]
  },
  settings: Object,
  deviceInfo: Object
}
```

### TimetableEntry Model
```javascript
{
  userId: ObjectId,
  subject: String,
  subjectCode: String,
  instructor: String,
  dayOfWeek: Number, // 0-6 (Sunday-Saturday)
  startTime: String, // "HH:MM"
  endTime: String,
  location: String,
  classType: String, // lecture, lab, tutorial, etc.
  notificationEnabled: Boolean,
  reminderMinutes: Number
}
```

### AttendanceRecord Model
```javascript
{
  userId: ObjectId,
  subject: String,
  date: Date,
  status: String, // present, absent, late, excused
  notes: String,
  location: String,
  classType: String
}
```

## Push Notifications

The backend includes a comprehensive push notification system:

### Features
- **Scheduled Notifications**: Automatic reminders for upcoming classes
- **Recurring Notifications**: Weekly class reminders
- **Notification Logs**: Track delivery status and analytics
- **Rate Limiting**: Prevent notification spam
- **Batch Processing**: Efficient bulk notification sending

### Setting Up Push Notifications

1. **Get Expo Access Token** (optional for enhanced features)
   - Visit [Expo Access Tokens](https://expo.dev/accounts/[account]/settings/access-tokens)
   - Create a new token
   - Add to your `.env` file

2. **Configure Client App**
   ```javascript
   import * as Notifications from 'expo-notifications';
   
   // Get push token
   const token = await Notifications.getExpoPushTokenAsync();
   
   // Register with backend
   await fetch('/api/users/push-token', {
     method: 'PUT',
     headers: {
       'Authorization': `Bearer ${authToken}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({ pushToken: token.data })
   });
   ```

## Development

### Project Structure
```
backend/
├── src/
│   ├── models/          # Database models
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic services
│   ├── middleware/      # Custom middleware
│   └── utils/           # Utility functions
├── logs/                # Application logs
├── scripts/             # Database scripts
├── tests/               # Test files
├── server.js            # Main server file
├── package.json
└── .env.example
```

### Available Scripts

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Seed database with sample data
npm run seed
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/attendance_app` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | JWT expiration time | `30d` |
| `LOG_LEVEL` | Logging level | `info` |
| `EXPO_ACCESS_TOKEN` | Expo push notifications token | Optional |

## Deployment

### Using PM2 (Recommended)

1. **Install PM2**
   ```bash
   npm install -g pm2
   ```

2. **Create ecosystem file**
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'attendance-app-backend',
       script: 'server.js',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       }
     }]
   };
   ```

3. **Deploy**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Using Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Monitoring and Logging

- **Winston Logger**: Comprehensive logging with file rotation
- **Request Logging**: All API requests are logged
- **Error Tracking**: Detailed error logs with stack traces
- **Performance Metrics**: Response time monitoring
- **Health Checks**: Built-in health check endpoint at `/health`

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Configurable CORS policies
- **Security Headers**: Helmet.js security headers
- **Input Validation**: Joi schema validation
- **SQL Injection Protection**: MongoDB parameterized queries

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@attendanceapp.com or create an issue on GitHub.