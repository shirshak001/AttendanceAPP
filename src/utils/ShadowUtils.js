import { Platform } from 'react-native';

// Utility function to create cross-platform shadows
export const createShadow = (shadowConfig = {}) => {
  const {
    shadowColor = '#000',
    shadowOffset = { width: 0, height: 2 },
    shadowOpacity = 0.1,
    shadowRadius = 4,
    elevation = 3, // Android specific
  } = shadowConfig;

  if (Platform.OS === 'web') {
    // Use boxShadow for web
    const { width, height } = shadowOffset;
    return {
      boxShadow: `${width}px ${height}px ${shadowRadius}px rgba(${hexToRgb(shadowColor)}, ${shadowOpacity})`,
    };
  } else if (Platform.OS === 'android') {
    // Use elevation for Android
    return {
      elevation,
    };
  } else {
    // Use shadow properties for iOS
    return {
      shadowColor,
      shadowOffset,
      shadowOpacity,
      shadowRadius,
    };
  }
};

// Helper function to convert hex color to RGB
const hexToRgb = (hex) => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '0, 0, 0';
};

export default createShadow;