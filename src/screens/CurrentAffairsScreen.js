import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { currentAffairsService, dayLabel, pickLang } from '../services/currentAffairsService';

import { t as tr } from '../i18n';
const PAGE = 20;

/** Daily Haryana current affairs, newest day first, with a quiz per day. */
export default function CurrentAffairsScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [hindi, setHindi] = useState(user?.preferredLanguage === 'Hindi');
  const [items, setItems] = useState([]);
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [starting, setStarting] = useState(null); // date whose quiz is starting

  const load = async () => {
    try {
      const data = await currentAffairsService.list({ limit: PAGE });
      setItems(data.items);
      setToday(data.today);
      setHasMore(!!data.hasMore);
    } catch {
      Alert.alert(tr("Current affairs"), tr("Could not load. Pull down to retry."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Older pages start before the oldest loaded day (a day is never split)
  const loadMore = async () => {
    if (loadingMore || !hasMore || !items.length) return;
    setLoadingMore(true);
    try {
      const data = await currentAffairsService.list({ limit: PAGE, before: items[items.length - 1].date });
      setItems((prev) => [...prev, ...data.items]);
      setHasMore(!!data.hasMore);
    } catch {
      // keep what we have
    } finally {
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const startDayQuiz = async (date) => {
    if (starting) return;
    try {
      setStarting(date);
      const session = await currentAffairsService.startQuiz({ date });
      navigation.navigate('PracticeInterface', { sessionId: session._id, sessionType: session.sessionType });
    } catch (e) {
      Alert.alert(tr("Could not start"), e?.response?.data?.message || tr("Please try again."));
    } finally {
      setStarting(null);
    }
  };

  // group consecutive items by day
  const days = [];
  for (const item of items) {
    const last = days[days.length - 1];
    if (last?.date === item.date) last.items.push(item);
    else days.push({ date: item.date, items: [item] });
  }

  const card = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };

  return (
    <ScreenWrapper backgroundColor={colors.surface}>
      <View style={tw`flex-row items-center px-3 pt-2 pb-2`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`} accessibilityLabel={tr("Back")}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={tw`flex-1 ml-1`}>
          <Text style={[tw`text-xl font-extrabold`, { color: colors.text }]}>{tr("Current Affairs")}</Text>
          <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>{tr("हरियाणा करंट अफेयर्स · daily")}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setHindi((h) => !h)}
          activeOpacity={0.8}
          accessibilityLabel={tr("Language: {0}. Tap to switch.", hindi ? 'Hindi' : 'English')}
          style={[tw`flex-row rounded-full p-1 mr-2`, card]}
        >
          {['EN', 'हिन्दी'].map((label, i) => {
            const on = (i === 1) === hindi;
            return (
              <View key={label} style={[tw`px-2.5 py-1.5 rounded-full`, on && { backgroundColor: colors.hero }]}>
                <Text style={[tw`text-xs font-bold`, { color: on ? colors.heroText : colors.textSecondary }]}>{label}</Text>
              </View>
            );
          })}
        </TouchableOpacity>
      </View>

      {loading && !items.length ? (
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
          {!days.length && (
            <View style={[tw`items-center p-8 rounded-3xl`, card]}>
              <Ionicons name="newspaper-outline" size={28} color={colors.textSecondary} />
              <Text style={[tw`text-sm font-bold mt-2`, { color: colors.text }]}>{tr("No current affairs yet")}</Text>
              <Text style={[tw`text-xs mt-1 text-center`, { color: colors.textSecondary }]}>
                {tr("Daily Haryana news with MCQs will appear here.")}
              </Text>
            </View>
          )}

          {days.map((day) => {
            const mcqs = day.items.reduce((n, it) => n + (it.questionCount || 0), 0);
            return (
              <View key={day.date} style={tw`mb-5`}>
                <View style={tw`flex-row items-center justify-between mb-2.5`}>
                  <Text style={[tw`text-base font-extrabold`, { color: colors.text }]}>{dayLabel(day.date, today)}</Text>
                  {mcqs > 0 && (
                    <TouchableOpacity
                      onPress={() => startDayQuiz(day.date)}
                      disabled={!!starting}
                      activeOpacity={0.85}
                      style={[tw`flex-row items-center px-3 h-8 rounded-full`, { backgroundColor: colors.hero }]}
                    >
                      {starting === day.date ? (
                        <ActivityIndicator size="small" color={colors.heroText} />
                      ) : (
                        <>
                          <Ionicons name="flash" size={13} color={colors.heroAccent} />
                          <Text style={[tw`text-xs font-bold ml-1`, { color: colors.heroText }]}>{tr("Quiz · {0} Q", mcqs)}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                <View style={[tw`rounded-3xl overflow-hidden`, card]}>
                  {day.items.map((it, i) => (
                    <TouchableOpacity
                      key={it._id}
                      onPress={() => navigation.navigate('CurrentAffairDetail', { id: it._id, hindi })}
                      activeOpacity={0.85}
                      style={[tw`p-4`, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
                    >
                      <View style={tw`flex-row items-start`}>
                        <View style={tw`flex-1`}>
                          <Text style={[tw`text-[15px] font-bold`, { color: colors.text }]} numberOfLines={2}>
                            {pickLang(hindi, it.title, it.titleHindi)}
                          </Text>
                          <Text style={[tw`text-xs mt-1 leading-5`, { color: colors.textSecondary }]} numberOfLines={2}>
                            {pickLang(hindi, it.summary, it.summaryHindi)}
                          </Text>
                          {(it.region === 'National' || it.questionCount > 0) && (
                            <Text style={[tw`text-[11px] font-semibold mt-1.5`, { color: colors.textSecondary }]}>
                              {[it.region === tr("National") ? tr("National") : null, it.questionCount ? tr("{0} MCQs", it.questionCount) : null]
                                .filter(Boolean)
                                .join(' · ')}
                            </Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={tw`ml-2 mt-0.5`} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}

          {hasMore && (
            <TouchableOpacity onPress={loadMore} disabled={loadingMore} style={tw`items-center py-3`}>
              {loadingMore ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={[tw`text-sm font-bold`, { color: colors.text }]}>{tr("Load older days")}</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}
