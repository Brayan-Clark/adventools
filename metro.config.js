const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');
config.resolver.assetExts.push('db');
config.resolver.assetExts.push('ttf');
config.resolver.assetExts.push('TTF');
config.resolver.assetExts.push('otf');
config.resolver.assetExts.push('OTF');

module.exports = withNativeWind(config, { input: "./global.css" });

