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
    ],
  };
};
