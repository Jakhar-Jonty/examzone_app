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
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

export default function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const { login } = useAuth();
  const styles = createStyles(colors);

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    const value = email.trim().toLowerCase();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      Alert.alert('Error', 'Enter a valid email');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.forgotPassword(value);
      setHint(
        res.debugOtp
          ? `Dev OTP: ${res.debugOtp}`
          : res.mock
            ? 'Check server logs for OTP'
            : ''
      );
      setStep(2);
      Alert.alert('Check your email', res.message || 'OTP sent if account exists');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (otp.trim().length !== 6) {
      Alert.alert('Error', 'Enter the 6-digit OTP');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.resetPassword({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        password,
      });
      await login(res.token, res.user);
    } catch (error) {
      Alert.alert('Reset failed', error.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Forgot password</Text>
        <Text style={styles.sub}>
          {step === 1
            ? 'Enter the email on your account'
            : `Enter OTP sent to ${email} and a new password`}
        </Text>

        {step === 1 ? (
          <>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={sendOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.heroText} />
              ) : (
                <Text style={styles.btnText}>Send email OTP</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {hint ? <Text style={styles.hint}>{hint}</Text> : null}
            <Text style={styles.label}>OTP</Text>
            <TextInput
              style={styles.input}
              placeholder="6-digit code"
              placeholderTextColor={colors.textSecondary}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
            />
            <Text style={styles.label}>New password</Text>
            <TextInput
              style={styles.input}
              placeholder="Min 6 characters"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              placeholder="Repeat password"
              placeholderTextColor={colors.textSecondary}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={resetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.heroText} />
              ) : (
                <Text style={styles.btnText}>Reset password</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={sendOtp} disabled={loading}>
              <Text style={styles.link}>Resend OTP</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep(1)}>
              <Text style={styles.linkMuted}>Change email</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    scroll: { padding: 24, paddingTop: 56 },
    back: { marginBottom: 16 },
    backText: { color: colors.text, fontWeight: '600', fontSize: 15 },
    title: { fontSize: 26, fontWeight: '800', color: colors.text },
    sub: { fontSize: 14, color: colors.textSecondary, marginTop: 6, marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 10 },
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
    btn: {
      backgroundColor: colors.hero,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 20,
    },
    btnDisabled: { opacity: 0.7 },
    btnText: { color: colors.heroText, fontWeight: '700', fontSize: 16 },
    hint: { color: colors.text, marginBottom: 8, fontSize: 13 },
    link: {
      textAlign: 'center',
      marginTop: 16,
      color: colors.text,
      fontWeight: '600',
    },
    linkMuted: {
      textAlign: 'center',
      marginTop: 10,
      color: colors.textSecondary,
      fontSize: 13,
    },
  });
