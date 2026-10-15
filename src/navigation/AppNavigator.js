import React, { useCallback, useEffect, useRef } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { routeFromNotification } from '../services/notificationService';

// Auth
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// Tabs
import TabNavigator from './TabNavigator';

// Shared screens (above tabs — tab bar hidden)
import LiveMockScreen from '../screens/LiveMockScreen';
import ExamDetailScreen from '../screens/ExamDetailScreen';
import ExamInterfaceScreen from '../screens/ExamInterfaceScreen';
import ResultScreen from '../screens/ResultScreen';
import ExamHistoryScreen from '../screens/ExamHistoryScreen';
import PaywallScreen from '../screens/PaywallScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import BadgesScreen from '../screens/BadgesScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import OmrEntryScreen from '../screens/OmrEntryScreen';

// Loading
import LoadingScreen from '../components/LoadingScreen';
import { t as tr } from '../i18n';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

/**
 * Open the right screen when a push notification is tapped — including when
 * the tap cold-starts the app. Taps that arrive before the app is ready (or
 * while signed out) are kept and handled once the main screens exist.
 */
function useNotificationTaps(isAuthenticated) {
  const pending = useRef(null);
  const handled = useRef(new Set());

  const flush = useCallback(() => {
    if (!pending.current || !isAuthenticated || !navigationRef.isReady()) return;
    const data = pending.current;
    pending.current = null;
    routeFromNotification(navigationRef, data);
  }, [isAuthenticated]);

  const onResponse = useCallback(
    (response) => {
      const id = response?.notification?.request?.identifier;
      if (!id || handled.current.has(id)) return;
      handled.current.add(id);
      pending.current = response.notification.request.content.data || {};
      flush();
    },
    [flush]
  );

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(onResponse);
    Notifications.getLastNotificationResponseAsync().then((r) => r && onResponse(r)).catch(() => {});
    return () => sub.remove();
  }, [onResponse]);

  useEffect(() => {
    flush();
  }, [flush]);

  return flush;
}

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const { colors } = useTheme();
  const flushNotificationTap = useNotificationTaps(isAuthenticated);

  if (loading) {
    return <LoadingScreen message={tr("Initializing...")} />;
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={flushNotificationTap}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.surface },
        }}
      >
        {!isAuthenticated ? (
          // ─── Auth Flow ─────────────────────────────
          <Stack.Group>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </Stack.Group>
        ) : (
          // ─── Authenticated Flow ────────────────────
          <Stack.Group>
            {/* Main tabs */}
            <Stack.Screen name="MainTabs" component={TabNavigator} />

            {/* Shared screens — rendered above tabs (tab bar hidden) */}
            <Stack.Screen name="ExamDetail" component={ExamDetailScreen} />

            <Stack.Screen
              name="ExamInterface"
              component={ExamInterfaceScreen}
              options={{
                gestureEnabled: false,     // Prevent swipe-back during exam
                animation: 'slide_from_right',
              }}
            />

            <Stack.Screen name="Result" component={ResultScreen} />
            <Stack.Screen name="ExamHistory" component={ExamHistoryScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
            <Stack.Screen name="LiveMock" component={LiveMockScreen} />
            <Stack.Screen name="Badges" component={BadgesScreen} />
            <Stack.Screen
              name="OmrEntry"
              component={OmrEntryScreen}
              options={{
                gestureEnabled: false,
                animation: 'slide_from_right',
              }}
            />

            <Stack.Screen name="Analytics" component={AnalyticsScreen} />

            {/* Paywall — presented as a modal from any gated content */}
            <Stack.Screen
              name="Paywall"
              component={PaywallScreen}
              options={{ presentation: 'modal' }}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}



// import React from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import { useAuth } from '../context/AuthContext';
// import { useTheme } from '../context/ThemeContext';
// import LoginScreen from '../screens/LoginScreen';
// import SignUpScreen from '../screens/SignUpScreen';
// import TabNavigator from './TabNavigator';
// import LoadingScreen from '../components/LoadingScreen';

// const Stack = createNativeStackNavigator();

// export default function AppNavigator() {
//   const { isAuthenticated, loading } = useAuth();
//   const { colors } = useTheme();

//   if (loading) {
//     return <LoadingScreen message="Initializing..." />;
//   }

//   return (
//     <NavigationContainer>
//       <Stack.Navigator
//         screenOptions={{
//           headerShown: false,
//           contentStyle: { backgroundColor: colors.surface },
//         }}
//       >
//         {!isAuthenticated ? (
//           <>
//             <Stack.Screen name="Login" component={LoginScreen} />
//             <Stack.Screen name="SignUp" component={SignUpScreen} />
//           </>
//         ) : (
//           <Stack.Screen name="MainTabs" component={TabNavigator} />
//         )}
//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// }

