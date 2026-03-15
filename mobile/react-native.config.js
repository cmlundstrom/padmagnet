// Exclude expo-dev-client native module from non-development builds.
// Without this, autolinking compiles its native code into preview/production
// APKs, causing a crash on launch when no dev server is available.

const isDevClient = process.env.APP_VARIANT !== 'preview' && process.env.APP_VARIANT !== 'production';

module.exports = {
  dependencies: {
    ...(!isDevClient && {
      'expo-dev-client': {
        platforms: {
          android: null,
          ios: null,
        },
      },
    }),
  },
};
