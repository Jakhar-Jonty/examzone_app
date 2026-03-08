import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

import HomeStack from './HomeStack';
import ExamsStack from './ExamsStack';
import StudyStack from './StudyStack';
import ProfileStack from './ProfileStack';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  HomeTab: { active: 'home', inactive: 'home-outline' },
  ExamsTab: { active: 'document-text', inactive: 'document-text-outline' },
  StudyTab: { active: 'book', inactive: 'book-outline' },
  ProfileTab: { active: 'person', inactive: 'person-outline' },
};

export default function TabNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, 5),
          paddingTop: 5,
          height: 60 + Math.max(insets.bottom - 5, 0),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = TAB_ICONS[route.name];
          return (
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="ExamsTab"
        component={ExamsStack}
        options={{ tabBarLabel: 'Exams' }}
      />
      <Tab.Screen
        name="StudyTab"
        component={StudyStack}
        options={{ tabBarLabel: 'Study' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}



// import React from 'react';
// import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { useTheme } from '../context/ThemeContext';
// import HomeStack from './HomeStack';
// import ExamsStack from './ExamsStack';
// import StudyStack from './StudyStack';
// import ProfileStack from './ProfileStack';
// import { Ionicons } from '@expo/vector-icons';

// const Tab = createBottomTabNavigator();

// export default function TabNavigator() {
//   const { colors, isDark } = useTheme();
//   const insets = useSafeAreaInsets();

//   return (
//     <Tab.Navigator
//       screenOptions={{
//         headerShown: false,
//         tabBarActiveTintColor: colors.primary,
//         tabBarInactiveTintColor: colors.textSecondary,
//         tabBarStyle: {
//           backgroundColor: colors.surface,
//           borderTopColor: colors.border,
//           borderTopWidth: 1,
//           paddingBottom: Math.max(insets.bottom, 5),
//           paddingTop: 5,
//           height: 60 + Math.max(insets.bottom - 5, 0),
//         },
//         tabBarLabelStyle: {
//           fontSize: 12,
//           fontWeight: '600',
//         },
//       }}
//     >
//       <Tab.Screen
//         name="HomeStack"
//         component={HomeStack}
//         options={{
//           tabBarLabel: 'Home',
//           tabBarIcon: ({ color, size }) => (
//             <Ionicons name="home" size={size} color={color} />
//           ),
//         }}
//       />
//       <Tab.Screen
//         name="ExamsStack"
//         component={ExamsStack}
//         options={{
//           tabBarLabel: 'Exams',
//           tabBarIcon: ({ color, size }) => (
//             <Ionicons name="document-text" size={size} color={color} />
//           ),
//         }}
//       />
//       <Tab.Screen
//         name="StudyStack"
//         component={StudyStack}
//         options={{
//           tabBarLabel: 'Study',
//           tabBarIcon: ({ color, size }) => (
//             <Ionicons name="book" size={size} color={color} />
//           ),
//         }}
//       />
//       <Tab.Screen
//         name="ProfileStack"
//         component={ProfileStack}
//         options={{
//           tabBarLabel: 'Profile',
//           tabBarIcon: ({ color, size }) => (
//             <Ionicons name="person" size={size} color={color} />
//           ),
//         }}
//       />
//     </Tab.Navigator>
//   );
// }

