import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
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

// Same spring for the tabs resizing (LayoutAnimation) and the pill sliding.
const SLIDE_MS = 320;
const tabsLayoutAnimation = {
  duration: SLIDE_MS,
  update: { type: LayoutAnimation.Types.spring, springDamping: 0.78 },
  create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Floating pill tab bar: a dark rounded bar above the bottom edge. A light pill
 * slides behind the active tab (icon + label); other tabs show only their icon.
 * It sits in its own strip (not over the screen), so no page content is hidden.
 */
function FloatingTabBar({ state, descriptors, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Each tab's measured x / width, and the pill's animated position + size.
  const layouts = useRef({});
  const pillX = useRef(new Animated.Value(0)).current;
  const pillWidth = useRef(new Animated.Value(0)).current;
  const pillReady = useRef(false);

  const movePillTo = (key) => {
    const target = layouts.current[key];
    if (!target) return;
    if (!pillReady.current) {
      // First layout: place the pill without animating.
      pillX.setValue(target.x);
      pillWidth.setValue(target.width);
      pillReady.current = true;
      return;
    }
    Animated.parallel([
      Animated.spring(pillX, { toValue: target.x, useNativeDriver: false, bounciness: 6, speed: 14 }),
      Animated.spring(pillWidth, { toValue: target.width, useNativeDriver: false, bounciness: 6, speed: 14 }),
    ]).start();
  };

  const focusedKey = state.routes[state.index].key;
  useEffect(() => {
    movePillTo(focusedKey);
  }, [focusedKey]);

  const focusedOptions = descriptors[focusedKey].options;
  if (focusedOptions.tabBarStyle?.display === 'none') {
    pillReady.current = false; // re-place instantly when the bar comes back
    return null;
  }

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
        {/* Sliding pill behind the active tab */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 7,
            left: 0,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.heroText,
            width: pillWidth,
            transform: [{ translateX: pillX }],
          }}
        />

        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? route.name;
          const icons = TAB_ICONS[route.name];

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              LayoutAnimation.configureNext(tabsLayoutAnimation);
              navigation.navigate(route.name, route.params);
            }
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                layouts.current[route.key] = { x, width };
                if (route.key === focusedKey) movePillTo(route.key);
              }}
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



