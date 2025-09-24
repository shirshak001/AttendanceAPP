const mongoose = require('mongoose');

class DatabaseService {
  static connection = null;

  static async connect() {
    try {
      const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-app';
      
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      this.connection = await mongoose.connect(mongoURI, options);
      
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
      });

      return this.connection;
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  static async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        this.connection = null;
        console.log('Database disconnected successfully');
      }
    } catch (error) {
      console.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  static isConnected() {
    return mongoose.connection.readyState === 1;
  }

  static getConnection() {
    return this.connection;
  }
}

module.exports = DatabaseService;