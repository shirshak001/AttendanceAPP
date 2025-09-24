import { useClerk } from '@clerk/clerk-expo'
import { Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export const SignOutButton = ({ navigation }) => {
  const { signOut } = useClerk()
  
  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut()
              // Navigation will be handled automatically by the auth state change
            } catch (err) {
              console.error(JSON.stringify(err, null, 2))
              Alert.alert('Error', 'Failed to sign out. Please try again.')
            }
          },
        },
      ],
      { cancelable: false }
    )
  }
  
  return (
    <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
      <Ionicons name="log-out" size={20} color="#ef4444" style={styles.icon} />
      <Text style={styles.signOutText}>Sign Out</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  icon: {
    marginRight: 12,
  },
  signOutText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
})