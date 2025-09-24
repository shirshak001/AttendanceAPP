import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error details:', errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            The app encountered an unexpected error. Please try refreshing the page.
          </Text>
          
          {__DEV__ && (
            <ScrollView style={styles.errorDetails}>
              <Text style={styles.errorDetailsTitle}>Error Details (Development Mode):</Text>
              <Text style={styles.errorDetailsText}>
                {this.state.error && this.state.error.toString()}
              </Text>
              <Text style={styles.errorDetailsText}>
                {this.state.errorInfo.componentStack}
              </Text>
            </ScrollView>
          )}
          
          <Text 
            style={styles.reloadButton}
            onPress={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              // For web, we can try to reload
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
          >
            Reload App
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  errorDetails: {
    backgroundColor: '#f1f3f4',
    padding: 15,
    borderRadius: 8,
    maxHeight: 200,
    width: '100%',
    marginBottom: 20,
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 10,
  },
  errorDetailsText: {
    fontSize: 12,
    color: '#6c757d',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  reloadButton: {
    backgroundColor: '#007bff',
    color: 'white',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    overflow: 'hidden',
  },
});

export default ErrorBoundary;