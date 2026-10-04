const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Keep env files (e.g. .env.prod.local with deploy keys) out of the module graph:
// the Android route context otherwise tried to bundle .env.prod.local.
config.resolver.blockList = [
  ...[config.resolver.blockList].flat(),
  /(^|[\\/])\.env(\..*)?$/,
];

module.exports = withNativeWind(config, { input: "./src/global.css", inlineRem: 16 });
