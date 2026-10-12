import React from 'react';
import { View, Text, Pressable } from 'react-native';
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

/**
 * Floating pill tab bar: a dark rounded bar above the bottom edge. The active
 * tab is a light pill with icon + label; the others show only their icon.
 * It sits in its own strip (not over the screen), so no page content is hidden.
 */
function FloatingTabBar({ state, descriptors, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const focusedOptions = descriptors[state.routes[state.index].key].options;
  if (focusedOptions.tabBarStyle?.display === 'none') return null;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 62,
          paddingHorizontal: 7,
          borderRadius: 31,
          backgroundColor: colors.hero,
          shadowColor: colors.hero,
          shadowOpacity: 0.18,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 10,
        }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? route.name;
          const icons = TAB_ICONS[route.name];

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              hitSlop={4}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                height: 48,
                borderRadius: 24,
                paddingHorizontal: focused ? 16 : 0,
                minWidth: 48,
                backgroundColor: focused ? colors.heroText : 'transparent',
              }}
            >
              <Ionicons
                name={focused ? icons.active : icons.inactive}
                size={21}
                color={focused ? colors.hero : colors.heroMuted}
              />
              {focused && (
                <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '800', color: colors.hero }} numberOfLines={1}>
                  {label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
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
            tabBarStyle: HIDE_TAB_ROUTES.has(focused) ? { display: 'none' } : undefined,
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



