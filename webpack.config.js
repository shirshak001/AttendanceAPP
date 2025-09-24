const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: [
          // Add modules that need to be transpiled for web
          '@react-navigation/native',
          '@react-navigation/stack',
          '@react-navigation/bottom-tabs',
          'react-native-vector-icons',
          'react-native-safe-area-context',
          'expo-notifications',
          'expo-task-manager',
        ],
      },
    },
    argv
  );

  // Add fallbacks for node modules that don't exist in web
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "crypto": false,
    "stream": false,
    "path": false,
    "os": false,
    "fs": false,
  };

  // Add aliases for better web compatibility
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native$': 'react-native-web',
  };

  return config;
};