import React, { createContext, useContext, useState, useEffect } from 'react';
import AuthService from '../services/AuthService';
import { Alert } from 'react-native';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      console.log('AuthContext: Checking auth status...');
      
      const loggedIn = await AuthService.isLoggedIn();
      console.log('AuthContext: User logged in:', loggedIn);
      
      setIsLoggedIn(loggedIn);
      
      if (loggedIn) {
        const userData = await AuthService.getCurrentUser();
        console.log('AuthContext: Retrieved user data:', userData);
        setUser(userData);
      } else {
        console.log('AuthContext: No user logged in');
        setUser(null);
      }
    } catch (error) {
      console.error('AuthContext: Error checking auth status:', error);
      Alert.alert('Error', 'Failed to check authentication status.');
      setIsLoggedIn(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('AuthContext: Attempting login with email:', email);
      const result = await AuthService.login(email, password);
      
      console.log('AuthContext: Login result:', result);
      
      if (result.success) {
        console.log('AuthContext: Login successful, updating state...');
        setUser(result.user);
        setIsLoggedIn(true);
        
        // Force a slight delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('AuthContext: State updated successfully');
      } else {
        console.error('AuthContext: Login failed:', result.error);
        setUser(null);
        setIsLoggedIn(false);
      }
      return result;
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      setUser(null);
      setIsLoggedIn(false);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const register = async (email, password, name) => {
    try {
      console.log('AuthContext: Attempting registration for:', email);
      const result = await AuthService.register(email, password, name);
      
      console.log('AuthContext: Registration result:', result);
      
      if (result.success) {
        console.log('AuthContext: Registration successful, updating state...');
        setUser(result.user);
        setIsLoggedIn(true);
        
        // Force a slight delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('AuthContext: Registration state updated successfully');
      } else {
        console.error('AuthContext: Registration failed:', result.error);
        setUser(null);
        setIsLoggedIn(false);
      }
      return result;
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  };

  const loginWithGoogle = async () => {
    try {
      console.log('AuthContext: Attempting Google login');
      const result = await AuthService.loginWithGoogle();
      
      console.log('AuthContext: Google login result:', result);
      
      if (result.success) {
        console.log('AuthContext: Google login successful, updating state...');
        setUser(result.user);
        setIsLoggedIn(true);
        
        // Force a slight delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('AuthContext: Google login state updated successfully');
      } else {
        console.error('AuthContext: Google login failed:', result.error);
        setUser(null);
        setIsLoggedIn(false);
      }
      return result;
    } catch (error) {
      console.error('AuthContext: Google login error:', error);
      setUser(null);
      setIsLoggedIn(false);
      return { success: false, error: 'Google login failed. Please try again.' };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const result = await AuthService.forgotPassword(email);
      return result;
    } catch (error) {
      console.error('Forgot password error:', error);
      return { success: false, error: 'Failed to send reset email. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      console.log('AuthContext: Attempting logout');
      const result = await AuthService.logout();
      if (result.success) {
        setUser(null);
        setIsLoggedIn(false);
        console.log('AuthContext: Logout successful');
      } else {
        console.error('AuthContext: Logout failed:', result.error);
      }
      return result;
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
      return { success: false, error: 'Logout failed' };
    }
  };

  // Method to reset auth state - useful for debugging
  const resetAuth = async () => {
    try {
      console.log('AuthContext: Resetting auth state');
      await AuthService.debugResetStorage();
      setUser(null);
      setIsLoggedIn(false);
      console.log('AuthContext: Auth state reset successful');
      return { success: true };
    } catch (error) {
      console.error('AuthContext: Reset auth error:', error);
      return { success: false, error: 'Reset auth failed' };
    }
  };

  const value = {
    user,
    isLoggedIn,
    isLoading,
    login,
    register,
    loginWithGoogle,
    forgotPassword,
    logout,
    checkAuthStatus,
    resetAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
export default AuthContext;