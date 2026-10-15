import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import { t as tr } from '../i18n';
const mark = require('../../assets/examzone_mark.png');

const GOALS = [
  { value: 1, label: '1 exam / day', sub: 'Light — just getting started' },
  { value: 2, label: '2 exams / day', sub: 'Regular practice' },
  { value: 3, label: '3 exams / day', sub: 'Serious prep' },
  { value: 5, label: '5 exams / day', sub: 'Intense grind' },
  { value: 10, label: '10 exams / day', sub: 'Full-time aspirant' },
];

const FEATURES = [
  { icon: '📚', label: '100+ Mock Exams', sub: 'Full syllabus coverage' },
  { icon: '🏆', label: 'Leaderboard', sub: 'Compete with peers' },
  { icon: '📈', label: 'Progress Tracking', sub: 'Know where you stand' },
  { icon: '⚡', label: 'XP & Badges', sub: 'Stay motivated' },
];

export default function OnboardingScreen({ route }) {
  const { token, user } = route.params;
  const { login } = useAuth();
  const { colors } = useTheme();
  const [goal, setGoal] = useState(3);
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    setLoading(true);
    try {
      await AsyncStorage.setItem('@dailyGoal', String(goal));
      await login(token, user);
      // login() sets isAuthenticated → AppNavigator auto-switches to authenticated stack
    } catch (e) {
      await login(token, user);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.hero }}>
      <ScrollView contentContainerStyle={tw`flex-grow`} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={tw`px-6 pt-12 pb-8 items-center`}>
          <Image source={mark} style={tw`h-16 w-16 rounded-2xl mb-4`} resizeMode="cover" />
          <Text style={[tw`text-3xl font-extrabold text-center mb-1`, { color: colors.heroText }]}>
            {tr("Welcome{0}!", user?.name ? `, ${user.name.split(' ')[0]}` : '')}
          </Text>
          <Text style={[tw`text-base text-center`, { color: colors.heroTextSecondary }]}>
            {tr("You're all set. Let's make this count.")}
          </Text>
        </View>

        {/* White card */}
        <View style={[tw`flex-1 rounded-t-3xl px-6 pt-8 pb-10`, { backgroundColor: colors.card }]}>
          {/* Features */}
          <Text style={[tw`text-xs font-bold uppercase tracking-widest mb-3`, { color: colors.textSecondary }]}>
            {tr("What's waiting for you")}
          </Text>
          <View style={tw`flex-row flex-wrap gap-3 mb-8`}>
            {FEATURES.map((f) => (
              <View key={f.label} style={[tw`flex-row items-center gap-3 p-3 rounded-2xl`, { width: '47%', backgroundColor: colors.card }]}>
                <Text style={{ fontSize: 24 }}>{f.icon}</Text>
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-sm font-bold`, { color: colors.text }]}>{tr(f.label)}</Text>
                  <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>{tr(f.sub)}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Daily goal */}
          <Text style={[tw`text-xs font-bold uppercase tracking-widest mb-1`, { color: colors.textSecondary }]}>
            {tr("Set your daily goal")}
          </Text>
          <Text style={[tw`text-xs mb-3`, { color: colors.textSecondary }]}>
            {tr("How many practice exams per day?")}
          </Text>
          <View style={tw`gap-2 mb-8`}>
            {GOALS.map((g) => {
              const sel = goal === g.value;
              return (
                <TouchableOpacity
                  key={g.value}
                  onPress={() => setGoal(g.value)}
                  style={[
                    tw`flex-row items-center justify-between px-4 py-3.5 rounded-2xl border-2`,
                    { borderColor: sel ? colors.hero : colors.border, backgroundColor: sel ? colors.surfaceMuted : colors.card },
                  ]}
                >
                  <Text style={[tw`text-sm font-bold`, { color: sel ? colors.text : colors.text }]}>{tr(g.label)}</Text>
                  <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>{tr(g.sub)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[tw`py-4 rounded-2xl items-center`, { backgroundColor: colors.hero, opacity: loading ? 0.6 : 1 }]}
            onPress={finish}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.heroText} />
              : <Text style={[tw`text-base font-extrabold`, { color: colors.heroText }]}>{tr("Start My Journey →")}</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
