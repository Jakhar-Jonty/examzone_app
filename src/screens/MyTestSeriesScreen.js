import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { testSeriesService } from '../services/testSeriesService';
import { seriesType, seriesTypeLabel } from '../utils/seriesMeta';
import { t as tr } from '../i18n';

/** My series, grouped: in progress → not started → completed → expired. */
export default function MyTestSeriesScreen({ navigation }) {
  const { colors } = useTheme();
  const [items, setItems] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await testSeriesService.myEnrollments();
      setItems(res.enrollments || []);
    } catch {
      setItems((prev) => prev || []);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const isDone = (e) => e.progress.totalTests > 0 && e.progress.testsCompleted >= e.progress.totalTests;
  const groups = items
    ? [
        [tr('In progress'), items.filter((e) => !e.expired && !isDone(e) && e.progress.testsCompleted > 0)],
        [tr('Not started'), items.filter((e) => !e.expired && !isDone(e) && e.progress.testsCompleted === 0)],
        [tr('Completed'), items.filter((e) => !e.expired && isDone(e))],
        [tr('Expired'), items.filter((e) => e.expired)],
      ].filter(([, list]) => list.length)
    : [];

  const openSeries = (e) => navigation.navigate('TestSeriesDetail', { id: e.testSeries._id });
  const openNext = (e) => navigation.navigate('ExamDetail', { examId: e.next.examId });
  const card = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };

  return (
    <ScreenWrapper backgroundColor={colors.surface}>
      <View style={tw`flex-row items-center px-3 pt-2 pb-2`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`} accessibilityLabel={tr('Back')}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[tw`text-xl font-extrabold ml-1`, { color: colors.text }]}>{tr('My Series')}</Text>
      </View>

      {!items ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator color={colors.text} size="large" />
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
          {groups.map(([title, list]) => (
            <View key={title} style={tw`mb-5`}>
              <Text style={[tw`text-xs font-bold tracking-widest mb-2.5`, { color: colors.textSecondary }]}>
                {title.toUpperCase()} · {list.length}
              </Text>
              {list.map((e) => {
                const type = seriesType(e.testSeries.seriesType);
                const tone = colors.tones[type.tone];
                const done = isDone(e);
                const p = e.progress;
                return (
                  <TouchableOpacity
                    key={e._id}
                    onPress={() => openSeries(e)}
                    activeOpacity={0.85}
                    style={[tw`p-4 rounded-3xl mb-3`, card, e.expired && { opacity: 0.7 }]}
                  >
                    <View style={tw`flex-row items-start`}>
                      <View style={[tw`w-11 h-11 rounded-2xl items-center justify-center mr-3`, { backgroundColor: tone.bg }]}>
                        <Ionicons name={done ? 'checkmark-done' : type.icon} size={20} color={tone.fg} />
                      </View>
                      <View style={tw`flex-1`}>
                        <Text style={[tw`text-[15px] font-bold`, { color: colors.text }]} numberOfLines={2}>
                          {e.testSeries.title}
                        </Text>
                        <Text style={[tw`text-xs mt-1`, { color: colors.textSecondary }]}>
                          {seriesTypeLabel(e.testSeries.seriesType)}
                          {' · '}
                          {p.testsCompleted
                            ? tr('{0}/{1} done · avg {2}%', p.testsCompleted, p.totalTests, Math.round(p.averageScore))
                            : p.totalTests === 1
                              ? tr('1 test')
                              : tr('{0} tests', p.totalTests)}
                        </Text>
                      </View>
                      {e.expired && (
                        <View style={[tw`px-2 py-1 rounded-md ml-2`, { backgroundColor: colors.tones.red.bg }]}>
                          <Text style={[tw`text-[11px] font-extrabold`, { color: colors.tones.red.fg }]}>{tr('Expired')}</Text>
                        </View>
                      )}
                    </View>

                    <View style={[tw`h-1.5 rounded-full overflow-hidden mt-3`, { backgroundColor: colors.surfaceMuted }]}>
                      <View
                        style={[
                          tw`h-full rounded-full`,
                          { width: `${Math.max(p.progressPercentage, p.testsCompleted ? 3 : 0)}%`, backgroundColor: done ? colors.tones.green.fg : colors.primary },
                        ]}
                      />
                    </View>

                    {!e.expired && e.next && (
                      <TouchableOpacity
                        onPress={() => openNext(e)}
                        activeOpacity={0.85}
                        style={[tw`flex-row items-center mt-3 p-3 rounded-2xl`, { backgroundColor: colors.surfaceMuted }]}
                      >
                        <View style={tw`flex-1`}>
                          <Text style={[tw`text-[11px] font-bold`, { color: colors.textSecondary }]}>
                            {tr('NEXT · TEST {0}', e.next.index + 1)}
                          </Text>
                          <Text style={[tw`text-sm font-semibold mt-0.5`, { color: colors.text }]} numberOfLines={1}>
                            {e.next.title}
                          </Text>
                        </View>
                        <View style={[tw`flex-row items-center px-3 h-8 rounded-full`, { backgroundColor: colors.hero }]}>
                          <Ionicons name="play" size={12} color={colors.heroAccent} />
                          <Text style={[tw`text-xs font-bold ml-1`, { color: colors.heroText }]}>
                            {p.testsCompleted ? tr('Continue') : tr('Start')}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {!groups.length && (
            <View style={[tw`items-center p-8 rounded-3xl mt-6`, card]}>
              <Ionicons name="bookmark-outline" size={32} color={colors.textSecondary} />
              <Text style={[tw`text-sm font-bold mt-3`, { color: colors.text }]}>{tr('No series yet')}</Text>
              <Text style={[tw`text-xs mt-1 text-center`, { color: colors.textSecondary }]}>
                {tr('Start any test in a series and it will appear here with your progress.')}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('TestSeriesList')}
                style={[tw`mt-4 px-4 h-10 rounded-xl items-center justify-center`, { backgroundColor: colors.hero }]}
              >
                <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>{tr('Browse Test Series')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}
