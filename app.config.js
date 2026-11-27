/**
 * Dynamic part of the Expo config (the rest is in app.json).
 *
 * The web version is published under /budgie (GitHub Pages), so its export
 * needs that base URL. It must not apply to iOS/Android: there the assets
 * would go into Budgie.app/budgie/, which on a case-insensitive disk (macOS)
 * collides with the Budgie executable and breaks the build.
 * `npm run build:web` sets EXPO_WEB_BASE_URL.
 */
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_WEB_BASE_URL ? { baseUrl: process.env.EXPO_WEB_BASE_URL } : {}),
  },
});
