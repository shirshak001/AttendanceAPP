import { useSignIn } from '@clerk/clerk-expo'
import { Text, TextInput, TouchableOpacity, View, StyleSheet, Alert } from 'react-native'
import React from 'react'
import { Ionicons } from '@expo/vector-icons'

export default function SignInScreen({ navigation }) {
  const { signIn, setActive, isLoaded } = useSignIn()

  const [emailAddress, setEmailAddress] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)

  // Handle the submission of the sign-in form
  const onSignInPress = async () => {
    if (!isLoaded) return

    setIsLoading(true)
    // Start the sign-in process using the email and password provided
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      })

      // If sign-in process is complete, set the created session as active
      // Navigation will happen automatically via useAuth() hook
      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId })
        console.log('Session activated, user will be automatically redirected')
      } else if (signInAttempt.status === 'needs_identifier_verification') {
        Alert.alert(
          'Email Verification Required',
          'Please check your email and verify your account before signing in.',
          [{ text: 'OK' }]
        )
      } else {
        // If the status isn't complete, check why. User might need to
        // complete further steps.
        console.error('Sign in incomplete:', JSON.stringify(signInAttempt, null, 2))
        Alert.alert(
          'Account Setup Incomplete',
          'Your account needs additional setup. Please complete the signup process or contact support.',
          [
            { text: 'Sign Up', onPress: navigateToSignUp },
            { text: 'OK', style: 'cancel' }
          ]
        )
      }
    } catch (err) {
      console.error('Sign in error:', JSON.stringify(err, null, 2))
      const errorCode = err.errors?.[0]?.code
      const errorMessage = err.errors?.[0]?.message
      
      if (errorCode === 'form_identifier_not_found') {
        Alert.alert(
          'Account Not Found',
          'No account found with this email. Please check your email or sign up for a new account.',
          [
            { text: 'Sign Up', onPress: navigateToSignUp },
            { text: 'Try Again', style: 'cancel' }
          ]
        )
      } else if (errorCode === 'form_password_incorrect') {
        Alert.alert('Incorrect Password', 'The password you entered is incorrect. Please try again.')
      } else {
        Alert.alert('Sign In Error', errorMessage || 'Sign in failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const navigateToSignUp = () => {
    navigation.navigate('SignUp')
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="school" size={60} color="#4f46e5" />
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your AttendEase account</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Ionicons name="mail" size={20} color="#6b7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={emailAddress}
            placeholder="Enter your email"
            onChangeText={(emailAddress) => setEmailAddress(emailAddress)}
            keyboardType="email-address"
            autoComplete="email"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed" size={20} color="#6b7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={password}
            placeholder="Enter your password"
            secureTextEntry={true}
            onChangeText={(password) => setPassword(password)}
            autoComplete="password"
          />
        </View>

        <TouchableOpacity 
          style={[styles.signInButton, isLoading && styles.disabledButton]} 
          onPress={onSignInPress}
          disabled={isLoading}
        >
          <Text style={styles.signInButtonText}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>Don't have an account?</Text>
          <TouchableOpacity onPress={navigateToSignUp}>
            <Text style={styles.signUpLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#1f2937',
  },
  signInButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  disabledButton: {
    opacity: 0.7,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  signUpText: {
    fontSize: 16,
    color: '#6b7280',
  },
  signUpLink: {
    fontSize: 16,
    color: '#4f46e5',
    fontWeight: '600',
  },
})