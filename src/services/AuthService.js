import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Random from 'expo-random';
import { resetStorage, getAllStorageKeys, getAllStorageData } from '../utils/StorageUtils';

// Initialize WebBrowser for login redirects
WebBrowser.maybeCompleteAuthSession();

// Storage keys
const STORAGE_KEYS = {
  USER_TOKEN: 'userToken',
  USER_DATA: 'userData',
  SUBJECTS: 'subjects',
  TIMETABLE: 'timetable',
  ATTENDANCE: 'attendance',
  ONBOARDING_COMPLETED: 'onboardingCompleted',
  FIRST_TIME_USER: 'firstTimeUser',
};

class AuthService {
  // Check if user is logged in
  static async isLoggedIn() {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);
      console.log('Checking login status, token exists:', token !== null);
      return token !== null;
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  }

  // Login user
  static async login(email, password) {
    try {
      console.log('Login attempt with:', { email });
      
      // Enhanced validation
      if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, error: 'Please enter a valid email address' };
      }

      // Password length validation
      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long' };
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would make an API call
      // For demo purposes, we accept any valid email/password combination
      const userData = {
        id: Date.now().toString(),
        email: email.toLowerCase(),
        name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
        createdAt: new Date().toISOString(),
        loginMethod: 'email',
        isFirstTime: false,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(email.split('@')[0])}&background=4f46e5&color=fff`,
      };

      const token = `token_${userData.id}_${Date.now()}`;
      
      // Store user data in AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      
      console.log('Login successful:', userData);
      return { success: true, user: userData, token };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  // Google login
  static async loginWithGoogle() {
    try {
      console.log('Initiating Google login...');
      
      // Simulate Google authentication process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo/development purposes we'll use a simulated Google login
      // In a production app, you would implement real Google authentication
      // with expo-auth-session using a proper Google API key
      
      // Generate realistic demo user data
      const demoUsers = [
        { email: 'john.doe@gmail.com', name: 'John Doe' },
        { email: 'jane.smith@gmail.com', name: 'Jane Smith' },
        { email: 'student@gmail.com', name: 'Student User' },
        { email: 'demo@gmail.com', name: 'Demo User' },
      ];
      
      const randomUser = demoUsers[Math.floor(Math.random() * demoUsers.length)];
      
      const userData = {
        id: `google_${Date.now()}`,
        email: randomUser.email,
        name: randomUser.name,
        createdAt: new Date().toISOString(),
        loginMethod: 'google',
        isFirstTime: true,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(randomUser.name)}&background=db4437&color=fff`,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(randomUser.name)}&background=db4437&color=fff`,
      };

      const token = `google_token_${userData.id}_${Date.now()}`;
      
      // Store user data in AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      
      // Create default collections for first-time users
      if (userData.isFirstTime) {
        await this.createDefaultCollections();
        await AsyncStorage.setItem(STORAGE_KEYS.FIRST_TIME_USER, 'true');
      }
      
      console.log('Google login successful:', userData);
      return { success: true, user: userData, token };
    } catch (error) {
      console.error('Google login error:', error);
      return { success: false, error: 'Google login failed. Please try again.' };
    }
  }

  // Register user
  static async register(email, password, name) {
    try {
      console.log('Registration attempt for:', { email, name });
      
      // Enhanced validation
      if (!email || !password || !name) {
        return { success: false, error: 'All fields are required' };
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, error: 'Please enter a valid email address' };
      }

      // Password strength validation
      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long' };
      }

      // Name validation
      if (name.trim().length < 2) {
        return { success: false, error: 'Name must be at least 2 characters long' };
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Check if email already exists (simulate existing users)
      const existingEmails = ['admin@test.com', 'existing@gmail.com'];
      if (existingEmails.includes(email.toLowerCase())) {
        return { success: false, error: 'An account with this email already exists' };
      }
      
      const userData = {
        id: Date.now().toString(),
        email: email.toLowerCase(),
        name: name.trim(),
        createdAt: new Date().toISOString(),
        loginMethod: 'email',
        isFirstTime: true,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=16a34a&color=fff`,
      };

      const token = `token_${userData.id}_${Date.now()}`;
      
      await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      
      // Create default collections for new users
      await this.createDefaultCollections();
      await AsyncStorage.setItem(STORAGE_KEYS.FIRST_TIME_USER, 'true');
      
      console.log('Registration successful:', userData);
      return { success: true, user: userData, token };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  }

  // Forgot password
  static async forgotPassword(email) {
    try {
      // In a real app, this would send a password reset email
      if (email && email.includes('@')) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { success: true, message: 'Password reset email sent successfully!' };
      } else {
        return { success: false, error: 'Please enter a valid email address' };
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      return { success: false, error: 'Failed to send reset email. Please try again.' };
    }
  }

  // Logout user
  static async logout() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: 'Logout failed' };
    }
  }

  // Get current user data
  static async getCurrentUser() {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Get user token
  static async getUserToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);
    } catch (error) {
      console.error('Error getting user token:', error);
      return null;
    }
  }

  // Check if user is first time
  static async isFirstTimeUser() {
    try {
      const firstTime = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_TIME_USER);
      return firstTime === 'true';
    } catch (error) {
      console.error('Error checking first time user:', error);
      return false;
    }
  }

  // Check if onboarding is completed
  static async isOnboardingCompleted() {
    try {
      const completed = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      return completed === 'true';
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  // Complete onboarding
  static async completeOnboarding() {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.FIRST_TIME_USER, 'false');
      return { success: true };
    } catch (error) {
      console.error('Error completing onboarding:', error);
      return { success: false };
    }
  }

  // Create default collections for new users
  static async createDefaultCollections() {
    try {
      // Default subjects
      const defaultSubjects = [];
      
      // Default timetable
      const defaultTimetable = {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: [],
      };
      
      // Default attendance
      const defaultAttendance = {};
      
      await AsyncStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(defaultSubjects));
      await AsyncStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(defaultTimetable));
      await AsyncStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(defaultAttendance));
      
      return { success: true };
    } catch (error) {
      console.error('Error creating default collections:', error);
      return { success: false };
    }
  }

  // Debug method to check all storage keys
  static async debugGetAllKeys() {
    return getAllStorageKeys();
  }

  // Debug method to check all storage data
  static async debugGetAllData() {
    return getAllStorageData();
  }

  // Debug method to reset storage
  static async debugResetStorage() {
    return resetStorage();
  }
}

export default AuthService;
export { STORAGE_KEYS };