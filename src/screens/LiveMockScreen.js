import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { liveMockService, countdown, liveWhen } from '../services/liveMockService';
import { t as tr } from '../i18n';

/**
 * Weekly All-Haryana live mock: this week's paper (countdown / live now /
 * results), the last leaderboard and past results.
 */
export default function LiveMockScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [, setTick] = useState(0);

  const load = async () => {
    try {
      setData(await liveMockService.overview());
    } catch {
      Alert.alert(tr('Live mock'), tr('Could not load. Pull down to retry.'));
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

  // keep the countdown fresh
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const card = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };
  const current = data?.current;
  const last = data?.lastResult;

  return (
    <ScreenWrapper backgroundColor={colors.surface}>
      <View style={tw`flex-row items-center px-3 pt-2 pb-2`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`} accessibilityLabel={tr('Back')}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={tw`flex-1 ml-1`}>
          <Text style={[tw`text-xl font-extrabold`, { color: colors.text }]}>{tr('All-Haryana Live Mock')}</Text>
          <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>{tr('Every Sunday · same paper for everyone')}</Text>
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
          {current ? (
            <CurrentCard current={current} colors={colors} navigation={navigation} />
          ) : (
            <View style={[tw`p-5 rounded-3xl mb-5`, card]}>
              <Text style={[tw`text-sm`, { color: colors.textSecondary }]}>{tr('The next live mock will be announced soon.')}</Text>
            </View>
          )}

          {/* ─── Last result / leaderboard ─────────────── */}
          {last && (
            <View style={tw`mb-5`}>
              <Text style={[tw`text-lg font-extrabold mb-1`, { color: colors.text }]}>{tr('Last week’s toppers')}</Text>
              <Text style={[tw`text-xs mb-3`, { color: colors.textSecondary }]}>
                {tr('{0} · {1} students', last.title, last.participants)}
              </Text>
              {last.me?.ranked && (
                <View style={[tw`flex-row items-center p-4 rounded-2xl mb-2.5`, { backgroundColor: colors.hero }]}>
                  <Ionicons name="trophy" size={20} color={colors.heroAccent} />
                  <Text style={[tw`flex-1 ml-3 text-sm font-bold`, { color: colors.heroText }]}>
                    {tr('Your Haryana rank #{0} of {1}', last.me.rank, last.participants)}
                  </Text>
                  <Text style={[tw`text-sm font-extrabold`, { color: colors.heroText }]}>
                    {last.me.score}/{last.totalMarks}
                  </Text>
                </View>
              )}
              {last.leaderboard.length ? (
                <View style={[tw`rounded-3xl overflow-hidden`, card]}>
                  {last.leaderboard.map((r, i) => {
                    const me = r.userId === String(user?._id);
                    return (
                      <View
                        key={r.userId}
                        style={[
                          tw`flex-row items-center px-4 py-3`,
                          i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                          me && { backgroundColor: colors.surfaceMuted },
                        ]}
                      >
                        <Text style={[tw`w-9 text-sm font-extrabold`, { color: r.rank <= 3 ? colors.text : colors.textSecondary }]}>
                          #{r.rank}
                        </Text>
                        <Text style={[tw`flex-1 text-sm font-semibold`, { color: colors.text }]} numberOfLines={1}>
                          {r.name}
                          {me ? tr(' (You)') : ''}
                        </Text>
                        <Text style={[tw`text-sm font-bold`, { color: colors.text }]}>
                          {r.score}/{last.totalMarks}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={[tw`p-4 rounded-2xl`, card]}>
                  <Text style={[tw`text-sm`, { color: colors.textSecondary }]}>{tr('Nobody took this one. Be the first next Sunday!')}</Text>
                </View>
              )}
            </View>
          )}

          {/* ─── History ─────────────────────────────── */}
          {data?.history?.length > 1 && (
            <View>
              <Text style={[tw`text-lg font-extrabold mb-3`, { color: colors.text }]}>{tr('Past live mocks')}</Text>
              <View style={[tw`rounded-3xl overflow-hidden`, card]}>
                {data.history.slice(1).map((h, i) => (
                  <TouchableOpacity
                    key={h._id}
                    onPress={() => navigation.navigate('ExamDetail', { examId: h._id })}
                    activeOpacity={0.85}
                    style={[tw`flex-row items-center px-4 py-3.5`, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
                  >
                    <View style={tw`flex-1`}>
                      <Text style={[tw`text-sm font-bold`, { color: colors.text }]} numberOfLines={1}>
                        {h.title}
                      </Text>
                      <Text style={[tw`text-xs mt-0.5`, { color: colors.textSecondary }]}>
                        {h.me?.ranked
                          ? tr('Rank #{0} of {1} · {2}/{3}', h.me.rank, h.participants, h.me.score, h.totalMarks)
                          : tr('{0} students · not attempted live', h.participants)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[tw`text-xs mt-2`, { color: colors.textSecondary }]}>
                {tr('Past papers stay open for practice — only live attempts are ranked.')}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

function CurrentCard({ current, colors, navigation }) {
  const live = current.state === 'live';
  const open = () => navigation.navigate('ExamDetail', { examId: current._id });
  const left = countdown(live ? current.liveEndsAt : current.scheduledTime);

  return (
    <View style={[tw`p-5 rounded-3xl mb-6`, { backgroundColor: colors.hero }]}>
      <View style={tw`flex-row items-center`}>
        {live ? (
          <View style={[tw`flex-row items-center px-2 py-1 rounded-md`, { backgroundColor: colors.tones.red.bg }]}>
            <View style={[tw`w-1.5 h-1.5 rounded-full mr-1.5`, { backgroundColor: colors.tones.red.fg }]} />
            <Text style={[tw`text-[11px] font-extrabold`, { color: colors.tones.red.fg }]}>{tr('LIVE NOW')}</Text>
          </View>
        ) : (
          <Text style={[tw`text-[11px] font-bold tracking-widest`, { color: colors.heroMuted }]}>{tr('THIS SUNDAY')}</Text>
        )}
      </View>
      <Text style={[tw`text-xl font-extrabold mt-2`, { color: colors.heroText }]}>{current.title}</Text>
      <Text style={[tw`text-xs mt-1`, { color: colors.heroTextSecondary }]}>
        {tr('{0} · {1} questions · {2} min', liveWhen(current.scheduledTime), current.totalQuestions, current.duration)}
      </Text>

      {left && (
        <Text style={[tw`text-3xl font-extrabold mt-4`, { color: colors.heroText }]}>
          {left}
          <Text style={[tw`text-sm font-semibold`, { color: colors.heroTextSecondary }]}>
            {live ? tr('  left to submit') : tr('  to start')}
          </Text>
        </Text>
      )}
      {current.participants > 0 && (
        <Text style={[tw`text-xs mt-1`, { color: colors.heroMuted }]}>{tr('{0} students have submitted', current.participants)}</Text>
      )}

      {live ? (
        current.me?.ranked || (current.me?.attempted && !current.me?.inProgress) ? (
          <View style={[tw`mt-4 p-3 rounded-2xl`, { backgroundColor: colors.heroRaised }]}>
            <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>{tr('Submitted ✓ — ranks are out when the window closes')}</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={open}
            activeOpacity={0.85}
            style={[tw`mt-4 h-12 rounded-2xl flex-row items-center justify-center`, { backgroundColor: colors.heroText }]}
          >
            <Ionicons name="play" size={16} color={colors.hero} />
            <Text style={[tw`text-[15px] font-bold ml-1.5`, { color: colors.hero }]}>
              {current.me?.inProgress ? tr('Resume live mock') : tr('Start live mock')}
            </Text>
          </TouchableOpacity>
        )
      ) : (
        <View style={[tw`mt-4 p-3 rounded-2xl flex-row items-center`, { backgroundColor: colors.heroRaised }]}>
          <Ionicons name="notifications-outline" size={16} color={colors.heroAccent} />
          <Text style={[tw`flex-1 text-xs ml-2`, { color: colors.heroTextSecondary }]}>
            {tr('We’ll remind you the evening before and 30 minutes before it starts.')}
          </Text>
        </View>
      )}
    </View>
  );
}
