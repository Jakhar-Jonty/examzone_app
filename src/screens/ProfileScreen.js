import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import tw from 'twrnc';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const THEME_OPTIONS = [
  { key: 'light', icon: 'sunny', label: 'Light' },
  { key: 'dark', icon: 'moon', label: 'Dark' },
  { key: 'system', icon: 'phone-portrait-outline', label: 'Auto' },
];

export default function ProfileScreen({ navigation }) {
  const { colors, theme, toggleTheme } = useTheme();
  const { user, logout, isPremium } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0] || '').join('').toUpperCase().slice(0, 2) || 'U';
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const menuSections = [
    {
      title: 'Membership',
      items: [
        {
          icon: isPremium ? 'diamond' : 'diamond-outline',
          label: isPremium ? 'Premium Active' : 'Go Premium',
          onPress: () => navigation.navigate('Paywall'),
          badge: isPremium ? null : 'Upgrade',
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          icon: 'person-outline',
          label: 'Edit Profile',
          onPress: () => navigation.navigate('EditProfile'),
        },
        {
          icon: 'notifications-outline',
          label: 'Notifications',
          onPress: () => navigation.navigate('Notifications'),
        },
      ],
    },
    {
      title: 'Study',
      items: [
        {
          icon: 'trophy-outline',
          label: 'Leaderboard',
          onPress: () => navigation.navigate('Leaderboard'),
        },
        {
          icon: 'ribbon-outline',
          label: 'Badges',
          onPress: () => navigation.navigate('Badges'),
        },
        {
          icon: 'time-outline',
          label: 'Exam History',
          onPress: () => navigation.navigate('ExamHistory'),
        },
        {
          icon: 'analytics-outline',
          label: 'Analytics',
          onPress: () => navigation.navigate('Analytics'),
        },
        {
          icon: 'book-outline',
          label: 'Wrong Book',
          onPress: () =>
            navigation.navigate('StudyTab', { screen: 'WrongBook', initial: false }),
        },
        {
          icon: 'bookmark-outline',
          label: 'Saved Questions',
          onPress: () =>
            navigation.navigate('StudyTab', {
              screen: 'StudyMain',
              params: { initialTab: 'questionBank' },
            }),
        },
        {
          icon: 'flash-outline',
          label: 'Practice Sessions',
          onPress: () =>
            navigation.navigate('StudyTab', { screen: 'PracticeSessions', initial: false }),
        },
        {
          icon: 'calendar-outline',
          label: 'Study Plans',
          onPress: () =>
            navigation.navigate('StudyTab', { screen: 'StudyPlans', initial: false }),
        },
      ],
    },
  ];

  return (
    <ScreenWrapper>
      <ScrollView
        style={[tw`flex-1`, { backgroundColor: colors.background }]}
        contentContainerStyle={tw`pb-10`}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Profile Header ─────────────────────────── */}
        <View style={tw`items-center pt-6 pb-8 px-5`}>
          {/* Avatar */}
          <TouchableOpacity
            style={tw`mb-4 relative`}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.7}
          >
            <View
              style={[
                tw`w-24 h-24 rounded-full items-center justify-center border-2`,
                { borderColor: colors.primary, backgroundColor: colors.surface },
              ]}
            >
              {user?.profileImage ? (
                <Image
                  source={{ uri: user.profileImage }}
                  style={tw`w-full h-full rounded-full`}
                />
              ) : (
                <Text style={[tw`text-3xl font-bold`, { color: colors.primary }]}>
                  {getInitials(user?.name)}
                </Text>
              )}
            </View>
            {/* Edit badge — positioned outside overflow:hidden parent */}
            <View
              style={[
                tw`absolute -bottom-0.5 -right-0.5 w-8 h-8 rounded-full items-center justify-center border-2`,
                { backgroundColor: colors.primary, borderColor: colors.background },
              ]}
            >
              <Ionicons name="pencil" size={14} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={[tw`text-xl font-bold`, { color: colors.text }]}>
            {user?.name || 'User'}
          </Text>
          {user?.email && (
            <Text style={[tw`text-sm mt-0.5`, { color: colors.textSecondary }]}>
              {user.email}
            </Text>
          )}
          {user?.phoneNumber && (
            <Text style={[tw`text-xs mt-0.5`, { color: colors.textSecondary }]}>
              {user.phoneNumber}
            </Text>
          )}
        </View>

        {/* ─── Theme Picker ───────────────────────────── */}
        <View style={tw`px-5 mb-6`}>
          <Text
            style={[
              tw`text-xs font-semibold uppercase mb-2.5 px-1`,
              { color: colors.textSecondary, letterSpacing: 0.5 },
            ]}
          >
            Appearance
          </Text>
          <View
            style={[
              tw`flex-row rounded-2xl p-1 border`,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {THEME_OPTIONS.map(({ key, icon, label }) => {
              const isActive = theme === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    tw`flex-1 flex-row items-center justify-center py-2.5 rounded-xl gap-1.5`,
                    isActive && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => toggleTheme(key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={icon}
                    size={16}
                    color={isActive ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      tw`text-xs font-semibold`,
                      { color: isActive ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─── Menu Sections ──────────────────────────── */}
        {menuSections.map((section) => (
          <View key={section.title} style={tw`px-5 mb-5`}>
            <Text
              style={[
                tw`text-xs font-semibold uppercase mb-2.5 px-1`,
                { color: colors.textSecondary, letterSpacing: 0.5 },
              ]}
            >
              {section.title}
            </Text>
            <View
              style={[
                tw`rounded-2xl overflow-hidden border`,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    tw`flex-row items-center px-4 py-3.5`,
                    index < section.items.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      tw`w-8 h-8 rounded-xl items-center justify-center mr-3`,
                      { backgroundColor: colors.primary + '10' },
                    ]}
                  >
                    <Ionicons name={item.icon} size={18} color={colors.primary} />
                  </View>
                  <Text style={[tw`flex-1 text-sm font-medium`, { color: colors.text }]}>
                    {item.label}
                  </Text>
                  {item.badge ? (
                    <View
                      style={[
                        tw`px-2 py-0.5 rounded-full mr-1.5`,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={tw`text-xs font-bold text-white`}>{item.badge}</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* ─── App Info ───────────────────────────────── */}
        <View style={tw`px-5 mb-5`}>
          <Text
            style={[
              tw`text-xs font-semibold uppercase mb-2.5 px-1`,
              { color: colors.textSecondary, letterSpacing: 0.5 },
            ]}
          >
            About
          </Text>
          <View
            style={[
              tw`flex-row items-center justify-between px-4 py-3.5 rounded-2xl border`,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[tw`text-sm font-medium`, { color: colors.text }]}>Version</Text>
            <Text style={[tw`text-sm`, { color: colors.textSecondary }]}>1.0.0</Text>
          </View>
        </View>

        {/* ─── Logout ─────────────────────────────────── */}
        <View style={tw`px-5 mt-2`}>
          <TouchableOpacity
            style={[
              tw`flex-row items-center justify-center py-3.5 rounded-2xl border`,
              { borderColor: colors.error + '30', backgroundColor: colors.error + '08' },
            ]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={[tw`text-sm font-semibold ml-2`, { color: colors.error }]}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
