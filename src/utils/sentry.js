// Crash reporting for the app. Off until EXPO_PUBLIC_SENTRY_DSN is set for the
// build (eas.json env or .env). Loaded lazily so Expo Go and builds without a
// DSN never touch the native module.
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

let Sentry = null;
if (DSN) {
  try {
    Sentry = require('@sentry/react-native');
    Sentry.init({
      dsn: DSN,
      environment: __DEV__ ? 'development' : 'production',
      tracesSampleRate: 0, // crashes and errors only
      sendDefaultPii: false,
    });
  } catch (e) {
    Sentry = null;
  }
}

export const sentryEnabled = !!Sentry;

/** Wrap the root component so render crashes are reported (no-op when off). */
export const withSentry = (Component) => (Sentry ? Sentry.wrap(Component) : Component);

export const reportError = (error, extra) => {
  if (Sentry) Sentry.captureException(error, extra ? { extra } : undefined);
};
