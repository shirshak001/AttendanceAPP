const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for resolving web modules
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;