import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '../services/AuthService';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Check authentication status after animation
    const checkAuthStatus = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Show splash for 2 seconds
        
        console.log('Checking authentication status...');
        const isLoggedIn = await AuthService.isLoggedIn();
        console.log('User logged in:', isLoggedIn);
        
        if (isLoggedIn) {
          // Check if user needs onboarding
          const isFirstTime = await AuthService.isFirstTimeUser();
          const onboardingCompleted = await AuthService.isOnboardingCompleted();
          console.log('First time user:', isFirstTime, 'Onboarding completed:', onboardingCompleted);
          
          if (isFirstTime && !onboardingCompleted) {
            console.log('Navigating to Onboarding for first-time user');
            navigation.replace('Onboarding');
          } else {
            console.log('Navigating to Dashboard for returning user');
            navigation.replace('Dashboard');
          }
        } else {
          console.log('No user logged in, navigating to Auth');
          navigation.replace('Auth');
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        navigation.replace('Auth');
      }
    };

    checkAuthStatus();
  }, [fadeAnim, scaleAnim, slideAnim, navigation]);

  return (
    <View style={styles.container}>
      {/* Background gradient effect */}
      <View style={styles.backgroundGradient} />
      
      {/* App Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoCircle}>
          <Ionicons name="school" size={60} color="#007AFF" />
        </View>
      </Animated.View>

      {/* App Title */}
      <Animated.View
        style={[
          styles.titleContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.appTitle}>AttendanceApp</Text>
        <Text style={styles.appSubtitle}>Track Your Academic Journey</Text>
      </Animated.View>

      {/* Loading Indicator */}
      <Animated.View
        style={[
          styles.loadingContainer,
          { opacity: fadeAnim },
        ]}
      >
        <View style={styles.loadingDots}>
          <Animated.View style={[styles.dot, styles.dot1]} />
          <Animated.View style={[styles.dot, styles.dot2]} />
          <Animated.View style={[styles.dot, styles.dot3]} />
        </View>
        <Text style={styles.loadingText}>Loading...</Text>
      </Animated.View>

      {/* Footer */}
      <Animated.View
        style={[
          styles.footer,
          { opacity: fadeAnim },
        ]}
      >
        <Text style={styles.footerText}>Your Academic Success Partner</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a2e',
    opacity: 0.9,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoText: {
    fontSize: 48,
    color: '#ffffff',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    fontWeight: '300',
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  loadingDots: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4f46e5',
    marginHorizontal: 4,
  },
  dot1: {
    backgroundColor: '#4f46e5',
  },
  dot2: {
    backgroundColor: '#7c3aed',
  },
  dot3: {
    backgroundColor: '#a855f7',
  },
  loadingText: {
    fontSize: 14,
    color: '#a1a1aa',
    fontWeight: '300',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default SplashScreen;