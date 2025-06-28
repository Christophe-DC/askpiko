module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './', // ou './app' si tu veux que @ pointe vers /app
          },
        },
      ],
      [
        'react-native-reanimated/plugin',
        {
          processNestedWorklets: true,
        },
      ],
      ['react-native-worklets-core/plugin'],
      /*[
        'react-native-reanimated/plugin',
        {
          // relativeSourceLocation: true,
          // disableInlineStylesWarning: true,
          processNestedWorklets: true,
          //omitNativeOnlyData: true,
          //globals: ['myObjectOnUI'],
          //substituteWebPlatformChecks: true,
        },
      ],*/
      // ['react-native-worklets-core/plugin'],
      // ['react-native-vision-camera'],
    ],
  };
};
