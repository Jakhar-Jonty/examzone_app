import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Share,
  Image,
} from 'react-native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import RewardCelebration from '../components/RewardCelebration';
import ReviewSection from '../components/ReviewSection';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatDate } from '../utils/helpers';
import {
  getLocalizedQuestionText,
  getLocalizedQuestionOptions,
  getLocalizedExplanation,
  resolveDisplayLanguage,
  supportsLanguageSwitch,
} from '../utils/questionLanguage';
import {
  calculateSectionAnalysis,
  calculateSubjectTopicAnalysis,
  calculateDifficultyAnalysis,
  calculateTimeAnalysis,
  answerInSection,
} from '../utils/resultAnalysis';
import { buildAirCopyFromPeerStats } from '../utils/airCopy';
import { startTopicPractice } from '../utils/startTopicPractice';

// ─── Helpers ─────────────────────────────────────────────
const formatTime = (seconds) => {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
};

// Green ≥ 80, orange ≥ 60, red below — returns a { fg, bg } tone from the theme.
const scoreTone = (value, colors) => {
  if (value >= 80) return colors.tones.green;
  if (value >= 60) return colors.tones.orange;
  return colors.tones.red;
};

const getScoreMessage = (value) => {
  if (value >= 90) return 'Outstanding';
  if (value >= 80) return 'Excellent';
  if (value >= 60) return 'Good job';
  if (value >= 40) return 'Keep practising';
  return 'Needs improvement';
};

