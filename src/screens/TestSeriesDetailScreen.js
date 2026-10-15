import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import ReviewSection from '../components/ReviewSection';
import { useTheme } from '../context/ThemeContext';
import { testSeriesService } from '../services/testSeriesService';
import { liveWhen } from '../services/liveMockService';
import { seriesType, seriesTypeLabel, accessLabel } from '../utils/seriesMeta';
import { t as tr } from '../i18n';

/**
 * One test series: progress, the ordered tests (with your best score or why
 * a test is locked) and a single sticky action — start / continue the next test.
 */
export default function TestSeriesDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { colors } = useTheme();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await testSeriesService.detail(id));
    } catch {
      Alert.alert(tr('Error'), tr('Could not load this series.'));
      navigation.goBack();
    }
  }, [id, navigation]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!data) {
    return (
      <ScreenWrapper backgroundColor={colors.surface}>
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator color={colors.text} size="large" />
        </View>
      </ScreenWrapper>
    );
  }

  const { series, progress, canAccess, isEnrolled, access, nextIndex } = data;
  const exams = series.exams || [];
  const type = seriesType(series.seriesType);
  const next = nextIndex >= 0 ? exams[nextIndex] : null;
  const allDone = exams.length > 0 && progress.testsCompleted === exams.length;
  const upcoming = exams.find((e) => e.lockReason === 'scheduled');

  // Free / unlocked series: enrol silently so the series shows up in "My Series"
  const ensureEnrolled = async () => {
    if (isEnrolled || !canAccess) return;
    try {
      await testSeriesService.enroll(id);
    } catch {
      // tracking only — the test is still open
    }
  };

  const openTest = async (entry) => {
    if (entry.locked) {
      const why = {
        scheduled: tr('This test opens on {0}.', entry.opensAt ? liveWhen(entry.opensAt) : ''),
        previous: tr('Complete the previous test to unlock this one.'),
        premium: tr('This series is part of Premium.'),
        purchase: tr('Enroll in this series to access its tests.'),
      }[entry.lockReason];
      if (entry.lockReason === 'premium') {
        Alert.alert(tr('Premium'), why, [
          { text: tr('Not now'), style: 'cancel' },
          { text: tr('Go Premium'), onPress: () => navigation.navigate('Paywall') },
        ]);
      } else {
        Alert.alert(tr('Locked'), why);
      }
      return;
    }
    setBusy(true);
    await ensureEnrolled();
    setBusy(false);
    navigation.navigate('ExamDetail', { examId: entry.exam?._id || entry.exam });
  };

  // Save to / remove from My Series without starting a test
  const toggleSaved = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (isEnrolled) await testSeriesService.unenroll(id);
      else await testSeriesService.enroll(id);
      setData((d) => ({ ...d, isEnrolled: !isEnrolled }));
    } catch (e) {
      Alert.alert(tr('Could not update'), tr(e?.response?.data?.message || 'Please try again.'));
    } finally {
      setSaving(false);
    }
  };
  const canSave = canAccess && !(isEnrolled && data.enrollment?.isPaid);

  const buy = () => {
    const price = accessLabel({ ...series, access });
    Alert.alert(tr('Enroll'), tr('This series costs {0}. Continue? (mock payment)', price), [
      { text: tr('Cancel'), style: 'cancel' },
      {
        text: tr('Pay & Enroll'),
        onPress: async () => {
          try {
            setBusy(true);
            await testSeriesService.enroll(id, { isMock: true });
            await load();
          } catch (e) {
            Alert.alert(tr('Failed'), tr(e?.response?.data?.message || 'Could not enroll.'));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  // the one primary action for this screen
  let cta = null;
  if (!canAccess) {
    cta =
      access === 'premium'
        ? { label: tr('Unlock with Premium'), icon: 'diamond-outline', onPress: () => navigation.navigate('Paywall') }
        : { label: tr('Enroll · {0}', accessLabel({ ...series, access })), icon: 'cart-outline', onPress: buy };
  } else if (next) {
    cta = {
      label: progress.testsCompleted ? tr('Continue · Test {0}', nextIndex + 1) : tr('Start · Test {0}', nextIndex + 1),
      sub: next.exam?.title,
      icon: 'play',
      onPress: () => openTest(next),
    };
  } else if (upcoming) {
    cta = { label: tr('Next test opens {0}', liveWhen(upcoming.opensAt)), icon: 'time-outline', disabled: true };
  } else if (allDone) {
    cta = { label: tr('All tests done 🎉 · Practise again'), icon: 'refresh', onPress: () => openTest(exams[0]) };
  }

  const card = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };

  return (
    <ScreenWrapper backgroundColor={colors.surface}>
      <View style={tw`flex-row items-center px-3 pt-2 pb-2`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`} accessibilityLabel={tr('Back')}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[tw`flex-1 text-base font-bold ml-1`, { color: colors.text }]} numberOfLines={1}>
          {tr('Test Series')}
        </Text>
        {canSave && (
          <TouchableOpacity
            onPress={toggleSaved}
            disabled={saving}
            activeOpacity={0.85}
            accessibilityLabel={isEnrolled ? tr('Remove from My Series') : tr('Save to My Series')}
            style={[
              tw`flex-row items-center px-3 h-9 rounded-full mr-2`,
              isEnrolled ? { backgroundColor: colors.hero } : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={isEnrolled ? colors.heroText : colors.text} />
            ) : (
              <>
                <Ionicons name={isEnrolled ? 'bookmark' : 'bookmark-outline'} size={14} color={isEnrolled ? colors.heroAccent : colors.text} />
                <Text style={[tw`text-xs font-bold ml-1`, { color: isEnrolled ? colors.heroText : colors.text }]}>
                  {isEnrolled ? tr('Saved') : tr('Save')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={tw`px-5 pt-1 pb-36`} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[tw`p-5 rounded-3xl mb-5`, { backgroundColor: colors.hero }]}>
          <View style={tw`flex-row items-center`}>
            <Ionicons name={type.icon} size={14} color={colors.heroAccent} />
            <Text style={[tw`text-[11px] font-bold tracking-widest ml-1.5`, { color: colors.heroMuted }]}>
              {seriesTypeLabel(series.seriesType).toUpperCase()}
              {series.subCategory?.name ? ` · ${series.subCategory.name.toUpperCase()}` : ''}
            </Text>
            <View style={[tw`ml-auto px-2 py-0.5 rounded-md`, { backgroundColor: colors.heroRaised }]}>
              <Text style={[tw`text-[11px] font-extrabold`, { color: colors.heroText }]}>{accessLabel({ ...series, access })}</Text>
            </View>
          </View>
          <Text style={[tw`text-2xl font-extrabold mt-2`, { color: colors.heroText }]}>{series.title}</Text>
          {!!series.description && (
            <Text style={[tw`text-xs mt-2 leading-5`, { color: colors.heroTextSecondary }]} numberOfLines={3}>
              {series.description}
            </Text>
          )}

          <View style={tw`flex-row mt-4`}>
            {[
              [exams.length, tr('Tests')],
              [series.estimatedDuration ? `~${series.estimatedDuration}h` : '—', tr('Duration')],
              [series.enrollments || 0, tr('Enrolled')],
            ].map(([v, label], i) => (
              <View key={label} style={[tw`flex-1`, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.heroRaised, paddingLeft: 12 }]}>
                <Text style={[tw`text-lg font-extrabold`, { color: colors.heroText }]}>{v}</Text>
                <Text style={[tw`text-[11px]`, { color: colors.heroMuted }]}>{label}</Text>
              </View>
            ))}
          </View>

          {progress.testsCompleted > 0 && (
            <View style={tw`mt-4`}>
              <View style={[tw`h-1.5 rounded-full overflow-hidden`, { backgroundColor: colors.heroTrack }]}>
                <View style={[tw`h-full rounded-full`, { width: `${progress.progressPercentage}%`, backgroundColor: colors.heroAccent }]} />
              </View>
              <Text style={[tw`text-xs mt-1.5`, { color: colors.heroTextSecondary }]}>
                {tr('{0}/{1} done · avg {2}%', progress.testsCompleted, progress.totalTests, Math.round(progress.averageScore))}
              </Text>
            </View>
          )}
        </View>

        {/* Tests */}
        <Text style={[tw`text-base font-extrabold mb-2.5`, { color: colors.text }]}>{tr('Tests')}</Text>
        <View style={[tw`rounded-3xl overflow-hidden mb-6`, card]}>
          {exams.map((entry, idx) => {
            const exam = entry.exam || {};
            const isNext = idx === nextIndex;
            let meta;
            if (entry.result) meta = tr('Best {0}% · {1}/{2}', Math.round(entry.result.percentage), entry.result.score, exam.totalMarks);
            else if (entry.lockReason === 'scheduled') meta = tr('Opens {0}', liveWhen(entry.opensAt));
            else if (entry.lockReason === 'previous') meta = tr('Finish test {0} first', idx);
            else if (entry.lockReason === 'premium') meta = tr('Premium');
            else
              meta = [exam.totalQuestions ? tr('{0} Q', exam.totalQuestions) : null, exam.duration ? tr('{0} min', exam.duration) : null]
                .filter(Boolean)
                .join(' · ');
            return (
              <TouchableOpacity
                key={String(exam._id || idx)}
                onPress={() => openTest(entry)}
                activeOpacity={0.85}
                disabled={busy}
                style={[
                  tw`flex-row items-center px-4 py-3.5`,
                  idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                  isNext && { backgroundColor: colors.surfaceMuted },
                ]}
              >
                <View
                  style={[
                    tw`w-8 h-8 rounded-full items-center justify-center mr-3`,
                    { backgroundColor: entry.completed ? colors.tones.green.bg : colors.surfaceMuted },
                  ]}
                >
                  {entry.completed ? (
                    <Ionicons name="checkmark" size={16} color={colors.tones.green.fg} />
                  ) : (
                    <Text style={[tw`text-xs font-bold`, { color: colors.text }]}>{idx + 1}</Text>
                  )}
                </View>
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-sm font-semibold`, { color: entry.locked ? colors.textSecondary : colors.text }]} numberOfLines={2}>
                    {exam.title || tr('Test')}
                  </Text>
                  <Text
                    style={[
                      tw`text-xs mt-0.5`,
                      { color: entry.result ? colors.tones.green.fg : colors.textSecondary },
                    ]}
                  >
                    {meta}
                  </Text>
                </View>
                {isNext ? (
                  <View style={[tw`px-2 py-1 rounded-md`, { backgroundColor: colors.hero }]}>
                    <Text style={[tw`text-[10px] font-extrabold`, { color: colors.heroText }]}>{tr('NEXT')}</Text>
                  </View>
                ) : (
                  <Ionicons
                    name={entry.locked ? 'lock-closed' : entry.completed ? 'refresh' : 'chevron-forward'}
                    size={16}
                    color={colors.textSecondary}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <ReviewSection targetType="test-series" targetId={id} />
      </ScrollView>

      {/* Sticky primary action */}
      {cta && (
        <View style={[tw`absolute left-0 right-0 bottom-0 px-5 pt-3 pb-5`, { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={cta.onPress}
            disabled={cta.disabled || busy}
            activeOpacity={0.85}
            style={[tw`py-3 rounded-2xl items-center justify-center`, { backgroundColor: cta.disabled ? colors.surfaceMuted : colors.hero }]}
          >
            {busy ? (
              <ActivityIndicator color={colors.heroText} />
            ) : (
              <>
                <View style={tw`flex-row items-center`}>
                  <Ionicons name={cta.icon} size={16} color={cta.disabled ? colors.textSecondary : colors.heroAccent} />
                  <Text style={[tw`text-[15px] font-bold ml-1.5`, { color: cta.disabled ? colors.textSecondary : colors.heroText }]}>
                    {cta.label}
                  </Text>
                </View>
                {!!cta.sub && (
                  <Text style={[tw`text-[11px] mt-0.5`, { color: colors.heroTextSecondary }]} numberOfLines={1}>
                    {cta.sub}
                  </Text>
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScreenWrapper>
  );
}
