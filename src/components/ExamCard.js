import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import { getExamStatus } from '../utils/helpers';
import { formatAttemptCount, formatExamBreadcrumb, shortLanguageLabel } from '../utils/examDisplay';
import { EXAM_SORT_OPTIONS } from '../utils/examSort';
import { useAuth } from '../context/AuthContext';

import { t as tr } from '../i18n';
// Badge tone → theme tone pair.
const badgeTone = (tone, colors) =>
  ({
    free: colors.tones.green,
    pro: colors.tones.purple,
    done: colors.tones.green,
    paused: colors.tones.orange,
    continue: colors.tones.orange,
    recommended: colors.tones.purple,
    new: colors.tones.blue,
  })[tone] || { fg: colors.textSecondary, bg: colors.surfaceMuted };

const difficultyTone = (level, colors) =>
  ({ Easy: colors.tones.green, Medium: colors.tones.orange, Hard: colors.tones.red })[level] || null;

function Badge({ label, tone, colors }) {
  const t = badgeTone(tone, colors);
  return (
    <View style={[tw`px-2 py-1 rounded-md`, { backgroundColor: t.bg }]}>
      <Text style={[tw`text-[10px] font-bold`, { color: t.fg }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

function Meta({ icon, label, color, colors }) {
  if (!label) return null;
  return (
    <View style={tw`flex-row items-center mr-3`}>
      <Ionicons name={icon} size={11} color={color || colors.textSecondary} />
      <Text style={[tw`text-[11px] font-semibold ml-1`, { color: color || colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function ActionButton({ label, icon, onPress, colors, variant = 'primary' }) {
  const style =
    variant === 'primary'
      ? { bg: colors.hero, fg: colors.heroText }
      : variant === 'resume'
        ? { bg: colors.tones.orange.bg, fg: colors.tones.orange.fg }
        : { bg: colors.card, fg: colors.text, border: colors.border };
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        tw`flex-1 h-10 rounded-xl items-center justify-center flex-row`,
        { backgroundColor: style.bg },
        style.border && { borderWidth: 1, borderColor: style.border },
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={style.fg} /> : null}
      <Text style={[tw`text-[13px] font-bold`, icon && tw`ml-1.5`, { color: style.fg }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * Exam list card: title + badges, breadcrumb, specs, your score, meta, actions.
 */
export default function ExamCard({ exam, navigation, colors, showBreadcrumb = true, compact = false, highlightTag }) {
  const { isPremium: isPremiumUser } = useAuth();
  if (!exam) return null;

  const status = getExamStatus(exam);
  const locked = exam.isPremium && !isPremiumUser;
  const stats = exam.attemptStats;
  const qCount = exam.totalQuestions || exam.questions || 0;
  const attempted = !!(exam.isAttempted || exam.attemptId);
  const breadcrumb = formatExamBreadcrumb(exam);
  const diffTone = difficultyTone(exam.difficultyLevel, colors);
  const langLabel = shortLanguageLabel(exam.language);
  const attemptLabel = formatAttemptCount(stats?.totalAttempts);

  const openDetail = () => navigation.navigate('ExamDetail', { examId: exam._id });
  const startExam = () => {
    if (locked) {
      navigation.navigate('Paywall', { reason: 'This exam is Premium. Upgrade to unlock it.' });
      return;
    }
    openDetail();
  };

  const footer = (() => {
    if (exam.isPaused) {
      return (
        <>
          <ActionButton label={tr("Resume")} icon="play" onPress={openDetail} colors={colors} variant="resume" />
          {attempted && exam.attemptId && (
            <>
              <View style={tw`w-2`} />
              <ActionButton
                label={tr("View result")}
                onPress={() => navigation.navigate('Result', { attemptId: exam.attemptId })}
                colors={colors}
                variant="outline"
              />
            </>
          )}
        </>
      );
    }
    if (attempted && exam.attemptId) {
      return (
        <>
          <ActionButton
            label={tr("View result")}
            onPress={() => navigation.navigate('Result', { attemptId: exam.attemptId })}
            colors={colors}
          />
          {status === 'available' && (
            <>
              <View style={tw`w-2`} />
              <ActionButton label={tr("Re-attempt")} onPress={startExam} colors={colors} variant="outline" />
            </>
          )}
        </>
      );
    }
    if (status === 'available') {
      return (
        <ActionButton
          label={locked ? tr("Unlock with Pro") : tr("Start test")}
          icon={locked ? 'lock-closed' : 'play'}
          onPress={startExam}
          colors={colors}
          variant={locked ? 'outline' : 'primary'}
        />
      );
    }
    return (
      <Text style={[tw`flex-1 text-xs font-semibold text-center py-2`, { color: colors.textSecondary }]}>
        {status === 'upcoming' ? tr("Opens soon") : tr("No longer available")}
      </Text>
    );
  })();

  const scorePct = exam.lastPercentage != null ? Math.round(exam.lastPercentage) : null;
  const scoreTone =
    scorePct == null ? null : scorePct >= 80 ? colors.tones.green : scorePct >= 60 ? colors.tones.orange : colors.tones.red;

  return (
    <TouchableOpacity
      onPress={openDetail}
      activeOpacity={0.92}
      style={[
        tw`rounded-2xl`,
        compact ? tw`mb-0` : null,
        { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
      ]}
    >
      <View style={tw`p-3.5`}>
        <View style={tw`flex-row items-start`}>
          <View style={tw`flex-1 pr-2`}>
            <Text
              style={[tw`text-[15px] font-extrabold leading-snug`, { color: colors.text }]}
              numberOfLines={2}
            >
              {exam.title}
            </Text>
            {showBreadcrumb && breadcrumb ? (
              <Text style={[tw`text-[11px] mt-0.5`, { color: colors.textSecondary }]} numberOfLines={1}>
                {breadcrumb}
              </Text>
            ) : null}
          </View>
          <View style={tw`items-end`}>
            <View style={tw`flex-row`}>
              {exam.isPaused && (
                <View style={tw`mr-1`}>
                  <Badge label={tr("Paused")} tone="paused" colors={colors} />
                </View>
              )}
              <Badge label={exam.isPremium ? tr("Pro") : tr("Free")} tone={exam.isPremium ? 'pro' : 'free'} colors={colors} />
            </View>
            {/* "Continue" adds nothing next to the Paused badge, so only New / For you show. */}
            {(highlightTag === 'new' || highlightTag === 'recommended') && (
              <View style={tw`mt-1`}>
                <Badge
                  label={highlightTag === 'recommended' ? tr("For you") : tr("New")}
                  tone={highlightTag}
                  colors={colors}
                />
              </View>
            )}
          </View>
        </View>

        <View style={tw`flex-row items-center justify-between mt-2.5`}>
          <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>
            {[
              qCount > 0 && `${qCount} Qs`,
              exam.duration != null && tr("{0} min", exam.duration),
              exam.totalMarks != null && tr("{0} marks", exam.totalMarks),
            ]
              .filter(Boolean)
              .map((part, i) => (
                <Text key={part}>
                  {i > 0 ? '  ·  ' : ''}
                  <Text style={[tw`font-bold`, { color: colors.text }]}>{part.split(' ')[0]}</Text>
                  {` ${tr(part.split(' ').slice(1).join(' '))}`}
                </Text>
              ))}
          </Text>
          {attempted && exam.lastScore != null && exam.totalMarks != null && (
            <View style={[tw`px-2 py-1 rounded-lg`, { backgroundColor: scoreTone?.bg || colors.surfaceMuted }]}>
              <Text style={[tw`text-xs font-extrabold`, { color: scoreTone?.fg || colors.text }]}>
                {exam.lastScore}/{exam.totalMarks}
                {scorePct != null ? ` · ${scorePct}%` : ''}
              </Text>
            </View>
          )}
        </View>

        {(exam.difficultyLevel || exam.averageRating > 0 || attemptLabel || langLabel || stats?.topScore != null) && (
          <View style={tw`flex-row flex-wrap mt-1.5`}>
            {exam.difficultyLevel && (
              <Meta icon="speedometer-outline" label={exam.difficultyLevel} color={diffTone?.fg} colors={colors} />
            )}
            {exam.averageRating > 0 && (
              <Meta icon="star" label={Number(exam.averageRating).toFixed(1)} color={colors.tones.orange.fg} colors={colors} />
            )}
            {attemptLabel && (
              <Meta
                icon="people-outline"
                label={`${attemptLabel} ${stats?.totalAttempts === 1 ? 'attempt' : 'attempts'}`}
                colors={colors}
              />
            )}
            {langLabel && <Meta icon="language-outline" label={langLabel} colors={colors} />}
            {stats?.topScore != null && exam.totalMarks && (
              <Meta icon="trending-up-outline" label={tr("Top {0}/{1}", stats.topScore, exam.totalMarks)} colors={colors} />
            )}
          </View>
        )}

        <View style={tw`flex-row mt-3`}>{footer}</View>
      </View>
    </TouchableOpacity>
  );
}

export function ExamFilterChips({ value, onChange, colors, counts }) {
  const chips = [
    { key: 'all', label: tr("All{0}", counts?.all != null ? ` ${counts.all}` : '') },
    { key: 'available', label: tr("Available{0}", counts?.available != null ? ` ${counts.available}` : '') },
    { key: 'attempted', label: tr("Attempted{0}", counts?.attempted != null ? ` ${counts.attempted}` : '') },
  ];
  return (
    <View style={[tw`flex-row rounded-2xl p-1 mb-3`, { backgroundColor: colors.surfaceMuted }]}>
      {chips.map(({ key, label }) => {
        const active = value === key;
        return (
          <TouchableOpacity
            key={key}
            style={[tw`flex-1 py-2 rounded-xl items-center`, active && { backgroundColor: colors.card }]}
            onPress={() => onChange(key)}
            activeOpacity={0.8}
          >
            <Text style={[tw`text-xs font-bold`, { color: active ? colors.text : colors.textSecondary }]}>{label}</Text>
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
    available: list.filter((e) => getExamStatus(e) === 'available' && !e.isAttempted && !e.isPaused).length,
    attempted: list.filter((e) => e.isAttempted || e.attemptId || e.isPaused).length,
  };
}

export function ExamSearchBar({ value, onChangeText, colors, placeholder = tr("Search exams..."), rightAccessory, compact }) {
  const field = (
    <View
      style={[
        tw`flex-1 flex-row items-center rounded-2xl px-3.5`,
        compact ? tw`h-11` : tw`h-12`,
        { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
      ]}
    >
      <Ionicons name="search" size={18} color={colors.textSecondary} />
      <TextInput
        style={[tw`flex-1 text-sm ml-2`, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
      />
      {value?.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} activeOpacity={0.7} accessibilityLabel={tr("Clear search")}>
          <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (rightAccessory) {
    return (
      <View style={[tw`flex-row items-center gap-2`, compact ? tw`mb-2.5` : tw`mb-3`]}>
        {field}
        {rightAccessory}
      </View>
    );
  }
  return <View style={tw`mb-3`}>{field}</View>;
}

export function ExamSortChips({ value, onChange, colors }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-2 mb-3 pr-1`}>
      {EXAM_SORT_OPTIONS.map(({ key, label }) => {
        const active = value === key;
        return (
          <TouchableOpacity
            key={key}
            style={[
              tw`px-3.5 py-2 rounded-full`,
              active
                ? { backgroundColor: colors.hero }
                : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
            ]}
            onPress={() => onChange(key)}
            activeOpacity={0.75}
          >
            <Text style={[tw`text-xs font-bold`, { color: active ? colors.heroText : colors.textSecondary }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
