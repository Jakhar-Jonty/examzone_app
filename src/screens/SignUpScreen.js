import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/authService';

import { t as tr } from '../i18n';
const mark = require('../../assets/examzone_mark.png');

function StepDots({ current, total = 3 }) {
  const { colors } = useTheme();
  return (
    <View style={tw`flex-row items-center justify-center gap-2 mb-6`}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            tw`rounded-full`,
            i + 1 === current
              ? [tw`h-2.5 w-8`, { backgroundColor: colors.hero }]
              : i + 1 < current
                ? [tw`h-2 w-2`, { backgroundColor: colors.primary }]
                : [tw`h-2 w-2`, { backgroundColor: colors.border }],
          ]}
        />
      ))}
    </View>
  );
}

export default function SignUpScreen({ navigation }) {
  const { colors } = useTheme();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpHint, setOtpHint] = useState('');
  const [signupToken, setSignupToken] = useState('');

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const inputStyle = [
    tw`rounded-2xl px-4 py-3.5 text-base border`,
    { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
  ];
  const labelStyle = [tw`text-sm font-semibold mb-1.5`, { color: colors.text }];

  const handleSendOtp = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      Alert.alert(tr("Invalid email"), tr("Enter a valid email address"));
      return;
    }
    setLoading(true);
    try {
      const res = await authService.sendSignupOtp(clean);
      setEmail(clean);
      setOtpHint(
        res.debugOtp
          ? tr("Dev OTP: {0}", res.debugOtp)
          : res.mock
            ? tr("Check server logs for OTP")
            : ''
      );
      setOtp('');
      setStep(2);
      Alert.alert(tr("OTP sent"), res.message || tr("Check {0}", clean));
    } catch (error) {
      Alert.alert(tr("Could not send OTP"), error.response?.data?.message || tr("Please try again."));
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
      const res = await authService.verifySignupOtp({ email, otp: otp.trim() });
      setSignupToken(res.signupToken);
      setStep(3);
    } catch (error) {
      Alert.alert(tr("Verification failed"), error.response?.data?.message || tr("Invalid OTP"));
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (name.trim().length < 2) {
      Alert.alert(tr("Error"), tr("Enter your full name"));
      return;
    }
    if (password.length < 6) {
      Alert.alert(tr("Error"), tr("Password must be at least 6 characters"));
      return;
    }
    const phone = phoneNumber.trim();
    if (phone && phone.length < 10) {
      Alert.alert(tr("Error"), tr("Enter a valid 10-digit phone or leave blank"));
      return;
    }
    setLoading(true);
    try {
      const response = await authService.completeSignup({
        signupToken,
        name: name.trim(),
        password,
        ...(phone ? { phoneNumber: phone } : {}),
      });
      navigation.replace('Onboarding', { token: response.token, user: response.user });
    } catch (error) {
      Alert.alert(tr("Could not create account"), error.response?.data?.message || tr("Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    1: { h: tr("Create Account"), p: tr("Enter your email — we’ll send a one-time code.") },
    2: { h: tr("Verify email"), p: tr("Enter the OTP sent to {0}", email) },
    3: { h: tr("Almost done"), p: tr("Add your name and a password to finish.") },
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={tw`flex-grow px-6 pt-8 pb-10`} keyboardShouldPersistTaps="handled">
          <Image source={mark} style={tw`h-16 w-16 rounded-2xl mb-4`} resizeMode="cover" />
          <Text style={[tw`text-3xl font-extrabold mb-1`, { color: colors.text }]}>{titles[step].h}</Text>
          <Text style={[tw`text-sm mb-6`, { color: colors.textSecondary }]}>{titles[step].p}</Text>

          <StepDots current={step} />

          {step === 1 && (
            <View style={tw`gap-4`}>
              <View>
                <Text style={labelStyle}>{tr("Email")}</Text>
                <TextInput
                  style={inputStyle}
                  placeholder={tr("you@example.com")}
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <TouchableOpacity
                style={[tw`rounded-2xl py-4 items-center`, { backgroundColor: colors.hero, opacity: loading ? 0.7 : 1 }]}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.heroText} />
                ) : (
                  <Text style={[tw` font-bold text-base`, { color: colors.heroText }]}>{tr("Send OTP")}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View style={tw`gap-4`}>
              {otpHint ? (
                <Text style={[tw`text-sm`, { color: colors.text }]}>{otpHint}</Text>
              ) : null}
              <View>
                <Text style={labelStyle}>{tr("6-digit OTP")}</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="••••••"
                  placeholderTextColor={colors.textSecondary}
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              <TouchableOpacity
                style={[tw`rounded-2xl py-4 items-center`, { backgroundColor: colors.hero, opacity: loading ? 0.7 : 1 }]}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.heroText} />
                ) : (
                  <Text style={[tw` font-bold text-base`, { color: colors.heroText }]}>{tr("Verify email")}</Text>
                )}
              </TouchableOpacity>
              <View style={tw`flex-row justify-between`}>
                <TouchableOpacity
                  onPress={() => {
                    setStep(1);
                    setOtp('');
                    setOtpHint('');
                  }}
                  disabled={loading}
                >
                  <Text style={[tw`text-sm font-semibold`, { color: colors.textSecondary }]}>{tr("Change email")}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSendOtp} disabled={loading}>
                  <Text style={[tw`text-sm font-semibold`, { color: colors.text }]}>{tr("Resend OTP")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={tw`gap-4`}>
              <View>
                <Text style={labelStyle}>{tr("Full name")}</Text>
                <TextInput
                  style={inputStyle}
                  placeholder={tr("Your full name")}
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
              <View>
                <Text style={labelStyle}>{tr("Password")}</Text>
                <View
                  style={[
                    tw`flex-row items-center rounded-2xl border px-4`,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <TextInput
                    style={[tw`flex-1 py-3.5 text-base`, { color: colors.text }]}
                    placeholder={tr("Min 6 characters")}
                    placeholderTextColor={colors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                    <Text style={{ fontSize: 18 }}>{showPass ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View>
                <Text style={labelStyle}>{tr("Phone (optional)")}</Text>
                <TextInput
                  style={inputStyle}
                  placeholder={tr("10-digit mobile")}
                  placeholderTextColor={colors.textSecondary}
                  value={phoneNumber}
                  onChangeText={(v) => setPhoneNumber(v.replace(/\D/g, '').slice(0, 10))}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              <TouchableOpacity
                style={[tw`rounded-2xl py-4 items-center`, { backgroundColor: colors.hero, opacity: loading ? 0.7 : 1 }]}
                onPress={handleComplete}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.heroText} />
                ) : (
                  <Text style={[tw` font-bold text-base`, { color: colors.heroText }]}>{tr("Create account")}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {step === 1 && (
            <TouchableOpacity style={tw`mt-8 items-center`} onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                {tr("Already have an account?")}{' '}
                <Text style={{ color: colors.text, fontWeight: '700' }}>{tr("Sign In")}</Text>
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
