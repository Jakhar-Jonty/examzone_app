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
  const { user, logout } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const menuSections = [
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
          onPress: () => Alert.alert('Coming Soon', 'Notifications settings coming soon.'),
          badge: null,
        },
      ],
    },
    {
      title: 'Study',
      items: [
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
          icon: 'bookmark-outline',
          label: 'Saved Questions',
          onPress: () =>
            navigation.navigate('StudyTab', {
              screen: 'StudyMain',
              params: { initialTab: 'questionBank' },
            }),
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






// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   Alert,
//   Image,
// } from 'react-native';
// import ScreenWrapper from '../components/ScreenWrapper';
// import { useTheme } from '../context/ThemeContext';
// import { useAuth } from '../context/AuthContext';
// import { Ionicons } from '@expo/vector-icons';

// export default function ProfileScreen({ navigation }) {
//   const { colors, theme, toggleTheme, isDark } = useTheme();
//   const { user, logout } = useAuth();
//   const styles = createStyles(colors);

//   const handleLogout = async () => {
//     Alert.alert(
//       'Logout',
//       'Are you sure you want to logout?',
//       [
//         {
//           text: 'Cancel',
//           style: 'cancel',
//         },
//         {
//           text: 'Logout',
//           style: 'destructive',
//           onPress: async () => {
//             await logout();
//           },
//         },
//       ]
//     );
//   };

//   const handleEditProfile = () => {
//     navigation.navigate('EditProfile');
//   };

//   const handleSettings = () => {
//     Alert.alert('Coming Soon', 'Settings feature will be available soon.');
//   };

//   const handleExamHistory = () => {
//     navigation.navigate('ExamHistory');
//   };

//   const handleAnalytics = () => {
//     navigation.navigate('Analytics');
//   };

//   const handleSavedQuestions = () => {
//     // Navigate to Study tab with questionBank selected
//     navigation.navigate('StudyStack', {
//       screen: 'StudyMain',
//       params: { initialTab: 'questionBank' }
//     });
//   };

//   const getThemeLabel = () => {
//     if (theme === 'light') return 'Light';
//     if (theme === 'dark') return 'Dark';
//     return 'System';
//   };

//   const handleThemeChange = (newTheme) => {
//     toggleTheme(newTheme);
//   };

//   return (
//     <ScreenWrapper>
//       <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
//         {/* Profile Header */}
//         <View style={styles.header}>
//           <TouchableOpacity
//             style={styles.avatarContainer}
//             onPress={handleEditProfile}
//             activeOpacity={0.7}
//           >
//             {user?.profileImage ? (
//               <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
//             ) : (
//               <Ionicons name="person" size={48} color={colors.primary} />
//             )}
//             <View style={styles.editAvatarBadge}>
//               <Ionicons name="camera" size={16} color="#FFFFFF" />
//             </View>
//           </TouchableOpacity>
//           <Text style={styles.userName}>{user?.name || 'User'}</Text>
//           <Text style={styles.userPhone}>{user?.phoneNumber || ''}</Text>
//         </View>

//         {/* Settings Section */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Appearance</Text>

//           <View style={styles.settingItem}>
//             <View style={styles.settingLeft}>
//               <Ionicons name="color-palette-outline" size={24} color={colors.text} />
//               <View style={styles.settingTextContainer}>
//                 <Text style={styles.settingLabel}>Theme</Text>
//                 <Text style={styles.settingDescription}>Current: {getThemeLabel()}</Text>
//               </View>
//             </View>
//           </View>

//           {/* Theme Options */}
//           <View style={styles.themeOptions}>
//             <TouchableOpacity
//               style={[
//                 styles.themeOption,
//                 theme === 'light' && styles.themeOptionActive,
//               ]}
//               onPress={() => handleThemeChange('light')}
//               activeOpacity={0.7}
//             >
//               <Ionicons
//                 name="sunny"
//                 size={24}
//                 color={theme === 'light' ? colors.primary : colors.textSecondary}
//               />
//               <Text style={[
//                 styles.themeOptionText,
//                 theme === 'light' && styles.themeOptionTextActive,
//               ]}>
//                 Light
//               </Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={[
//                 styles.themeOption,
//                 theme === 'dark' && styles.themeOptionActive,
//               ]}
//               onPress={() => handleThemeChange('dark')}
//               activeOpacity={0.7}
//             >
//               <Ionicons
//                 name="moon"
//                 size={24}
//                 color={theme === 'dark' ? colors.primary : colors.textSecondary}
//               />
//               <Text style={[
//                 styles.themeOptionText,
//                 theme === 'dark' && styles.themeOptionTextActive,
//               ]}>
//                 Dark
//               </Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={[
//                 styles.themeOption,
//                 theme === 'system' && styles.themeOptionActive,
//               ]}
//               onPress={() => handleThemeChange('system')}
//               activeOpacity={0.7}
//             >
//               <Ionicons
//                 name="phone-portrait-outline"
//                 size={24}
//                 color={theme === 'system' ? colors.primary : colors.textSecondary}
//               />
//               <Text style={[
//                 styles.themeOptionText,
//                 theme === 'system' && styles.themeOptionTextActive,
//               ]}>
//                 System
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </View>

//         {/* Menu Items */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Account</Text>

//           <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile} activeOpacity={0.7}>
//             <Ionicons name="person-outline" size={24} color={colors.text} />
//             <Text style={styles.menuText}>Edit Profile</Text>
//             <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
//           </TouchableOpacity>

//           <TouchableOpacity style={styles.menuItem} onPress={handleSettings} activeOpacity={0.7}>
//             <Ionicons name="settings-outline" size={24} color={colors.text} />
//             <Text style={styles.menuText}>Settings</Text>
//             <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
//           </TouchableOpacity>
//         </View>

//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Study</Text>

//           <TouchableOpacity style={styles.menuItem} onPress={handleExamHistory} activeOpacity={0.7}>
//             <Ionicons name="time-outline" size={24} color={colors.text} />
//             <Text style={styles.menuText}>Exam History</Text>
//             <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
//           </TouchableOpacity>

//           <TouchableOpacity style={styles.menuItem} onPress={handleAnalytics} activeOpacity={0.7}>
//             <Ionicons name="analytics-outline" size={24} color={colors.text} />
//             <Text style={styles.menuText}>Analytics</Text>
//             <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
//           </TouchableOpacity>

//           <TouchableOpacity style={styles.menuItem} onPress={handleSavedQuestions} activeOpacity={0.7}>
//             <Ionicons name="bookmark-outline" size={24} color={colors.text} />
//             <Text style={styles.menuText}>Saved Questions</Text>
//             <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
//           </TouchableOpacity>
//         </View>

//         {/* App Info */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>About</Text>

//           <View style={styles.infoItem}>
//             <Text style={styles.infoLabel}>App Version</Text>
//             <Text style={styles.infoValue}>1.0.0</Text>
//           </View>
//         </View>

//         {/* Logout Button */}
//         <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
//           <Ionicons name="log-out-outline" size={24} color={colors.error} />
//           <Text style={styles.logoutText}>Logout</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     </ScreenWrapper>
//   );
// }

// const createStyles = (colors) =>
//   StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: colors.background,
//     },
//     content: {
//       padding: 20,
//       paddingBottom: 40,
//     },
//     header: {
//       alignItems: 'center',
//       marginBottom: 32,
//       paddingTop: 20,
//     },
//     avatarContainer: {
//       width: 100,
//       height: 100,
//       borderRadius: 50,
//       backgroundColor: colors.surface,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginBottom: 16,
//       borderWidth: 3,
//       borderColor: colors.primary,
//       position: 'relative',
//       overflow: 'hidden',
//     },
//     avatarImage: {
//       width: '100%',
//       height: '100%',
//     },
//     editAvatarBadge: {
//       position: 'absolute',
//       bottom: 0,
//       right: 0,
//       backgroundColor: colors.primary,
//       width: 32,
//       height: 32,
//       borderRadius: 16,
//       justifyContent: 'center',
//       alignItems: 'center',
//       borderWidth: 2,
//       borderColor: colors.background,
//     },
//     userName: {
//       fontSize: 24,
//       fontWeight: 'bold',
//       color: colors.text,
//       marginBottom: 4,
//     },
//     userPhone: {
//       fontSize: 14,
//       color: colors.textSecondary,
//     },
//     section: {
//       marginBottom: 24,
//     },
//     sectionTitle: {
//       fontSize: 14,
//       fontWeight: '600',
//       color: colors.textSecondary,
//       textTransform: 'uppercase',
//       letterSpacing: 0.5,
//       marginBottom: 12,
//       paddingHorizontal: 4,
//     },
//     settingItem: {
//       backgroundColor: colors.surface,
//       borderRadius: 16,
//       padding: 16,
//       marginBottom: 12,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     settingLeft: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     settingTextContainer: {
//       marginLeft: 16,
//       flex: 1,
//     },
//     settingLabel: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: colors.text,
//       marginBottom: 4,
//     },
//     settingDescription: {
//       fontSize: 14,
//       color: colors.textSecondary,
//     },
//     themeOptions: {
//       flexDirection: 'row',
//       gap: 12,
//       marginTop: 8,
//     },
//     themeOption: {
//       flex: 1,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'center',
//       paddingVertical: 14,
//       paddingHorizontal: 12,
//       borderRadius: 12,
//       backgroundColor: colors.surface,
//       borderWidth: 2,
//       borderColor: colors.border,
//       gap: 8,
//     },
//     themeOptionActive: {
//       borderColor: colors.primary,
//       backgroundColor: colors.primary + '20',
//     },
//     themeOptionText: {
//       fontSize: 14,
//       fontWeight: '600',
//       color: colors.textSecondary,
//     },
//     themeOptionTextActive: {
//       color: colors.primary,
//     },
//     menuSection: {
//       marginBottom: 24,
//     },
//     menuItem: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: colors.surface,
//       borderRadius: 16,
//       padding: 16,
//       marginBottom: 12,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     menuText: {
//       flex: 1,
//       fontSize: 16,
//       color: colors.text,
//       marginLeft: 16,
//     },
//     infoItem: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       backgroundColor: colors.surface,
//       borderRadius: 16,
//       padding: 16,
//       marginBottom: 12,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     infoLabel: {
//       fontSize: 16,
//       color: colors.text,
//     },
//     infoValue: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: colors.textSecondary,
//     },
//     logoutButton: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: colors.surface,
//       borderRadius: 16,
//       padding: 16,
//       borderWidth: 1,
//       borderColor: colors.error + '40',
//       marginTop: 20,
//     },
//     logoutText: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: colors.error,
//       marginLeft: 8,
//     },
//   });
