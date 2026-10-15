import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { practiceSessionService } from '../services/practiceSessionService';

const SUBJECT = 'Haryana GK';
const TOPIC_TONES = ['orange', 'blue', 'purple', 'red', 'green', 'orange', 'blue'];
const TEST_SIZE = 15;
const WEAK_BELOW = 50; // % accuracy
const WEAK_MIN_ATTEMPTS = 5;

/**
 * Haryana GK hub: topic-wise tests with this student's accuracy per topic,
 * a mixed test, and past-paper (PYQ) questions — all from the "Haryana GK"
 * subject of the question bank.
 */
export default function HaryanaGkScreen({ navigation }) {
  const { colors } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(null); // key of the test being started

  const load = async () => {
    try {
      const res = await api.get('/haryana-gk/overview');
      setData(res.data);
    } catch {
      Alert.alert('Haryana GK', 'Could not load the Haryana GK hub. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const start = async (key, request) => {
    if (starting) return;
    try {
      setStarting(key);
      const { session } = await practiceSessionService.create(request);
      navigation.navigate('PracticeInterface', { sessionId: session._id, sessionType: session.sessionType });
    } catch (e) {
      Alert.alert('Could not start', e?.response?.data?.message || 'Please try again.');
    } finally {
      setStarting(null);
    }
  };

  const startTopic = (topic) =>
    start(topic.key, {
      sessionType: 'topic-wise',
      filters: { subject: SUBJECT, topics: [topic.label] },
      questionCount: TEST_SIZE,
      strict: true,
    });
  const startMixed = () =>
    start('mixed', { sessionType: 'subject-wise', filters: { subject: SUBJECT }, questionCount: TEST_SIZE, strict: true });
  const startPyq = () => start('pyq', { sessionType: 'pyq', filters: { subject: SUBJECT }, questionCount: TEST_SIZE });

  const card = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };
  const overall = data?.overall;

  return (
    <ScreenWrapper backgroundColor={colors.surface}>
      <View style={tw`flex-row items-center px-3 pt-2 pb-2`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={tw`flex-1 ml-1`}>
          <Text style={[tw`text-xl font-extrabold`, { color: colors.text }]}>Haryana GK</Text>
          <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>हरियाणा सामान्य ज्ञान</Text>
        </View>
      </View>

      {loading && !data ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={tw`px-5 pt-2 pb-12`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.text}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Summary ─────────────────────────────── */}
          <View style={[tw`p-5 rounded-3xl mb-5`, { backgroundColor: colors.hero }]}>
            <Text style={[tw`text-[11px] font-bold tracking-widest`, { color: colors.heroMuted }]}>YOUR HARYANA GK</Text>
            <View style={tw`flex-row items-end mt-1`}>
              <Text style={[tw`text-4xl font-extrabold`, { color: colors.heroText }]}>
                {overall?.accuracy != null ? overall.accuracy : '—'}
                {overall?.accuracy != null ? <Text style={[tw`text-xl`, { color: colors.heroTextSecondary }]}>%</Text> : null}
              </Text>
              <Text style={[tw`text-xs ml-2 mb-1.5`, { color: colors.heroTextSecondary }]}>
                {overall?.attempted ? `accuracy · ${overall.attempted} answered` : 'Start a topic to see your accuracy'}
              </Text>
            </View>
            <Text style={[tw`text-xs mt-1`, { color: colors.heroMuted }]}>
              {data?.totalQuestions || 0} questions across {data?.topics?.filter((t) => t.questionCount).length || 0} topics
            </Text>

            <View style={tw`flex-row gap-2.5 mt-4`}>
              <TouchableOpacity
                style={[tw`flex-1 flex-row items-center justify-center h-11 rounded-2xl`, { backgroundColor: colors.heroText }]}
                onPress={startMixed}
                disabled={!data?.totalQuestions || !!starting}
                activeOpacity={0.85}
              >
                {starting === 'mixed' ? (
                  <ActivityIndicator color={colors.hero} />
                ) : (
                  <>
                    <Ionicons name="shuffle" size={16} color={colors.hero} />
                    <Text style={[tw`text-sm font-bold ml-1.5`, { color: colors.hero }]}>Mixed test</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[tw`flex-1 flex-row items-center justify-center h-11 rounded-2xl`, { backgroundColor: colors.heroRaised }]}
                onPress={startPyq}
                disabled={!data?.pyqCount || !!starting}
                activeOpacity={0.85}
              >
                {starting === 'pyq' ? (
                  <ActivityIndicator color={colors.heroText} />
                ) : (
                  <>
                    <Ionicons name="time-outline" size={16} color={colors.heroText} />
                    <Text style={[tw`text-sm font-bold ml-1.5`, { color: colors.heroText }]}>
                      Past papers{data?.pyqCount ? ` · ${data.pyqCount}` : ''}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── Topics ──────────────────────────────── */}
          <Text style={[tw`text-lg font-extrabold mb-3`, { color: colors.text }]}>Topics</Text>
          {(data?.topics || []).map((topic, i) => {
            const tone = colors.tones[TOPIC_TONES[i % TOPIC_TONES.length]];
            const empty = !topic.questionCount;
            const weak = topic.accuracy != null && topic.accuracy < WEAK_BELOW && topic.attempted >= WEAK_MIN_ATTEMPTS;
            return (
              <TouchableOpacity
                key={topic.key}
                onPress={() => startTopic(topic)}
                disabled={empty || !!starting}
                activeOpacity={0.85}
                style={[tw`p-4 rounded-3xl mb-2.5`, card, empty && { opacity: 0.6 }]}
                accessibilityLabel={`${topic.label}, ${topic.questionCount} questions${empty ? ', coming soon' : ''}`}
              >
                <View style={tw`flex-row items-center`}>
                  <View style={[tw`w-11 h-11 rounded-2xl items-center justify-center mr-3`, { backgroundColor: tone.bg }]}>
                    <Ionicons name={`${topic.icon}-outline`} size={20} color={tone.fg} />
                  </View>
                  <View style={tw`flex-1`}>
                    <View style={tw`flex-row items-center`}>
                      <Text style={[tw`text-[15px] font-bold`, { color: colors.text }]} numberOfLines={1}>
                        {topic.label}
                      </Text>
                      {weak && (
                        <View style={[tw`ml-2 px-1.5 py-0.5 rounded-md`, { backgroundColor: colors.tones.red.bg }]}>
                          <Text style={[tw`text-[10px] font-bold`, { color: colors.tones.red.fg }]}>WEAK</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[tw`text-xs mt-0.5`, { color: colors.textSecondary }]}>
                      {topic.labelHindi} · {empty ? 'Coming soon' : `${topic.questionCount} questions`}
                    </Text>
                  </View>
                  {starting === topic.key ? (
                    <ActivityIndicator color={colors.text} />
                  ) : !empty ? (
                    <View style={tw`items-end`}>
                      <Text style={[tw`text-sm font-extrabold`, { color: topic.accuracy == null ? colors.textSecondary : colors.text }]}>
                        {topic.accuracy == null ? 'New' : `${topic.accuracy}%`}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </View>
                  ) : null}
                </View>
                {!empty && topic.accuracy != null && (
                  <View style={[tw`h-1.5 rounded-full overflow-hidden mt-3`, { backgroundColor: colors.surfaceMuted }]}>
                    <View
                      style={[
                        tw`h-full rounded-full`,
                        { width: `${Math.max(3, topic.accuracy)}%`, backgroundColor: weak ? colors.tones.red.fg : colors.primary },
                      ]}
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          <Text style={[tw`text-xs text-center mt-3 px-6`, { color: colors.textSecondary }]}>
            Each topic test has up to {TEST_SIZE} questions. Wrong answers go to your Wrong Book.
          </Text>
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}