// ─── Main screen ─────────────────────────────────────────
export default function ResultScreen({ route, navigation }) {
  const { attemptId, rewards } = route.params;
  const { colors } = useTheme();
  const { user } = useAuth();

  // Show the celebration once when arriving fresh from a submit (rewards passed).
  const [showCelebration, setShowCelebration] = useState(!!rewards);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [attemptStatus, setAttemptStatus] = useState(null);
  const [starting, setStarting] = useState(false);
  const [questionFilter, setQuestionFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [displayLanguage, setDisplayLanguage] = useState('English');
  const [previousAttempts, setPreviousAttempts] = useState([]);
  const [peerStats, setPeerStats] = useState(null);
  const [startingPracticeTopic, setStartingPracticeTopic] = useState(null);
  const [savedQuestions, setSavedQuestions] = useState(new Set());
  const [savingQuestionId, setSavingQuestionId] = useState(null);

  useEffect(() => {
    if (result?.exam?.language) {
      setDisplayLanguage(resolveDisplayLanguage(result.exam.language, user?.preferredLanguage));
    }
  }, [result?.exam?.language, user?.preferredLanguage]);

  useEffect(() => {
    fetchResult();
  }, [attemptId]);

  const fetchResult = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/exams/result/${attemptId}`);
      let resultData = response.data.result;
      setPreviousAttempts(response.data.previousAttempts || []);
      setPeerStats(response.data.peerStats || null);

      if (resultData?.exam?._id) {
        try {
          const examRes = await api.get(`/exams/${resultData.exam._id}`);
          if (examRes.data.attemptStatus) setAttemptStatus(examRes.data.attemptStatus);
          if (examRes.data.exam) {
            resultData = { ...resultData, exam: { ...resultData.exam, ...examRes.data.exam } };
          }
        } catch {}
      }

      setResult(resultData);

      const questionIds = (resultData?.answers || [])
        .map((a) => a.question?._id?.toString?.() || a.question?._id)
        .filter(Boolean);
      if (questionIds.length > 0) {
        try {
          const savedRes = await api.post('/user/questions/check-saved', { questionIds });
          const map = savedRes.data?.savedMap || {};
          setSavedQuestions(new Set(Object.keys(map).filter((id) => map[id])));
        } catch {}
      }
    } catch {
      setError('Failed to load result. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleSave = async (questionId) => {
    if (!questionId || savingQuestionId) return;
    const id = questionId.toString();
    setSavingQuestionId(id);
    try {
      if (savedQuestions.has(id)) {
        await api.delete(`/user/questions/unsave/${id}`);
        setSavedQuestions((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        await api.post('/user/questions/save', { questionId: id });
        setSavedQuestions((prev) => new Set(prev).add(id));
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not update saved question');
    } finally {
      setSavingQuestionId(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchResult();
  };

  const handleRetryExam = async () => {
    if (!result?.exam?._id) return;
    try {
      setStarting(true);
      const response = await api.post(`/exams/${result.exam._id}/start`);
      navigation.replace('ExamInterface', {
        examId: result.exam._id,
        attemptId: response.data.attempt._id,
        exam: response.data.exam,
        attempt: response.data.attempt,
      });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to start exam');
    } finally {
      setStarting(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    try {
      const air = buildAirCopyFromPeerStats(peerStats);
      const line = `I scored ${result.percentage?.toFixed(1)}% (${result.totalScore}/${result.exam?.totalMarks}) on "${result.exam?.title}" on ExamZone!`;
      await Share.share({ message: air ? `${air.full}\n\n${line}` : line });
    } catch {}
  };

  const handleGoHome = () => {
    navigation.navigate('MainTabs', { screen: 'HomeTab', params: { screen: 'Dashboard' } });
  };

  const handleStartPracticeTopic = async (topic, subject) => {
    if (startingPracticeTopic) return;
    try {
      setStartingPracticeTopic(topic);
      await startTopicPractice({ subject, topic, questionCount: 15, navigation });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to start practice');
    } finally {
      setStartingPracticeTopic(null);
    }
  };

  // ─── Computed ──────────────────────────────────────────
  const percentage = result?.percentage || 0;
  const totalAnswers = result?.answers?.length || 0;
  const correctCount = result?.answers?.filter((a) => a.isCorrect).length || 0;
  const wrongCount = result?.answers?.filter((a) => !a.isCorrect && a.selectedAnswer).length || 0;
  const skippedCount = result?.answers?.filter((a) => !a.selectedAnswer).length || 0;

  const sectionAnalysis = result ? calculateSectionAnalysis(result) : null;
  const subjectTopicAnalysis = result ? calculateSubjectTopicAnalysis(result) : { subjects: {}, topics: {} };
  const difficultyAnalysis = result ? calculateDifficultyAnalysis(result) : {};
  const timeAnalysis = result ? calculateTimeAnalysis(result) : null;
  const subjectEntries = Object.entries(subjectTopicAnalysis.subjects).filter(([s]) => s !== 'Unknown');
  const topicEntries = Object.entries(subjectTopicAnalysis.topics).filter(([t]) => t !== 'Unknown');

  const filteredAnswers =
    result?.answers?.filter((a) => {
      if (sectionFilter !== 'all' && sectionAnalysis) {
        const section = sectionAnalysis[Number(sectionFilter)];
        if (!answerInSection(a, section)) return false;
      }
      if (questionFilter === 'correct') return a.isCorrect;
      if (questionFilter === 'wrong') return !a.isCorrect && a.selectedAnswer;
      if (questionFilter === 'skipped') return !a.selectedAnswer;
      return true;
    }) || [];

  const card = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };

  // ─── Loading / error ───────────────────────────────────
  if ((loading && !result) || error || !result) {
    return (
      <ScreenWrapper backgroundColor={colors.surface}>
        <Header title="Result" navigation={navigation} colors={colors} />
        <View style={tw`flex-1 items-center justify-center px-10`}>
          {loading && !error ? (
            <ActivityIndicator size="large" color={colors.text} />
          ) : (
            <>
              <Ionicons name="alert-circle-outline" size={44} color={colors.textSecondary} />
              <Text style={[tw`text-base font-bold mt-3 text-center`, { color: colors.text }]}>
                {error || 'Result not found'}
              </Text>
              <TouchableOpacity
                style={[tw`mt-5 px-5 py-3 rounded-2xl`, { backgroundColor: colors.hero }]}
                onPress={fetchResult}
                activeOpacity={0.8}
              >
                <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>Retry</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScreenWrapper>
    );
  }

  const showLanguageToggle = supportsLanguageSwitch(result?.exam, result?.answers);
  const airCopy = buildAirCopyFromPeerStats(peerStats);

  return (
    <ScreenWrapper backgroundColor={colors.surface}>
      <RewardCelebration rewards={rewards} visible={showCelebration} onClose={() => setShowCelebration(false)} />
      <Header title={result.exam?.title || 'Result'} navigation={navigation} colors={colors} onShare={handleShare} />

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-5 pt-4 pb-12`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Score hero ─────────────────────────────── */}
        <View style={[tw`p-5 rounded-3xl mb-4`, { backgroundColor: colors.hero }]}>
          <Text style={[tw`text-[11px] font-bold tracking-widest`, { color: colors.heroMuted }]}>
            {getScoreMessage(percentage).toUpperCase()}
          </Text>
          <View style={tw`flex-row items-end justify-between mt-1`}>
            <Text style={[tw`text-5xl font-extrabold`, { color: colors.heroText }]}>
              {percentage.toFixed(0)}
              <Text style={[tw`text-2xl`, { color: colors.heroTextSecondary }]}>%</Text>
            </Text>
            <View style={tw`items-end pb-1.5`}>
              <Text style={[tw`text-lg font-bold`, { color: colors.heroText }]}>
                {result.totalScore}/{result.exam?.totalMarks || 0}
              </Text>
              <Text style={[tw`text-xs`, { color: colors.heroMuted }]}>marks</Text>
            </View>
          </View>
          <View style={[tw`h-1.5 rounded-full overflow-hidden mt-3`, { backgroundColor: colors.heroTrack }]}>
            <View
              style={[
                tw`h-full rounded-full`,
                { width: `${Math.max(2, Math.min(100, percentage))}%`, backgroundColor: colors.heroAccent },
              ]}
            />
          </View>

          {airCopy && (
            <View style={[tw`flex-row items-center p-3 rounded-2xl mt-4`, { backgroundColor: colors.heroRaised }]}>
              <Ionicons name="trophy" size={20} color={colors.heroAccent} />
              <View style={tw`ml-3 flex-1`}>
                <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>{airCopy.headline}</Text>
                <Text style={[tw`text-xs mt-0.5`, { color: colors.heroTextSecondary }]}>{airCopy.subline}</Text>
              </View>
            </View>
          )}

          <View style={tw`flex-row mt-4`}>
            {[
              { label: 'Correct', value: correctCount },
              { label: 'Wrong', value: wrongCount },
              { label: 'Skipped', value: skippedCount },
              { label: 'Time', value: result.timeTaken > 0 ? formatTime(result.timeTaken) : '—' },
            ].map((s, i) => (
              <View
                key={s.label}
                style={[tw`flex-1`, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.heroTrack, paddingLeft: 12 }]}
              >
                <Text style={[tw`text-base font-extrabold`, { color: colors.heroText }]}>{s.value}</Text>
                <Text style={[tw`text-[11px] mt-0.5`, { color: colors.heroMuted }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          <Text style={[tw`text-[11px] mt-4`, { color: colors.heroMuted }]}>
            Attempt #{result.attemptNumber || 1}
            {result.endTime ? ` · ${formatDate(result.endTime)}` : ''}
          </Text>
        </View>

        {/* ─── Actions ────────────────────────────────── */}
        <View style={tw`flex-row gap-2.5 mb-2`}>
          {attemptStatus?.canReattempt && (
            <TouchableOpacity
              style={[tw`flex-1 flex-row items-center justify-center h-12 rounded-2xl`, { backgroundColor: colors.hero }]}
              onPress={handleRetryExam}
              disabled={starting}
              activeOpacity={0.85}
            >
              {starting ? (
                <ActivityIndicator color={colors.heroText} />
              ) : (
                <>
                  <Ionicons name="refresh" size={17} color={colors.heroText} />
                  <Text style={[tw`text-sm font-bold ml-2`, { color: colors.heroText }]}>Retry exam</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {wrongCount > 0 && (
            <TouchableOpacity
              style={[tw`flex-1 flex-row items-center justify-center h-12 rounded-2xl`, { backgroundColor: colors.tones.red.bg }]}
              onPress={() => navigation.navigate('MainTabs', { screen: 'StudyTab', params: { screen: 'WrongBook', initial: false } })}
              activeOpacity={0.85}
            >
              <Ionicons name="close-circle-outline" size={17} color={colors.tones.red.fg} />
              <Text style={[tw`text-sm font-bold ml-2`, { color: colors.tones.red.fg }]}>Fix {wrongCount} mistakes</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={tw`flex-row items-center justify-between mb-5 px-1`}>
          <TouchableOpacity onPress={handleGoHome} hitSlop={10} style={tw`flex-row items-center`}>
            <Ionicons name="home-outline" size={15} color={colors.textSecondary} />
            <Text style={[tw`text-xs font-semibold ml-1.5`, { color: colors.textSecondary }]}>Back to home</Text>
          </TouchableOpacity>
          {attemptStatus && !attemptStatus.canReattempt && attemptStatus.maxAttempts ? (
            <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>
              {attemptStatus.attemptCount}/{attemptStatus.maxAttempts} attempts used
            </Text>
          ) : null}
        </View>

        {/* ─── Tabs ───────────────────────────────────── */}
        <View style={[tw`flex-row p-1 rounded-2xl mb-4`, { backgroundColor: colors.surfaceMuted }]}>
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'questions', label: `Questions (${totalAnswers})` },
            { key: 'analytics', label: 'Analytics' },
          ].map((tab) => {
            const on = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[tw`flex-1 items-center py-2.5 rounded-xl`, on && { backgroundColor: colors.card }]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[tw`text-xs font-bold`, { color: on ? colors.text : colors.textSecondary }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── Overview ───────────────────────────────── */}
        {activeTab === 'overview' && (
          <View style={tw`gap-3`}>
            <Card title="Answer breakdown" colors={colors}>
              <BreakdownRow label="Correct" count={correctCount} total={totalAnswers} tone={colors.tones.green} colors={colors} />
              <BreakdownRow label="Wrong" count={wrongCount} total={totalAnswers} tone={colors.tones.red} colors={colors} />
              <BreakdownRow
                label="Skipped"
                count={skippedCount}
                total={totalAnswers}
                tone={{ fg: colors.textSecondary, bg: colors.surfaceMuted }}
                colors={colors}
                last
              />
            </Card>

            {result.timeTaken > 0 && (
              <Card title="Time" colors={colors}>
                <View style={tw`flex-row`}>
                  {[
                    { label: 'Total', value: formatTime(result.timeTaken) },
                    { label: 'Per question', value: formatTime(Math.floor(result.timeTaken / Math.max(1, totalAnswers))) },
                    { label: 'Allowed', value: result.exam?.duration ? `${result.exam.duration}m` : '—' },
                  ].map(({ label, value }) => (
                    <View key={label} style={tw`flex-1`}>
                      <Text style={[tw`text-base font-extrabold`, { color: colors.text }]}>{value}</Text>
                      <Text style={[tw`text-xs mt-0.5`, { color: colors.textSecondary }]}>{label}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            <Card title="Exam details" colors={colors}>
              {[
                { icon: 'document-text-outline', text: `${totalAnswers} questions` },
                { icon: 'ribbon-outline', text: `${result.exam?.totalMarks || 0} total marks` },
                result.exam?.duration && { icon: 'time-outline', text: `${result.exam.duration} min` },
                result.exam?.category?.name && {
                  icon: 'folder-outline',
                  text: [result.exam.category.name, result.exam?.subCategory?.name].filter(Boolean).join(' · '),
                },
              ]
                .filter(Boolean)
                .map(({ icon, text }) => (
                  <View key={icon} style={tw`flex-row items-center py-1.5`}>
                    <Ionicons name={icon} size={16} color={colors.textSecondary} />
                    <Text style={[tw`text-sm ml-2.5`, { color: colors.text }]}>{text}</Text>
                  </View>
                ))}
            </Card>

            {result?.exam?._id && (
              <View style={tw`mt-1`}>
                <ReviewSection targetType="exam" targetId={result.exam._id} canReview />
              </View>
            )}
          </View>
        )}

        {/* ─── Questions ──────────────────────────────── */}
        {activeTab === 'questions' && (
          <View>
            {showLanguageToggle && (
              <View style={[tw`flex-row self-start rounded-full p-1 mb-3`, card]}>
                {['English', 'Hindi'].map((lang) => {
                  const on = displayLanguage === lang;
                  return (
                    <TouchableOpacity
                      key={lang}
                      style={[tw`px-3.5 py-1.5 rounded-full`, on && { backgroundColor: colors.hero }]}
                      onPress={() => setDisplayLanguage(lang)}
                      activeOpacity={0.8}
                    >
                      <Text style={[tw`text-xs font-bold`, { color: on ? colors.heroText : colors.textSecondary }]}>
                        {lang === 'Hindi' ? 'हिन्दी' : 'EN'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {sectionAnalysis?.length > 0 && (
              <ChipRow colors={colors}>
                <Chip label="All sections" on={sectionFilter === 'all'} onPress={() => setSectionFilter('all')} colors={colors} />
                {sectionAnalysis.map((section) => (
                  <Chip
                    key={section.index}
                    label={section.name || `Section ${section.index + 1}`}
                    on={sectionFilter === String(section.index)}
                    onPress={() => setSectionFilter(String(section.index))}
                    colors={colors}
                  />
                ))}
              </ChipRow>
            )}

            <ChipRow colors={colors}>
              {[
                { key: 'all', label: `All ${totalAnswers}` },
                { key: 'correct', label: `Correct ${correctCount}` },
                { key: 'wrong', label: `Wrong ${wrongCount}` },
                { key: 'skipped', label: `Skipped ${skippedCount}` },
              ].map(({ key, label }) => (
                <Chip key={key} label={label} on={questionFilter === key} onPress={() => setQuestionFilter(key)} colors={colors} />
              ))}
            </ChipRow>

            {filteredAnswers.length > 0 ? (
              filteredAnswers.map((answer) => {
                const originalIndex = result.answers.indexOf(answer);
                const qid = answer.question?._id?.toString?.() || answer.question?._id;
                return (
                  <QuestionCard
                    key={originalIndex}
                    answer={answer}
                    index={originalIndex}
                    colors={colors}
                    displayLanguage={displayLanguage}
                    isSaved={qid ? savedQuestions.has(String(qid)) : false}
                    onToggleSave={handleToggleSave}
                  />
                );
              })
            ) : (
              <Text style={[tw`text-sm text-center py-10`, { color: colors.textSecondary }]}>
                No questions match this filter
              </Text>
            )}
          </View>
        )}

        {/* ─── Analytics ──────────────────────────────── */}
        {activeTab === 'analytics' && (
          <View style={tw`gap-3`}>
            {peerStats?.sampleSize > 0 && (
              <Card
                title="Compared to other students"
                subtitle={`Based on ${peerStats.sampleSize} completed attempt${peerStats.sampleSize === 1 ? '' : 's'}`}
                colors={colors}
              >
                <PeerGrid
                  title="Marks"
                  colors={colors}
                  cells={[
                    { label: 'You', value: peerStats.marks.your, highlight: true },
                    { label: 'Average', value: peerStats.marks.avg },
                    { label: 'Highest', value: peerStats.marks.max },
                    { label: 'Lowest', value: peerStats.marks.min },
                  ]}
                  footnote={`Rank #${peerStats.marks.yourRank} of ${peerStats.marks.totalRanked} · better than ${peerStats.marks.betterThanPercent}% of attempts`}
                />
                <PeerGrid
                  title="Percentage"
                  colors={colors}
                  cells={[
                    { label: 'You', value: `${peerStats.percentage.your}%`, highlight: true },
                    { label: 'Average', value: `${peerStats.percentage.avg}%` },
                    { label: 'Highest', value: `${peerStats.percentage.max}%` },
                    { label: 'Lowest', value: `${peerStats.percentage.min}%` },
                  ]}
                />
                <PeerGrid
                  title="Time taken"
                  colors={colors}
                  last
                  cells={[
                    { label: 'You', value: peerStats.time.your > 0 ? formatTime(peerStats.time.your) : '—', highlight: true },
                    { label: 'Average', value: peerStats.time.avg != null ? formatTime(peerStats.time.avg) : '—' },
                    { label: 'Fastest', value: peerStats.time.min != null ? formatTime(peerStats.time.min) : '—' },
                    { label: 'Slowest', value: peerStats.time.max != null ? formatTime(peerStats.time.max) : '—' },
                  ]}
                  footnote={
                    peerStats.time.yourRank != null
                      ? `Speed rank #${peerStats.time.yourRank} of ${peerStats.time.totalRanked}${
                          peerStats.time.fasterThanPercent != null && peerStats.time.totalRanked > 1
                            ? ` · faster than ${peerStats.time.fasterThanPercent}% of attempts`
                            : ''
                        }`
                      : null
                  }
                />
              </Card>
            )}

            {previousAttempts.length > 0 && (
              <Card title="Your attempts" colors={colors}>
                <View style={[tw`p-3 rounded-2xl mb-2`, { backgroundColor: colors.hero }]}>
                  <Text style={[tw`text-[11px] font-bold`, { color: colors.heroMuted }]}>
                    THIS ATTEMPT · #{result.attemptNumber || 1}
                  </Text>
                  <Text style={[tw`text-sm font-bold mt-1`, { color: colors.heroText }]}>
                    {result.totalScore}/{result.exam?.totalMarks || 0} · {percentage.toFixed(1)}%
                  </Text>
                  <Text style={[tw`text-xs mt-0.5`, { color: colors.heroTextSecondary }]}>
                    {correctCount} correct · {wrongCount} wrong · {skippedCount} skipped
                    {result.timeTaken > 0 ? ` · ${formatTime(result.timeTaken)}` : ''}
                  </Text>
                </View>
                {previousAttempts.map((prev) => {
                  const scoreDiff = (result.totalScore || 0) - (prev.totalScore || 0);
                  const pctDiff = (result.percentage || 0) - (prev.percentage || 0);
                  const diffTone = scoreDiff > 0 ? colors.tones.green : colors.tones.red;
                  return (
                    <TouchableOpacity
                      key={prev._id}
                      style={[tw`flex-row items-center p-3 rounded-2xl mb-2`, { backgroundColor: colors.surfaceMuted }]}
                      onPress={() => navigation.replace('Result', { attemptId: prev._id })}
                      activeOpacity={0.8}
                    >
                      <View style={tw`flex-1`}>
                        <Text style={[tw`text-xs font-semibold`, { color: colors.textSecondary }]}>
                          Attempt #{prev.attemptNumber}{prev.endTime ? ` · ${formatDate(prev.endTime)}` : ''}
                        </Text>
                        <Text style={[tw`text-sm font-bold mt-0.5`, { color: colors.text }]}>
                          {prev.totalScore}/{result.exam?.totalMarks || 0} · {(prev.percentage || 0).toFixed(1)}%
                        </Text>
                      </View>
                      {scoreDiff !== 0 && (
                        <View style={[tw`px-2 py-1 rounded-md`, { backgroundColor: diffTone.bg }]}>
                          <Text style={[tw`text-[11px] font-bold`, { color: diffTone.fg }]}>
                            {scoreDiff > 0 ? '+' : ''}{pctDiff.toFixed(1)}% now
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </Card>
            )}

            {sectionAnalysis?.length > 0 && (
              <Card title="By section" colors={colors}>
                {sectionAnalysis.map((section, i) => {
                  const tone = scoreTone(section.sectionPercentage, colors);
                  return (
                    <View
                      key={section.index}
                      style={[tw`py-2.5`, i < sectionAnalysis.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                    >
                      <View style={tw`flex-row justify-between items-center`}>
                        <Text style={[tw`text-sm font-bold flex-1 pr-2`, { color: colors.text }]}>
                          {section.name || `Section ${section.index + 1}`}
                        </Text>
                        <View style={[tw`px-2 py-1 rounded-md`, { backgroundColor: tone.bg }]}>
                          <Text style={[tw`text-xs font-bold`, { color: tone.fg }]}>{section.sectionPercentage.toFixed(1)}%</Text>
                        </View>
                      </View>
                      <Text style={[tw`text-xs mt-1`, { color: colors.textSecondary }]}>
                        {section.sectionScore}/{section.sectionTotalMarks} marks · {section.correct} correct · {section.wrong} wrong · {section.unattempted} skipped
                        {section.avgTimePerQuestion > 0 ? ` · ${formatTime(Math.round(section.avgTimePerQuestion))}/q` : ''}
                      </Text>
                      {section.cutoff != null && (
                        <Text
                          style={[
                            tw`text-xs font-semibold mt-1`,
                            { color: section.cutoffMet ? colors.tones.green.fg : colors.tones.red.fg },
                          ]}
                        >
                          Cutoff {section.cutoff}: {section.cutoffMet ? 'cleared' : 'not cleared'}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </Card>
            )}

            {subjectEntries.length > 0 && (
              <Card title="By subject" subtitle="Weakest first" colors={colors}>
                {subjectEntries
                  .sort((a, b) => a[1].percentage - b[1].percentage)
                  .map(([subject, stats]) => (
                    <ProgressRow
                      key={subject}
                      label={subject}
                      right={`${stats.obtainedMarks.toFixed(1)}/${stats.totalMarks}`}
                      detail={`${stats.correct} correct · ${stats.wrong} wrong · ${stats.unattempted} skipped · ${stats.accuracy.toFixed(0)}% accuracy`}
                      value={stats.percentage}
                      tone={scoreTone(stats.percentage, colors)}
                      colors={colors}
                    />
                  ))}
              </Card>
            )}

            {topicEntries.length > 0 && (
              <Card title="By topic" subtitle="Weakest first — practise the red ones" colors={colors}>
                {topicEntries
                  .sort((a, b) => a[1].percentage - b[1].percentage)
                  .map(([topic, stats]) => (
                    <View key={topic} style={tw`mb-3`}>
                      <ProgressRow
                        label={topic}
                        right={`${stats.percentage.toFixed(0)}%`}
                        detail={`${stats.correct}/${stats.total} correct · ${stats.accuracy.toFixed(0)}% accuracy`}
                        value={stats.percentage}
                        tone={scoreTone(stats.percentage, colors)}
                        colors={colors}
                        noMargin
                      />
                      {stats.accuracy < 60 && stats.total >= 3 && (
                        <TouchableOpacity
                          onPress={() => handleStartPracticeTopic(topic)}
                          disabled={startingPracticeTopic === topic}
                          style={[tw`self-start flex-row items-center px-3 py-1.5 rounded-lg mt-2`, { backgroundColor: colors.tones.orange.bg }]}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="flash" size={12} color={colors.tones.orange.fg} />
                          <Text style={[tw`text-[11px] font-bold ml-1`, { color: colors.tones.orange.fg }]}>
                            {startingPracticeTopic === topic ? 'Starting…' : 'Practise 15 questions'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
              </Card>
            )}

            {Object.keys(difficultyAnalysis).length > 0 && (
              <Card title="By difficulty" colors={colors}>
                {['Easy', 'Medium', 'Hard']
                  .filter((d) => difficultyAnalysis[d])
                  .concat(Object.keys(difficultyAnalysis).filter((d) => !['Easy', 'Medium', 'Hard'].includes(d)))
                  .map((diff) => {
                    const stats = difficultyAnalysis[diff];
                    const avgTime = timeAnalysis?.timeByDifficulty?.[diff]?.avgTime;
                    return (
                      <ProgressRow
                        key={diff}
                        label={diff}
                        right={`${stats.accuracy.toFixed(0)}% accuracy`}
                        detail={`${stats.correct} correct · ${stats.wrong} wrong · ${stats.unattempted} skipped${
                          avgTime ? ` · ${formatTime(Math.round(avgTime))}/q` : ''
                        }`}
                        value={stats.accuracy}
                        tone={scoreTone(stats.accuracy, colors)}
                        colors={colors}
                      />
                    );
                  })}
                {result.exam?.duration > 0 && timeAnalysis?.totalTime > 0 && (
                  <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>
                    Used {formatTime(timeAnalysis.totalTime)} of {result.exam.duration}m (
                    {((timeAnalysis.totalTime / (result.exam.duration * 60)) * 100).toFixed(0)}%)
                  </Text>
                )}
              </Card>
            )}

            {!peerStats?.sampleSize &&
              !sectionAnalysis?.length &&
              subjectEntries.length === 0 &&
              Object.keys(difficultyAnalysis).length === 0 &&
              previousAttempts.length === 0 && (
                <View style={tw`items-center py-10 px-6`}>
                  <Ionicons name="analytics-outline" size={36} color={colors.textSecondary} />
                  <Text style={[tw`text-sm mt-3 text-center`, { color: colors.textSecondary }]}>
                    Detailed analytics appear when questions have subject, topic or difficulty tags.
                  </Text>
                </View>
              )}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

// ─── Building blocks ─────────────────────────────────────

function Header({ title, navigation, colors, onShare }) {
  return (
    <View style={tw`flex-row items-center px-3 pt-2 pb-2`}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`} accessibilityLabel="Back">
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={[tw`flex-1 text-base font-bold text-center mx-2`, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      {onShare ? (
        <TouchableOpacity onPress={onShare} style={tw`p-2`} accessibilityLabel="Share result">
          <Ionicons name="share-outline" size={21} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={tw`w-10`} />
      )}
    </View>
  );
}

function Card({ title, subtitle, colors, children }) {
  return (
    <View style={[tw`p-4 rounded-3xl`, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
      <Text style={[tw`text-base font-extrabold`, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[tw`text-xs mt-0.5`, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      <View style={tw`mt-3`}>{children}</View>
    </View>
  );
}

function BreakdownRow({ label, count, total, tone, colors, last }) {
  const share = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={tw`${last ? '' : 'mb-3'}`}>
      <View style={tw`flex-row items-center justify-between mb-1.5`}>
        <Text style={[tw`text-sm font-semibold`, { color: colors.text }]}>{label}</Text>
        <Text style={[tw`text-sm font-bold`, { color: colors.text }]}>
          {count} <Text style={[tw`font-normal`, { color: colors.textSecondary }]}>· {share.toFixed(0)}%</Text>
        </Text>
      </View>
      <View style={[tw`h-2 rounded-full overflow-hidden`, { backgroundColor: colors.surfaceMuted }]}>
        <View style={[tw`h-full rounded-full`, { width: `${share}%`, backgroundColor: tone.fg }]} />
      </View>
    </View>
  );
}

function ProgressRow({ label, right, detail, value, tone, colors, noMargin }) {
  return (
    <View style={tw`${noMargin ? '' : 'mb-3'}`}>
      <View style={tw`flex-row justify-between items-center mb-1`}>
        <Text style={[tw`text-sm font-bold flex-1 pr-2`, { color: colors.text }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[tw`text-xs font-bold`, { color: colors.text }]}>{right}</Text>
      </View>
      <Text style={[tw`text-[11px] mb-1.5`, { color: colors.textSecondary }]}>{detail}</Text>
      <View style={[tw`h-1.5 rounded-full overflow-hidden`, { backgroundColor: colors.surfaceMuted }]}>
        <View style={[tw`h-full rounded-full`, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: tone.fg }]} />
      </View>
    </View>
  );
}

function PeerGrid({ title, cells, footnote, colors, last }) {
  return (
    <View style={tw`${last ? '' : 'mb-4'}`}>
      <Text style={[tw`text-xs font-bold mb-2`, { color: colors.textSecondary }]}>{title.toUpperCase()}</Text>
      <View style={tw`flex-row gap-2`}>
        {cells.map((cell) => (
          <View
            key={cell.label}
            style={[
              tw`flex-1 py-2.5 rounded-xl items-center`,
              { backgroundColor: cell.highlight ? colors.hero : colors.surfaceMuted },
            ]}
          >
            <Text style={[tw`text-sm font-extrabold`, { color: cell.highlight ? colors.heroText : colors.text }]}>
              {cell.value}
            </Text>
            <Text style={[tw`text-[10px] mt-0.5`, { color: cell.highlight ? colors.heroMuted : colors.textSecondary }]}>
              {cell.label}
            </Text>
          </View>
        ))}
      </View>
      {footnote ? <Text style={[tw`text-xs mt-2`, { color: colors.textSecondary }]}>{footnote}</Text> : null}
    </View>
  );
}

function ChipRow({ children }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mb-3 -mx-5`} contentContainerStyle={tw`px-5 gap-2`}>
      {children}
    </ScrollView>
  );
}

function Chip({ label, on, onPress, colors }) {
  return (
    <TouchableOpacity
      style={[
        tw`px-3.5 py-2 rounded-full`,
        on
          ? { backgroundColor: colors.hero }
          : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[tw`text-xs font-bold`, { color: on ? colors.heroText : colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function QuestionCard({ answer, index, colors, displayLanguage, isSaved, onToggleSave }) {
  const [expanded, setExpanded] = useState(false);
  const question = answer.question;
  if (!question) return null;

  const questionText = getLocalizedQuestionText(question, displayLanguage);
  const questionOptions = getLocalizedQuestionOptions(question, displayLanguage);
  const explanation = getLocalizedExplanation(question, displayLanguage);
  const questionId = question._id?.toString?.() || question._id;

  const isCorrect = answer.isCorrect;
  const isSkipped = !answer.selectedAnswer;
  const userAnswer = answer.selectedAnswer;
  const correctAnswer = question.correctAnswer;
  const status = isSkipped
    ? { tone: { fg: colors.textSecondary, bg: colors.surfaceMuted }, icon: 'remove-circle', label: 'Skipped' }
    : isCorrect
      ? { tone: colors.tones.green, icon: 'checkmark-circle', label: 'Correct' }
      : { tone: colors.tones.red, icon: 'close-circle', label: 'Wrong' };

  return (
    <TouchableOpacity
      style={[tw`rounded-3xl mb-2.5 overflow-hidden`, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.85}
    >
      <View style={tw`flex-row items-center p-3.5`}>
        <View style={[tw`w-9 h-9 rounded-full items-center justify-center mr-3`, { backgroundColor: status.tone.bg }]}>
          <Text style={[tw`text-xs font-bold`, { color: status.tone.fg }]}>{index + 1}</Text>
        </View>
        <View style={tw`flex-1 mr-2`}>
          <Text style={[tw`text-sm leading-5`, { color: colors.text }]} numberOfLines={expanded ? 0 : 1}>
            {questionText}
          </Text>
          <Text style={[tw`text-[11px] mt-0.5`, { color: status.tone.fg }]}>
            {status.label}
            {answer.timeSpent > 0 ? <Text style={{ color: colors.textSecondary }}> · {formatTime(answer.timeSpent)}</Text> : null}
          </Text>
        </View>
        {questionId && onToggleSave && (
          <TouchableOpacity
            onPress={(e) => {
              e?.stopPropagation?.();
              onToggleSave(questionId);
            }}
            hitSlop={8}
            style={tw`p-1 mr-1`}
            accessibilityLabel={isSaved ? 'Remove from saved' : 'Save question'}
          >
            <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={18} color={isSaved ? colors.text : colors.textSecondary} />
          </TouchableOpacity>
        )}
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
      </View>

      {expanded && (
        <View style={[tw`px-3.5 pb-4`, { borderTopWidth: 1, borderTopColor: colors.border }]}>
          {question.questionImage ? (
            <Image
              source={{ uri: question.questionImage }}
              style={[tw`w-full h-40 rounded-xl mt-3`, { backgroundColor: colors.surfaceMuted }]}
              resizeMode="contain"
            />
          ) : null}

          <View style={tw`gap-2 mt-3`}>
            {questionOptions?.map((option, i) => {
              const isCorrectOpt = option.optionLabel === correctAnswer;
              const isUserWrong = option.optionLabel === userAnswer && !isCorrect;
              const tone = isCorrectOpt ? colors.tones.green : isUserWrong ? colors.tones.red : null;
              return (
                <View
                  key={i}
                  style={[
                    tw`flex-row items-center p-3 rounded-2xl`,
                    tone
                      ? { backgroundColor: tone.bg, borderWidth: 1, borderColor: tone.fg }
                      : { backgroundColor: colors.surfaceMuted },
                  ]}
                >
                  <Text style={[tw`text-xs font-bold w-6`, { color: tone ? tone.fg : colors.textSecondary }]}>
                    {option.optionLabel}
                  </Text>
                  <Text style={[tw`flex-1 text-sm`, { color: colors.text, fontWeight: tone ? '600' : '400' }]}>
                    {option.optionText}
                  </Text>
                  {isCorrectOpt && <Ionicons name="checkmark" size={16} color={colors.tones.green.fg} />}
                  {isUserWrong && <Ionicons name="close" size={16} color={colors.tones.red.fg} />}
                </View>
              );
            })}
          </View>

          <View style={tw`flex-row gap-2 mt-3`}>
            {[
              { label: 'Your answer', value: userAnswer || 'Skipped', color: status.tone.fg },
              { label: 'Correct', value: correctAnswer, color: colors.tones.green.fg },
              { label: 'Marks', value: `${answer.marksObtained || 0}/${question.marks || 1}`, color: colors.text },
            ].map((cell) => (
              <View key={cell.label} style={[tw`flex-1 p-2.5 rounded-xl`, { backgroundColor: colors.surfaceMuted }]}>
                <Text style={[tw`text-[10px]`, { color: colors.textSecondary }]}>{cell.label}</Text>
                <Text style={[tw`text-sm font-bold mt-0.5`, { color: cell.color }]}>{cell.value}</Text>
              </View>
            ))}
          </View>

          {explanation ? (
            <View style={[tw`flex-row p-3 rounded-2xl mt-3`, { backgroundColor: colors.tones.blue.bg }]}>
              <Ionicons name="bulb-outline" size={16} color={colors.tones.blue.fg} />
              <View style={tw`flex-1 ml-2`}>
                <Text style={[tw`text-xs font-bold mb-1`, { color: colors.tones.blue.fg }]}>Explanation</Text>
                <Text style={[tw`text-xs leading-5`, { color: colors.text }]}>{explanation}</Text>
              </View>
            </View>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
}
