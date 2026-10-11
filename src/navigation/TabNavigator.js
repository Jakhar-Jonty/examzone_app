import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

import HomeStack from './HomeStack';
import ExamsStack from './ExamsStack';
import SeriesStack from './SeriesStack';
import StudyStack from './StudyStack';
import ProfileStack from './ProfileStack';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  HomeTab: { active: 'home', inactive: 'home-outline' },
  ExamsTab: { active: 'document-text', inactive: 'document-text-outline' },
  SeriesTab: { active: 'albums', inactive: 'albums-outline' },
  StudyTab: { active: 'book', inactive: 'book-outline' },
  ProfileTab: { active: 'person', inactive: 'person-outline' },
};

const HIDE_TAB_ROUTES = new Set(['PracticeInterface', 'PracticeResult']);

export default function TabNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const defaultTabBarStyle = {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: Math.max(insets.bottom, 5),
    paddingTop: 5,
    height: 60 + Math.max(insets.bottom - 5, 0),
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: defaultTabBarStyle,
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
        name="SeriesTab"
        component={SeriesStack}
        options={{ tabBarLabel: 'Series' }}
      />
      <Tab.Screen
        name="StudyTab"
        component={StudyStack}
        options={({ route }) => {
          const focused = getFocusedRouteNameFromRoute(route) ?? 'StudyMain';
          return {
            tabBarLabel: 'Study',
            tabBarStyle: HIDE_TAB_ROUTES.has(focused)
              ? { display: 'none' }
              : defaultTabBarStyle,
          };
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{ tabBarLabel: 'Profile' }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            const nestedState = route.state;
            if (nestedState && nestedState.index > 0) {
              e.preventDefault();
              navigation.navigate('ProfileTab', { screen: 'ProfileMain' });
            }
          },
        })}
      />
    </Tab.Navigator>
  );
}



