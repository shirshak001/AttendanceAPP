import * as React from 'react'
import { Text, TextInput, TouchableOpacity, View, StyleSheet, Alert } from 'react-native'
import { useSignUp } from '@clerk/clerk-expo'
import { Ionicons } from '@expo/vector-icons'

export default function SignUpScreen({ navigation }) {
  const { isLoaded, signUp, setActive } = useSignUp()

  const [emailAddress, setEmailAddress] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [username, setUsername] = React.useState('')
  const [pendingVerification, setPendingVerification] = React.useState(false)
  const [code, setCode] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)

  // Handle submission of sign-up form
  const onSignUpPress = async () => {
    if (!isLoaded) return

    setIsLoading(true)
    // Start sign-up process using email and password provided
    try {
      console.log('Creating sign up with email:', emailAddress)
      
      await signUp.create({
        emailAddress,
        password,
        username,
      })
      
      console.log('Sign up created successfully')

      // Send user an email with verification code
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      console.log('Verification email sent')

      // Set 'pendingVerification' to true to display second form
      // and capture OTP code
      setPendingVerification(true)
    } catch (err) {
      console.error('Sign up error:', JSON.stringify(err, null, 2))
      const errorCode = err.errors?.[0]?.code
      const errorMessage = err.errors?.[0]?.message
      
      if (errorCode === 'form_param_missing') {
        Alert.alert('Missing Information', 'Please fill in all required fields.')
      } else if (errorCode === 'form_password_pwned') {
        Alert.alert(
          'Password Security Issue',
          'This password has been found in a data breach. Please choose a stronger, unique password.',
          [{ text: 'OK' }]
        )
      } else if (errorCode === 'form_username_invalid_character') {
        Alert.alert('Invalid Username', 'Username can only contain letters, numbers, and underscores.')
      } else if (errorCode === 'form_username_invalid_length') {
        Alert.alert('Username Length', 'Username must be between 3 and 20 characters long.')
      } else if (errorCode === 'form_identifier_exists') {
        Alert.alert('Account Exists', 'An account with this email or username already exists. Please try signing in.')
      } else {
        Alert.alert('Error', errorMessage || 'Sign up failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handle submission of verification form
  const onVerifyPress = async () => {
    if (!isLoaded) return

    setIsLoading(true)
    try {
      console.log('Attempting email verification with code:', code)
      
      // Use the code the user provided to attempt verification
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      })

      console.log('Verification attempt result:', signUpAttempt.status)
      console.log('Missing requirements:', signUpAttempt.missingFields)
      
      console.log('Verification attempt result:', signUpAttempt.status)
      console.log('Missing requirements:', signUpAttempt.missingFields)
      console.log('Unverified fields:', signUpAttempt.unverifiedFields)
      
      // Handle different signup statuses
      if (signUpAttempt.status === 'complete') {
        await setActive({ session: signUpAttempt.createdSessionId })
        console.log('Session activated, user will be automatically redirected')
      } else if (signUpAttempt.status === 'missing_requirements') {
        // Check what requirements are missing
        const missingFields = signUpAttempt.missingFields || []
        const unverifiedFields = signUpAttempt.unverifiedFields || []
        
        console.log('Missing fields:', missingFields)
        console.log('Unverified fields:', unverifiedFields)
        
        if (unverifiedFields.includes('email_address')) {
          Alert.alert('Email Not Verified', 'Please check your email and enter the correct verification code.')
        } else if (missingFields.length > 0) {
          // If username is missing, try to update with it
          if (missingFields.includes('username') && username) {
            try {
              console.log('Adding missing username to complete signup')
              const completeResult = await signUp.update({ username })
              
              if (completeResult.status === 'complete') {
                await setActive({ session: completeResult.createdSessionId })
                console.log('Signup completed with username, user will be automatically redirected')
              } else {
                Alert.alert('Setup Error', 'Unable to complete account setup. Please try again.')
              }
            } catch (updateErr) {
              console.error('Username update error:', updateErr)
              Alert.alert('Setup Error', 'Unable to add username to your account. Please try again.')
            }
          } else {
            Alert.alert('Additional Information Required', 'Please go back and ensure all fields are filled correctly.')
            setPendingVerification(false)
          }
        } else {
          Alert.alert('Account Setup', 'Your account needs additional setup. Please try signing in.')
          navigation.navigate('SignIn')
        }
      } else {
        // If the status is not complete, check why. User may need to
        // complete further steps.
        console.error('Verification incomplete:', JSON.stringify(signUpAttempt, null, 2))
        Alert.alert('Verification Issue', 'Please check your code and try again.')
      }
    } catch (err) {
      console.error('Verification error:', JSON.stringify(err, null, 2))
      Alert.alert('Error', 'Verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const navigateToSignIn = () => {
    navigation.navigate('SignIn')
  }

  if (pendingVerification) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="mail" size={60} color="#4f46e5" />
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>We sent a verification code to {emailAddress}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="key" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={code}
              placeholder="Enter verification code"
              onChangeText={(code) => setCode(code)}
              keyboardType="number-pad"
              autoComplete="sms-otp"
            />
          </View>

          <TouchableOpacity 
            style={[styles.verifyButton, isLoading && styles.disabledButton]}
            onPress={onVerifyPress}
            disabled={isLoading}
          >
            <Text style={styles.verifyButtonText}>
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.backToSignUpButton}
            onPress={() => setPendingVerification(false)}
          >
            <Text style={styles.backToSignUpText}>Back to Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="person-add" size={60} color="#4f46e5" />
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up for your AttendEase account</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Ionicons name="mail" size={20} color="#6b7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={emailAddress}
            placeholder="Enter your email"
            onChangeText={(email) => setEmailAddress(email)}
            keyboardType="email-address"
            autoComplete="email"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="person" size={20} color="#6b7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={username}
            placeholder="Choose a username"
            onChangeText={(username) => setUsername(username)}
            autoComplete="username"
          />
        </View>







        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed" size={20} color="#6b7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={password}
            placeholder="Enter a strong password (8+ chars)"
            secureTextEntry={true}
            onChangeText={(password) => setPassword(password)}
            autoComplete="password-new"
          />
        </View>
        
        {password.length > 0 && password.length < 8 && (
          <Text style={styles.passwordHint}>
            Password should be at least 8 characters long
          </Text>
        )}

        {username.length > 0 && username.length < 3 && (
          <Text style={styles.passwordHint}>
            Username should be at least 3 characters long
          </Text>
        )}







        <TouchableOpacity 
          style={[styles.signUpButton, (isLoading || !emailAddress || !password || !username) && styles.disabledButton]}
          onPress={onSignUpPress}
          disabled={isLoading || !emailAddress || !password || !username}
        >
          <Text style={styles.signUpButtonText}>
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Text>
        </TouchableOpacity>

        <View style={styles.signInContainer}>
          <Text style={styles.signInText}>Already have an account?</Text>
          <TouchableOpacity onPress={navigateToSignIn}>
            <Text style={styles.signInLink}>Sign In</Text>
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
  signUpButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  verifyButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  signInText: {
    fontSize: 16,
    color: '#6b7280',
  },
  signInLink: {
    fontSize: 16,
    color: '#4f46e5',
    fontWeight: '600',
  },
  backToSignUpButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  backToSignUpText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  passwordHint: {
    fontSize: 14,
    color: '#f59e0b',
    marginTop: -12,
    marginBottom: 8,
    marginLeft: 16,
  },
})