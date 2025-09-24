import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function to reset AsyncStorage
// This can be useful for debugging authentication issues
const resetStorage = async () => {
  try {
    await AsyncStorage.clear();
    console.log('AsyncStorage has been cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing AsyncStorage:', error);
    return false;
  }
};

// Helper function to view all AsyncStorage keys
const getAllStorageKeys = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    console.log('All AsyncStorage keys:', keys);
    return keys;
  } catch (error) {
    console.error('Error getting AsyncStorage keys:', error);
    return [];
  }
};

// Helper function to view all AsyncStorage data
const getAllStorageData = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const items = await AsyncStorage.multiGet(keys);
    const data = {};
    
    items.forEach(([key, value]) => {
      try {
        data[key] = JSON.parse(value);
      } catch (e) {
        data[key] = value;
      }
    });
    
    console.log('All AsyncStorage data:', data);
    return data;
  } catch (error) {
    console.error('Error getting AsyncStorage data:', error);
    return {};
  }
};

export { resetStorage, getAllStorageKeys, getAllStorageData };