import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { API_URL } from '../services/api';
import StableTextInput from '../components/StableTextInput';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { t as tr } from '../i18n';

const logo = require('../../assets/examzone_logo.png');

const loginErrorMessage = (error) => {
  if (!error.response) {
    return tr("Cannot reach server ({0}). Check internet connection and try again.", API_URL);
  }
  return error.response.data?.message || tr("Login failed. Please try again.");
};

const looksLikeEmail = (v) => v.includes('@');

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const { login } = useAuth();
  const [mode, setMode] = useState('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpKey, setOtpKey] = useState(0); // bump to clear the OTP field
  const [otpHint, setOtpHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handlePasswordLogin = async () => {
    const id = identifier.trim();
    if (!id || !password.trim()) {
      Alert.alert(tr("Error"), tr("Please fill in all fields"));
      return;
    }
    if (password.length < 6) {
      Alert.alert(tr("Error"), tr("Password must be at least 6 characters"));
      return;
    }
    setLoading(true);
    try {
      const payload = looksLikeEmail(id)
        ? { email: id.toLowerCase(), password }
        : { phoneNumber: id, password };
      const response = await authService.login(payload);
      await login(response.token, response.user);
    } catch (error) {
      Alert.alert(tr("Login Failed"), loginErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const email = otpEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert(tr("Error"), tr("Enter a valid email"));
      return;
    }
    setLoading(true);
    try {
      const res = await authService.sendLoginOtp(email);
      setOtpHint(
        res.debugOtp
          ? tr("Dev OTP: {0}", res.debugOtp)
          : res.mock
            ? tr("Check server logs for OTP")
            : ''
      );
      setOtpSent(true);
      Alert.alert(tr("OTP sent"), res.message || tr("Check your email"));
    } catch (error) {
      Alert.alert(tr("Could not send OTP"), loginErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 6) {
      Alert.alert(tr("Error"), tr("Enter the 6-digit OTP"));
      return;
    }
    setLoading(true);
    try {
      const response = await authService.verifyLoginOtp({
        email: otpEmail.trim().toLowerCase(),
        otp: otp.trim(),
      });
      await login(response.token, response.user);
    } catch (error) {
      Alert.alert(tr("Verification failed"), loginErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>{tr("Welcome Back")}</Text>
            <Text style={styles.subtitle}>{tr("Password or email OTP")}</Text>
          </View>

          <View style={styles.tabs}>
            {[
              { id: 'password', label: tr("Password") },
              { id: 'otp', label: tr("Email OTP") },
            ].map((t) => {
              const active = mode === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => {
                    setMode(t.id);
                    setOtpSent(false);
                    setOtp('');
                    setOtpKey((k) => k + 1);
                    setOtpHint('');
                  }}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{tr(t.label)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.form}>
            {mode === 'password' ? (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>{tr("Phone or email")}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={tr("Phone number or email")}
                    placeholderTextColor={colors.textSecondary}
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <View style={styles.inputContainer}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>{tr("Password")}</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                      <Text style={styles.forgot}>{tr("Forgot?")}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder={tr("Enter your password")}
                      placeholderTextColor={colors.textSecondary}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                    >
                      <Text style={styles.eyeText}>{showPassword ? tr("Hide") : tr("Show")}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handlePasswordLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.heroText} />
                  ) : (
                    <Text style={styles.buttonText}>{tr("Sign In")}</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : !otpSent ? (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>{tr("Email")}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={tr("you@example.com")}
                    placeholderTextColor={colors.textSecondary}
                    value={otpEmail}
                    onChangeText={setOtpEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleSendOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.heroText} />
                  ) : (
                    <Text style={styles.buttonText}>{tr("Send OTP")}</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.hint}>{tr("OTP sent to {0}", otpEmail)}</Text>
                {otpHint ? <Text style={styles.devHint}>{otpHint}</Text> : null}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>{tr("OTP")}</Text>
                  <StableTextInput
                    resetKey={otpKey}
                    style={styles.input}
                    placeholder={tr("6-digit code")}
                    placeholderTextColor={colors.textSecondary}
                    value={otp}
                    onChangeText={setOtp}
                    transform={(v) => v.replace(/\D/g, '').slice(0, 6)}
                    textContentType="oneTimeCode"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.heroText} />
                  ) : (
                    <Text style={styles.buttonText}>{tr("Verify & Sign In")}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSendOtp} disabled={loading}>
                  <Text style={styles.linkCenter}>{tr("Resend OTP")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setOtpSent(false);
                    setOtp('');
                    setOtpKey((k) => k + 1);
                  }}
                >
                  <Text style={styles.linkMuted}>{tr("Change email")}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <GoogleSignInButton navigation={navigation} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>{tr("Don't have an account?")} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.footerLink}>{tr("Sign Up")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    content: { width: '100%', maxWidth: 420, alignSelf: 'center' },
    header: { alignItems: 'center', marginBottom: 20 },
    logo: { width: 88, height: 88, borderRadius: 20, marginBottom: 12 },
    title: { fontSize: 26, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    tabs: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceMuted,
      borderRadius: 12,
      padding: 4,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    tabActive: { backgroundColor: colors.hero },
    tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    tabTextActive: { color: colors.heroText },
    form: { gap: 4 },
    inputContainer: { marginBottom: 14 },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
    forgot: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingHorizontal: 14,
    },
    passwordInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.text },
    eyeButton: { paddingLeft: 8 },
    eyeText: { fontSize: 13, fontWeight: '600', color: colors.text },
    button: {
      backgroundColor: colors.hero,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: colors.heroText, fontSize: 16, fontWeight: '700' },
    hint: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
    devHint: { fontSize: 13, color: colors.text, marginBottom: 8 },
    linkCenter: {
      textAlign: 'center',
      marginTop: 14,
      color: colors.text,
      fontWeight: '600',
      fontSize: 14,
    },
    linkMuted: {
      textAlign: 'center',
      marginTop: 10,
      color: colors.textSecondary,
      fontSize: 13,
    },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
    footerText: { color: colors.textSecondary, fontSize: 14 },
    footerLink: { color: colors.text, fontWeight: '700', fontSize: 14 },
  });
