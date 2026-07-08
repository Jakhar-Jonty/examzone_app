import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.primary }}>
      <ScrollView contentContainerStyle={tw`flex-grow`} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={tw`px-6 pt-12 pb-8 items-center`}>
          <Text style={tw`text-5xl mb-3`}>🎉</Text>
          <Text style={[tw`text-3xl font-extrabold text-center mb-1`, { color: '#fff' }]}>
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
          </Text>
          <Text style={[tw`text-base text-center`, { color: 'rgba(255,255,255,0.8)' }]}>
            You're all set. Let's make this count.
          </Text>
        </View>

        {/* White card */}
        <View style={[tw`flex-1 rounded-t-3xl px-6 pt-8 pb-10`, { backgroundColor: colors.background }]}>
          {/* Features */}
          <Text style={[tw`text-xs font-bold uppercase tracking-widest mb-3`, { color: colors.textSecondary }]}>
            What's waiting for you
          </Text>
          <View style={tw`flex-row flex-wrap gap-3 mb-8`}>
            {FEATURES.map((f) => (
              <View key={f.label} style={[tw`flex-row items-center gap-3 p-3 rounded-2xl`, { width: '47%', backgroundColor: colors.surface }]}>
                <Text style={{ fontSize: 24 }}>{f.icon}</Text>
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-sm font-bold`, { color: colors.text }]}>{f.label}</Text>
                  <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>{f.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Daily goal */}
          <Text style={[tw`text-xs font-bold uppercase tracking-widest mb-1`, { color: colors.textSecondary }]}>
            Set your daily goal
          </Text>
          <Text style={[tw`text-xs mb-3`, { color: colors.textSecondary }]}>
            How many practice exams per day?
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
                    { borderColor: sel ? colors.primary : colors.border, backgroundColor: sel ? (colors.primary + '15') : colors.surface },
                  ]}
                >
                  <Text style={[tw`text-sm font-bold`, { color: sel ? colors.primary : colors.text }]}>{g.label}</Text>
                  <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>{g.sub}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[tw`py-4 rounded-2xl items-center`, { backgroundColor: loading ? '#86efac' : colors.primary }]}
            onPress={finish}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={[tw`text-base font-extrabold`, { color: '#fff' }]}>Start My Journey →</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
