import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth, useUser, useClerk } from '@clerk/clerk-expo';
import { SignOutButton } from '../components/auth/SignOutButton';

const TestAuthScreen = ({ navigation }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();

  useEffect(() => {
    console.log('TestAuthScreen - isLoaded:', isLoaded);
    console.log('TestAuthScreen - isSignedIn:', isSignedIn);
    console.log('TestAuthScreen - user:', user);
    console.log('TestAuthScreen - clerk loaded:', !!clerk);
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading Clerk...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AttendEase - Authentication Status</Text>
      <View style={styles.infoContainer}>
        <Text style={styles.text}>
          Clerk Loaded: {isLoaded ? '✅ Yes' : '❌ No'}
        </Text>
        <Text style={styles.text}>
          Signed In: {isSignedIn ? '✅ Yes' : '❌ No'}
        </Text>
        <Text style={styles.text}>
          User Object: {user ? '✅ Present' : '❌ Missing'}
        </Text>
      </View>

      {user && (
        <View style={styles.userInfo}>
          <Text style={styles.subtitle}>User Information:</Text>
          <Text style={styles.text}>
            ID: {user.id}
          </Text>
          <Text style={styles.text}>
            Name: {user.fullName || user.firstName || 'No name'}
          </Text>
          <Text style={styles.text}>
            Username: {user.username ? `@${user.username}` : 'Not set'}
          </Text>
          <Text style={styles.text}>
            Email: {user.primaryEmailAddress?.emailAddress || 'No email'}
          </Text>
          <Text style={styles.text}>
            Email Verified: {user.primaryEmailAddress?.verification?.status || 'Unknown'}
          </Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        {isSignedIn && <SignOutButton navigation={navigation} />}
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.navButtonText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#1f2937',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#374151',
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userInfo: {
    backgroundColor: '#f0f9ff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  text: {
    fontSize: 16,
    marginBottom: 8,
    color: '#4b5563',
  },
  buttonContainer: {
    gap: 15,
  },
  navButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TestAuthScreen;