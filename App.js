import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ClerkProvider } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import Navigation from './src/navigation/Navigation';
import NotificationService from './src/services/NotificationService';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Token cache for Clerk
const tokenCache = {
  async getToken(key) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

// Get the Clerk publishable key from environment
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_c291Z2h0LWh1c2t5LTYyLmNsZXJrLmFjY291bnRzLmRldiQ';

console.log('Clerk publishable key loaded:', publishableKey ? 'Yes' : 'No');
console.log('Using key:', publishableKey?.substring(0, 20) + '...');

if (!publishableKey) {
  throw new Error('Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env');
}

const App = () => {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing notification service...');
        await NotificationService.initialize();
        console.log('Notification service initialized successfully');
      } catch (error) {
        console.error('Error initializing notification service:', error);
      }
    };
    
    initializeApp();
  }, []);

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <SafeAreaProvider>
        <Navigation />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </ClerkProvider>
  );
};

export default App;
