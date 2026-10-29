import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import { useFocusExam, useSubExam, matchesSubExam } from '../context/AppConfigContext';
import SubExamChips from '../components/SubExamChips';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import ScreenWrapper from '../components/ScreenWrapper';
import { ExamCardSkeletonList } from '../components/ExamCardSkeleton';
import { gamificationService } from '../services/gamificationService';
import { testSeriesService } from '../services/testSeriesService';
import { notificationApi } from '../services/notificationService';
import { practiceSessionService } from '../services/practiceSessionService';
import { studyPlanService } from '../services/studyPlanService';
import { liveMockService, countdown, liveWhen } from '../services/liveMockService';
import { t as tr } from '../i18n';
import { features } from '../config/features';

const PRACTICE_TYPE_LABELS = {
  random: 'Random',
  'subject-wise': 'Subject Wise',
  'topic-wise': 'Topic Wise',
  'difficulty-based': 'By Difficulty',
  'weak-areas': 'Weak Areas',
  mistakes: 'Wrong Book',
  pyq: 'PYQ',
  'daily-quiz': 'Daily Quiz',
};

const EXAM_TYPE_LABELS = {
  mock: 'Mock test',
  'full-length': 'Full mock',
  sectional: 'Sectional',
  pyq: 'PYQ paper',
  practice: 'Practice',
  quiz: 'Quiz',
  adaptive: 'Adaptive',
};

const SERIES_CARD_WIDTH = Math.min(300, Dimensions.get('window').width - 80);
const SERIES_CARD_GAP = 12;

function computePlanProgress(plan) {
  const total =
    plan.progress?.totalTopics ??
    (plan.subjects || []).reduce((n, s) => n + (s.topics?.length || 0), 0);
  const completed =
    plan.progress?.completedTopics ??
    (plan.subjects || []).reduce(
      (n, s) => n + (s.topics?.filter((t) => t.status === 'completed').length || 0),
      0,
    );
  const pct = total
    ? Math.round((completed / total) * 100)
    : plan.progress?.overallProgress ?? 0;
  return { total, completed, pct };
}

function pickActiveStudyPlan(plans) {
  if (!plans?.length) return null;
  const active = plans.filter((p) => p.status === 'active' || !p.status);
  const pool = active.length ? active : plans.filter((p) => p.status !== 'completed');
  if (!pool.length) return null;
  return pool.sort((a, b) => {
    const pa = computePlanProgress(a).pct;
    const pb = computePlanProgress(b).pct;
    if (pa !== pb) return pa - pb;
    return new Date(a.endDate) - new Date(b.endDate);
  })[0];
}

const idOf = (v) => String(v?._id || v || '');

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return tr('Good morning');
  if (h < 17) return tr('Good afternoon');
  return tr('Good evening');
}

function startsIn(date) {
  const ms = new Date(date) - new Date();
  if (ms <= 0) return tr("Starting now");
  const mins = Math.round(ms / 60000);
  if (mins < 60) return tr("Starts in {0}m", mins);
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return tr("Starts in {0}h {1}m", hrs, mins % 60);
  const days = Math.floor(hrs / 24);
  return tr("Starts in {0} day{1}", days, days === 1 ? '' : 's');
}

function timeAgo(date) {
  const mins = Math.round((new Date() - new Date(date)) / 60000);
  if (mins < 60) return tr("{0}m ago", Math.max(1, mins));
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return tr("{0}h ago", hrs);
  const days = Math.floor(hrs / 24);
  return tr("{0}d ago", days);
}

