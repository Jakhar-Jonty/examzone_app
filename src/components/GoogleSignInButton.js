import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { t as tr } from '../i18n';

// The token is requested for the WEB client, which is what the server checks
// (GOOGLE_CLIENT_ID). Android only needs an Android OAuth client with this
// package name + signing SHA-1 to exist in the same Google Cloud project.
const WEB_CLIENT_ID = '724155815254-1a8798degtds7ekh2htcvles8dlgf4i6.apps.googleusercontent.com';

// iOS needs its own OAuth client + URL scheme, which we don't have yet;
// Expo Go doesn't include the native module (it works in real builds only)
export const googleSignInAvailable =
  Platform.OS === 'android' && Constants.executionEnvironment !== 'storeClient';

const getIdToken = async () => {
  // loaded lazily so a build without the native module can't crash at start-up
  const { GoogleSignin, isSuccessResponse } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  await GoogleSignin.signOut().catch(() => {}); // always show the account picker
  const res = await GoogleSignin.signIn();
  return isSuccessResponse(res) ? res.data.idToken : null; // null = cancelled
};

/** "Continue with Google" with an "or" divider; new accounts go to onboarding. */
export default function GoogleSignInButton({ navigation }) {
  const { colors } = useTheme();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!googleSignInAvailable) return null;

  const signIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const idToken = await getIdToken();
      if (!idToken) return;
      const res = await authService.google(idToken);
      if (res.isNewUser) navigation.replace('Onboarding', { token: res.token, user: res.user });
      else await login(res.token, res.user);
    } catch (e) {
      const code = e?.code;
      if (code === 'SIGN_IN_CANCELLED' || code === '12501') return;
      // DEVELOPER_ERROR (10): package name / SHA-1 not registered for this build
      Alert.alert(
        tr('Google sign-in failed'),
        tr(e?.response?.data?.message || (String(code) === '10' ? 'Google sign-in is not set up for this app build.' : 'Please try again.'))
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={tw`mt-6`}>
      <View style={tw`flex-row items-center mb-4`}>
        <View style={[tw`flex-1 h-px`, { backgroundColor: colors.border }]} />
        <Text style={[tw`mx-3 text-xs`, { color: colors.textSecondary }]}>{tr('or')}</Text>
        <View style={[tw`flex-1 h-px`, { backgroundColor: colors.border }]} />
      </View>
      <TouchableOpacity
        onPress={signIn}
        disabled={loading}
        activeOpacity={0.85}
        accessibilityRole="button"
        style={[
          tw`flex-row items-center justify-center h-14 rounded-2xl border`,
          { backgroundColor: colors.card, borderColor: colors.border, opacity: loading ? 0.7 : 1 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color={colors.text} />
            <Text style={[tw`ml-2 text-base font-bold`, { color: colors.text }]}>{tr('Continue with Google')}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
