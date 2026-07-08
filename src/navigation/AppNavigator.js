import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Auth
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

// Tabs
import TabNavigator from './TabNavigator';

// Shared screens (above tabs — tab bar hidden)
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

// Loading
import LoadingScreen from '../components/LoadingScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return <LoadingScreen message="Initializing..." />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!isAuthenticated ? (
          // ─── Auth Flow ─────────────────────────────
          <Stack.Group>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
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
            <Stack.Screen name="Badges" component={BadgesScreen} />
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
//           contentStyle: { backgroundColor: colors.background },
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

