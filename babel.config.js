module.exports = function (api) {
  api.cache(true);

  // Strip noisy console.* in production builds, but keep console.error and
  // console.warn so crashes stay visible. Reanimated's plugin must remain LAST.
  const plugins = [];
  if (process.env.NODE_ENV === "production") {
    plugins.push(["transform-remove-console", { exclude: ["error", "warn"] }]);
  }
  plugins.push("react-native-reanimated/plugin");

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins,
  };
};
