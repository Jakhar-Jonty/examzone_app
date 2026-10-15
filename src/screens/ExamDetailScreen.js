import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import ReviewSection from '../components/ReviewSection';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatDate } from '../utils/helpers';
import { shortLanguageLabel, formatExamBreadcrumb } from '../utils/examDisplay';

import { t as tr } from '../i18n';
const EXAM_TYPE_LABELS = {
  mock: 'Mock test',
  'full-length': 'Full mock',
  sectional: 'Sectional test',
  pyq: 'Previous year paper',
  practice: 'Practice test',
  quiz: 'Quiz',
  adaptive: 'Adaptive test',
};

const DEFAULT_INSTRUCTIONS = [
  'Read each question carefully before answering',
  'Move between questions with Previous / Next',
  'Use "Mark for review" to flag questions to revisit',
  'You can change answers until you submit',
  'The test submits automatically when time runs out',
  'After submitting you cannot change your answers',
];

export default function ExamDetailScreen({ route, navigation }) {
  const { examId } = route.params;
  const { colors } = useTheme();
  const { isPremium } = useAuth();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null); // 'online' | 'omr'
  const [examStatus, setExamStatus] = useState(null); // 'new' | 'paused' | 'completed'
  const [attemptStatus, setAttemptStatus] = useState(null);
  const [completedAttemptId, setCompletedAttemptId] = useState(null);
  const [attemptHistory, setAttemptHistory] = useState([]);

  const supportsOmr = ['omr', 'both'].includes(exam?.deliveryMode);
  const supportsOnline = !exam?.deliveryMode || ['online', 'both'].includes(exam.deliveryMode);
  const locked = exam?.isPremium && !isPremium;

  useEffect(() => {
    fetchExamDetails();
  }, [examId]);

  const fetchExamDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/exams/${examId}`);
      setExam(response.data.exam);

      const status = response.data.attemptStatus;
      setAttemptStatus(status || null);
      if (status?.isCompleted) {
        setExamStatus('completed');
        setCompletedAttemptId(status.completedAttemptId);
      } else if (status?.isPaused) {
        setExamStatus('paused');
        if (status.pausedAttemptId) setCompletedAttemptId(status.pausedAttemptId);
      } else {
        setExamStatus('new');
      }
      setAttemptHistory(response.data.attemptHistory || []);
    } catch (error) {
      Alert.alert(tr("Error"), error.response?.data?.message || tr("Failed to load exam"));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (mode = 'online') => {
    if (locked) {
      navigation.navigate('Paywall', { reason: 'This exam is Premium. Upgrade to unlock it.' });
      return;
    }
    try {
      setStarting(mode);
      const response = await api.post(`/exams/${examId}/start`, { mode });
      const attemptData = response.data.attempt;
      const params = {
        examId,
        attemptId: attemptData._id,
        exam: response.data.exam || exam,
        attempt: attemptData,
        isResumed: response.data.isResumed || false,
      };
      if (mode === 'omr' || response.data.attemptMode === 'omr') {
        navigation.navigate('OmrEntry', params);
        return;
      }
      // ExamInterface is a root-stack screen (above the tabs).
      navigation.navigate('ExamInterface', params);
    } catch (error) {
      Alert.alert(tr("Error"), error.response?.data?.message || tr("Failed to start the exam"));
    } finally {
      setStarting(null);
    }
  };

  const card = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };

  if (loading || !exam) {
    return (
      <ScreenWrapper backgroundColor={colors.surface}>
        <Header title={tr("Exam")} navigation={navigation} colors={colors} />
        <View style={tw`flex-1 items-center justify-center`}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.text} />
          ) : (
            <Text style={[tw`text-sm`, { color: colors.textSecondary }]}>{tr("Exam not found")}</Text>
          )}
        </View>
      </ScreenWrapper>
    );
  }

  const questionCount =
    exam.totalQuestions || (typeof exam.questions === 'number' ? exam.questions : exam.questions?.length || 0);
  const stats = exam.attemptStats;
  const breadcrumb = formatExamBreadcrumb(exam);
  const scheduledLater = exam.scheduledTime && new Date(exam.scheduledTime) > new Date();
  const difficultyTone =
    { Easy: colors.tones.green, Medium: colors.tones.orange, Hard: colors.tones.red }[exam.difficultyLevel] ||
    colors.tones.blue;
  const instructions = (exam.instructions || '').trim();
  const pct = (score) => (exam.totalMarks ? `${Math.round((score / exam.totalMarks) * 100)}%` : '');

  const insights = [
    exam.averageRating > 0 && {
      icon: 'star', tone: colors.tones.orange,
      value: Number(exam.averageRating).toFixed(1),
      label: tr("Rating{0}", exam.reviewCount ? ` · ${exam.reviewCount}` : ''),
    },
    stats?.totalAttempts > 0 && { icon: 'people-outline', tone: colors.tones.blue, value: stats.totalAttempts, label: tr("Attempts") },
    stats?.topScore != null && { icon: 'trophy-outline', tone: colors.tones.green, value: `${stats.topScore}/${exam.totalMarks}`, label: tr("Top score") },
    stats?.averageScore != null && { icon: 'analytics-outline', tone: colors.tones.purple, value: stats.averageScore, label: tr("Avg score") },
    exam.difficultyLevel && { icon: 'speedometer-outline', tone: difficultyTone, value: exam.difficultyLevel, label: tr("Difficulty") },
    exam.language && { icon: 'language-outline', tone: colors.tones.blue, value: shortLanguageLabel(exam.language), label: tr("Language") },
  ].filter(Boolean);

  return (
    <ScreenWrapper backgroundColor={colors.surface}>
      <Header title={exam.title} navigation={navigation} colors={colors} />

      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-5 pt-4 pb-12`} showsVerticalScrollIndicator={false}>
        {/* ─── Hero ───────────────────────────────────── */}
        <View style={[tw`p-5 rounded-3xl mb-4`, { backgroundColor: colors.hero }]}>
          <View style={tw`flex-row items-center justify-between`}>
            <Text style={[tw`text-[11px] font-bold tracking-widest`, { color: colors.heroMuted }]}>
              {tr(EXAM_TYPE_LABELS[exam.examType] || 'Test').toUpperCase()}
            </Text>
            {exam.isPremium && (
              <View style={[tw`flex-row items-center px-2 py-1 rounded-md`, { backgroundColor: colors.heroRaised }]}>
                <Ionicons name="diamond" size={11} color={colors.heroAccent} />
                <Text style={[tw`text-[10px] font-bold ml-1`, { color: colors.heroText }]}>{tr("PRO")}</Text>
              </View>
            )}
          </View>
          <Text style={[tw`text-2xl font-extrabold mt-1`, { color: colors.heroText }]}>{exam.title}</Text>
          {breadcrumb ? (
            <Text style={[tw`text-xs mt-1`, { color: colors.heroTextSecondary }]}>{breadcrumb}</Text>
          ) : null}

          <View style={tw`flex-row mt-5`}>
            {[
              { label: tr("Questions"), value: questionCount },
              { label: tr("Minutes"), value: exam.duration || 0 },
              { label: tr("Marks"), value: exam.totalMarks || 0 },
            ].map((s, i) => (
              <View
                key={s.label}
                style={[tw`flex-1`, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.heroTrack, paddingLeft: 14 }]}
              >
                <Text style={[tw`text-xl font-extrabold`, { color: colors.heroText }]}>{s.value}</Text>
                <Text style={[tw`text-[11px] mt-0.5`, { color: colors.heroMuted }]}>{tr(s.label)}</Text>
              </View>
            ))}
          </View>

          {(exam.enableNegativeMarking && exam.negativeMarksPerQuestion) || scheduledLater ? (
            <View style={[tw`mt-4 pt-3`, { borderTopWidth: 1, borderTopColor: colors.heroTrack }]}>
              {exam.enableNegativeMarking && exam.negativeMarksPerQuestion ? (
                <Text style={[tw`text-xs`, { color: colors.heroTextSecondary }]}>
                  {tr("−{0} marks for each wrong answer", Math.abs(exam.negativeMarksPerQuestion))}
                </Text>
              ) : null}
              {scheduledLater ? (
                <Text style={[tw`text-xs mt-0.5`, { color: colors.heroTextSecondary }]}>
                  {tr("Opens {0}", formatDate(exam.scheduledTime))}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* ─── Actions by status ──────────────────────── */}
        {examStatus === 'completed' ? (
          <View style={[tw`p-4 rounded-3xl mb-4`, card]}>
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <View style={tw`flex-row items-center`}>
                <Ionicons name="checkmark-circle" size={18} color={colors.tones.green.fg} />
                <Text style={[tw`text-sm font-bold ml-1.5`, { color: colors.text }]}>{tr("Completed")}</Text>
              </View>
              {attemptStatus?.maxAttempts ? (
                <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>
                  {tr("{0}/{1} attempts used", attemptStatus.attemptCount, attemptStatus.maxAttempts)}
                </Text>
              ) : null}
            </View>

            {attemptStatus?.bestScore != null && attemptStatus?.latestScore != null && (
              <View style={tw`flex-row gap-2.5 mb-3`}>
                {[
                  { label: tr("Best"), score: attemptStatus.bestScore, sub: pct(attemptStatus.bestScore) },
                  {
                    label: tr("Latest"),
                    score: attemptStatus.latestScore,
                    sub: attemptStatus.latestPercentage != null ? `${Math.round(attemptStatus.latestPercentage)}%` : '',
                  },
                ].map((s) => (
                  <View key={s.label} style={[tw`flex-1 p-3 rounded-2xl`, { backgroundColor: colors.surfaceMuted }]}>
                    <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>{tr("{0} score", s.label)}</Text>
                    <Text style={[tw`text-lg font-extrabold mt-0.5`, { color: colors.text }]}>
                      {s.score}/{exam.totalMarks}
                      <Text style={[tw`text-xs font-semibold`, { color: colors.textSecondary }]}>  {tr(s.sub)}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={tw`flex-row gap-2.5`}>
              <PrimaryButton
                label={tr("View result")}
                icon="eye-outline"
                colors={colors}
                onPress={() => completedAttemptId && navigation.navigate('Result', { attemptId: completedAttemptId })}
              />
              {attemptStatus?.canReattempt && (
                <SecondaryButton
                  label={tr("Re-attempt")}
                  icon="refresh"
                  loading={starting === 'online'}
                  colors={colors}
                  onPress={() => handleStartExam('online')}
                />
              )}
            </View>
          </View>
        ) : examStatus === 'paused' ? (
          <View style={[tw`p-4 rounded-3xl mb-4`, { backgroundColor: colors.tones.orange.bg }]}>
            <View style={tw`flex-row items-center mb-1`}>
              <Ionicons name="pause-circle" size={18} color={colors.tones.orange.fg} />
              <Text style={[tw`text-sm font-bold ml-1.5`, { color: colors.tones.orange.fg }]}>{tr("Paused")}</Text>
            </View>
            <Text style={[tw`text-xs mb-3`, { color: colors.text }]}>
              {tr("Your answers are saved. Continue where you left off.")}
            </Text>
            <PrimaryButton
              label={tr("Resume test")}
              icon="play"
              loading={starting === 'online'}
              colors={colors}
              onPress={() => handleStartExam('online')}
            />
          </View>
        ) : (
          <View style={tw`mb-4`}>
            {supportsOnline && (
              <PrimaryButton
                label={locked ? tr("Unlock with Premium") : supportsOmr ? tr("Start online test") : tr("Start test")}
                icon={locked ? 'lock-closed' : 'play'}
                loading={starting === 'online'}
                colors={colors}
                onPress={() => handleStartExam('online')}
              />
            )}
            {supportsOmr && (
              <>
                <View style={tw`h-2.5`} />
                <SecondaryButton
                  label={tr("OMR mode — enter answers")}
                  icon="grid-outline"
                  loading={starting === 'omr'}
                  disabled={locked}
                  colors={colors}
                  onPress={() => handleStartExam('omr')}
                />
                <Text style={[tw`text-xs text-center mt-2 px-4`, { color: colors.textSecondary }]}>
                  {tr("Attempt on paper, then fill the OMR grid here for instant rank and solutions.")}
                </Text>
              </>
            )}
          </View>
        )}

        {/* ─── Attempt history ────────────────────────── */}
        {examStatus === 'completed' && attemptHistory.length > 0 && (
          <Section title={tr("Your attempts")} colors={colors}>
            <View style={[tw`rounded-3xl overflow-hidden`, card]}>
              {attemptHistory.map((item, i) => {
                const p = Math.round(item.percentage || 0);
                const tone = p >= 80 ? colors.tones.green : p >= 60 ? colors.tones.orange : colors.tones.red;
                return (
                  <TouchableOpacity
                    key={item._id}
                    onPress={() => navigation.navigate('Result', { attemptId: item._id })}
                    activeOpacity={0.8}
                    style={[
                      tw`flex-row items-center px-4 py-3.5`,
                      i < attemptHistory.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={[tw`w-11 h-11 rounded-full items-center justify-center mr-3`, { backgroundColor: tone.bg }]}>
                      <Text style={[tw`text-xs font-bold`, { color: tone.fg }]}>{p}%</Text>
                    </View>
                    <View style={tw`flex-1`}>
                      <Text style={[tw`text-sm font-bold`, { color: colors.text }]}>{tr("Attempt {0}", item.attemptNumber)}</Text>
                      <Text style={[tw`text-xs mt-0.5`, { color: colors.textSecondary }]}>
                        {tr("{0}/{1} marks · {2}", item.score, exam.totalMarks, formatDate(item.date))}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </Section>
        )}

        {/* ─── Insights ───────────────────────────────── */}
        {insights.length > 0 && (
          <Section title={tr("About this test")} colors={colors}>
            <View style={tw`flex-row flex-wrap justify-between`}>
              {insights.map((it) => (
                <View
                  key={it.label}
                  style={[tw`flex-row items-center p-3 rounded-2xl mb-2.5`, card, { width: '48.5%' }]}
                >
                  <View style={[tw`w-9 h-9 rounded-xl items-center justify-center mr-2.5`, { backgroundColor: it.tone.bg }]}>
                    <Ionicons name={it.icon} size={17} color={it.tone.fg} />
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={[tw`text-sm font-extrabold`, { color: colors.text }]} numberOfLines={1}>{it.value}</Text>
                    <Text style={[tw`text-[11px]`, { color: colors.textSecondary }]} numberOfLines={1}>{tr(it.label)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* ─── Instructions ───────────────────────────── */}
        <Section title={tr("Instructions")} colors={colors}>
          <View style={[tw`p-4 rounded-3xl`, card]}>
            {instructions ? (
              <Text style={[tw`text-sm leading-6`, { color: colors.text }]}>{instructions}</Text>
            ) : (
              DEFAULT_INSTRUCTIONS.map((line, i) => (
                <View key={line} style={[tw`flex-row items-start`, i > 0 && tw`mt-2.5`]}>
                  <View style={[tw`w-5 h-5 rounded-full items-center justify-center mr-2.5 mt-0.5`, { backgroundColor: colors.surfaceMuted }]}>
                    <Text style={[tw`text-[10px] font-bold`, { color: colors.textSecondary }]}>{i + 1}</Text>
                  </View>
                  <Text style={[tw`flex-1 text-sm leading-5`, { color: colors.text }]}>{tr(line)}</Text>
                </View>
              ))
            )}
          </View>
        </Section>

        {/* ─── Reviews ────────────────────────────────── */}
        <ReviewSection targetType="exam" targetId={exam._id} canReview={(attemptStatus?.attemptCount ?? 0) > 0} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ─── Building blocks ─────────────────────────────────────

function Header({ title, navigation, colors }) {
  return (
    <View style={tw`flex-row items-center px-3 pt-2 pb-2`}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`} accessibilityLabel={tr("Back")}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={[tw`flex-1 text-base font-bold text-center mx-2`, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={tw`w-10`} />
    </View>
  );
}

function Section({ title, colors, children }) {
  return (
    <View style={tw`mb-5`}>
      <Text style={[tw`text-lg font-extrabold mb-3`, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function PrimaryButton({ label, icon, onPress, loading, colors }) {
  return (
    <TouchableOpacity
      style={[tw`flex-1 flex-row items-center justify-center h-12 rounded-2xl`, { backgroundColor: colors.hero }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={colors.heroText} />
      ) : (
        <>
          <Ionicons name={icon} size={17} color={colors.heroText} />
          <Text style={[tw`text-sm font-bold ml-2`, { color: colors.heroText }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function SecondaryButton({ label, icon, onPress, loading, disabled, colors }) {
  return (
    <TouchableOpacity
      style={[
        tw`flex-1 flex-row items-center justify-center h-12 rounded-2xl`,
        { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, opacity: disabled ? 0.5 : 1 },
      ]}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <>
          <Ionicons name={icon} size={17} color={colors.text} />
          <Text style={[tw`text-sm font-bold ml-2`, { color: colors.text }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
