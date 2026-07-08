import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import BadgesScreen from '../screens/BadgesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Stack = createNativeStackNavigator();

export default function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="Badges" component={BadgesScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}




// import React from 'react';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import ProfileScreen from '../screens/ProfileScreen';
// import EditProfileScreen from '../screens/EditProfileScreen';
// import ExamHistoryScreen from '../screens/ExamHistoryScreen';
// import AnalyticsScreen from '../screens/AnalyticsScreen';
// import ResultScreen from '../screens/ResultScreen';

// const Stack = createNativeStackNavigator();

// export default function ProfileStack() {
//   return (
//     <Stack.Navigator
//       screenOptions={{
//         headerShown: false,
//       }}
//     >
//       <Stack.Screen name="ProfileMain" component={ProfileScreen} />
//       <Stack.Screen name="EditProfile" component={EditProfileScreen} />
//       <Stack.Screen name="ExamHistory" component={ExamHistoryScreen} />
//       <Stack.Screen name="Analytics" component={AnalyticsScreen} />
//       <Stack.Screen name="Result" component={ResultScreen} />
//     </Stack.Navigator>
//   );
// }

