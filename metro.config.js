const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');
// expo-sqlite on the web runs SQLite compiled to WebAssembly
config.resolver.assetExts.push('wasm');

module.exports = config;
