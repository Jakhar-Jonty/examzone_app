import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/authService';
import { useCategories } from '../hooks/useCategories';

const GENDERS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer-not-to-say' },
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Chandigarh',
];

function StepDots({ current, total }) {
  return (
    <View style={tw`flex-row items-center justify-center gap-2 mb-6`}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            tw`rounded-full`,
            i + 1 === current
              ? tw`h-2.5 w-8 bg-green-600`
              : i + 1 < current
              ? tw`h-2 w-2 bg-green-400`
              : tw`h-2 w-2 bg-gray-200`,
          ]}
        />
      ))}
    </View>
  );
}

export default function SignUpScreen({ navigation }) {
  const { colors } = useTheme();
  const { categories, loading: catLoading } = useCategories();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showStateList, setShowStateList] = useState(false);

  const [form, setForm] = useState({
    phoneNumber: '',
    name: '',
    password: '',
    confirmPassword: '',
    examPreparations: [],
    preferredLanguage: 'English',
    gender: '',
    state: '',
    dateOfBirth: '',
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const toggleExam = (code) => {
    set('examPreparations', form.examPreparations.includes(code)
      ? form.examPreparations.filter((e) => e !== code)
      : [...form.examPreparations, code]);
  };

  const validateStep1 = () => {
    if (!form.phoneNumber.trim() || form.phoneNumber.length < 10) {
      Alert.alert('Error', 'Enter a valid 10-digit phone number'); return false;
    }
    if (!form.name.trim() || form.name.length < 2) {
      Alert.alert('Error', 'Enter your full name'); return false;
    }
    if (form.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters'); return false;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match'); return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (form.examPreparations.length === 0) {
      Alert.alert('Error', 'Select at least one exam'); return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const extras = {};
      if (form.gender) extras.gender = form.gender;
      if (form.state) extras.state = form.state;
      if (form.dateOfBirth) extras.dateOfBirth = form.dateOfBirth;

      const response = await authService.register(
        form.phoneNumber.trim(),
        form.password,
        form.name.trim(),
        form.examPreparations.filter(Boolean),
        form.preferredLanguage,
        extras,
      );
      // Navigate to Onboarding BEFORE calling login — keeps user in auth stack
      navigation.replace('Onboarding', { token: response.token, user: response.user });
    } catch (error) {
      Alert.alert('Registration Failed', error.response?.data?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [tw`rounded-2xl px-4 py-3.5 text-base border`, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }];
  const labelStyle = [tw`text-sm font-semibold mb-1.5`, { color: colors.text }];
  const chipBase = [tw`px-4 py-2.5 rounded-2xl border mr-2 mb-2`, { borderColor: colors.border, backgroundColor: colors.surface }];
  const chipSel = [tw`px-4 py-2.5 rounded-2xl border mr-2 mb-2`, { borderColor: colors.primary, backgroundColor: colors.primary }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={tw`flex-grow px-6 pt-8 pb-10`} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <Text style={[tw`text-3xl font-extrabold mb-1`, { color: colors.text }]}>
            {step === 1 ? 'Create Account' : step === 2 ? 'Your Goals' : 'About You'}
          </Text>
          <Text style={[tw`text-sm mb-6`, { color: colors.textSecondary }]}>
            {step === 1 ? 'Fill in your credentials to get started' : step === 2 ? 'What exams are you preparing for?' : 'Optional — you can skip and fill later'}
          </Text>

          <StepDots current={step} total={3} />

          {/* ── Step 1: Credentials ── */}
          {step === 1 && (
            <View style={tw`gap-4`}>
              <View>
                <Text style={labelStyle}>Phone Number *</Text>
                <TextInput style={inputStyle} placeholder="10-digit mobile number" placeholderTextColor={colors.textSecondary} value={form.phoneNumber} onChangeText={(v) => set('phoneNumber', v)} keyboardType="phone-pad" />
              </View>
              <View>
                <Text style={labelStyle}>Full Name *</Text>
                <TextInput style={inputStyle} placeholder="Your full name" placeholderTextColor={colors.textSecondary} value={form.name} onChangeText={(v) => set('name', v)} autoCapitalize="words" />
              </View>
              <View>
                <Text style={labelStyle}>Password *</Text>
                <View style={[tw`flex-row items-center rounded-2xl border px-4`, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput style={[tw`flex-1 py-3.5 text-base`, { color: colors.text }]} placeholder="Min 6 characters" placeholderTextColor={colors.textSecondary} value={form.password} onChangeText={(v) => set('password', v)} secureTextEntry={!showPass} autoCapitalize="none" />
                  <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                    <Text style={{ fontSize: 18 }}>{showPass ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View>
                <Text style={labelStyle}>Confirm Password *</Text>
                <View style={[tw`flex-row items-center rounded-2xl border px-4`, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput style={[tw`flex-1 py-3.5 text-base`, { color: colors.text }]} placeholder="Repeat password" placeholderTextColor={colors.textSecondary} value={form.confirmPassword} onChangeText={(v) => set('confirmPassword', v)} secureTextEntry={!showConfirm} autoCapitalize="none" />
                  <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                    <Text style={{ fontSize: 18 }}>{showConfirm ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* ── Step 2: Exam Goals ── */}
          {step === 2 && (
            <View>
              {catLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={tw`py-8`} />
              ) : (
                <View style={tw`flex-row flex-wrap`}>
                  {categories.map((cat) => {
                    const sel = form.examPreparations.includes(cat.code);
                    return (
                      <TouchableOpacity key={cat._id} style={sel ? chipSel : chipBase} onPress={() => toggleExam(cat.code)}>
                        <Text style={[tw`text-sm font-semibold`, { color: sel ? '#fff' : colors.text }]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* ── Step 3: Profile ── */}
          {step === 3 && (
            <View style={tw`gap-4`}>
              {/* Language */}
              <View>
                <Text style={labelStyle}>Preferred Language</Text>
                <View style={tw`flex-row gap-2`}>
                  {['English', 'Hindi', 'Both'].map((lang) => {
                    const sel = form.preferredLanguage === lang;
                    return (
                      <TouchableOpacity key={lang} style={[tw`flex-1 py-3 rounded-2xl border items-center`, { backgroundColor: sel ? colors.primary : colors.surface, borderColor: sel ? colors.primary : colors.border }]} onPress={() => set('preferredLanguage', lang)}>
                        <Text style={[tw`text-sm font-semibold`, { color: sel ? '#fff' : colors.text }]}>{lang}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Gender */}
              <View>
                <Text style={labelStyle}>Gender (Optional)</Text>
                <View style={tw`flex-row flex-wrap`}>
                  {GENDERS.map((g) => {
                    const sel = form.gender === g.value;
                    return (
                      <TouchableOpacity key={g.value} style={[sel ? chipSel : chipBase]} onPress={() => set('gender', sel ? '' : g.value)}>
                        <Text style={[tw`text-sm font-semibold`, { color: sel ? '#fff' : colors.text }]}>{g.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* State */}
              <View>
                <Text style={labelStyle}>State (Optional)</Text>
                <TouchableOpacity style={inputStyle} onPress={() => setShowStateList(!showStateList)}>
                  <Text style={{ color: form.state ? colors.text : colors.textSecondary }}>{form.state || 'Select your state'}</Text>
                </TouchableOpacity>
                {showStateList && (
                  <View style={[tw`rounded-2xl border mt-1 overflow-hidden`, { backgroundColor: colors.surface, borderColor: colors.border, maxHeight: 160 }]}>
                    <ScrollView nestedScrollEnabled>
                      {INDIAN_STATES.map((s) => (
                        <TouchableOpacity key={s} style={[tw`px-4 py-3 border-b`, { borderBottomColor: colors.border }]} onPress={() => { set('state', s); setShowStateList(false); }}>
                          <Text style={[{ color: form.state === s ? colors.primary : colors.text, fontWeight: form.state === s ? '700' : '400' }]}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* DOB */}
              <View>
                <Text style={labelStyle}>Date of Birth (Optional)</Text>
                <TextInput style={inputStyle} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} value={form.dateOfBirth} onChangeText={(v) => set('dateOfBirth', v)} keyboardType="numeric" />
              </View>
            </View>
          )}

          {/* Nav buttons */}
          <View style={tw`flex-row gap-3 mt-8`}>
            {step > 1 && (
              <TouchableOpacity style={[tw`flex-1 py-4 rounded-2xl border items-center`, { borderColor: colors.border }]} onPress={() => setStep((s) => s - 1)}>
                <Text style={[tw`text-base font-bold`, { color: colors.text }]}>← Back</Text>
              </TouchableOpacity>
            )}
            {step < 3 ? (
              <TouchableOpacity style={[tw`flex-1 py-4 rounded-2xl items-center`, { backgroundColor: colors.primary }]} onPress={handleNext}>
                <Text style={[tw`text-base font-bold`, { color: '#fff' }]}>Continue →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[tw`flex-1 py-4 rounded-2xl items-center`, { backgroundColor: loading ? '#86efac' : colors.primary }]} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={[tw`text-base font-bold`, { color: '#fff' }]}>Create Account 🎉</Text>}
              </TouchableOpacity>
            )}
          </View>

          {step === 1 && (
            <TouchableOpacity style={tw`mt-6 items-center`} onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                Already have an account? <Text style={{ color: colors.primary, fontWeight: '700' }}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