export default function DashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const { user, isPremium, updateUser } = useAuth();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [wordOfDay, setWordOfDay] = useState(null);
  const [quote, setQuote] = useState(null);
  const [availableExams, setAvailableExams] = useState([]);
  const [progress, setProgress] = useState(null);
  const [testSeries, setTestSeries] = useState([]);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [activePractice, setActivePractice] = useState(null);
  const [studyPlan, setStudyPlan] = useState(null);
  const [liveMock, setLiveMock] = useState(null); // { current, lastResult }
  const [unreadCount, setUnreadCount] = useState(0);
  const [updates, setUpdates] = useState([]);
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [seriesIndex, setSeriesIndex] = useState(0);
  const [busy, setBusy] = useState(null); // 'resume' | 'quiz' | 'lang'

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  // Home data, one request (older servers without /home get the 12 separate calls)
  const loadHome = async () => {
    try {
      return (await api.get('/home')).data;
    } catch (e) {
      if (e?.response?.status !== 404) throw e;
    }
    const [statsRes, wordRes, quoteRes, examsRes, progressData, seriesRes, activeRes, practiceRes, plansRes, notifRes, liveMockRes] =
      await Promise.all([
        api.get('/user/dashboard-stats').catch(() => ({ data: null })),
        api.get('/user/word-of-day').catch(() => ({ data: null })),
        api.get('/user/motivational-quote').catch(() => ({ data: null })),
        api.get('/exams/available').catch(() => ({ data: { exams: [] } })),
        gamificationService.getMyProgress().catch(() => null),
        testSeriesService.list({ limit: 6 }).catch(() => ({ series: [] })),
        api.get('/exams/active-attempt').then((r) => r.data).catch(() => null),
        practiceSessionService.list({ limit: 8 }).catch(() => ({ sessions: [] })),
        studyPlanService.list().catch(() => ({ plans: [] })),
        notificationApi.list(1, 3).catch(() => ({ notifications: [] })),
        liveMockService.overview().catch(() => null),
      ]);
    let activePractice = (practiceRes?.sessions || []).find((s) => !s.isCompleted) || null;
    if (activePractice) {
      const detail = await practiceSessionService.get(activePractice._id).catch(() => null);
      activePractice = { ...activePractice, answeredCount: detail?.session?.answers?.length || 0 };
    }
    return {
      stats: statsRes.data,
      wordOfDay: wordRes.data?.wordOfDay || wordRes.data?.word || wordRes.data,
      quote: quoteRes.data?.quote || quoteRes.data?.motivationalQuote || quoteRes.data,
      exams: examsRes.data?.exams || [],
      progress: progressData,
      testSeries: seriesRes?.series || [],
      activeAttempt: activeRes?.attempt || null,
      unreadCount: notifRes?.unreadCount || 0,
      updates: notifRes?.notifications || [],
      activePractice,
      studyPlans: plansRes?.plans || [],
      liveMock: liveMockRes,
    };
  };

  const applyHome = (home) => {
    setStats(home.stats);
    setAvailableExams(home.exams || []);
    setProgress(home.progress);
    setTestSeries(home.testSeries || []);
    setActiveAttempt(home.activeAttempt || null);
    setUnreadCount(home.unreadCount || 0);
    setStudyPlan(pickActiveStudyPlan(home.studyPlans || []));
    setUpdates(home.updates || []);
    setActivePractice(home.activePractice || null);
    setLiveMock(home.liveMock || null);
    setWordOfDay(home.wordOfDay || null);
    setQuote(home.quote || null);
  };

  const cacheKey = `@homeCache:${user?._id || user?.id || ''}`;
  const hasData = useRef(false); // read inside the focus callback, which keeps the first render's state

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // first open: show the last Home straight away while the fresh one loads
      if (!hasData.current) {
        const cached = await AsyncStorage.getItem(cacheKey).catch(() => null);
        if (cached) {
          try {
            applyHome(JSON.parse(cached));
            hasData.current = true;
          } catch {
            // ignore a corrupt cache
          }
        }
      }

      const home = await loadHome();
      applyHome(home);
      if (home.stats) {
        hasData.current = true;
        AsyncStorage.setItem(cacheKey, JSON.stringify(home)).catch(() => {});
      } else {
        setError(tr("Unable to load your dashboard. Pull down to retry."));
      }
    } catch {
      if (!hasData.current) setError(tr("Something went wrong. Pull down to retry."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // ─── Derived data ──────────────────────────────────────
  const focus = useFocusExam();
  const { selectedId: subExamId } = useSubExam();
  const targetExams = stats?.targetExams || [];
  const target =
    targetExams.find((t) => idOf(t.category) === selectedTargetId) || targetExams[0] || null;
  const inTarget = (exam) =>
    (!target || !exam.category || idOf(exam.category) === idOf(target.category)) && matchesSubExam(exam, subExamId);

  const currentStreak = stats?.streak?.currentStreak || 0;
  const todayDone = stats?.today?.completed || 0;
  const todayGoal = stats?.today?.goal || 3;
  const totalAttempts = Number(stats?.stats?.totalAttempts) || 0;
  const averageScore = parseFloat(stats?.stats?.averageScore);
  const xp = progress?.xp || 0;
  const rank = progress?.rank || 'Beginner';
  const nextRank = progress?.nextRank || null;
  const xpToNext = progress?.xpToNextRank || 0;
  const rankProgress = Math.max(0, Math.min(1, progress?.progressToNext || 0));

  const targetExamsList = availableExams.filter(inTarget);
  const recommended = [
    ...targetExamsList.filter((e) => !e.isAttempted),
    ...targetExamsList.filter((e) => e.isAttempted),
  ].slice(0, 3);
  const liveTests = (stats?.upcomingExams || []).filter(inTarget);
  // Haryana GK hub is promoted for HSSC/Haryana aspirants (and before a goal is set)
  const showHaryanaGk = !target || /hssc|haryana|\bcet\b/i.test(target.name || '');
  const recentResults = (stats?.recentExamResults || []).slice(0, 3);
  const dailyQuiz = stats?.dailyQuiz || null;
  const dailyQuizDone = !!dailyQuiz?.isCompleted;

  // ─── Actions ───────────────────────────────────────────
  const setDailyGoal = async (goal) => {
    setStats((s) => (s ? { ...s, today: { ...(s.today || {}), goal } } : s));
    try {
      const res = await api.put('/user/profile', { preferences: { dailyTestGoal: goal } });
      if (res.data?.user) updateUser(res.data.user);
    } catch {
      // keep the local change; it syncs on the next save
    }
  };

  const changeDailyGoal = () =>
    Alert.alert(tr("Daily goal"), tr("How many tests or practice sets a day?"), [
      ...[1, 3, 5].map((g) => ({ text: tr("{0} a day", g), onPress: () => setDailyGoal(g) })),
      { text: tr("Cancel"), style: 'cancel' },
    ]);

  const openPracticeSession = (session) =>
    navigation.navigate('StudyTab', {
      screen: 'PracticeInterface',
      params: { sessionId: session._id, sessionType: session.sessionType },
      initial: false,
    });

  const resumeExam = async () => {
    if (!activeAttempt || busy) return;
    try {
      setBusy('resume');
      const res = await api.post(`/exams/${activeAttempt.examId}/start`);
      const attemptData = res.data.attempt;
      navigation.navigate('ExamInterface', {
        examId: activeAttempt.examId,
        attemptId: attemptData._id,
        exam: res.data.exam,
        attempt: attemptData,
        isResumed: res.data.isResumed ?? true,
      });
    } catch {
      navigation.navigate('ExamDetail', { examId: activeAttempt.examId });
    } finally {
      setBusy(null);
    }
  };

  const openDailyQuiz = async () => {
    if (busy) return;
    try {
      setBusy('quiz');
      if (dailyQuizDone) {
        const detail = await practiceSessionService.get(dailyQuiz.sessionId);
        navigation.navigate('StudyTab', { screen: 'PracticeResult', params: { session: detail.session }, initial: false });
        return;
      }
      const { session } = await practiceSessionService.create({
        sessionType: 'daily-quiz',
        filters: target ? { category: idOf(target.category) } : {},
      });
      openPracticeSession(session);
    } catch (e) {
      Alert.alert(tr("Daily quiz"), e?.response?.data?.message || tr("Could not start today’s quiz. Try again."));
    } finally {
      setBusy(null);
    }
  };

  const toggleLanguage = async () => {
    if (busy) return;
    const next = user?.preferredLanguage === 'Hindi' ? 'English' : 'Hindi';
    try {
      setBusy('lang');
      const res = await api.put('/user/profile', { preferredLanguage: next });
      if (res.data?.user) await updateUser(res.data.user);
    } catch {
      Alert.alert(tr("Language"), tr("Could not change language. Try again."));
    } finally {
      setBusy(null);
    }
  };

  const chooseTarget = () => {
    if (targetExams.length < 2) {
      navigation.navigate('EditProfile');
      return;
    }
    Alert.alert(tr("Preparing for"), tr("Show content for:"), [
      ...targetExams.slice(0, 3).map((t) => ({
        text: t.name,
        onPress: () => setSelectedTargetId(idOf(t.category)),
      })),
      { text: tr("Edit exams"), onPress: () => navigation.navigate('EditProfile') },
      { text: tr("Cancel"), style: 'cancel' },
    ]);
  };

  // Hero priority: unfinished exam → unfinished practice → today's quiz → next recommended test.
  const hero = (() => {
    if (activeAttempt) {
      return {
        label: activeAttempt.isPaused ? tr("PAUSED EXAM") : tr("CONTINUE EXAM"),
        title: activeAttempt.examTitle || tr("Your mock test"),
        subtitle: tr("{0} questions answered", activeAttempt.answeredCount || 0),
        icon: 'play',
        cta: tr("Resume"),
        pct: activeAttempt.totalQuestions
          ? (activeAttempt.answeredCount || 0) / activeAttempt.totalQuestions
          : null,
        loading: busy === 'resume',
        onPress: resumeExam,
      };
    }
    if (activePractice) {
      const answered = activePractice.answeredCount || 0;
      const total = activePractice.totalQuestions || 0;
      const isQuiz = activePractice.sessionType === 'daily-quiz';
      return {
        isDailyQuiz: isQuiz,
        label: isQuiz ? 'TODAY' : 'CONTINUE',
        title: isQuiz ? tr("Daily quiz") : tr("{0} session", tr(PRACTICE_TYPE_LABELS[activePractice.sessionType] || 'Practice')),
        subtitle: total ? tr("{0} of {1} questions answered", answered, total) : tr("{0} answered", answered),
        icon: 'flash',
        cta: tr("Resume"),
        pct: total ? answered / total : null,
        onPress: () => openPracticeSession(activePractice),
      };
    }
    if (!dailyQuizDone) {
      return {
        isDailyQuiz: true,
        label: 'TODAY',
        title: tr("Daily quiz"),
        subtitle: tr("10 questions{0} · about 5 min", target ? ` · ${target.name}` : ''),
        icon: 'today',
        cta: tr("Start quiz"),
        pct: null,
        loading: busy === 'quiz',
        onPress: openDailyQuiz,
      };
    }
    if (recommended[0]) {
      return {
        label: tr("UP NEXT"),
        title: recommended[0].title,
        subtitle: tr("{0} · {1} min", tr(EXAM_TYPE_LABELS[recommended[0].examType] || 'Test'), recommended[0].duration || 0),
        icon: 'play-circle',
        cta: tr("View test"),
        pct: null,
        onPress: () => navigation.navigate('ExamDetail', { examId: recommended[0]._id }),
      };
    }
    return {
      label: tr("GET STARTED"),
      title: tr("Find your next mock test"),
      subtitle: tr("Browse tests for your exam"),
      icon: 'search',
      cta: tr("Browse exams"),
      pct: null,
      onPress: () => navigation.navigate('ExamsTab'),
    };
  })();

  // ─── Loading ───────────────────────────────────────────
  if (loading && !stats) {
    return (
      <ScreenWrapper backgroundColor={colors.surface}>
        <View style={[tw`flex-1 px-5 pt-6`, { backgroundColor: colors.surface }]}>
          <ExamCardSkeletonList count={4} colors={colors} />
        </View>
      </ScreenWrapper>
    );
  }

  const card = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };
  const firstName = (user?.name || '').split(' ')[0] || 'there';
  const isHindi = user?.preferredLanguage === 'Hindi';

  return (
    <ScreenWrapper backgroundColor={colors.surface}>
      <View style={[tw`flex-1`, { backgroundColor: colors.surface }]}>
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-5 pt-3 pb-28`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Header ───────────────────────────────── */}
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <TouchableOpacity
              style={tw`flex-row items-center flex-1`}
              onPress={() => navigation.navigate('ProfileTab')}
              activeOpacity={0.8}
              accessibilityLabel={tr("Open profile")}
            >
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={tw`w-11 h-11 rounded-full`} />
              ) : (
                <View style={[tw`w-11 h-11 rounded-full items-center justify-center`, { backgroundColor: colors.surfaceMuted }]}>
                  <Text style={[tw`text-base font-bold`, { color: colors.text }]}>{firstName[0]?.toUpperCase()}</Text>
                </View>
              )}
              <View style={tw`ml-3 flex-1`}>
                <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>{greeting()}</Text>
                <Text style={[tw`text-xl font-extrabold`, { color: colors.text }]} numberOfLines={1}>
                  {firstName}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={tw`flex-row items-center gap-2`}>
              <TouchableOpacity
                onPress={toggleLanguage}
                activeOpacity={0.8}
                accessibilityLabel={tr("Question language: {0}. Tap to switch.", isHindi ? 'Hindi' : 'English')}
                style={[tw`flex-row rounded-full p-1`, card]}
              >
                {['EN', 'हिन्दी'].map((label, i) => {
                  const on = (i === 1) === isHindi;
                  return (
                    <View
                      key={label}
                      style={[tw`px-2.5 py-1.5 rounded-full`, on && { backgroundColor: colors.hero }]}
                    >
                      <Text style={[tw`text-xs font-bold`, { color: on ? colors.heroText : colors.textSecondary }]}>
                        {tr(label)}
                      </Text>
                    </View>
                  );
                })}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('Notifications')}
                activeOpacity={0.8}
                accessibilityLabel={tr("Notifications")}
                style={[tw`w-11 h-11 rounded-full items-center justify-center`, card]}
              >
                <Ionicons name="notifications-outline" size={20} color={colors.text} />
                {unreadCount > 0 && (
                  <View
                    style={[
                      tw`absolute top-2 right-2.5 w-2.5 h-2.5 rounded-full`,
                      { backgroundColor: colors.tones.red.fg, borderWidth: 2, borderColor: colors.card },
                    ]}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── Sub-exam (focus mode; only once 2+ sub-exams have exams) ── */}
          <SubExamChips style={tw`mb-5`} />

          {/* ─── Target exam (hidden in focus mode: everything is the focus exam) ── */}
          {!focus && (
          <TouchableOpacity
            onPress={chooseTarget}
            activeOpacity={0.85}
            style={[tw`flex-row items-center justify-between px-3.5 py-2.5 rounded-2xl mb-5`, card]}
          >
            <View style={tw`flex-row items-center flex-1`}>
              <View style={[tw`w-8 h-8 rounded-lg items-center justify-center mr-3`, { backgroundColor: colors.surfaceMuted }]}>
                <Ionicons name="locate-outline" size={17} color={colors.text} />
              </View>
              <View style={tw`flex-1`}>
                <Text style={[tw`text-[11px]`, { color: colors.textSecondary }]}>
                  {target ? tr("Preparing for") : tr("Set your goal")}
                </Text>
                <Text style={[tw`text-sm font-bold`, { color: colors.text }]} numberOfLines={1}>
                  {target ? target.name : tr("Choose the exam you’re preparing for")}
                </Text>
              </View>
            </View>
            <View style={tw`flex-row items-center`}>
              <Text style={[tw`text-xs font-semibold mr-1`, { color: colors.textSecondary }]}>
                {target ? tr("Change") : tr("Choose")}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
          )}

          {/* ─── Error ────────────────────────────────── */}
          {error && (
            <TouchableOpacity
              onPress={onRefresh}
              style={[tw`flex-row items-center p-3 rounded-2xl mb-4`, { backgroundColor: colors.tones.red.bg }]}
            >
              <Ionicons name="alert-circle-outline" size={18} color={colors.tones.red.fg} />
              <Text style={[tw`text-xs ml-2 flex-1`, { color: colors.tones.red.fg }]}>{error}</Text>
            </TouchableOpacity>
          )}

          {/* ─── Hero (Continue / Today) ──────────────── */}
          <View style={[tw`p-5 rounded-3xl mb-4`, { backgroundColor: colors.hero }]}>
            <View style={tw`flex-row justify-between items-start`}>
              <View style={tw`flex-1 pr-3`}>
                <Text style={[tw`text-[11px] font-bold tracking-widest`, { color: colors.heroMuted }]}>{tr(hero.label)}</Text>
                <Text style={[tw`text-xl font-extrabold mt-1`, { color: colors.heroText }]} numberOfLines={2}>
                  {hero.title}
                </Text>
                <Text style={[tw`text-xs mt-1`, { color: colors.heroTextSecondary }]}>{hero.subtitle}</Text>
              </View>
              <View style={[tw`w-11 h-11 rounded-2xl items-center justify-center`, { backgroundColor: colors.heroRaised }]}>
                <Ionicons name={hero.icon} size={22} color={colors.heroAccent} />
              </View>
            </View>
            {hero.pct != null && (
              <View style={[tw`h-1.5 rounded-full mt-4 overflow-hidden`, { backgroundColor: colors.heroTrack }]}>
                <View
                  style={[
                    tw`h-full rounded-full`,
                    { width: `${Math.max(3, Math.round(hero.pct * 100))}%`, backgroundColor: colors.heroAccent },
                  ]}
                />
              </View>
            )}
            <TouchableOpacity
              onPress={hero.onPress}
              activeOpacity={0.85}
              style={[tw`flex-row items-center justify-center h-12 rounded-2xl mt-4`, { backgroundColor: colors.heroText }]}
            >
              {hero.loading ? (
                <ActivityIndicator color={colors.hero} />
              ) : (
                <>
                  <Text style={[tw`text-[15px] font-bold mr-2`, { color: colors.hero }]}>{hero.cta}</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.hero} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* ─── Stats + rank ─────────────────────────── */}
          <View style={[tw`p-4 rounded-3xl mb-4`, card]}>
            {/* Daily goal (set in onboarding; tap to change) */}
            <TouchableOpacity onPress={changeDailyGoal} activeOpacity={0.8} accessibilityRole="button" style={tw`mb-4`}>
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <Text style={[tw`text-sm font-bold`, { color: colors.text }]}>
                  {todayDone >= todayGoal ? tr("Today's goal done!") : tr("Today's goal")}
                </Text>
                <Text style={[tw`text-xs font-semibold`, { color: colors.textSecondary }]}>
                  {tr("{0} of {1} tests", Math.min(todayDone, todayGoal), todayGoal)}
                </Text>
              </View>
              <View style={tw`flex-row gap-1.5`}>
                {Array.from({ length: todayGoal }).map((_, i) => (
                  <View
                    key={i}
                    style={[tw`flex-1 h-2 rounded-full`, { backgroundColor: i < todayDone ? colors.tones.green.fg : colors.surfaceMuted }]}
                  />
                ))}
              </View>
            </TouchableOpacity>
            <View style={tw`flex-row`}>
              <Stat icon="flame" iconColor={colors.tones.orange.fg} label={tr("Streak")} colors={colors}
                value={String(currentStreak)} unit={currentStreak === 1 ? tr('day') : tr('days')} />
              <Stat icon="document-text-outline" label={tr("Exams")} colors={colors} divider
                value={String(totalAttempts)} />
              <Stat icon="trending-up" label={tr("Average")} colors={colors} divider
                value={totalAttempts > 0 && !Number.isNaN(averageScore) ? averageScore.toFixed(0) : '—'}
                unit={totalAttempts > 0 && !Number.isNaN(averageScore) ? '%' : undefined} />
            </View>
            <View style={[tw`h-px my-4`, { backgroundColor: colors.border }]} />
            <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')} activeOpacity={0.8}>
              <View style={tw`flex-row justify-between items-center mb-2`}>
                <Text style={[tw`text-sm font-bold`, { color: colors.text }]}>
                  {tr(rank)} <Text style={[tw`font-normal`, { color: colors.textSecondary }]}>{tr("· {0} XP", xp.toLocaleString('en-IN'))}</Text>
                </Text>
                <View style={tw`flex-row items-center`}>
                  <Text style={[tw`text-xs font-semibold`, { color: colors.text }]}>{tr("Leaderboard")}</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.text} />
                </View>
              </View>
              <View style={[tw`h-1.5 rounded-full overflow-hidden`, { backgroundColor: colors.surfaceMuted }]}>
                <View style={[tw`h-full rounded-full`, { width: `${Math.round(rankProgress * 100)}%`, backgroundColor: colors.primary }]} />
              </View>
              <Text style={[tw`text-xs mt-2`, { color: colors.textSecondary }]}>
                {nextRank ? tr("{0} XP to {1}", xpToNext.toLocaleString('en-IN'), tr(nextRank)) : tr("Top rank reached")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ─── All-Haryana live mock ──────────────────── */}
          <LiveMockCard data={liveMock} colors={colors} onPress={() => navigation.navigate('LiveMock')} />

          {/* ─── Daily quiz (when not already the hero) ── */}
          {!hero.isDailyQuiz && (
            <TouchableOpacity
              onPress={openDailyQuiz}
              activeOpacity={0.85}
              style={[tw`flex-row items-center p-4 rounded-3xl mb-4`, card]}
            >
              <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, { backgroundColor: colors.tones.purple.bg }]}>
                <Ionicons name="today-outline" size={20} color={colors.tones.purple.fg} />
              </View>
              <View style={tw`flex-1`}>
                <Text style={[tw`text-sm font-bold`, { color: colors.text }]}>{tr("Daily quiz")}</Text>
                <Text style={[tw`text-xs mt-0.5`, { color: colors.textSecondary }]}>
                  {dailyQuizDone
                    ? tr("Done today · {0}/{1} correct", dailyQuiz.correctAnswers || 0, dailyQuiz.totalQuestions || 10)
                    : dailyQuiz
                      ? tr("In progress · tap to continue")
                      : tr("10 questions · about 5 min")}
                </Text>
              </View>
              {busy === 'quiz' ? (
                <ActivityIndicator color={colors.text} />
              ) : dailyQuizDone ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.tones.green.fg} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          )}

          {/* ─── HSSC exam info ───────────────────────── */}
          <TouchableOpacity
            onPress={() => navigation.navigate('HsscInfo')}
            activeOpacity={0.85}
            style={[tw`flex-row items-center p-4 rounded-3xl mb-4`, card]}
          >
            <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, { backgroundColor: colors.tones.blue.bg }]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.tones.blue.fg} />
            </View>
            <View style={tw`flex-1`}>
              <Text style={[tw`text-sm font-bold`, { color: colors.text }]}>{tr("HSSC CET info")}</Text>
              <Text style={[tw`text-xs mt-0.5`, { color: colors.textSecondary }]}>{tr("Pattern, syllabus, marking")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* ─── Quick actions ────────────────────────── */}
          <View style={tw`flex-row flex-wrap justify-between mb-2`}>
            <QuickTile icon="play-circle-outline" tone={colors.tones.green} label={tr("Mock test")} subtitle={tr("Full exam")}
              colors={colors} onPress={() => navigation.navigate('ExamsTab')} />
            <QuickTile icon="flash-outline" tone={colors.tones.orange} label={tr("Practice")} subtitle={tr("Quick drill")}
              colors={colors} onPress={() => navigation.navigate('StudyTab', { screen: 'PracticeSessions', initial: false })} />
            <QuickTile icon="book-outline" tone={colors.tones.blue} label="PYQ" subtitle={tr("Past papers")}
              colors={colors} onPress={() => navigation.navigate('StudyTab', { screen: 'Pyq', initial: false })} />
            <QuickTile icon="close-circle-outline" tone={colors.tones.red} label={tr("Wrong Book")} subtitle={tr("Fix mistakes")}
              colors={colors} onPress={() => navigation.navigate('StudyTab', { screen: 'WrongBook', initial: false })} />
          </View>

          {/* ─── Haryana GK hub ───────────────────────── */}
          {showHaryanaGk && (
            <TouchableOpacity
              onPress={() => navigation.navigate('StudyTab', { screen: 'HaryanaGk', initial: false })}
              activeOpacity={0.85}
              style={[tw`flex-row items-center p-4 rounded-3xl mb-6`, { backgroundColor: colors.hero }]}
            >
              <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, { backgroundColor: colors.heroRaised }]}>
                <Ionicons name="map-outline" size={20} color={colors.heroAccent} />
              </View>
              <View style={tw`flex-1`}>
                <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>{tr("Haryana GK")}</Text>
                <Text style={[tw`text-xs mt-0.5`, { color: colors.heroTextSecondary }]} numberOfLines={1}>
                  {tr("Topic tests for HSSC · हरियाणा सामान्य ज्ञान")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.heroTextSecondary} />
            </TouchableOpacity>
          )}

          {/* ─── Live tests ───────────────────────────── */}
          {liveTests.length > 0 && (
            <Section title={tr("Live tests")} colors={colors}>
              <View style={[tw`rounded-3xl overflow-hidden`, card]}>
                {liveTests.map((exam, i) => (
                  <ListRow
                    key={exam._id}
                    colors={colors}
                    last={i === liveTests.length - 1}
                    icon="radio-outline"
                    iconTone={colors.tones.red}
                    title={exam.title}
                    subtitle={tr("{0} · {1} min", startsIn(exam.scheduledTime), exam.duration || 0)}
                    onPress={() => navigation.navigate('ExamDetail', { examId: exam._id })}
                  />
                ))}
              </View>
            </Section>
          )}

          {/* ─── Study plan ───────────────────────────── */}
          {features.studyPlans && studyPlan && (() => {
            const { completed, total, pct } = computePlanProgress(studyPlan);
            return (
              <TouchableOpacity
                onPress={() => navigation.navigate('StudyTab', { screen: 'StudyPlans', initial: false })}
                activeOpacity={0.85}
                style={[tw`p-4 rounded-3xl mb-6`, card]}
              >
                <View style={tw`flex-row items-center justify-between mb-2`}>
                  <Text style={[tw`text-sm font-bold flex-1`, { color: colors.text }]} numberOfLines={1}>
                    {studyPlan.title}
                  </Text>
                  <Text style={[tw`text-sm font-bold`, { color: colors.text }]}>{pct}%</Text>
                </View>
                <View style={[tw`h-1.5 rounded-full overflow-hidden`, { backgroundColor: colors.surfaceMuted }]}>
                  <View style={[tw`h-full rounded-full`, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                </View>
                <Text style={[tw`text-xs mt-2`, { color: colors.textSecondary }]}>
                  {tr("Study plan · {0} of {1} topics done", completed, total)}
                </Text>
              </TouchableOpacity>
            );
          })()}

          {/* ─── Recommended ──────────────────────────── */}
          <Section
            title={target ? tr("Recommended for {0}", target.name) : tr("Recommended for you")}
            onSeeAll={() => navigation.navigate('ExamsTab')}
            colors={colors}
          >
            {recommended.length > 0 ? (
              <View style={[tw`rounded-3xl overflow-hidden`, card]}>
                {recommended.map((exam, i) => (
                  <ListRow
                    key={exam._id}
                    colors={colors}
                    last={i === recommended.length - 1}
                    icon={exam.examType === 'pyq' ? 'book-outline' : 'document-text-outline'}
                    title={exam.title}
                    subtitle={[
                      tr(EXAM_TYPE_LABELS[exam.examType] || 'Test'),
                      `${exam.totalQuestions || exam.questions || 0} Qs`,
                      tr("{0} min", exam.duration || 0),
                    ].join(' · ')}
                    badge={exam.isAttempted ? 'DONE' : exam.isPremium ? 'PRO' : 'FREE'}
                    badgeTone={exam.isAttempted ? null : exam.isPremium ? colors.tones.purple : colors.tones.green}
                    onPress={() => navigation.navigate('ExamDetail', { examId: exam._id })}
                  />
                ))}
              </View>
            ) : (
              <EmptyCard
                colors={colors}
                icon="document-text-outline"
                title={tr("No tests here yet")}
                body={tr("New tests for your exam will show up here.")}
              />
            )}
          </Section>

          {/* ─── Exam updates ─────────────────────────── */}
          {updates.length > 0 && (
            <Section title={tr("Updates")} onSeeAll={() => navigation.navigate('Notifications')} colors={colors}>
              <View style={[tw`rounded-3xl overflow-hidden`, card]}>
                {updates.slice(0, 2).map((n, i, arr) => (
                  <ListRow
                    key={n._id}
                    colors={colors}
                    last={i === arr.length - 1}
                    icon="megaphone-outline"
                    iconTone={n.isRead ? null : colors.tones.blue}
                    title={n.title}
                    subtitle={`${timeAgo(n.createdAt)} · ${n.message}`}
                    onPress={() => navigation.navigate('Notifications')}
                  />
                ))}
              </View>
            </Section>
          )}

          {/* ─── Test series carousel ─────────────────── */}
          {testSeries.length > 0 && (
            <Section
              title={tr("Test series")}
              onSeeAll={() => navigation.navigate('SeriesTab', { screen: 'TestSeriesList' })}
              colors={colors}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={SERIES_CARD_WIDTH + SERIES_CARD_GAP}
                decelerationRate="fast"
                style={tw`-mx-5`}
                contentContainerStyle={tw`px-5`}
                onMomentumScrollEnd={(e) =>
                  setSeriesIndex(Math.round(e.nativeEvent.contentOffset.x / (SERIES_CARD_WIDTH + SERIES_CARD_GAP)))
                }
              >
                {testSeries.map((s) => (
                  <SeriesCard
                    key={s._id}
                    series={s}
                    colors={colors}
                    onPress={() =>
                      navigation.navigate('SeriesTab', { screen: 'TestSeriesDetail', params: { id: s._id }, initial: false })
                    }
                  />
                ))}
              </ScrollView>
              {testSeries.length > 1 && (
                <View style={tw`flex-row justify-center mt-3`}>
                  {testSeries.map((s, i) => (
                    <View
                      key={s._id}
                      style={[
                        tw`h-1.5 rounded-full mx-0.5`,
                        { width: i === seriesIndex ? 16 : 6, backgroundColor: i === seriesIndex ? colors.text : colors.border },
                      ]}
                    />
                  ))}
                </View>
              )}
            </Section>
          )}

          {/* ─── Recent results ───────────────────────── */}
          <Section
            title={tr("Recent results")}
            onSeeAll={recentResults.length ? () => navigation.navigate('ExamHistory') : null}
            colors={colors}
          >
            {recentResults.length > 0 ? (
              <View style={[tw`rounded-3xl overflow-hidden`, card]}>
                {recentResults.map((attempt, i) => {
                  const pct = attempt.percentage || 0;
                  const tone = pct >= 70 ? colors.tones.green : pct >= 40 ? colors.tones.orange : colors.tones.red;
                  return (
                    <TouchableOpacity
                      key={attempt._id}
                      onPress={() => navigation.navigate('Result', { attemptId: attempt._id })}
                      activeOpacity={0.8}
                      style={[
                        tw`flex-row items-center px-4 py-3.5`,
                        i < recentResults.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                      ]}
                    >
                      <View style={[tw`w-11 h-11 rounded-full items-center justify-center mr-3`, { backgroundColor: tone.bg }]}>
                        <Text style={[tw`text-xs font-bold`, { color: tone.fg }]}>{pct.toFixed(0)}%</Text>
                      </View>
                      <View style={tw`flex-1`}>
                        <Text style={[tw`text-sm font-bold`, { color: colors.text }]} numberOfLines={1}>
                          {attempt.exam?.title || tr("Exam")}
                        </Text>
                        <Text style={[tw`text-xs mt-0.5`, { color: colors.textSecondary }]}>
                          {tr("{0}/{1} marks · {2} correct · {3} wrong", attempt.totalScore || 0, attempt.exam?.totalMarks || 0, attempt.correctAnswers || 0, attempt.incorrectAnswers || 0)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <EmptyCard
                colors={colors}
                icon="bar-chart-outline"
                title={tr("No results yet")}
                body={tr("Finish a mock test to see your score and accuracy here.")}
              />
            )}
          </Section>

          {/* ─── Go Premium (free users) ──────────────── */}
          {!isPremium && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Paywall')}
              activeOpacity={0.85}
              style={[tw`flex-row items-center p-4 rounded-3xl mb-6`, card]}
            >
              <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, { backgroundColor: colors.tones.purple.bg }]}>
                <Ionicons name="diamond-outline" size={20} color={colors.tones.purple.fg} />
              </View>
              <View style={tw`flex-1`}>
                <Text style={[tw`text-sm font-bold`, { color: colors.text }]}>{tr("Go Premium")}</Text>
                <Text style={[tw`text-xs mt-0.5`, { color: colors.textSecondary }]}>{tr("Unlimited tests and all study material")}</Text>
              </View>
              <View style={[tw`px-3.5 py-2 rounded-xl`, { backgroundColor: colors.hero }]}>
                <Text style={[tw`text-xs font-bold`, { color: colors.heroText }]}>{tr("Upgrade")}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* ─── Word of the day ──────────────────────── */}
          {wordOfDay?.word && (
            <TouchableOpacity
              onPress={() => navigation.navigate('WordOfDayDetail', { word: wordOfDay })}
              activeOpacity={0.85}
              style={[tw`p-4 rounded-3xl`, card]}
            >
              <View style={tw`flex-row justify-between items-center`}>
                <Text style={[tw`text-[11px] font-bold tracking-widest`, { color: colors.textSecondary }]}>{tr("WORD OF THE DAY")}</Text>
                {quote?.quote && (
                  <TouchableOpacity onPress={() => navigation.navigate('QuoteDetail', { quote })} hitSlop={10}>
                    <Text style={[tw`text-xs font-semibold`, { color: colors.text }]}>{tr("Quote ›")}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[tw`text-lg font-extrabold mt-1.5`, { color: colors.text }]}>{wordOfDay.word}</Text>
              {!!wordOfDay.meaning && (
                <Text style={[tw`text-xs mt-1 leading-5`, { color: colors.textSecondary }]} numberOfLines={2}>
                  {wordOfDay.meaning}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}

// ─── Small building blocks ───────────────────────────────

function Section({ title, onSeeAll, colors, children }) {
  return (
    <View style={tw`mb-6`}>
      <View style={tw`flex-row justify-between items-center mb-3`}>
        <Text style={[tw`text-lg font-extrabold flex-1 pr-3`, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} hitSlop={10}>
            <Text style={[tw`text-sm font-semibold`, { color: colors.text }]}>{tr("See all")}</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function Stat({ icon, iconColor, label, value, unit, divider, colors }) {
  return (
    <View style={[tw`flex-1`, divider && { paddingLeft: 14, borderLeftWidth: 1, borderLeftColor: colors.border }]}>
      <View style={tw`flex-row items-center`}>
        <Ionicons name={icon} size={14} color={iconColor || colors.textSecondary} />
        <Text style={[tw`text-xs ml-1`, { color: colors.textSecondary }]}>{tr(label)}</Text>
      </View>
      <Text style={[tw`text-2xl font-extrabold mt-1`, { color: value === '—' ? colors.textSecondary : colors.text }]}>
        {value}
        {unit ? <Text style={[tw`text-xs font-semibold`, { color: colors.textSecondary }]}>{unit === '%' ? unit : ` ${unit}`}</Text> : null}
      </Text>
    </View>
  );
}

function QuickTile({ icon, tone, label, subtitle, onPress, colors }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        tw`flex-row items-center p-3.5 rounded-2xl mb-2.5`,
        { width: '48.5%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
      ]}
    >
      <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, { backgroundColor: tone.bg }]}>
        <Ionicons name={icon} size={20} color={tone.fg} />
      </View>
      <View style={tw`flex-1`}>
        <Text style={[tw`text-sm font-bold`, { color: colors.text }]} numberOfLines={1}>{tr(label)}</Text>
        <Text style={[tw`text-xs`, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

function ListRow({ icon, iconTone, title, subtitle, badge, badgeTone, last, onPress, colors }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        tw`flex-row items-center px-4 py-3.5`,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <View
        style={[
          tw`w-11 h-11 rounded-xl items-center justify-center mr-3`,
          { backgroundColor: iconTone ? iconTone.bg : colors.surfaceMuted },
        ]}
      >
        <Ionicons name={icon} size={20} color={iconTone ? iconTone.fg : colors.text} />
      </View>
      <View style={tw`flex-1 pr-2`}>
        <Text style={[tw`text-sm font-bold`, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        <Text style={[tw`text-xs mt-0.5`, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text>
      </View>
      {badge ? (
        <View style={[tw`px-2 py-1 rounded-md`, { backgroundColor: badgeTone ? badgeTone.bg : colors.surfaceMuted }]}>
          <Text style={[tw`text-[10px] font-bold`, { color: badgeTone ? badgeTone.fg : colors.textSecondary }]}>{badge}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );
}

function EmptyCard({ icon, title, body, colors }) {
  return (
    <View
      style={[
        tw`flex-row items-center p-4 rounded-3xl`,
        { backgroundColor: colors.card, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border },
      ]}
    >
      <View style={[tw`w-11 h-11 rounded-full items-center justify-center mr-3`, { backgroundColor: colors.surfaceMuted }]}>
        <Ionicons name={icon} size={20} color={colors.textSecondary} />
      </View>
      <View style={tw`flex-1`}>
        <Text style={[tw`text-sm font-bold`, { color: colors.text }]}>{title}</Text>
        <Text style={[tw`text-xs mt-0.5 leading-4`, { color: colors.textSecondary }]}>{body}</Text>
      </View>
    </View>
  );
}

function SeriesCard({ series, onPress, colors }) {
  const paid = series.accessType === 'paid' || series.isPremium || series.price > 0;
  const price = !paid
    ? tr("Free")
    : `₹${series.discountPrice && series.discountPrice < series.price ? series.discountPrice : series.price}`;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        tw`p-4 rounded-3xl`,
        {
          width: SERIES_CARD_WIDTH,
          marginRight: SERIES_CARD_GAP,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={tw`flex-row justify-between items-center`}>
        <View style={[tw`px-2 py-1 rounded-md`, { backgroundColor: colors.surfaceMuted }]}>
          <Text style={[tw`text-[10px] font-bold uppercase`, { color: colors.text }]}>
            {tr("{0} series", series.seriesType || 'mock')}
          </Text>
        </View>
        <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>
          {series.totalTests || 0} {series.totalTests === 1 ? tr("test") : tr("tests")}
        </Text>
      </View>
      <Text style={[tw`text-base font-extrabold mt-3`, { color: colors.text }]} numberOfLines={2}>
        {series.title}
      </Text>
      <View style={tw`flex-row justify-between items-center mt-4`}>
        <Text style={[tw`text-xl font-extrabold`, { color: colors.text }]}>{price}</Text>
        <View style={[tw`px-4 py-2.5 rounded-xl`, { backgroundColor: colors.hero }]}>
          <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>
            {series.isEnrolled ? tr("Continue") : tr("Enroll")}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/** Home card for the weekly live mock: countdown → LIVE → your rank. */
function LiveMockCard({ data, colors, onPress }) {
  const current = data?.current;
  const last = data?.lastResult;
  const recentResult = last?.me?.ranked && Date.now() - new Date(last.liveEndsAt).getTime() < 3 * 24 * 3600 * 1000;
  if (!current && !recentResult) return null;

  const live = current?.state === 'live';
  let title;
  let subtitle;
  if (recentResult) {
    title = tr('Your Haryana rank #{0} of {1}', last.me.rank, last.participants);
    subtitle = tr('{0} · {1}/{2}', last.title, last.me.score, last.totalMarks);
  } else if (live) {
    title = tr('All-Haryana live mock is LIVE');
    subtitle = tr('{0} left · {1} questions · {2} min', countdown(current.liveEndsAt) || '', current.totalQuestions, current.duration);
  } else {
    title = tr('All-Haryana Live Mock');
    subtitle = tr('{0} · starts in {1}', liveWhen(current.scheduledTime), countdown(current.scheduledTime) || '');
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[tw`flex-row items-center p-4 rounded-3xl mb-4`, { backgroundColor: colors.card, borderWidth: 1, borderColor: live ? colors.tones.red.fg : colors.border }]}
    >
      <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-3`, { backgroundColor: live ? colors.tones.red.bg : colors.tones.orange.bg }]}>
        <Ionicons name={live ? 'radio' : 'trophy-outline'} size={20} color={live ? colors.tones.red.fg : colors.tones.orange.fg} />
      </View>
      <View style={tw`flex-1`}>
        <Text style={[tw`text-sm font-bold`, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        <Text style={[tw`text-xs mt-0.5`, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}
