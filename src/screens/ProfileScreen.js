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
import { t as tr } from '../i18n';

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
    Alert.alert(tr("Logout"), tr("Are you sure you want to logout?"), [
      { text: tr("Cancel"), style: 'cancel' },
      { text: tr("Logout"), style: 'destructive', onPress: () => logout() },
    ]);
  };

  const menuSections = [
    {
      title: tr("Membership"),
      items: [
        {
          icon: isPremium ? 'diamond' : 'diamond-outline',
          label: isPremium ? tr("Premium Active") : tr("Go Premium"),
          onPress: () => navigation.navigate('Paywall'),
          badge: isPremium ? null : tr("Upgrade"),
        },
      ],
    },
    {
      title: tr("Account"),
      items: [
        {
          icon: 'person-outline',
          label: tr("Edit Profile"),
          onPress: () => navigation.navigate('EditProfile'),
        },
        {
          icon: 'notifications-outline',
          label: tr("Notifications"),
          onPress: () => navigation.navigate('Notifications'),
        },
      ],
    },
    {
      title: tr("Study"),
      items: [
        {
          icon: 'gift-outline',
          label: tr("Refer & earn"),
          onPress: () => navigation.navigate('Refer'),
        },
        {
          icon: 'trophy-outline',
          label: tr("Leaderboard"),
          onPress: () => navigation.navigate('Leaderboard'),
        },
        {
          icon: 'ribbon-outline',
          label: tr("Badges"),
          onPress: () => navigation.navigate('Badges'),
        },
        {
          icon: 'time-outline',
          label: tr("Exam History"),
          onPress: () => navigation.navigate('ExamHistory'),
        },
        {
          icon: 'analytics-outline',
          label: tr("Analytics"),
          onPress: () => navigation.navigate('Analytics'),
        },
        {
          icon: 'book-outline',
          label: tr("Wrong Book"),
          onPress: () =>
            navigation.navigate('StudyTab', { screen: 'WrongBook', initial: false }),
        },
        {
          icon: 'bookmark-outline',
          label: tr("Saved Questions"),
          onPress: () =>
            navigation.navigate('StudyTab', {
              screen: 'StudyMain',
              params: { initialTab: 'questionBank' },
            }),
        },
        {
          icon: 'flash-outline',
          label: tr("Practice Sessions"),
          onPress: () =>
            navigation.navigate('StudyTab', { screen: 'PracticeSessions', initial: false }),
        },
        {
          icon: 'calendar-outline',
          label: tr("Study Plans"),
          onPress: () =>
            navigation.navigate('StudyTab', { screen: 'StudyPlans', initial: false }),
        },
      ],
    },
  ];

  return (
    <ScreenWrapper>
      <ScrollView
        style={[tw`flex-1`, { backgroundColor: colors.surface }]}
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
                { borderColor: colors.hero, backgroundColor: colors.card },
              ]}
            >
              {user?.profileImage ? (
                <Image
                  source={{ uri: user.profileImage }}
                  style={tw`w-full h-full rounded-full`}
                />
              ) : (
                <Text style={[tw`text-3xl font-bold`, { color: colors.text }]}>
                  {getInitials(user?.name)}
                </Text>
              )}
            </View>
            {/* Edit badge — positioned outside overflow:hidden parent */}
            <View
              style={[
                tw`absolute -bottom-0.5 -right-0.5 w-8 h-8 rounded-full items-center justify-center border-2`,
                { backgroundColor: colors.hero, borderColor: colors.card },
              ]}
            >
              <Ionicons name="pencil" size={14} color={colors.heroText} />
            </View>
          </TouchableOpacity>

          <Text style={[tw`text-xl font-bold`, { color: colors.text }]}>
            {user?.name || tr("User")}
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
            {tr("Appearance")}
          </Text>
          <View
            style={[
              tw`flex-row rounded-2xl p-1 border`,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {THEME_OPTIONS.map(({ key, icon, label }) => {
              const isActive = theme === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    tw`flex-1 flex-row items-center justify-center py-2.5 rounded-xl gap-1.5`,
                    isActive && { backgroundColor: colors.cardMuted },
                  ]}
                  onPress={() => toggleTheme(key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={icon}
                    size={16}
                    color={isActive ? colors.text : colors.textSecondary}
                  />
                  <Text
                    style={[
                      tw`text-xs font-semibold`,
                      { color: isActive ? colors.text : colors.textSecondary },
                    ]}
                  >
                    {tr(label)}
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
                { backgroundColor: colors.card, borderColor: colors.border },
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
                      { backgroundColor: colors.cardMuted },
                    ]}
                  >
                    <Ionicons name={item.icon} size={18} color={colors.text} />
                  </View>
                  <Text style={[tw`flex-1 text-sm font-medium`, { color: colors.text }]}>
                    {tr(item.label)}
                  </Text>
                  {item.badge ? (
                    <View
                      style={[
                        tw`px-2 py-0.5 rounded-full mr-1.5`,
                        { backgroundColor: colors.hero },
                      ]}
                    >
                      <Text style={[tw`text-xs font-bold`, { color: colors.heroText }]}>{item.badge}</Text>
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
            {tr("About")}
          </Text>
          <View
            style={[
              tw`flex-row items-center justify-between px-4 py-3.5 rounded-2xl border`,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[tw`text-sm font-medium`, { color: colors.text }]}>{tr("Version")}</Text>
            <Text style={[tw`text-sm`, { color: colors.textSecondary }]}>1.0.0</Text>
          </View>
        </View>

        {/* ─── Logout ─────────────────────────────────── */}
        <View style={tw`px-5 mt-2`}>
          <TouchableOpacity
            style={[
              tw`flex-row items-center justify-center py-3.5 rounded-2xl border`,
              { borderColor: colors.tones.red.fg, backgroundColor: colors.tones.red.bg },
            ]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={[tw`text-sm font-semibold ml-2`, { color: colors.error }]}>
              {tr("Logout")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
