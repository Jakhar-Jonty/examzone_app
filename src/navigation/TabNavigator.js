import React from 'react';
import { View } from 'react-native';
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
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: Math.max(insets.bottom, 8),
    paddingTop: 8,
    height: 68 + Math.max(insets.bottom - 8, 0),
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: defaultTabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        // Active tab: icon sits on a soft pill; inactive: plain outline icon.
        tabBarIcon: ({ color, focused }) => {
          const icons = TAB_ICONS[route.name];
          return (
            <View
              style={{
                width: 56,
                height: 30,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? colors.surfaceMuted : 'transparent',
              }}
            >
              <Ionicons name={focused ? icons.active : icons.inactive} size={21} color={color} />
            </View>
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



