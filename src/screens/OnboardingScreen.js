import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFocusExam, useSubExam } from '../context/AppConfigContext';
import api from '../services/api';
import StableTextInput from '../components/StableTextInput';
import { t as tr, setLanguage } from '../i18n';

const mark = require('../../assets/examzone_mark.png');

const GOALS = [
  { value: 1, label: 'Light', sub: '1 test a day' },
  { value: 3, label: 'Regular', sub: '3 tests a day' },
  { value: 5, label: 'Serious', sub: '5+ tests a day' },
];

const FEATURES = [
  { icon: 'map-outline', label: 'Haryana GK', sub: 'Topic tests' },
  { icon: 'trophy-outline', label: 'Sunday live mock', sub: 'Your Haryana rank' },
  { icon: 'newspaper-outline', label: 'Current affairs', sub: 'Every day' },
  { icon: 'language-outline', label: 'Hindi + English', sub: 'Every question' },
];

const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * First run after sign-up: study language (switches the app right away),
 * which exam, daily goal and an optional friend's code — then Home, where
 * today's quiz is one tap away.
 */
export default function OnboardingScreen({ route }) {
  const { token, user } = route.params;
  const { login } = useAuth();
  const { colors } = useTheme();
  const focus = useFocusExam();
  const { options: subExams, select: selectSubExam } = useSubExam();
  // HSSC students mostly study in Hindi, so Hindi is pre-selected (one tap to switch)
  const [lang, setLang] = useState('Hindi');
  // App.js sets the UI language from the signed-in user, who doesn't exist yet;
  // re-apply the choice on every render of this (only visible) screen
  setLanguage(lang);
  const [subExam, setSubExam] = useState(null);
  const [goal, setGoal] = useState(3);
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [loading, setLoading] = useState(false);

  // switch the UI immediately so the student sees the choice take effect
  const chooseLanguage = (value) => setLang(value);

  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const finish = async () => {
    setLoading(true);
    setCodeError('');
    let nextUser = user;
    try {
      if (code.trim()) {
        try {
          await api.post('/referral/apply', { code: code.trim() }, auth);
        } catch (e) {
          setCodeError(tr(e?.response?.data?.message || 'This referral code is not valid.'));
          setLoading(false);
          return;
        }
      }
      const res = await api.put('/user/profile', { preferredLanguage: lang, preferences: { dailyTestGoal: goal } }, auth).catch(() => null);
      nextUser = res?.data?.user || { ...user, preferredLanguage: lang };
      await AsyncStorage.setItem('@dailyGoal', String(goal)).catch(() => {});
      if (subExam) selectSubExam(subExam);
    } finally {
      // login() switches the navigator to the app (Home)
      await login(token, nextUser);
    }
  };

  const card = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };
  const chip = (on) =>
    on ? { backgroundColor: colors.hero, borderColor: colors.hero } : { backgroundColor: colors.card, borderColor: colors.border };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={tw`px-5 pb-10`} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Welcome */}
        <View style={[tw`mt-3 p-5 rounded-3xl`, { backgroundColor: colors.hero }]}>
          <View style={tw`flex-row items-center`}>
            <Image source={mark} style={tw`h-11 w-11 rounded-xl`} resizeMode="cover" />
            <View style={tw`ml-3 flex-1`}>
              <Text style={[tw`text-xl font-extrabold`, { color: colors.heroText }]}>
                {tr('Welcome{0}!', user?.name ? `, ${user.name.split(' ')[0]}` : '')}
              </Text>
              <Text style={[tw`text-xs mt-0.5`, { color: colors.heroTextSecondary }]}>
                {tr('Your {0} preparation starts here.', focus?.name || 'HSSC')}
              </Text>
            </View>
          </View>
          <View style={tw`flex-row flex-wrap mt-4 -mx-1`}>
            {FEATURES.map((f) => (
              <View key={f.label} style={[tw`w-1/2 px-1 mb-2`]}>
                <View style={[tw`flex-row items-center p-2.5 rounded-2xl`, { backgroundColor: colors.heroRaised }]}>
                  <Ionicons name={f.icon} size={18} color={colors.heroAccent} />
                  <View style={tw`ml-2 flex-1`}>
                    <Text style={[tw`text-xs font-bold`, { color: colors.heroText }]} numberOfLines={1}>
                      {tr(f.label)}
                    </Text>
                    <Text style={[tw`text-[10px]`, { color: colors.heroTextSecondary }]} numberOfLines={1}>
                      {tr(f.sub)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 1. Language */}
        <Text style={[tw`text-base font-extrabold mt-6 mb-1`, { color: colors.text }]}>{tr('Which language do you study in?')}</Text>
        <Text style={[tw`text-xs mb-3`, { color: colors.textSecondary }]}>{tr('Questions and the app will be in this language. You can switch any time.')}</Text>
        <View style={tw`flex-row gap-3`}>
          {[
            ['Hindi', 'हिन्दी', 'अ'],
            ['English', 'English', 'A'],
          ].map(([value, label, glyph]) => {
            const on = lang === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => chooseLanguage(value)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={[tw`flex-1 items-center py-4 rounded-3xl border-2`, chip(on)]}
              >
                <Text style={[tw`text-3xl font-extrabold`, { color: on ? colors.heroAccent : colors.textSecondary }]}>{glyph}</Text>
                <Text style={[tw`text-base font-bold mt-1`, { color: on ? colors.heroText : colors.text }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 2. Exam */}
        {subExams.length > 0 && (
          <>
            <Text style={[tw`text-base font-extrabold mt-6 mb-1`, { color: colors.text }]}>{tr('Which exam are you preparing for?')}</Text>
            <Text style={[tw`text-xs mb-3`, { color: colors.textSecondary }]}>{tr('Optional — you will still see all of {0}.', focus?.name || 'HSSC')}</Text>
            <View style={tw`flex-row flex-wrap gap-2`}>
              {[{ _id: null, name: tr('All {0}', focus?.name || 'HSSC') }, ...subExams].map((s) => {
                const on = String(s._id) === String(subExam);
                return (
                  <TouchableOpacity
                    key={String(s._id)}
                    onPress={() => setSubExam(s._id)}
                    activeOpacity={0.85}
                    style={[tw`px-4 h-10 rounded-full items-center justify-center border`, chip(on)]}
                  >
                    <Text style={[tw`text-sm font-bold`, { color: on ? colors.heroText : colors.text }]}>{titleCase(s.name)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* 3. Daily goal */}
        <Text style={[tw`text-base font-extrabold mt-6 mb-3`, { color: colors.text }]}>{tr('Your daily goal')}</Text>
        <View style={tw`flex-row gap-2.5`}>
          {GOALS.map((g) => {
            const on = goal === g.value;
            return (
              <TouchableOpacity
                key={g.value}
                onPress={() => setGoal(g.value)}
                activeOpacity={0.85}
                style={[tw`flex-1 items-center py-3 rounded-2xl border-2`, chip(on)]}
              >
                <Text style={[tw`text-sm font-bold`, { color: on ? colors.heroText : colors.text }]}>{tr(g.label)}</Text>
                <Text style={[tw`text-[11px] mt-0.5`, { color: on ? colors.heroTextSecondary : colors.textSecondary }]}>{tr(g.sub)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 4. Friend's code */}
        {showCode ? (
          <View style={[tw`mt-6 p-4 rounded-3xl`, card]}>
            <Text style={[tw`text-sm font-bold mb-2`, { color: colors.text }]}>{tr('Have a friend’s code?')}</Text>
            <StableTextInput
              value={code}
              onChangeText={(v) => {
                setCode(v);
                setCodeError('');
              }}
              transform={(v) => v.trim().toUpperCase()}
              placeholder={tr('Enter code')}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[tw`h-11 px-3 rounded-xl text-base font-bold tracking-widest`, { backgroundColor: colors.surfaceMuted, color: colors.text }]}
            />
            {!!codeError && <Text style={[tw`text-xs mt-2`, { color: colors.tones.red.fg }]}>{codeError}</Text>}
          </View>
        ) : (
          <TouchableOpacity onPress={() => setShowCode(true)} style={tw`mt-5 flex-row items-center`}>
            <Ionicons name="gift-outline" size={16} color={colors.text} />
            <Text style={[tw`text-sm font-semibold ml-1.5 underline`, { color: colors.text }]}>{tr('Have a friend’s code?')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[tw`mt-7 h-14 rounded-2xl items-center justify-center flex-row`, { backgroundColor: colors.hero, opacity: loading ? 0.7 : 1 }]}
          onPress={finish}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.heroText} />
          ) : (
            <>
              <Text style={[tw`text-base font-extrabold`, { color: colors.heroText }]}>{tr('Start preparing')}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.heroText} style={tw`ml-2`} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
