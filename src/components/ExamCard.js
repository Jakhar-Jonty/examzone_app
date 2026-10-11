import React from 'react';
import { View, Text, TouchableOpacity, Platform, TextInput, ScrollView } from 'react-native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import { getExamStatus } from '../utils/helpers';
import {
  formatAttemptCount,
  formatExamBreadcrumb,
  shortLanguageLabel,
  difficultyColor,
} from '../utils/examDisplay';
import { EXAM_SORT_OPTIONS } from '../utils/examSort';
import { useAuth } from '../context/AuthContext';

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  android: { elevation: 3 },
  default: {},
});

function Badge({ label, tone = 'neutral', colors }) {
  const tones = {
    free: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
    pro: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
    done: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
    paused: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
    recommended: { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
    new: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
    continue: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
    neutral: { bg: colors.surface, text: colors.textSecondary, border: colors.border },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <View style={[tw`px-2 py-0.5 rounded-md border`, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={[tw`text-[10px] font-bold`, { color: t.text }]}>
        {label}
      </Text>
    </View>
  );
}

function SpecMetric({ icon, value, label, colors }) {
  return (
    <View
      style={[
        tw`flex-1 items-center py-2 rounded-xl border`,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <Ionicons name={icon} size={14} color={colors.primary} style={tw`mb-0.5`} />
      <Text style={[tw`text-sm font-bold`, { color: colors.text }]}>{value}</Text>
      <Text style={[tw`text-[10px]`, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function MetaChip({ icon, label, color, colors }) {
  if (!label) return null;
  return (
    <View
      style={[
        tw`flex-row items-center gap-1 px-2 py-1 rounded-full`,
        { backgroundColor: (color || colors.textSecondary) + '14' },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={11} color={color || colors.textSecondary} />
      ) : null}
      <Text style={[tw`text-[10px] font-semibold`, { color: color || colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

function ActionButton({ label, onPress, colors, variant = 'primary', flex }) {
  const isPrimary = variant === 'primary';
  const isResume = variant === 'resume';
  const accent = isResume ? '#f59e0b' : colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        flex ? tw`flex-1` : tw`w-full`,
        tw`py-2.5 rounded-xl items-center justify-center flex-row gap-1.5`,
        isPrimary || isResume
          ? { backgroundColor: accent }
          : { backgroundColor: colors.card, borderWidth: 1.5, borderColor: accent },
      ]}
    >
      {isPrimary && label === 'Start' && (
        <Ionicons name="play" size={14} color="#fff" />
      )}
      <Text
        style={[
          tw`text-xs font-bold`,
          { color: isPrimary || isResume ? '#fff' : accent },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Exam list card — structured hierarchy with spec grid + footer actions.
 */
export default function ExamCard({
  exam,
  navigation,
  colors,
  showBreadcrumb = true,
  compact = false,
  highlightTag,
}) {
  const { isPremium: isPremiumUser } = useAuth();
  if (!exam) return null;

  const status = getExamStatus(exam);
  const locked = exam.isPremium && !isPremiumUser;
  const stats = exam.attemptStats;
  const qCount = exam.totalQuestions || exam.questions || 0;
  const attempted = !!(exam.isAttempted || exam.attemptId);
  const cardBg = colors.card || '#FFFFFF';
  const breadcrumb = formatExamBreadcrumb(exam);

  const openDetail = () => navigation.navigate('ExamDetail', { examId: exam._id });

  const startExam = () => {
    if (locked) {
      navigation.navigate('Paywall', {
        reason: 'This exam is Premium. Upgrade to unlock it.',
      });
      return;
    }
    openDetail();
  };

  const renderFooter = () => {
    if (attempted && exam.attemptId) {
      return (
        <View style={[tw`flex-row gap-2 pt-3 mt-3 border-t`, { borderColor: colors.border }]}>
          <ActionButton
            label="View Result"
            onPress={() => navigation.navigate('Result', { attemptId: exam.attemptId })}
            colors={colors}
            variant="primary"
            flex
          />
          {status === 'available' && (
            <ActionButton label="Re-attempt" onPress={startExam} colors={colors} variant="outline" flex />
          )}
        </View>
      );
    }

    if (exam.isPaused) {
      return (
        <View style={[tw`pt-3 mt-3 border-t`, { borderColor: colors.border }]}>
          <ActionButton label="Resume Exam" onPress={openDetail} colors={colors} variant="resume" />
        </View>
      );
    }

    if (status === 'available') {
      return (
        <View style={[tw`pt-3 mt-3 border-t`, { borderColor: colors.border }]}>
          <ActionButton
            label={locked ? 'Unlock with Pro' : 'Start Exam'}
            onPress={startExam}
            colors={colors}
            variant={locked ? 'outline' : 'primary'}
          />
        </View>
      );
    }

    return (
      <View style={[tw`pt-3 mt-3 border-t items-center`, { borderColor: colors.border }]}>
        <Text style={[tw`text-xs font-semibold`, { color: colors.textSecondary }]}>
          {status === 'upcoming' ? 'Starts soon' : 'No longer available'}
        </Text>
      </View>
    );
  };

  const diffColor = difficultyColor(exam.difficultyLevel);
  const langLabel = shortLanguageLabel(exam.language);
  const attemptLabel = formatAttemptCount(stats?.totalAttempts);

  return (
    <TouchableOpacity
      onPress={openDetail}
      activeOpacity={0.92}
      style={[
        tw`rounded-2xl border`,
        compact ? tw`mb-0` : null,
        cardShadow,
        { backgroundColor: cardBg, borderColor: colors.border },
      ]}
    >
      <View style={tw`px-4 pt-3.5 pb-3.5`}>
        {/* Title + status chips (same row) */}
        <View style={tw`flex-row items-start gap-2`}>
          <Text
            style={[
              tw`flex-1 min-w-0`,
              compact ? tw`text-sm font-bold leading-5` : tw`text-base font-bold leading-snug`,
              { color: colors.text },
            ]}
            numberOfLines={2}
          >
            {exam.title}
          </Text>
          <View style={tw`items-end gap-1 flex-shrink-0 max-w-[42%]`}>
            <View style={tw`flex-row flex-wrap justify-end gap-1`}>
              <Badge
                label={exam.isPremium ? 'Pro' : 'Free'}
                tone={exam.isPremium ? 'pro' : 'free'}
                colors={colors}
              />
              {attempted && <Badge label="Attempted" tone="done" colors={colors} />}
              {exam.isPaused && <Badge label="Paused" tone="paused" colors={colors} />}
            </View>
            {highlightTag && (
              <Badge
                label={
                  highlightTag === 'recommended'
                    ? 'Recommended'
                    : highlightTag === 'new'
                      ? 'New'
                      : 'Continue'
                }
                tone={highlightTag}
                colors={colors}
              />
            )}
          </View>
        </View>

        {showBreadcrumb && breadcrumb ? (
          <View style={tw`flex-row items-center gap-1 mt-1`}>
            <Ionicons name="folder-open-outline" size={12} color={colors.textSecondary} />
            <Text
              style={[tw`text-[11px] flex-1`, { color: colors.textSecondary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {breadcrumb}
            </Text>
          </View>
        ) : null}

        {/* Spec grid */}
        <View style={tw`flex-row gap-2 mt-3`}>
          {qCount > 0 && (
            <SpecMetric icon="help-circle-outline" value={qCount} label="Questions" colors={colors} />
          )}
          <SpecMetric icon="time-outline" value={exam.duration} label="Minutes" colors={colors} />
          <SpecMetric icon="ribbon-outline" value={exam.totalMarks} label="Marks" colors={colors} />
        </View>

        {/* Your score highlight */}
        {attempted && exam.lastScore != null && exam.totalMarks != null && (
          <View
            style={[
              tw`flex-row items-center justify-between mt-3 px-3 py-2 rounded-xl`,
              { backgroundColor: colors.primary + '12' },
            ]}
          >
            <View style={tw`flex-row items-center gap-2`}>
              <Ionicons name="trophy-outline" size={16} color={colors.primary} />
              <Text style={[tw`text-xs font-semibold`, { color: colors.text }]}>
                Your score
              </Text>
            </View>
            <Text style={[tw`text-sm font-bold`, { color: colors.primary }]}>
              {exam.lastScore}/{exam.totalMarks}
              {exam.lastPercentage != null
                ? `  ·  ${Math.round(exam.lastPercentage)}%`
                : ''}
            </Text>
          </View>
        )}

        {/* Social proof + meta */}
        {(attemptLabel || exam.averageRating > 0 || langLabel || stats?.topScore != null || exam.difficultyLevel) && (
          <View style={tw`flex-row flex-wrap gap-1.5 mt-3`}>
            {exam.difficultyLevel && (
              <MetaChip
                icon="pulse"
                label={exam.difficultyLevel}
                color={diffColor}
                colors={colors}
              />
            )}
            {exam.averageRating > 0 && (
              <MetaChip
                icon="star"
                label={Number(exam.averageRating).toFixed(1)}
                color="#d97706"
                colors={colors}
              />
            )}
            {attemptLabel && (
              <MetaChip
                icon="people-outline"
                label={`${attemptLabel} attempts`}
                colors={colors}
              />
            )}
            {langLabel && <MetaChip icon="language-outline" label={langLabel} colors={colors} />}
            {stats?.topScore != null && exam.totalMarks && (
              <MetaChip
                icon="trending-up-outline"
                label={`Top ${stats.topScore}/${exam.totalMarks}`}
                colors={colors}
              />
            )}
          </View>
        )}

        {renderFooter()}
      </View>
    </TouchableOpacity>
  );
}

export function ExamFilterChips({ value, onChange, colors, counts }) {
  const chips = [
    { key: 'all', label: `All${counts?.all != null ? ` (${counts.all})` : ''}` },
    { key: 'available', label: `Available${counts?.available != null ? ` (${counts.available})` : ''}` },
    { key: 'attempted', label: `Attempted${counts?.attempted != null ? ` (${counts.attempted})` : ''}` },
  ];

  return (
    <View
      style={[
        tw`flex-row rounded-lg p-1 mb-3`,
        { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
      ]}
    >
      {chips.map(({ key, label }) => {
        const active = value === key;
        return (
          <TouchableOpacity
            key={key}
            style={[
              tw`flex-1 py-2 rounded-md items-center`,
              active && { backgroundColor: colors.card },
            ]}
            onPress={() => onChange(key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                tw`text-[11px] font-semibold`,
                { color: active ? colors.primary : colors.textSecondary },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function filterExamsByChip(exams, filter) {
  if (!exams?.length) return [];
  if (filter === 'available') {
    return exams.filter((e) => getExamStatus(e) === 'available' && !e.isAttempted && !e.isPaused);
  }
  if (filter === 'attempted') {
    return exams.filter((e) => e.isAttempted || e.attemptId || e.isPaused);
  }
  return exams;
}

export function examFilterCounts(exams) {
  const list = exams || [];
  return {
    all: list.length,
    available: list.filter((e) => getExamStatus(e) === 'available' && !e.isAttempted && !e.isPaused)
      .length,
    attempted: list.filter((e) => e.isAttempted || e.attemptId || e.isPaused).length,
  };
}

export function ExamSearchBar({
  value,
  onChangeText,
  colors,
  placeholder = 'Search exams...',
  rightAccessory,
}) {
  const field = (
    <View
      style={[
        tw`flex-1 flex-row items-center rounded-xl px-3 py-2.5 border gap-2`,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Ionicons name="search" size={18} color={colors.textSecondary} />
      <TextInput
        style={[tw`flex-1 text-sm`, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
      />
      {value?.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (rightAccessory) {
    return (
      <View style={tw`flex-row items-center gap-2 mb-3`}>
        {field}
        {rightAccessory}
      </View>
    );
  }

  return <View style={tw`mb-3`}>{field}</View>;
}

export function ExamSortChips({ value, onChange, colors }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw`gap-2 mb-3 pr-1`}
    >
      {EXAM_SORT_OPTIONS.map(({ key, label }) => {
        const active = value === key;
        return (
          <TouchableOpacity
            key={key}
            style={[
              tw`px-3 py-1.5 rounded-full border`,
              active
                ? { backgroundColor: colors.primary + '18', borderColor: colors.primary }
                : { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => onChange(key)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                tw`text-[11px] font-semibold`,
                { color: active ? colors.primary : colors.textSecondary },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
