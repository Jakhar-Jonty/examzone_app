import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import tw from 'twrnc';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ImageBackground } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { formatDate, getExamStatus, getStreakBadge } from '../utils/helpers';
import { gamificationService } from '../services/gamificationService';
import { testSeriesService } from '../services/testSeriesService';
import { notificationApi } from '../services/notificationService';
import { practiceSessionService } from '../services/practiceSessionService';
import { studyPlanService } from '../services/studyPlanService';

const PRACTICE_TYPE_LABELS = {
  random: 'Random',
  'subject-wise': 'Subject Wise',
  'topic-wise': 'Topic Wise',
  'difficulty-based': 'By Difficulty',
  'weak-areas': 'Weak Areas',
};

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

function getNextMilestone(plan) {
  return (plan.milestones || [])
    .filter((m) => !m.isCompleted)
    .sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate))[0];
}

function formatShortDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function DashboardScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { user, isPremium } = useAuth();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [wordOfDay, setWordOfDay] = useState(null);
  const [quote, setQuote] = useState(null);
  const [recentResults, setRecentResults] = useState([]);
  const [recentPublishedExams, setRecentPublishedExams] = useState([]);
  const [progress, setProgress] = useState(null);
  const [testSeries, setTestSeries] = useState([]);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState({ top: [], me: null });
  const [resuming, setResuming] = useState(false);
  const [activePractice, setActivePractice] = useState(null);
  const [studyPlanHighlight, setStudyPlanHighlight] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, wordRes, quoteRes, examsRes, progressData, seriesRes, activeRes, unreadRes, lbRes, practiceRes, plansRes] = await Promise.all([
        api.get('/user/dashboard-stats').catch(() => ({ data: null })),
        api.get('/user/word-of-day').catch(() => ({ data: null })),
        api.get('/user/motivational-quote').catch(() => ({ data: null })),
        api.get('/user/exams').catch(() => ({ data: { exams: [] } })),
        gamificationService.getMyProgress().catch(() => null),
        testSeriesService.list({ limit: 6 }).catch(() => ({ series: [] })),
        api.get('/exams/active-attempt').then((r) => r.data).catch(() => null),
        notificationApi.unreadCount().catch(() => ({ unreadCount: 0 })),
        gamificationService.getLeaderboard(5).catch(() => null),
        practiceSessionService.list({ limit: 8 }).catch(() => ({ sessions: [] })),
        studyPlanService.list().catch(() => ({ plans: [] })),
      ]);

      setProgress(progressData);
      setTestSeries(seriesRes?.series || []);
      setActiveAttempt(activeRes?.attempt || null);
      setUnreadCount(unreadRes?.unreadCount || 0);
      if (lbRes) setLeaderboard({ top: (lbRes.leaderboard || []).slice(0, 3), me: lbRes.me || null });

      const inProgressPractice = (practiceRes?.sessions || []).find((s) => !s.isCompleted);
      if (inProgressPractice) {
        try {
          const detail = await practiceSessionService.get(inProgressPractice._id);
          setActivePractice({
            ...inProgressPractice,
            answeredCount: detail?.session?.answers?.length || 0,
          });
        } catch {
          setActivePractice(inProgressPractice);
        }
      } else {
        setActivePractice(null);
      }

      setStudyPlanHighlight(pickActiveStudyPlan(plansRes?.plans || []));

      if (statsRes.data) {
        setStats(statsRes.data);
        setRecentResults((statsRes.data?.recentExamResults || []).slice(0, 5));
        setRecentPublishedExams((statsRes.data?.todaysPublishedExams || []).slice(0, 5));
      } else {
        const allExams = examsRes.data?.exams || [];
        setRecentResults(
          allExams
            .filter((e) => e.isAttempted)
            .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
            .slice(0, 5)
        );
        setRecentPublishedExams(
          allExams.filter((e) => !e.isAttempted && e.status === 'active').slice(0, 5)
        );
      }

      if (wordRes.data) setWordOfDay(wordRes.data?.wordOfDay || wordRes.data?.word || wordRes.data);
      if (quoteRes.data) setQuote(quoteRes.data?.quote || quoteRes.data?.motivationalQuote || quoteRes.data);

      if (!statsRes.data && !wordRes.data && !quoteRes.data && !examsRes.data?.exams?.length) {
        setError('Unable to load data. Pull down to retry.');
      }
    } catch {
      setError('Something went wrong. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Resume an in-progress attempt — the start endpoint resumes existing ones.
  const handleResume = async () => {
    if (!activeAttempt || resuming) return;
    try {
      setResuming(true);
      const res = await api.post(`/exams/${activeAttempt.examId}/start`);
      const attemptData = res.data.attempt;
      // ExamInterface is a root-stack screen (above the tabs).
      navigation.navigate('ExamInterface', {
        examId: activeAttempt.examId,
        attemptId: attemptData._id,
        exam: res.data.exam,
        attempt: attemptData,
        isResumed: res.data.isResumed ?? true,
      });
    } catch (e) {
      // fall back to the exam detail screen
      navigation.navigate('ExamDetail', { examId: activeAttempt.examId });
    } finally {
      setResuming(false);
    }
  };

  const openPractice = () => {
    navigation.navigate('StudyTab', { screen: 'PracticeSessions' });
  };

  const resumePractice = () => {
    if (!activePractice) return;
    navigation.navigate('StudyTab', {
      screen: 'PracticeInterface',
      params: {
        sessionId: activePractice._id,
        sessionType: activePractice.sessionType,
      },
    });
  };

  const openStudyPlans = () => {
    navigation.navigate('StudyTab', { screen: 'StudyPlans' });
  };

  // ─── Helpers ───────────────────────────────────────────
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  const getScoreColor = (pct) => {
    if (pct >= 70) return '#10b981';
    if (pct >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getStatusColor = (status) => {
    const map = {
      available: colors.primary,
      completed: '#10b981',
      paused: '#f59e0b',
      upcoming: '#3b82f6',
      expired: '#9ca3af',
    };
    return map[status] || '#9ca3af';
  };

  const getCategoryName = (cat) => {
    if (!cat) return 'General';
    if (typeof cat === 'string') return cat;
    return cat.displayName || cat.name || 'General';
  };

  // ─── Computed ──────────────────────────────────────────
  const streak = stats?.streak;
  const currentStreak = streak?.currentStreak || 0;
  const longestStreak = streak?.longestStreak || 0;
  const totalExamsAttempted = stats?.totalExamsAttempted || stats?.examsAttempted || 0;
  const averageScore = stats?.averageScore || stats?.averagePercentage || 0;
  const totalStudyDays = streak?.totalStudyDays || 0;
  const streakBadge = getStreakBadge(currentStreak);
  const xp = progress?.xp || 0;
  const rank = progress?.rank || 'Beginner';
  const nextRank = progress?.nextRank || null;
  const xpToNext = progress?.xpToNextRank || 0;
  const rankProgress = Math.max(0, Math.min(1, progress?.progressToNext || 0));
  const primaryAction = (() => {
    if (activeAttempt) {
      return {
        kind: 'resume-exam',
        badge: activeAttempt.isPaused ? 'PAUSED EXAM' : 'EXAM IN PROGRESS',
        title: activeAttempt.examTitle || 'Resume your mock test',
        subtitle: `${activeAttempt.answeredCount || 0} answered`,
        icon: 'play',
        color: '#f59e0b',
        onPress: handleResume,
      };
    }
    if (activePractice) {
      const answered = activePractice.answeredCount || 0;
      const total = activePractice.totalQuestions || 0;
      return {
        kind: 'resume-practice',
        badge: 'PRACTICE IN PROGRESS',
        title: `${PRACTICE_TYPE_LABELS[activePractice.sessionType] || 'Practice'} Session`,
        subtitle: total ? `${answered}/${total} answered` : `${answered} answered`,
        icon: 'flash',
        color: colors.primary,
        onPress: resumePractice,
      };
    }
    return {
      kind: 'start-mock',
      badge: 'TODAY FOCUS',
      title: 'Start your next mock test',
      subtitle: 'Track progress and improve accuracy',
      icon: 'play-circle',
      color: colors.primary,
      onPress: () => navigation.navigate('ExamsTab'),
    };
  })();

  // ─── Loading ───────────────────────────────────────────
  if (loading && !stats) {
    return (
      <ScreenWrapper>
        <View style={[tw`flex-1 items-center justify-center`, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`pb-28`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Error ────────────────────────────────── */}
          {error && (
            <TouchableOpacity
              style={[tw`mx-5 mt-3 p-3 rounded-2xl flex-row items-center`, { backgroundColor: '#fef2f2' }]}
              onPress={fetchDashboardData}
              activeOpacity={0.7}
            >
              <Ionicons name="alert-circle" size={18} color="#ef4444" />
              <Text style={tw`flex-1 text-xs text-red-500 ml-2`}>{error}</Text>
              <Ionicons name="refresh" size={16} color="#ef4444" />
            </TouchableOpacity>
          )}

          {/* ─── Greeting ─────────────────────────────── */}
          <View style={tw`px-5 pt-2 pb-5`}>
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-1`}>
                <Text style={[tw`text-sm`, { color: colors.textSecondary }]}>
                  Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},
                </Text>
                <Text style={[tw`text-2xl font-bold mt-0.5`, { color: colors.text }]}>
                  {user?.name?.split(' ')[0] || 'User'} 👋
                </Text>
              </View>
              <View style={tw`flex-row items-center gap-3`}>
                {/* Notification bell */}
                <TouchableOpacity
                  style={[
                    tw`w-11 h-11 rounded-full items-center justify-center`,
                    { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
                  ]}
                  onPress={() => navigation.navigate('ProfileTab', { screen: 'Notifications' })}
                  activeOpacity={0.7}
                >
                  <Ionicons name="notifications-outline" size={20} color={colors.text} />
                  {unreadCount > 0 && (
                    <View
                      style={[
                        tw`absolute -top-0.5 -right-0.5 rounded-full items-center justify-center px-1`,
                        { minWidth: 18, height: 18, backgroundColor: '#ef4444', borderWidth: 2, borderColor: colors.background },
                      ]}
                    >
                      <Text style={tw`text-[10px] font-bold text-white`}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Avatar */}
                <TouchableOpacity
                  style={[
                    tw`w-11 h-11 rounded-full items-center justify-center overflow-hidden`,
                    { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => navigation.navigate('ProfileTab')}
                  activeOpacity={0.7}
                >
                  {user?.profileImage ? (
                    <Image source={{ uri: user.profileImage }} style={tw`w-11 h-11`} />
                  ) : (
                    <Text style={[tw`text-sm font-bold`, { color: colors.primary }]}>
                      {getInitials(user?.name)}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ─── Primary Action ───────────────────────── */}
          <TouchableOpacity
            style={tw`px-5 mb-5`}
            activeOpacity={0.9}
            onPress={primaryAction.onPress}
            disabled={resuming && primaryAction.kind === 'resume-exam'}
          >
            <View
              style={[
                tw`flex-row items-center p-4 rounded-2xl`,
                { backgroundColor: primaryAction.color + '14', borderWidth: 1, borderColor: primaryAction.color + '40' },
              ]}
            >
              <View
                style={[
                  tw`w-11 h-11 rounded-full items-center justify-center`,
                  { backgroundColor: primaryAction.color + '22' },
                ]}
              >
                <Ionicons name={primaryAction.icon} size={20} color={primaryAction.color} />
              </View>
              <View style={tw`flex-1 ml-3`}>
                <Text style={[tw`text-xs font-semibold`, { color: primaryAction.color }]}>
                  {primaryAction.badge}
                </Text>
                <Text style={[tw`text-sm font-bold mt-0.5`, { color: colors.text }]} numberOfLines={1}>
                  {primaryAction.title}
                </Text>
                <Text style={[tw`text-xs mt-0.5`, { color: colors.textSecondary }]}>
                  {primaryAction.subtitle} · {primaryAction.kind === 'start-mock' ? 'tap to begin' : 'tap to continue'}
                </Text>
              </View>
              {resuming && primaryAction.kind === 'resume-exam' ? (
                <ActivityIndicator color={primaryAction.color} />
              ) : (
                <Ionicons name="arrow-forward-circle" size={26} color={primaryAction.color} />
              )}
            </View>
          </TouchableOpacity>

          {/* ─── Streak + Stats Row ───────────────────── */}
          <View style={tw`px-5 mb-5`}>
            <View style={tw`flex-row gap-2.5`}>
              {/* Streak */}
              <View
                style={[
                  tw`flex-1 p-3.5 rounded-2xl`,
                  { backgroundColor: colors.primary + '10' },
                ]}
              >
                <View style={tw`flex-row items-center justify-between mb-1`}>
                  <View style={tw`flex-row items-center gap-1.5`}>
                    <Ionicons name="flame" size={16} color={colors.primary} />
                    <Text style={[tw`text-[11px] font-medium`, { color: colors.primary }]}>Streak</Text>
                  </View>
                  {streakBadge.current && (
                    <Text style={tw`text-base`}>{streakBadge.current.icon}</Text>
                  )}
                </View>
                <Text style={[tw`text-2xl font-bold`, { color: colors.primary }]}>
                  {currentStreak}
                  <Text style={[tw`text-xs font-medium`, { color: colors.primary }]}> days</Text>
                </Text>
                {streakBadge.current ? (
                  <Text style={[tw`text-[10px] mt-0.5`, { color: colors.primary, opacity: 0.8 }]} numberOfLines={1}>
                    {streakBadge.current.name}
                  </Text>
                ) : longestStreak > currentStreak ? (
                  <Text style={[tw`text-[10px] mt-0.5`, { color: colors.primary, opacity: 0.7 }]}>
                    Best: {longestStreak}
                  </Text>
                ) : null}
              </View>

              {/* Exams Done */}
              <View
                style={[
                  tw`flex-1 p-3.5 rounded-2xl`,
                  { backgroundColor: '#3b82f6' + '10' },
                ]}
              >
                <View style={tw`flex-row items-center gap-1.5 mb-1`}>
                  <Ionicons name="document-text" size={14} color="#3b82f6" />
                  <Text style={[tw`text-[11px] font-medium`, { color: '#3b82f6' }]}>Exams</Text>
                </View>
                <Text style={[tw`text-2xl font-bold`, { color: '#3b82f6' }]}>
                  {totalExamsAttempted}
                </Text>
                <Text style={[tw`text-[10px] mt-0.5`, { color: '#3b82f6', opacity: 0.7 }]}>
                  attempted
                </Text>
              </View>

              {/* Avg Score */}
              <View
                style={[
                  tw`flex-1 p-3.5 rounded-2xl`,
                  { backgroundColor: '#10b981' + '10' },
                ]}
              >
                <View style={tw`flex-row items-center gap-1.5 mb-1`}>
                  <Ionicons name="trending-up" size={14} color="#10b981" />
                  <Text style={[tw`text-[11px] font-medium`, { color: '#10b981' }]}>Average</Text>
                </View>
                <Text style={[tw`text-2xl font-bold`, { color: '#10b981' }]}>
                  {typeof averageScore === 'number' ? averageScore.toFixed(0) : '0'}
                  <Text style={[tw`text-xs font-medium`, { color: '#10b981' }]}>%</Text>
                </Text>
                <Text style={[tw`text-[10px] mt-0.5`, { color: '#10b981', opacity: 0.7 }]}>
                  score
                </Text>
              </View>
            </View>
          </View>

          {/* ─── Rank & XP ────────────────────────────── */}
          <TouchableOpacity
            style={tw`px-5 mb-5`}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ProfileTab', { screen: 'Leaderboard' })}
          >
            <View
              style={[
                tw`p-4 rounded-2xl`,
                { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
              ]}
            >
              <View style={tw`flex-row items-center justify-between mb-2.5`}>
                <View style={tw`flex-row items-center gap-2`}>
                  <Ionicons name="trophy" size={18} color={colors.primary} />
                  <Text style={[tw`text-base font-bold`, { color: colors.text }]}>{rank}</Text>
                </View>
                <View style={tw`flex-row items-center gap-1`}>
                  <Text style={[tw`text-sm font-bold`, { color: colors.primary }]}>{xp} XP</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </View>
              </View>
              {/* Progress bar */}
              <View
                style={[
                  tw`h-2 rounded-full overflow-hidden`,
                  { backgroundColor: colors.border },
                ]}
              >
                <View
                  style={[
                    tw`h-full rounded-full`,
                    { width: `${rankProgress * 100}%`, backgroundColor: colors.primary },
                  ]}
                />
              </View>
              <Text style={[tw`text-[11px] mt-1.5`, { color: colors.textSecondary }]}>
                {nextRank ? `${xpToNext} XP to ${nextRank}` : 'Max rank reached 🎉'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* ─── Go Premium banner ────────────────────── */}
          {!isPremium && (
            <TouchableOpacity
              style={tw`px-5 mb-5`}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Paywall')}
            >
              <View
                style={[
                  tw`flex-row items-center p-4 rounded-2xl`,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Ionicons name="diamond" size={22} color="#fff" />
                <View style={tw`flex-1 ml-3`}>
                  <Text style={tw`text-sm font-bold text-white`}>Go Premium</Text>
                  <Text style={tw`text-xs text-white opacity-90 mt-0.5`}>
                    Unlimited exams · all study material · ad-free
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
          )}

          {/* ─── Quick Actions ────────────────────────── */}
          <View style={tw`px-5 mb-6`}>
            <Text style={[tw`text-base font-bold mb-3`, { color: colors.text }]}>
              Quick Start
            </Text>
            <View style={tw`flex-row gap-2.5`}>
              <QuickActionTile
                icon="play-circle"
                label="Mock Test"
                subtitle="Full exam"
                colors={colors}
                primary
                onPress={() => navigation.navigate('ExamsTab')}
              />
              <QuickActionTile
                icon="flash"
                label="Practice"
                subtitle="Quick drill"
                colors={colors}
                accent={colors.primary}
                onPress={openPractice}
              />
              <QuickActionTile
                icon="time-outline"
                label="History"
                subtitle="Past attempts"
                colors={colors}
                onPress={() => navigation.navigate('ExamHistory')}
              />
            </View>
          </View>

          {/* ─── Active study plan ────────────────────── */}
          {studyPlanHighlight && (() => {
            const { total, completed, pct } = computePlanProgress(studyPlanHighlight);
            const nextMilestone = getNextMilestone(studyPlanHighlight);
            const daysLeft = studyPlanHighlight.endDate
              ? Math.max(0, Math.ceil((new Date(studyPlanHighlight.endDate) - new Date()) / 86400000))
              : null;

            return (
              <TouchableOpacity
                style={tw`px-5 mb-6`}
                activeOpacity={0.88}
                onPress={openStudyPlans}
              >
                <View
                  style={[
                    tw`p-4 rounded-2xl`,
                    { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
                  ]}
                >
                  <View style={tw`flex-row items-center justify-between mb-3`}>
                    <View style={tw`flex-row items-center gap-2`}>
                      <View
                        style={[
                          tw`w-9 h-9 rounded-xl items-center justify-center`,
                          { backgroundColor: '#3b82f6' + '18' },
                        ]}
                      >
                        <Ionicons name="calendar" size={18} color="#3b82f6" />
                      </View>
                      <View>
                        <Text style={[tw`text-[11px] font-semibold uppercase tracking-wide`, { color: '#3b82f6' }]}>
                          Study Plan
                        </Text>
                        <Text style={[tw`text-sm font-bold`, { color: colors.text }]} numberOfLines={1}>
                          {studyPlanHighlight.title}
                        </Text>
                      </View>
                    </View>
                    <View style={tw`items-end`}>
                      <Text style={[tw`text-lg font-bold`, { color: colors.primary }]}>{pct}%</Text>
                      {daysLeft != null && (
                        <Text style={[tw`text-[10px]`, { color: colors.textSecondary }]}>
                          {daysLeft === 0 ? 'Ends today' : `${daysLeft}d left`}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={[tw`h-2 rounded-full overflow-hidden mb-2`, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        tw`h-full rounded-full`,
                        { width: `${pct}%`, backgroundColor: colors.primary },
                      ]}
                    />
                  </View>

                  <View style={tw`flex-row items-center justify-between`}>
                    <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>
                      {completed} of {total} topics completed
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </View>

                  {nextMilestone && (
                    <View
                      style={[
                        tw`flex-row items-center gap-2 mt-3 pt-3`,
                        { borderTopWidth: 1, borderTopColor: colors.border },
                      ]}
                    >
                      <Ionicons name="flag-outline" size={14} color="#f59e0b" />
                      <Text style={[tw`text-xs flex-1`, { color: colors.textSecondary }]} numberOfLines={1}>
                        Next: <Text style={{ fontWeight: '600', color: colors.text }}>{nextMilestone.title}</Text>
                        {nextMilestone.targetDate ? ` · ${formatShortDate(nextMilestone.targetDate)}` : ''}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })()}

          {/* ─── Daily Insights ───────────────────────── */}
          {(wordOfDay || quote) && (
            <View style={tw`px-5 mb-6`}>
              <Text style={[tw`text-base font-bold mb-3`, { color: colors.text }]}>
                Daily Insights
              </Text>

              {wordOfDay && (
                <TouchableOpacity
                  style={[
                    tw`p-4 rounded-2xl mb-2.5 border`,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => wordOfDay?.word && navigation.navigate('WordOfDayDetail', { word: wordOfDay })}
                  activeOpacity={0.7}
                >
                  <View style={tw`flex-row items-center justify-between`}>
                    <View style={tw`flex-row items-center flex-1`}>
                      <View
                        style={[
                          tw`w-8 h-8 rounded-xl items-center justify-center mr-3`,
                          { backgroundColor: colors.primary + '12' },
                        ]}
                      >
                        <Text style={tw`text-base`}>📖</Text>
                      </View>
                      <View style={tw`flex-1`}>
                        <Text style={[tw`text-[11px] font-medium mb-0.5`, { color: colors.textSecondary }]}>
                          WORD OF THE DAY
                        </Text>
                        <Text style={[tw`text-base font-bold`, { color: colors.primary }]}>
                          {wordOfDay.word}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </View>
                  <Text
                    style={[tw`text-xs mt-2 ml-11 leading-4`, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {wordOfDay.meaning}
                  </Text>
                </TouchableOpacity>
              )}

              {quote && (
                <TouchableOpacity
                  style={[
                    tw`p-4 rounded-2xl border`,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => quote?.quote && navigation.navigate('QuoteDetail', { quote })}
                  activeOpacity={0.7}
                >
                  <View style={tw`flex-row items-start`}>
                    <View
                      style={[
                        tw`w-8 h-8 rounded-xl items-center justify-center mr-3 mt-0.5`,
                        { backgroundColor: '#f59e0b' + '12' },
                      ]}
                    >
                      <Text style={tw`text-base`}>💬</Text>
                    </View>
                    <View style={tw`flex-1`}>
                      <Text
                        style={[tw`text-sm italic leading-5`, { color: colors.text }]}
                        numberOfLines={3}
                      >
                        "{quote.quote}"
                      </Text>
                      {quote.author && (
                        <Text style={[tw`text-xs mt-1.5 font-medium`, { color: colors.textSecondary }]}>
                          — {quote.author}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ─── Categories ───────────────────────────── */}
          {stats?.categories?.length > 0 && (
            <View style={tw`mb-6`}>
              <SectionHeader
                title="Categories"
                onSeeAll={() => navigation.navigate('Categories')}
                colors={colors}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={tw`px-5`}
              >
                {stats.categories.slice(0, 6).map((category, index) => (
                  <TouchableOpacity
                    key={category._id}
                    style={[
                      tw`items-center mr-4`,
                      { width: 76 },
                    ]}
                    onPress={() => navigation.navigate('CategoryDetail', { categoryId: category._id })}
                    activeOpacity={0.7}
                  >
                    {category.logo ? (
                      <Image
                        source={{ uri: category.logo }}
                        style={[
                          tw`w-14 h-14 rounded-2xl mb-2`,
                          { backgroundColor: colors.surface },
                        ]}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          tw`w-14 h-14 rounded-2xl items-center justify-center mb-2`,
                          { backgroundColor: colors.primary + '10' },
                        ]}
                      >
                        <Ionicons name="book-outline" size={24} color={colors.primary} />
                      </View>
                    )}
                    <Text
                      style={[tw`text-[11px] font-medium text-center`, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {category.displayName || category.name}
                    </Text>
                    {category.examCount > 0 && (
                      <Text style={[tw`text-[10px] mt-0.5`, { color: colors.textSecondary }]}>
                        {category.examCount} exams
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ─── Test Series (featured banner) ────────── */}
          {testSeries.length > 0 && (() => {
            // Feature the first not-yet-enrolled series, else the first one.
            const featured = testSeries.find((s) => !s.isEnrolled) || testSeries[0];
            const paid = featured.accessType === 'paid' || featured.isPremium || featured.price > 0;
            const priceText = !paid
              ? 'Free'
              : `₹${featured.discountPrice && featured.discountPrice < featured.price ? featured.discountPrice : featured.price}`;
            const goDetail = () =>
              navigation.navigate('SeriesTab', {
                screen: 'TestSeriesDetail',
                params: { id: featured._id },
              });

            const Banner = ({ children }) =>
              featured.thumbnail ? (
                <ImageBackground
                  source={{ uri: featured.thumbnail }}
                  style={tw`w-full`}
                  imageStyle={tw`rounded-3xl`}
                >
                  <LinearGradient
                    colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.78)']}
                    style={tw`rounded-3xl p-5`}
                  >
                    {children}
                  </LinearGradient>
                </ImageBackground>
              ) : (
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={tw`rounded-3xl p-5`}
                >
                  {children}
                </LinearGradient>
              );

            return (
              <View style={tw`px-5 mb-6`}>
                {/* Header */}
                <View style={tw`flex-row items-center justify-between mb-3`}>
                  <View style={tw`flex-row items-center gap-2`}>
                    <Ionicons name="albums" size={18} color={colors.primary} />
                    <Text style={[tw`text-base font-bold`, { color: colors.text }]}>Test Series</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('SeriesTab', { screen: 'TestSeriesList' })}
                    hitSlop={8}
                  >
                    <Text style={[tw`text-sm font-semibold`, { color: colors.primary }]}>See all ›</Text>
                  </TouchableOpacity>
                </View>

                {/* Hero card */}
                <TouchableOpacity activeOpacity={0.9} onPress={goDetail}>
                  <View style={tw`rounded-3xl overflow-hidden`}>
                    <Banner>
                      {/* top row: type + enrolled */}
                      <View style={tw`flex-row items-center justify-between`}>
                        <View style={[tw`px-2.5 py-1 rounded-lg`, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                          <Text style={tw`text-[11px] font-bold text-white uppercase`}>
                            {featured.seriesType || 'mock'}
                          </Text>
                        </View>
                        {featured.isEnrolled && (
                          <View style={[tw`px-2.5 py-1 rounded-lg flex-row items-center gap-1`, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                            <Ionicons name="checkmark-circle" size={13} color="#fff" />
                            <Text style={tw`text-[11px] font-bold text-white`}>Enrolled</Text>
                          </View>
                        )}
                      </View>

                      {/* title */}
                      <Text style={tw`text-xl font-extrabold text-white mt-4`} numberOfLines={2}>
                        {featured.title}
                      </Text>

                      {/* meta */}
                      <View style={tw`flex-row items-center gap-4 mt-2`}>
                        <View style={tw`flex-row items-center gap-1`}>
                          <Ionicons name="document-text" size={14} color="rgba(255,255,255,0.9)" />
                          <Text style={[tw`text-xs`, { color: 'rgba(255,255,255,0.9)' }]}>{featured.totalTests || 0} tests</Text>
                        </View>
                        {featured.estimatedDuration ? (
                          <View style={tw`flex-row items-center gap-1`}>
                            <Ionicons name="time" size={14} color="rgba(255,255,255,0.9)" />
                            <Text style={[tw`text-xs`, { color: 'rgba(255,255,255,0.9)' }]}>{featured.estimatedDuration}h</Text>
                          </View>
                        ) : null}
                        {featured.enrollments ? (
                          <View style={tw`flex-row items-center gap-1`}>
                            <Ionicons name="people" size={14} color="rgba(255,255,255,0.9)" />
                            <Text style={[tw`text-xs`, { color: 'rgba(255,255,255,0.9)' }]}>{featured.enrollments}</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* CTA row */}
                      <View style={tw`flex-row items-center justify-between mt-5`}>
                        <Text style={tw`text-2xl font-extrabold text-white`}>{priceText}</Text>
                        <View style={tw`bg-white px-5 py-2.5 rounded-xl flex-row items-center gap-1.5`}>
                          <Text style={[tw`text-sm font-bold`, { color: colors.primary }]}>
                            {featured.isEnrolled ? 'Continue' : 'Enroll Now'}
                          </Text>
                          <Ionicons name="arrow-forward" size={15} color={colors.primary} />
                        </View>
                      </View>
                    </Banner>
                  </View>
                </TouchableOpacity>

                {/* tiny dots if more than one */}
                {testSeries.length > 1 && (
                  <View style={tw`flex-row justify-center gap-1.5 mt-3`}>
                    {testSeries.slice(0, 5).map((s, i) => (
                      <View
                        key={s._id}
                        style={[
                          tw`h-1.5 rounded-full`,
                          {
                            width: s._id === featured._id ? 16 : 6,
                            backgroundColor: s._id === featured._id ? colors.primary : colors.border,
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            );
          })()}

          {/* ─── Leaderboard snapshot ─────────────────── */}
          {leaderboard.top.length > 0 && (
            <View style={tw`px-5 mb-6`}>
              <View style={tw`flex-row items-center justify-between mb-3`}>
                <View style={tw`flex-row items-center gap-2`}>
                  <Ionicons name="trophy" size={18} color={colors.primary} />
                  <Text style={[tw`text-base font-bold`, { color: colors.text }]}>Leaderboard</Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ProfileTab', { screen: 'Leaderboard' })}
                  hitSlop={8}
                >
                  <Text style={[tw`text-sm font-semibold`, { color: colors.primary }]}>See all ›</Text>
                </TouchableOpacity>
              </View>

              <View style={[tw`rounded-2xl border overflow-hidden`, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {leaderboard.top.map((u, i) => {
                  const medal = ['#FFD700', '#C0C0C0', '#CD7F32'][i];
                  const isMe = leaderboard.me && String(u.userId) === String(leaderboard.me.userId);
                  return (
                    <View
                      key={String(u.userId)}
                      style={[
                        tw`flex-row items-center px-3 py-2.5`,
                        i < leaderboard.top.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                        isMe && { backgroundColor: colors.primary + '0d' },
                      ]}
                    >
                      <View style={tw`w-7 items-center`}>
                        <Ionicons name="medal" size={18} color={medal} />
                      </View>
                      <View style={[tw`w-8 h-8 rounded-full items-center justify-center mx-2`, { backgroundColor: colors.primary + '18' }]}>
                        <Text style={[tw`text-xs font-bold`, { color: colors.primary }]}>{getInitials(u.name)}</Text>
                      </View>
                      <Text style={[tw`flex-1 text-sm font-semibold`, { color: colors.text }]} numberOfLines={1}>
                        {u.name}{isMe ? ' (You)' : ''}
                      </Text>
                      <Text style={[tw`text-sm font-extrabold`, { color: colors.primary }]}>{u.xp} XP</Text>
                    </View>
                  );
                })}

                {/* Your rank if outside top 3 */}
                {leaderboard.me && leaderboard.me.position > 3 && (
                  <View style={[tw`flex-row items-center px-3 py-2.5`, { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.primary + '0d' }]}>
                    <Text style={[tw`w-7 text-center text-xs font-bold`, { color: colors.textSecondary }]}>
                      #{leaderboard.me.position}
                    </Text>
                    <View style={[tw`w-8 h-8 rounded-full items-center justify-center mx-2`, { backgroundColor: colors.primary }]}>
                      <Text style={tw`text-xs font-bold text-white`}>{getInitials(leaderboard.me.name)}</Text>
                    </View>
                    <Text style={[tw`flex-1 text-sm font-semibold`, { color: colors.text }]} numberOfLines={1}>
                      You
                    </Text>
                    <Text style={[tw`text-sm font-extrabold`, { color: colors.primary }]}>{leaderboard.me.xp} XP</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ─── Recent Results ────────────────────────── */}
          {recentResults.length > 0 && (
            <View style={tw`mb-6`}>
              <SectionHeader
                title="Recent Results"
                onSeeAll={() => navigation.navigate('ExamHistory')}
                colors={colors}
              />
              <View style={tw`px-5 gap-2`}>
                {recentResults.slice(0, 4).map((attempt) => {
                  const pct = attempt.percentage || 0;
                  const scoreColor = getScoreColor(pct);
                  const totalScore = attempt.totalScore || 0;
                  const totalMarks = attempt.exam?.totalMarks || 0;

                  return (
                    <TouchableOpacity
                      key={attempt._id}
                      style={[
                        tw`flex-row items-center p-3.5 rounded-2xl border`,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                      onPress={() => attempt._id && navigation.navigate('Result', { attemptId: attempt._id })}
                      activeOpacity={0.7}
                    >
                      {/* Score Circle */}
                      <View
                        style={[
                          tw`w-11 h-11 rounded-full items-center justify-center mr-3`,
                          { backgroundColor: scoreColor + '15' },
                        ]}
                      >
                        <Text style={[tw`text-sm font-bold`, { color: scoreColor }]}>
                          {pct.toFixed(0)}%
                        </Text>
                      </View>

                      {/* Info */}
                      <View style={tw`flex-1`}>
                        <Text
                          style={[tw`text-sm font-semibold`, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {attempt.exam?.title || 'Exam'}
                        </Text>
                        <View style={tw`flex-row items-center mt-0.5 gap-3`}>
                          <Text style={[tw`text-[11px]`, { color: colors.textSecondary }]}>
                            {totalScore}/{totalMarks}
                          </Text>
                          <Text style={[tw`text-[11px]`, { color: '#10b981' }]}>
                            ✓ {attempt.correctAnswers || 0}
                          </Text>
                          <Text style={[tw`text-[11px]`, { color: '#ef4444' }]}>
                            ✗ {attempt.incorrectAnswers || 0}
                          </Text>
                        </View>
                      </View>

                      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ─── New Exams ─────────────────────────────── */}
          {recentPublishedExams.length > 0 && (
            <View style={tw`mb-6`}>
              <SectionHeader
                title="New Exams"
                onSeeAll={() => navigation.navigate('ExamsTab')}
                colors={colors}
              />
              <View style={tw`px-5 gap-2.5`}>
                {recentPublishedExams.slice(0, 4).map((exam) => {
                  const status = getExamStatus(exam);
                  const statusColor = getStatusColor(status);
                  // "NEW" if published within the last 48h.
                  const isNew =
                    exam.publishedAt &&
                    Date.now() - new Date(exam.publishedAt).getTime() < 48 * 3600 * 1000;
                  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

                  return (
                    <TouchableOpacity
                      key={exam._id}
                      style={[
                        tw`flex-row items-stretch rounded-2xl border overflow-hidden`,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                      onPress={() => navigation.navigate('ExamDetail', { examId: exam._id })}
                      activeOpacity={0.8}
                    >
                      {/* Color accent bar */}
                      <View style={{ width: 4, backgroundColor: statusColor }} />

                      <View style={tw`flex-1 flex-row items-center p-3.5`}>
                        {/* Icon */}
                        <View
                          style={[
                            tw`w-11 h-11 rounded-xl items-center justify-center mr-3`,
                            { backgroundColor: statusColor + '15' },
                          ]}
                        >
                          <Ionicons
                            name={
                              status === 'available'
                                ? 'play'
                                : status === 'upcoming'
                                ? 'time'
                                : status === 'paused'
                                ? 'pause'
                                : 'document-text'
                            }
                            size={20}
                            color={statusColor}
                          />
                        </View>

                        {/* Info */}
                        <View style={tw`flex-1`}>
                          <View style={tw`flex-row items-center gap-2`}>
                            <Text
                              style={[tw`flex-1 text-[15px] font-bold`, { color: colors.text }]}
                              numberOfLines={1}
                            >
                              {exam.title}
                            </Text>
                            {isNew && (
                              <View style={[tw`px-1.5 py-0.5 rounded`, { backgroundColor: colors.primary }]}>
                                <Text style={tw`text-[9px] font-extrabold text-white`}>NEW</Text>
                              </View>
                            )}
                          </View>
                          <View style={tw`flex-row items-center mt-1 gap-1.5`}>
                            <Text style={[tw`text-[11px] font-semibold`, { color: colors.primary }]}>
                              {getCategoryName(exam.category)}
                            </Text>
                            {exam.duration ? (
                              <Text style={[tw`text-[11px]`, { color: colors.textSecondary }]}>
                                · {exam.duration}m
                              </Text>
                            ) : null}
                            {exam.totalMarks ? (
                              <Text style={[tw`text-[11px]`, { color: colors.textSecondary }]}>
                                · {exam.totalMarks} marks
                              </Text>
                            ) : null}
                          </View>
                        </View>

                        {/* Status + chevron */}
                        <View style={tw`items-end ml-2`}>
                          <View
                            style={[
                              tw`px-2 py-0.5 rounded-md mb-1`,
                              { backgroundColor: statusColor + '15' },
                            ]}
                          >
                            <Text style={[tw`text-[10px] font-bold`, { color: statusColor }]}>
                              {statusLabel}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ─── Empty State ──────────────────────────── */}
          {!loading && !recentResults.length && !recentPublishedExams.length && !stats?.categories?.length && (
            <View style={tw`items-center px-10 py-16`}>
              <View
                style={[
                  tw`w-16 h-16 rounded-full items-center justify-center mb-4`,
                  { backgroundColor: colors.primary + '10' },
                ]}
              >
                <Ionicons name="rocket-outline" size={32} color={colors.primary} />
              </View>
              <Text style={[tw`text-lg font-bold mb-1 text-center`, { color: colors.text }]}>
                Let's get started!
              </Text>
              <Text style={[tw`text-sm text-center mb-5`, { color: colors.textSecondary }]}>
                Browse available exams and start your preparation journey.
              </Text>
              <TouchableOpacity
                style={[tw`px-6 py-3 rounded-2xl`, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('ExamsTab')}
                activeOpacity={0.7}
              >
                <Text style={tw`text-sm font-semibold text-white`}>Browse Exams</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}

// ─── Section Header Component ────────────────────────────
function QuickActionTile({ icon, label, subtitle, colors, primary, accent, onPress }) {
  const iconColor = primary ? '#fff' : accent || colors.text;
  const bg = primary ? colors.primary : colors.surface;
  const border = primary ? colors.primary : colors.border;

  return (
    <TouchableOpacity
      style={[
        tw`flex-1 items-center py-3.5 px-2 rounded-2xl`,
        {
          backgroundColor: bg,
          borderWidth: primary ? 0 : 1,
          borderColor: border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={[
          tw`w-10 h-10 rounded-xl items-center justify-center mb-2`,
          { backgroundColor: primary ? 'rgba(255,255,255,0.2)' : (accent || colors.primary) + '14' },
        ]}
      >
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text
        style={[
          tw`text-xs font-bold text-center`,
          { color: primary ? '#fff' : colors.text },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={[
          tw`text-[10px] text-center mt-0.5`,
          { color: primary ? 'rgba(255,255,255,0.85)' : colors.textSecondary },
        ]}
        numberOfLines={1}
      >
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ title, onSeeAll, colors }) {
  return (
    <View style={tw`flex-row justify-between items-center px-5 mb-3`}>
      <Text style={[tw`text-base font-bold`, { color: colors.text }]}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={[tw`text-xs font-semibold`, { color: colors.primary }]}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}





// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   ActivityIndicator,
//   RefreshControl,
//   Image,
//   Dimensions,
// } from 'react-native';
// import { useTheme } from '../context/ThemeContext';
// import { useAuth } from '../context/AuthContext';
// import api from '../services/api';
// import { Ionicons } from '@expo/vector-icons';
// import { LinearGradient } from 'expo-linear-gradient';
// import ScreenWrapper from '../components/ScreenWrapper';

// const { width } = Dimensions.get('window');

// export default function DashboardScreen({ navigation }) {
//   const { colors, isDark } = useTheme();
//   const { user } = useAuth();
//   const [stats, setStats] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [wordOfDay, setWordOfDay] = useState(null);
//   const [quote, setQuote] = useState(null);
//   const [recentResults, setRecentResults] = useState([]);
//   const [recentPublishedExams, setRecentPublishedExams] = useState([]);

//   useEffect(() => {
//     fetchDashboardData();
//   }, []);

//   const fetchDashboardData = async () => {
//     try {
//       setLoading(true);

//       // Fetch all endpoints, but handle failures gracefully
//       const promises = [
//         api.get('/user/dashboard-stats').catch(err => {
//           console.warn('Failed to fetch dashboard-stats:', err);
//           return { data: null };
//         }),
//         api.get('/user/word-of-day').catch(err => {
//           console.warn('Failed to fetch word-of-day:', err);
//           return { data: null };
//         }),
//         api.get('/user/motivational-quote').catch(err => {
//           console.warn('Failed to fetch motivational-quote:', err);
//           return { data: null };
//         }),
//         api.get('/user/exams').catch(err => {
//           console.warn('Failed to fetch exams:', err);
//           return { data: { exams: [] } };
//         }),
//       ];

//       const [statsRes, wordRes, quoteRes, examsRes] = await Promise.all(promises);

//       // Set stats if available
//       if (statsRes.data) {
//         setStats(statsRes.data);

//         // Use recentExamResults from dashboard-stats (matches web frontend)
//         const recentResultsData = statsRes.data?.recentExamResults || [];
//         setRecentResults(recentResultsData.slice(0, 5));

//         // Use todaysPublishedExams from dashboard-stats if available
//         const publishedExams = statsRes.data?.todaysPublishedExams || [];
//         setRecentPublishedExams(publishedExams.slice(0, 5));
//       } else {
//         // Fallback: try to get recent results from exams endpoint
//         const allExams = examsRes.data?.exams || [];
//         const attemptedExams = allExams
//           .filter(exam => exam.isAttempted)
//           .sort((a, b) => {
//             const dateA = new Date(a.updatedAt || a.createdAt || 0);
//             const dateB = new Date(b.updatedAt || b.createdAt || 0);
//             return dateB - dateA;
//           })
//           .slice(0, 5);
//         setRecentResults(attemptedExams);

//         // Get published exams
//         const publishedExams = allExams
//           .filter(exam => !exam.isAttempted && exam.status === 'active')
//           .slice(0, 5);
//         setRecentPublishedExams(publishedExams);
//       }

//       // Set word of day if available
//       if (wordRes.data) {
//         const wordData = wordRes.data?.wordOfDay || wordRes.data?.word || wordRes.data;
//         setWordOfDay(wordData);
//       }

//       // Set quote if available
//       if (quoteRes.data) {
//         const quoteData = quoteRes.data?.quote || quoteRes.data?.motivationalQuote || quoteRes.data;
//         setQuote(quoteData);
//       }
//     } catch (error) {
//       console.error('Failed to fetch dashboard data:', error);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   const onRefresh = () => {
//     setRefreshing(true);
//     fetchDashboardData();
//   };

//   const getExamStatus = (exam) => {
//     const now = new Date();

//     // Parse scheduledTime
//     let scheduledTime;
//     if (typeof exam.scheduledTime === 'string') {
//       scheduledTime = new Date(exam.scheduledTime);
//     } else if (typeof exam.scheduledTime === 'number') {
//       scheduledTime = new Date(exam.scheduledTime);
//     } else {
//       scheduledTime = new Date(exam.scheduledTime);
//     }

//     // Validate scheduledTime
//     if (isNaN(scheduledTime.getTime())) {
//       return 'available';
//     }

//     // Handle expiresAt
//     let expiresAt = null;
//     if (exam.expiresAt !== null && exam.expiresAt !== undefined && exam.expiresAt !== '') {
//       if (typeof exam.expiresAt === 'string') {
//         expiresAt = new Date(exam.expiresAt);
//       } else if (typeof exam.expiresAt === 'number') {
//         expiresAt = new Date(exam.expiresAt);
//       } else {
//         expiresAt = new Date(exam.expiresAt);
//       }
//       if (isNaN(expiresAt.getTime())) {
//         expiresAt = null;
//       }
//     }

//     // Check if exam is already completed
//     if (exam.isAttempted) return 'completed';

//     // Check if exam is paused
//     if (exam.isPaused) return 'paused';

//     // Check if exam hasn't started yet
//     if (now < scheduledTime) {
//       return 'upcoming';
//     }

//     // Check if exam has expired
//     if (expiresAt && !isNaN(expiresAt.getTime()) && now > expiresAt) {
//       return 'expired';
//     }

//     // If exam has started and not expired, it's available
//     if (now >= scheduledTime) {
//       return 'available';
//     }

//     return 'available';
//   };

//   const formatDate = (dateString) => {
//     if (!dateString) return '';
//     const date = new Date(dateString);
//     if (isNaN(date.getTime())) return '';

//     const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
//     const month = months[date.getMonth()];
//     const day = date.getDate();
//     const year = date.getFullYear();
//     const hours = date.getHours().toString().padStart(2, '0');
//     const minutes = date.getMinutes().toString().padStart(2, '0');

//     return `${month} ${day}, ${year} ${hours}:${minutes}`;
//   };

//   const styles = createStyles(colors, isDark);

//   if (loading && !stats) {
//     return (
//       <View style={styles.container}>
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color={colors.primary} />
//         </View>
//       </View>
//     );
//   }

//   return (
//     <ScreenWrapper>
//       <View style={styles.container}>
//         <ScrollView
//           style={styles.scrollView}
//           contentContainerStyle={styles.scrollContent}
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               tintColor={colors.primary}
//             />
//           }
//           showsVerticalScrollIndicator={false}
//         >
//           {/* Hero Header */}
//           <View style={styles.heroSection}>
//             <View style={styles.heroContent}>
//               <Text style={styles.greeting}>Welcome back,</Text>
//               <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'User'}! 👋</Text>
//               <Text style={styles.heroSubtitle}>Ready to ace your exams today?</Text>
//             </View>
//             <View style={styles.heroIcon}>
//               <Ionicons name="trophy" size={40} color={colors.primary} />
//             </View>
//           </View>

//           {/* Streak Card */}
//           {stats?.streak && (() => {
//             const currentStreak = stats.streak.currentStreak || 0;
//             const longestStreak = stats.streak.longestStreak || 0;
//             const totalStudyDays = stats.streak.totalStudyDays || 0;

//             // Calculate next milestone
//             const milestones = [1, 3, 7, 14, 30, 60, 100, 200, 300, 365];
//             const nextMilestone = milestones.find(m => m > currentStreak) || null;
//             const progressToNext = nextMilestone ? Math.min((currentStreak / nextMilestone) * 100, 100) : 100;

//             return (
//               <View style={styles.streakCard}>
//                 <LinearGradient
//                   colors={[colors.primary, colors.primaryDark || '#15803d']}
//                   start={{ x: 0, y: 0 }}
//                   end={{ x: 1, y: 1 }}
//                   style={styles.streakGradient}
//                 >
//                   <View style={styles.streakContent}>
//                     <View style={styles.streakLeft}>
//                       <View style={styles.streakIconContainer}>
//                         <Ionicons name="flame" size={40} color="#FFFFFF" />
//                       </View>
//                       <View style={styles.streakTextContainer}>
//                         <Text style={styles.streakSubLabel}>Study Streak</Text>
//                         <View style={styles.streakNumberContainer}>
//                           <Text style={styles.streakNumber}>{currentStreak}</Text>
//                           <Text style={styles.streakDaysLabel}>days</Text>
//                         </View>
//                       </View>
//                     </View>
//                     {longestStreak > 0 && (
//                       <View style={styles.streakRight}>
//                         <Text style={styles.streakBestLabel}>Longest</Text>
//                         <View style={styles.streakBestContainer}>
//                           <Ionicons name="trophy" size={18} color="#FFFFFF" />
//                           <Text style={styles.streakBestNumber}>{longestStreak}</Text>
//                         </View>
//                       </View>
//                     )}
//                   </View>

//                   {/* Next Milestone Progress */}
//                   {nextMilestone && (
//                     <View style={styles.streakProgressContainer}>
//                       <View style={styles.streakProgressHeader}>
//                         <Text style={styles.streakProgressLabel}>Next: {nextMilestone} days</Text>
//                         <Text style={styles.streakProgressPercent}>{Math.round(progressToNext)}%</Text>
//                       </View>
//                       <View style={styles.streakProgressBar}>
//                         <View
//                           style={[
//                             styles.streakProgressFill,
//                             { width: `${progressToNext}%` }
//                           ]}
//                         />
//                       </View>
//                     </View>
//                   )}

//                   {/* Total Study Days */}
//                   {totalStudyDays > 0 && (
//                     <View style={styles.streakFooter}>
//                       <Ionicons name="calendar-outline" size={14} color="#FFFFFF" style={{ opacity: 0.9 }} />
//                       <Text style={styles.streakFooterText}>
//                         {totalStudyDays} total study {totalStudyDays === 1 ? 'day' : 'days'}
//                       </Text>
//                     </View>
//                   )}
//                 </LinearGradient>
//               </View>
//             );
//           })()}

//           {/* Daily Content - Word of Day and Quote */}
//           <View style={styles.dailyContentRow}>
//             {wordOfDay && (
//               <TouchableOpacity
//                 style={styles.dailyCard}
//                 onPress={() => {
//                   console.log('Navigating with wordOfDay:', wordOfDay);
//                   if (wordOfDay && wordOfDay.word) {
//                     navigation.navigate('WordOfDayDetail', { word: wordOfDay });
//                   } else {
//                     console.log('WordOfDay is missing or invalid:', wordOfDay);
//                   }
//                 }}
//                 activeOpacity={0.7}
//               >
//                 <View style={styles.dailyCardHeader}>
//                   <View style={styles.dailyIconContainer}>
//                     <Ionicons name="book" size={20} color={colors.primary} />
//                   </View>
//                   <Text style={styles.dailyCardTitle}>Word of Day</Text>
//                   <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
//                 </View>
//                 <Text style={styles.wordText}>{wordOfDay.word}</Text>
//                 <Text style={styles.wordMeaning} numberOfLines={2}>
//                   {wordOfDay.meaning}
//                 </Text>
//               </TouchableOpacity>
//             )}

//             {quote && (
//               <TouchableOpacity
//                 style={styles.dailyCard}
//                 onPress={() => {
//                   if (quote && quote.quote) {
//                     navigation.navigate('QuoteDetail', { quote });
//                   }
//                 }}
//                 activeOpacity={0.7}
//               >
//                 <View style={styles.dailyCardHeader}>
//                   <View style={styles.dailyIconContainer}>
//                     <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
//                   </View>
//                   <Text style={styles.dailyCardTitle}>Daily Quote</Text>
//                   <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
//                 </View>
//                 <Text style={styles.quoteText} numberOfLines={3}>
//                   "{quote.quote}"
//                 </Text>
//                 {quote.author && (
//                   <Text style={styles.quoteAuthor}>— {quote.author}</Text>
//                 )}
//               </TouchableOpacity>
//             )}
//           </View>

//           {/* Categories Section */}
//           {stats?.categories && stats.categories.length > 0 && (
//             <View style={styles.section}>
//               <View style={styles.sectionHeader}>
//                 <Text style={styles.sectionTitle}>Categories</Text>
//                 <TouchableOpacity
//                   onPress={() => navigation.navigate('Categories')}
//                 >
//                   <Text style={styles.seeAll}>See All →</Text>
//                 </TouchableOpacity>
//               </View>
//               <ScrollView
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 contentContainerStyle={styles.categoriesContainer}
//               >
//                 {stats.categories.slice(0, 5).map((category, index) => (
//                   <TouchableOpacity
//                     key={category._id}
//                     style={[
//                       styles.categoryCard,
//                       index === 0 && styles.categoryCardFirst,
//                     ]}
//                     onPress={() => {
//                       navigation.navigate('CategoryDetail', { categoryId: category._id });
//                     }}
//                   >
//                     {category.logo ? (
//                       <Image
//                         source={{ uri: category.logo }}
//                         style={styles.categoryLogo}
//                         resizeMode="cover"
//                       />
//                     ) : (
//                       <View style={styles.categoryIconContainer}>
//                         <Ionicons name="book" size={36} color={colors.primary} />
//                       </View>
//                     )}
//                     <Text style={styles.categoryName} numberOfLines={2}>
//                       {category.displayName || category.name}
//                     </Text>
//                     {category.examCount > 0 && (
//                       <View style={styles.categoryBadge}>
//                         <Text style={styles.categoryBadgeText}>
//                           {category.examCount} {category.examCount === 1 ? 'exam' : 'exams'}
//                         </Text>
//                       </View>
//                     )}


//                   </TouchableOpacity>
//                 ))}
//               </ScrollView>
//             </View>
//           )}

//           {/* Recent Exam Results */}
//           {recentResults.length > 0 && (
//             <View style={styles.section}>
//               <View style={styles.sectionHeader}>
//                 <Text style={styles.sectionTitle}>Recent Results</Text>
//                 <TouchableOpacity onPress={() => navigation.navigate('ExamHistory')}>
//                   <Text style={styles.seeAll}>See All →</Text>
//                 </TouchableOpacity>
//               </View>
//               <ScrollView
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 contentContainerStyle={styles.horizontalScrollContainer}
//               >
//                 {recentResults.map((attempt, index) => {
//                   // Use percentage from attempt (already calculated by backend)
//                   const percentage = attempt.percentage || 0;
//                   const totalScore = attempt.totalScore || 0;
//                   const totalMarks = attempt.exam?.totalMarks || 0;

//                   const getScoreColor = () => {
//                     if (percentage >= 70) return ['#10b981', '#059669']; // green
//                     if (percentage >= 50) return ['#f59e0b', '#d97706']; // yellow
//                     return ['#ef4444', '#dc2626']; // red
//                   };
//                   const scoreColors = getScoreColor();

//                   return (
//                     <TouchableOpacity
//                       key={attempt._id}
//                       style={[
//                         styles.resultCard,
//                         index === 0 && styles.resultCardFirst,
//                       ]}
//                       onPress={() => {
//                         if (attempt._id) {
//                           navigation.navigate('Result', { attemptId: attempt._id });
//                         }
//                       }}
//                       activeOpacity={0.7}
//                     >
//                       <LinearGradient
//                         colors={scoreColors}
//                         start={{ x: 0, y: 0 }}
//                         end={{ x: 1, y: 0 }}
//                         style={styles.resultTopBar}
//                       />
//                       <View style={styles.resultCardContent}>
//                         <View style={styles.resultCardHeader}>
//                           <Text style={styles.resultCardTitle} numberOfLines={2}>
//                             {attempt.exam?.title || 'Exam'}
//                           </Text>
//                           <View style={[
//                             styles.resultBadge,
//                             percentage >= 70 && styles.resultBadgeSuccess,
//                             percentage >= 50 && percentage < 70 && styles.resultBadgeWarning,
//                             percentage < 50 && styles.resultBadgeDanger,
//                           ]}>
//                             <Text style={[
//                               styles.resultBadgeText,
//                               percentage >= 70 && { color: '#10b981' },
//                               percentage >= 50 && percentage < 70 && { color: '#f59e0b' },
//                               percentage < 50 && { color: '#ef4444' },
//                             ]}>{percentage.toFixed(1)}%</Text>
//                           </View>
//                         </View>
//                         {attempt.exam?.category && (
//                           <Text style={styles.resultCategory} numberOfLines={1}>
//                             {attempt.exam.category.name || attempt.exam.category.displayName || 'General'}
//                             {attempt.exam.subCategory && ` → ${attempt.exam.subCategory.name}`}
//                             {attempt.exam.tier && ` → ${attempt.exam.tier.name}`}
//                           </Text>
//                         )}
//                         <View style={styles.resultStatsContainer}>
//                           <View style={styles.resultStatRow}>
//                             <Text style={styles.resultStatLabel}>Score</Text>
//                             <Text style={styles.resultStatValue}>
//                               {totalScore} / {totalMarks}
//                             </Text>
//                           </View>
//                           <View style={styles.resultStatRow}>
//                             <Text style={styles.resultStatLabel}>Correct</Text>
//                             <Text style={[styles.resultStatValue, { color: '#10b981' }]}>
//                               {attempt.correctAnswers || 0}
//                             </Text>
//                           </View>
//                           <View style={styles.resultStatRow}>
//                             <Text style={styles.resultStatLabel}>Incorrect</Text>
//                             <Text style={[styles.resultStatValue, { color: '#ef4444' }]}>
//                               {attempt.incorrectAnswers || 0}
//                             </Text>
//                           </View>
//                         </View>
//                       </View>
//                     </TouchableOpacity>
//                   );
//                 })}
//               </ScrollView>
//             </View>
//           )}

//           {/* Recent Published Exams */}
//           {recentPublishedExams.length > 0 && (
//             <View style={styles.section}>
//               <View style={styles.sectionHeader}>
//                 <Text style={styles.sectionTitle}>New Exams</Text>
//                 <TouchableOpacity onPress={() => navigation.navigate('Exams')}>
//                   <Text style={styles.seeAll}>See All →</Text>
//                 </TouchableOpacity>
//               </View>
//               <ScrollView
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 contentContainerStyle={styles.horizontalScrollContainer}
//               >
//                 {recentPublishedExams.map((exam, index) => {
//                   const status = getExamStatus(exam);
//                   const statusText = status.charAt(0).toUpperCase() + status.slice(1);

//                   return (
//                     <TouchableOpacity
//                       key={exam._id}
//                       style={[
//                         styles.newExamCard,
//                         index === 0 && styles.newExamCardFirst,
//                       ]}
//                       onPress={() => {
//                         navigation.navigate('ExamDetail', { examId: exam._id });
//                       }}
//                       activeOpacity={0.7}
//                     >
//                       <View style={styles.newExamLeftBorder} />
//                       <View style={styles.newExamCardContent}>
//                         <View style={styles.newExamCardHeader}>
//                           <Text style={styles.newExamCardTitle} numberOfLines={2}>
//                             {exam.title}
//                           </Text>
//                           <View style={[
//                             styles.newExamBadge,
//                             status === 'available' && styles.newExamBadgeAvailable,
//                             status === 'completed' && styles.newExamBadgeCompleted,
//                             status === 'upcoming' && styles.newExamBadgeUpcoming,
//                             status === 'paused' && styles.newExamBadgePaused,
//                             status === 'expired' && styles.newExamBadgeExpired,
//                           ]}>
//                             <Text style={[
//                               styles.newExamBadgeText,
//                               status === 'available' && { color: colors.primary },
//                               status === 'completed' && { color: colors.textSecondary },
//                               status === 'upcoming' && { color: '#f59e0b' },
//                               status === 'paused' && { color: colors.primary },
//                               status === 'expired' && { color: '#6b7280' },
//                             ]}>{statusText}</Text>
//                           </View>
//                         </View>
//                         {exam.category && (
//                           <Text style={styles.newExamCategory} numberOfLines={1}>
//                             {exam.category?.name || exam.category?.displayName || 'General'}
//                             {exam.subCategory && ` → ${exam.subCategory.name}`}
//                             {exam.tier && ` → ${exam.tier.name}`}
//                           </Text>
//                         )}
//                         <View style={styles.newExamDetailsContainer}>
//                           {exam.scheduledTime && (
//                             <View style={styles.newExamDetailRow}>
//                               <Ionicons name="calendar-outline" size={14} color={colors.primary} />
//                               <Text style={styles.newExamDetailText}>
//                                 {formatDate(exam.scheduledTime)}
//                               </Text>
//                             </View>
//                           )}
//                           <View style={styles.newExamDetailRow}>
//                             {exam.duration && (
//                               <>
//                                 <Ionicons name="time-outline" size={14} color="#10b981" />
//                                 <Text style={styles.newExamDetailText}>{exam.duration} min</Text>
//                               </>
//                             )}
//                             {exam.totalMarks && (
//                               <>
//                                 <Ionicons name="trophy-outline" size={14} color="#22c55e" style={{ marginLeft: 12 }} />
//                                 <Text style={styles.newExamDetailText}>{exam.totalMarks} marks</Text>
//                               </>
//                             )}
//                           </View>
//                         </View>
//                       </View>
//                     </TouchableOpacity>
//                   );
//                 })}
//               </ScrollView>
//             </View>
//           )}

//           <View style={{ height: 20 }} />
//         </ScrollView>
//       </View>
//     </ScreenWrapper>
//   );
// }

// const createStyles = (colors, isDark) =>
//   StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: colors.background,
//     },
//     scrollView: {
//       flex: 1,
//     },
//     scrollContent: {
//       paddingBottom: 100,
//     },
//     loadingContainer: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     heroSection: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       paddingHorizontal: 20,
//       marginBottom: 24,
//     },
//     heroContent: {
//       flex: 1,
//     },
//     greeting: {
//       fontSize: 16,
//       color: colors.textSecondary,
//       marginBottom: 4,
//       fontWeight: '500',
//     },
//     userName: {
//       fontSize: 32,
//       fontWeight: 'bold',
//       color: colors.text,
//       marginBottom: 8,
//       letterSpacing: -0.5,
//     },
//     heroSubtitle: {
//       fontSize: 15,
//       color: colors.textSecondary,
//       fontWeight: '500',
//     },
//     heroIcon: {
//       width: 60,
//       height: 60,
//       borderRadius: 30,
//       backgroundColor: colors.primary + '20',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     streakCard: {
//       marginHorizontal: 20,
//       marginBottom: 24,
//       borderRadius: 24,
//       overflow: 'hidden',
//       shadowColor: colors.primary,
//       shadowOffset: { width: 0, height: 8 },
//       shadowOpacity: 0.3,
//       shadowRadius: 16,
//       elevation: 8,
//     },
//     streakGradient: {
//       padding: 20,
//       borderRadius: 24,
//     },
//     streakContent: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       marginBottom: 12,
//     },
//     streakLeft: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       flex: 1,
//     },
//     streakIconContainer: {
//       marginRight: 12,
//       backgroundColor: 'rgba(255, 255, 255, 0.2)',
//       borderRadius: 20,
//       padding: 10,
//     },
//     streakTextContainer: {
//       justifyContent: 'center',
//     },
//     streakSubLabel: {
//       fontSize: 12,
//       color: '#FFFFFF',
//       opacity: 0.9,
//       marginBottom: 4,
//       fontWeight: '500',
//     },
//     streakNumberContainer: {
//       flexDirection: 'row',
//       alignItems: 'baseline',
//       gap: 6,
//     },
//     streakNumber: {
//       fontSize: 32,
//       fontWeight: 'bold',
//       color: '#FFFFFF',
//     },
//     streakDaysLabel: {
//       fontSize: 14,
//       color: '#FFFFFF',
//       opacity: 0.85,
//       fontWeight: '500',
//     },
//     streakRight: {
//       alignItems: 'flex-end',
//     },
//     streakBestLabel: {
//       fontSize: 11,
//       color: '#FFFFFF',
//       opacity: 0.9,
//       marginBottom: 4,
//       fontWeight: '500',
//     },
//     streakBestContainer: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 4,
//     },
//     streakBestNumber: {
//       fontSize: 20,
//       fontWeight: 'bold',
//       color: '#FFFFFF',
//     },
//     streakProgressContainer: {
//       marginTop: 12,
//       paddingTop: 12,
//       borderTopWidth: 1,
//       borderTopColor: 'rgba(255, 255, 255, 0.2)',
//     },
//     streakProgressHeader: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       marginBottom: 8,
//     },
//     streakProgressLabel: {
//       fontSize: 11,
//       color: '#FFFFFF',
//       opacity: 0.9,
//       fontWeight: '500',
//     },
//     streakProgressPercent: {
//       fontSize: 11,
//       color: '#FFFFFF',
//       opacity: 0.9,
//       fontWeight: '600',
//     },
//     streakProgressBar: {
//       width: '100%',
//       height: 6,
//       backgroundColor: 'rgba(255, 255, 255, 0.2)',
//       borderRadius: 3,
//       overflow: 'hidden',
//     },
//     streakProgressFill: {
//       height: '100%',
//       backgroundColor: '#FFFFFF',
//       borderRadius: 3,
//     },
//     streakFooter: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginTop: 12,
//       paddingTop: 12,
//       borderTopWidth: 1,
//       borderTopColor: 'rgba(255, 255, 255, 0.2)',
//       gap: 6,
//     },
//     streakFooterText: {
//       fontSize: 11,
//       color: '#FFFFFF',
//       opacity: 0.9,
//       fontWeight: '500',
//     },
//     dailyContentRow: {
//       flexDirection: 'row',
//       paddingHorizontal: 20,
//       marginBottom: 24,
//       gap: 12,
//     },
//     dailyCard: {
//       flex: 1,
//       backgroundColor: colors.surface,
//       borderRadius: 20,
//       padding: 18,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     dailyCardHeader: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginBottom: 12,
//     },
//     dailyIconContainer: {
//       width: 32,
//       height: 32,
//       borderRadius: 16,
//       backgroundColor: colors.primary + '15',
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginRight: 10,
//     },
//     dailyCardTitle: {
//       fontSize: 13,
//       fontWeight: '700',
//       color: colors.text,
//       textTransform: 'uppercase',
//       letterSpacing: 0.5,
//     },
//     wordText: {
//       fontSize: 20,
//       fontWeight: 'bold',
//       color: colors.primary,
//       marginBottom: 6,
//     },
//     wordMeaning: {
//       fontSize: 13,
//       color: colors.text,
//       lineHeight: 18,
//     },
//     quoteText: {
//       fontSize: 14,
//       color: colors.text,
//       lineHeight: 20,
//       marginBottom: 8,
//       fontStyle: 'italic',
//     },
//     quoteAuthor: {
//       fontSize: 12,
//       color: colors.textSecondary,
//       fontWeight: '600',
//     },
//     section: {
//       marginBottom: 28,
//     },
//     sectionHeader: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       paddingHorizontal: 20,
//       marginBottom: 16,
//     },
//     sectionTitle: {
//       fontSize: 22,
//       fontWeight: 'bold',
//       color: colors.text,
//       letterSpacing: -0.5,
//     },
//     seeAll: {
//       fontSize: 15,
//       color: colors.primary,
//       fontWeight: '600',
//     },
//     categoriesContainer: {
//       paddingLeft: 20,
//       paddingRight: 20,
//     },
//     categoryCard: {
//       width: 160,
//       backgroundColor: colors.surface,
//       borderRadius: 20,
//       padding: 18,
//       marginRight: 12,
//       alignItems: 'center',
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     categoryCardFirst: {
//       marginLeft: 0,
//     },
//     categoryLogo: {
//       width: 56,
//       height: 56,
//       borderRadius: 16,
//       marginBottom: 12,
//     },
//     categoryIconContainer: {
//       width: 56,
//       height: 56,
//       borderRadius: 16,
//       backgroundColor: colors.primary + '15',
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginBottom: 12,
//     },
//     categoryName: {
//       fontSize: 15,
//       fontWeight: '700',
//       color: colors.text,
//       textAlign: 'center',
//       marginBottom: 8,
//     },
//     categoryBadge: {
//       backgroundColor: colors.primary + '15',
//       paddingHorizontal: 10,
//       paddingVertical: 4,
//       borderRadius: 12,
//     },
//     categoryBadgeText: {
//       fontSize: 11,
//       color: colors.primary,
//       fontWeight: '600',
//     },
//     horizontalScrollContainer: {
//       paddingLeft: 20,
//       paddingRight: 20,
//     },
//     // Recent Results Card Styles
//     resultCard: {
//       width: 280,
//       backgroundColor: colors.card,
//       borderRadius: 16,
//       marginRight: 12,
//       overflow: 'hidden',
//       borderWidth: 1,
//       borderColor: colors.border,
//       shadowColor: '#000',
//       shadowOffset: { width: 0, height: 2 },
//       shadowOpacity: 0.1,
//       shadowRadius: 8,
//       elevation: 3,
//     },
//     resultCardFirst: {
//       marginLeft: 0,
//     },
//     resultTopBar: {
//       height: 4,
//       width: '100%',
//     },
//     resultCardContent: {
//       padding: 16,
//     },
//     resultCardHeader: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'flex-start',
//       marginBottom: 8,
//       gap: 8,
//     },
//     resultCardTitle: {
//       flex: 1,
//       fontSize: 14,
//       fontWeight: 'bold',
//       color: colors.text,
//       lineHeight: 20,
//     },
//     resultBadge: {
//       paddingHorizontal: 8,
//       paddingVertical: 4,
//       borderRadius: 12,
//       minWidth: 50,
//       alignItems: 'center',
//     },
//     resultBadgeSuccess: {
//       backgroundColor: '#10b981' + '20',
//     },
//     resultBadgeWarning: {
//       backgroundColor: '#f59e0b' + '20',
//     },
//     resultBadgeDanger: {
//       backgroundColor: '#ef4444' + '20',
//     },
//     resultBadgeText: {
//       fontSize: 12,
//       fontWeight: 'bold',
//     },
//     resultCategory: {
//       fontSize: 12,
//       color: colors.textSecondary,
//       marginBottom: 12,
//     },
//     resultStatsContainer: {
//       backgroundColor: colors.surface,
//       borderRadius: 12,
//       padding: 12,
//       gap: 8,
//     },
//     resultStatRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     resultStatLabel: {
//       fontSize: 11,
//       color: colors.textSecondary,
//       fontWeight: '600',
//     },
//     resultStatValue: {
//       fontSize: 11,
//       fontWeight: 'bold',
//       color: colors.text,
//     },
//     // New Exams Card Styles
//     newExamCard: {
//       width: 280,
//       backgroundColor: colors.card,
//       borderRadius: 12,
//       marginRight: 12,
//       overflow: 'hidden',
//       borderWidth: 1,
//       borderColor: colors.border,
//       shadowColor: '#000',
//       shadowOffset: { width: 0, height: 1 },
//       shadowOpacity: 0.08,
//       shadowRadius: 4,
//       elevation: 2,
//       flexDirection: 'row',
//     },
//     newExamCardFirst: {
//       marginLeft: 0,
//     },
//     newExamLeftBorder: {
//       width: 4,
//       backgroundColor: colors.primary,
//     },
//     newExamCardContent: {
//       flex: 1,
//       padding: 16,
//     },
//     newExamCardHeader: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'flex-start',
//       marginBottom: 8,
//       gap: 8,
//     },
//     newExamCardTitle: {
//       flex: 1,
//       fontSize: 14,
//       fontWeight: '600',
//       color: colors.text,
//       lineHeight: 20,
//     },
//     newExamBadge: {
//       paddingHorizontal: 6,
//       paddingVertical: 4,
//       borderRadius: 12,
//       minWidth: 60,
//       alignItems: 'center',
//     },
//     newExamBadgeAvailable: {
//       backgroundColor: colors.primary + '20',
//     },
//     newExamBadgeCompleted: {
//       backgroundColor: colors.textSecondary + '20',
//     },
//     newExamBadgeUpcoming: {
//       backgroundColor: '#f59e0b' + '20',
//     },
//     newExamBadgePaused: {
//       backgroundColor: colors.primary + '20',
//     },
//     newExamBadgeExpired: {
//       backgroundColor: '#6b7280' + '20',
//     },
//     newExamBadgeText: {
//       fontSize: 10,
//       fontWeight: '600',
//     },
//     newExamCategory: {
//       fontSize: 12,
//       color: colors.textSecondary,
//       marginBottom: 12,
//     },
//     newExamDetailsContainer: {
//       borderTopWidth: 1,
//       borderTopColor: colors.border,
//       paddingTop: 12,
//       gap: 8,
//     },
//     newExamDetailRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 6,
//     },
//     newExamDetailText: {
//       fontSize: 11,
//       color: colors.textSecondary,
//       fontWeight: '500',
//     },
//     examCard: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       backgroundColor: colors.surface,
//       borderRadius: 18,
//       padding: 18,
//       marginHorizontal: 20,
//       marginBottom: 12,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     examCardLeft: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       flex: 1,
//     },
//     examIconContainer: {
//       width: 48,
//       height: 48,
//       borderRadius: 24,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginRight: 14,
//     },
//     examIconAvailable: {
//       backgroundColor: colors.primary,
//     },
//     examIconCompleted: {
//       backgroundColor: '#3B82F6', // Blue for completed
//     },
//     examInfo: {
//       flex: 1,
//     },
//     examTitle: {
//       fontSize: 16,
//       fontWeight: '700',
//       color: colors.text,
//       marginBottom: 4,
//     },
//     examMetaRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     examMeta: {
//       fontSize: 13,
//       color: colors.textSecondary,
//     },
//     examScore: {
//       fontSize: 13,
//       color: colors.primary,
//       fontWeight: '600',
//     },
//     examCardRight: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     statusBadgeAvailable: {
//       backgroundColor: colors.primary + '20',
//       paddingHorizontal: 14,
//       paddingVertical: 6,
//       borderRadius: 16,
//       marginRight: 8,
//     },
//     statusTextAvailable: {
//       fontSize: 12,
//       fontWeight: '700',
//       color: colors.primary,
//     },
//   });
