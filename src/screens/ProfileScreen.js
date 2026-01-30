import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Switch,
  Alert,
  Image,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }) {
  const { colors, theme, toggleTheme, isDark } = useTheme();
  const { user, logout } = useAuth();
  const styles = createStyles(colors);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleSettings = () => {
    Alert.alert('Coming Soon', 'Settings feature will be available soon.');
  };

  const handleExamHistory = () => {
    navigation.navigate('ExamHistory');
  };

  const handleAnalytics = () => {
    navigation.navigate('Analytics');
  };

  const handleSavedQuestions = () => {
    // Navigate to Study tab with questionBank selected
    navigation.navigate('StudyStack', { 
      screen: 'StudyMain',
      params: { initialTab: 'questionBank' }
    });
  };

  const getThemeLabel = () => {
    if (theme === 'light') return 'Light';
    if (theme === 'dark') return 'Dark';
    return 'System';
  };

  const handleThemeChange = (newTheme) => {
    toggleTheme(newTheme);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleEditProfile}
            activeOpacity={0.7}
          >
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={48} color={colors.primary} />
            )}
            <View style={styles.editAvatarBadge}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userPhone}>{user?.phoneNumber || ''}</Text>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="color-palette-outline" size={24} color={colors.text} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Theme</Text>
                <Text style={styles.settingDescription}>Current: {getThemeLabel()}</Text>
              </View>
            </View>
          </View>

          {/* Theme Options */}
          <View style={styles.themeOptions}>
            <TouchableOpacity
              style={[
                styles.themeOption,
                theme === 'light' && styles.themeOptionActive,
              ]}
              onPress={() => handleThemeChange('light')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="sunny" 
                size={24} 
                color={theme === 'light' ? colors.primary : colors.textSecondary} 
              />
              <Text style={[
                styles.themeOptionText,
                theme === 'light' && styles.themeOptionTextActive,
              ]}>
                Light
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                theme === 'dark' && styles.themeOptionActive,
              ]}
              onPress={() => handleThemeChange('dark')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="moon" 
                size={24} 
                color={theme === 'dark' ? colors.primary : colors.textSecondary} 
              />
              <Text style={[
                styles.themeOptionText,
                theme === 'dark' && styles.themeOptionTextActive,
              ]}>
                Dark
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                theme === 'system' && styles.themeOptionActive,
              ]}
              onPress={() => handleThemeChange('system')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="phone-portrait-outline" 
                size={24} 
                color={theme === 'system' ? colors.primary : colors.textSecondary} 
              />
              <Text style={[
                styles.themeOptionText,
                theme === 'system' && styles.themeOptionTextActive,
              ]}>
                System
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile} activeOpacity={0.7}>
            <Ionicons name="person-outline" size={24} color={colors.text} />
            <Text style={styles.menuText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleSettings} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={24} color={colors.text} />
            <Text style={styles.menuText}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Study</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleExamHistory} activeOpacity={0.7}>
            <Ionicons name="time-outline" size={24} color={colors.text} />
            <Text style={styles.menuText}>Exam History</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleAnalytics} activeOpacity={0.7}>
            <Ionicons name="analytics-outline" size={24} color={colors.text} />
            <Text style={styles.menuText}>Analytics</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleSavedQuestions} activeOpacity={0.7}>
            <Ionicons name="bookmark-outline" size={24} color={colors.text} />
            <Text style={styles.menuText}>Saved Questions</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={24} color={colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      paddingBottom: 40,
    },
    header: {
      alignItems: 'center',
      marginBottom: 32,
      paddingTop: 20,
    },
    avatarContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 3,
      borderColor: colors.primary,
      position: 'relative',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    editAvatarBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.primary,
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },
    userName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    userPhone: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    settingItem: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    settingTextContainer: {
      marginLeft: 16,
      flex: 1,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    themeOptions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    themeOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      gap: 8,
    },
    themeOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '20',
    },
    themeOptionText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    themeOptionTextActive: {
      color: colors.primary,
    },
    menuSection: {
      marginBottom: 24,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    menuText: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      marginLeft: 16,
    },
    infoItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoLabel: {
      fontSize: 16,
      color: colors.text,
    },
    infoValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.error + '40',
      marginTop: 20,
    },
    logoutText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.error,
      marginLeft: 8,
    },
  });
