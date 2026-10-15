import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import SubExamChips from '../components/SubExamChips';
import { useTheme } from '../context/ThemeContext';
import { useSubExam } from '../context/AppConfigContext';
import { testSeriesService } from '../services/testSeriesService';
import { seriesType, seriesTypeLabel, accessLabel } from '../utils/seriesMeta';
import { t as tr } from '../i18n';

/** Browse test series: continue strip for started ones, then all series. */
export default function TestSeriesScreen({ navigation }) {
  const { colors } = useTheme();
  const { selectedId: subExamId } = useSubExam();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await testSeriesService.list({ subExam: subExamId || undefined });
      setSeries(res.series || []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [subExamId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const open = (s) => navigation.navigate('TestSeriesDetail', { id: s._id });
  const started = series.filter((s) => s.progress?.testsCompleted > 0 && s.progress.testsCompleted < s.progress.totalTests);
  const card = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };

  return (
    <ScreenWrapper backgroundColor={colors.surface}>
      <View style={tw`flex-row items-center justify-between px-5 pt-2 pb-3`}>
        <Text style={[tw`text-2xl font-extrabold`, { color: colors.text }]}>{tr('Test Series')}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('MyTestSeries')}
          style={[tw`flex-row items-center px-3 h-9 rounded-full`, card]}
          activeOpacity={0.85}
        >
          <Ionicons name="bookmark-outline" size={14} color={colors.text} />
          <Text style={[tw`text-xs font-bold ml-1`, { color: colors.text }]}>{tr('My Series')}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator color={colors.text} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={tw`pb-12`}
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
          <SubExamChips style={tw`px-5 mb-4`} />

          {/* Continue where you left off */}
          {started.length > 0 && (
            <View style={tw`mb-5`}>
              <Text style={[tw`text-base font-extrabold px-5 mb-2.5`, { color: colors.text }]}>{tr('Continue')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`px-5 gap-3`}>
                {started.map((s) => (
                  <TouchableOpacity
                    key={s._id}
                    onPress={() => open(s)}
                    activeOpacity={0.85}
                    style={[tw`w-64 p-4 rounded-3xl`, { backgroundColor: colors.hero }]}
                  >
                    <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]} numberOfLines={1}>
                      {s.title}
                    </Text>
                    <Text style={[tw`text-xs mt-1`, { color: colors.heroTextSecondary }]}>
                      {tr('{0}/{1} done · avg {2}%', s.progress.testsCompleted, s.progress.totalTests, Math.round(s.progress.averageScore))}
                    </Text>
                    <View style={[tw`h-1.5 rounded-full overflow-hidden mt-3`, { backgroundColor: colors.heroTrack }]}>
                      <View style={[tw`h-full rounded-full`, { width: `${s.progress.progressPercentage}%`, backgroundColor: colors.heroAccent }]} />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={tw`px-5`}>
            {series.length > 0 && (
              <Text style={[tw`text-base font-extrabold mb-2.5`, { color: colors.text }]}>{tr('All series')}</Text>
            )}
            {series.map((s) => {
              const type = seriesType(s.seriesType);
              const tone = colors.tones[type.tone];
              const done = s.progress?.testsCompleted || 0;
              const access = s.access || 'free';
              return (
                <TouchableOpacity key={s._id} onPress={() => open(s)} activeOpacity={0.85} style={[tw`p-4 rounded-3xl mb-3`, card]}>
                  <View style={tw`flex-row items-start`}>
                    <View style={[tw`w-11 h-11 rounded-2xl items-center justify-center mr-3`, { backgroundColor: tone.bg }]}>
                      <Ionicons name={type.icon} size={20} color={tone.fg} />
                    </View>
                    <View style={tw`flex-1`}>
                      <Text style={[tw`text-[15px] font-bold`, { color: colors.text }]} numberOfLines={2}>
                        {s.title}
                      </Text>
                      <Text style={[tw`text-xs mt-1`, { color: colors.textSecondary }]}>
                        {[
                          seriesTypeLabel(s.seriesType),
                          s.totalTests === 1 ? tr('1 test') : tr('{0} tests', s.totalTests || 0),
                          s.estimatedDuration ? tr('~{0}h', s.estimatedDuration) : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    <View
                      style={[
                        tw`px-2 py-1 rounded-md ml-2`,
                        { backgroundColor: access === 'free' ? colors.tones.green.bg : access === 'premium' ? colors.tones.purple.bg : colors.surfaceMuted },
                      ]}
                    >
                      <Text
                        style={[
                          tw`text-[11px] font-extrabold`,
                          { color: access === 'free' ? colors.tones.green.fg : access === 'premium' ? colors.tones.purple.fg : colors.text },
                        ]}
                      >
                        {accessLabel(s)}
                      </Text>
                    </View>
                  </View>
                  {done > 0 && (
                    <View style={tw`mt-3`}>
                      <View style={[tw`h-1.5 rounded-full overflow-hidden`, { backgroundColor: colors.surfaceMuted }]}>
                        <View style={[tw`h-full rounded-full`, { width: `${s.progress.progressPercentage}%`, backgroundColor: colors.primary }]} />
                      </View>
                      <Text style={[tw`text-[11px] mt-1`, { color: colors.textSecondary }]}>
                        {tr('{0}/{1} done · avg {2}%', done, s.progress.totalTests, Math.round(s.progress.averageScore))}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {!series.length && (
              <View style={[tw`items-center p-8 rounded-3xl mt-6`, card]}>
                <Ionicons name={error ? 'cloud-offline-outline' : 'albums-outline'} size={32} color={colors.textSecondary} />
                <Text style={[tw`text-sm font-bold mt-3`, { color: colors.text }]}>
                  {error ? tr('Could not load. Pull down to retry.') : tr('No series for this exam yet')}
                </Text>
                {!error && (
                  <>
                    <Text style={[tw`text-xs mt-1 text-center`, { color: colors.textSecondary }]}>
                      {tr('Meanwhile, try the mock tests and the Sunday live mock.')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('ExamsTab')}
                      style={[tw`mt-4 px-4 h-10 rounded-xl items-center justify-center`, { backgroundColor: colors.hero }]}
                    >
                      <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>{tr('Browse exams')}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}
