import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const AuthScreen = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { login, register, forgotPassword, loginWithGoogle, resetAuth } = useAuth();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    const { email, password, name, confirmPassword } = formData;
    
    if (!email || !password) {
      Alert.alert('Error', 'Email and password are required');
      return false;
    }

    // Enhanced email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }

    if (!isLogin) {
      if (!name || name.trim().length < 2) {
        Alert.alert('Error', 'Please enter a valid name (at least 2 characters)');
        return false;
      }
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return false;
      }
      // Additional password strength check for registration
      if (!/(?=.*[a-zA-Z])/.test(password)) {
        Alert.alert('Error', 'Password must contain at least one letter');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (showForgotPassword) {
      handleForgotPassword();
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      console.log('Submitting form for:', isLogin ? 'login' : 'registration');
      
      let result;
      if (isLogin) {
        result = await login(formData.email, formData.password);
      } else {
        result = await register(formData.email, formData.password, formData.name);
      }

      console.log('Auth result:', result);

      if (result.success) {
        console.log('Authentication successful, navigating to Dashboard');
        // Check if it's first time user for onboarding
        if (result.user?.isFirstTime) {
          navigation.replace('Onboarding');
        } else {
          navigation.replace('Dashboard');
        }
      } else {
        console.error('Authentication error:', result.error);
        Alert.alert('Error', result.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Authentication exception:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const result = await forgotPassword(formData.email);
      if (result.success) {
        Alert.alert('Success', result.message, [
          { text: 'OK', onPress: () => setShowForgotPassword(false) }
        ]);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      console.log('Attempting Google login...');
      const result = await loginWithGoogle();
      console.log('Google login result:', result);
      
      if (result.success) {
        console.log('Google login successful, navigating to Dashboard');
        // Check if it's first time user for onboarding
        if (result.user?.isFirstTime) {
          navigation.replace('Onboarding');
        } else {
          navigation.replace('Dashboard');
        }
      } else {
        console.error('Google login failed:', result.error);
        Alert.alert('Error', result.error || 'Google login failed');
      }
    } catch (error) {
      console.error('Google login exception:', error);
      Alert.alert('Error', 'Google login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Debug function to reset authentication state
  const handleResetAuth = async () => {
    try {
      const result = await resetAuth();
      if (result.success) {
        Alert.alert('Success', 'Authentication state has been reset');
      } else {
        Alert.alert('Error', result.error || 'Failed to reset authentication');
      }
    } catch (error) {
      console.error('Reset auth exception:', error);
      Alert.alert('Error', 'Failed to reset authentication');
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setShowForgotPassword(false);
    setFormData({
      email: '',
      password: '',
      name: '',
      confirmPassword: '',
    });
  };

  const getHeaderTitle = () => {
    if (showForgotPassword) return 'Reset Password';
    return isLogin ? 'Welcome Back!' : 'Create Account';
  };

  const getHeaderSubtitle = () => {
    if (showForgotPassword) return 'Enter your email to reset your password';
    return isLogin 
      ? 'Sign in to track your attendance' 
      : 'Join us to start monitoring your attendance';
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {getHeaderTitle()}
          </Text>
          <Text style={styles.subtitle}>
            {getHeaderSubtitle()}
          </Text>
        </View>

        <View style={styles.form}>
          {!isLogin && !showForgotPassword && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#a1a1aa"
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#a1a1aa"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {!showForgotPassword && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#a1a1aa"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry
              />
            </View>
          )}

          {!isLogin && !showForgotPassword && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                placeholderTextColor="#a1a1aa"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                secureTextEntry
              />
            </View>
          )}

          {isLogin && !showForgotPassword && (
            <TouchableOpacity 
              style={styles.forgotPasswordContainer}
              onPress={() => setShowForgotPassword(true)}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Loading...' : (
                showForgotPassword ? 'Send Reset Email' : 
                (isLogin ? 'Sign In' : 'Create Account')
              )}
            </Text>
          </TouchableOpacity>

          {!showForgotPassword && (
            <>
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity
                style={[styles.googleButton, isLoading && styles.submitButtonDisabled]}
                onPress={handleGoogleLogin}
                disabled={isLoading}
              >
                <Text style={styles.googleButtonIcon}>🔍</Text>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.toggleContainer}>
            {showForgotPassword ? (
              <TouchableOpacity onPress={() => setShowForgotPassword(false)}>
                <Text style={styles.toggleButton}>← Back to Login</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.toggleText}>
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                </Text>
                <TouchableOpacity onPress={toggleAuthMode}>
                  <Text style={styles.toggleButton}>
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Debug Reset Button */}
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetAuth}
          >
            <Text style={styles.resetButtonText}>Reset Authentication (Debug)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#252545',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4f46e5',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#6b7280',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  toggleText: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  toggleButton: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '600',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '500',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#3f3f46',
  },
  dividerText: {
    color: '#a1a1aa',
    fontSize: 14,
    marginHorizontal: 16,
  },
  googleButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  googleButtonIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  googleButtonText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    marginTop: 30,
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AuthScreen;