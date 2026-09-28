module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Le migrazioni Drizzle sono file .sql importati come stringhe
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
