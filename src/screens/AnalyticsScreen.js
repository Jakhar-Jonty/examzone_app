import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { startTopicPractice } from '../utils/startTopicPractice';

export default function AnalyticsScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('all'); // 'all', 'week', 'month', 'quarter'
  const [startingPractice, setStartingPractice] = useState(null);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/user/analytics', {
        params: { timeRange },
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const handleStartPractice = async (rec) => {
    if (startingPractice) return;
    try {
      setStartingPractice(rec.topic);
      await startTopicPractice({
        subject: rec.subject,
        topic: rec.topic,
        questionCount: rec.questionCount || 15,
        navigation,
      });
    } catch (error) {
      console.error('Failed to start practice:', error);
    } finally {
      setStartingPractice(null);
    }
  };

  const overallStats = analytics?.overallStats || analytics?.stats;

  // Green ≥ 80, orange ≥ 60, red below — { fg, bg } theme tone.
  const getScoreTone = (percentage) => {
    if (percentage >= 80) return colors.tones.green;
    if (percentage >= 60) return colors.tones.orange;
    return colors.tones.red;
  };

  const getTrendIcon = (change) => {
    if (change > 0) return { name: 'trending-up', color: colors.tones.green.fg };
    if (change < 0) return { name: 'trending-down', color: colors.tones.red.fg };
    return { name: 'remove', color: colors.textSecondary };
  };

  if (loading && !analytics) {
    return (
      <ScreenWrapper>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Analytics</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.text} />
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {['all', 'week', 'month', 'quarter'].map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                timeRange === range && styles.timeRangeButtonActive,
              ]}
              onPress={() => setTimeRange(range)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  timeRange === range && styles.timeRangeTextActive,
                ]}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {!analytics || !overallStats ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="analytics-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No analytics data available</Text>
              <Text style={styles.emptySubtext}>Complete some exams to see your analytics</Text>
            </View>
          ) : (
            <>
              {/* Overall Stats */}
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <View style={styles.statCardHeader}>
                    <Ionicons name="document-text" size={20} color={colors.text} />
                    <Text style={styles.statCardLabel}>Total Attempts</Text>
                  </View>
                  <Text style={styles.statCardValue}>{overallStats.totalAttempts || 0}</Text>
                  {analytics.trends && (
                    <View style={styles.statTrend}>
                      <Ionicons
                        {...getTrendIcon(analytics.trends.attemptsChange)}
                        size={14}
                      />
                      <Text
                        style={[
                          styles.statTrendText,
                          { color: getTrendIcon(analytics.trends.attemptsChange).color },
                        ]}
                      >
                        {analytics.trends.attemptsChange > 0 ? '+' : ''}
                        {analytics.trends.attemptsChange.toFixed(1)}%
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.statCard}>
                  <View style={styles.statCardHeader}>
                    <Ionicons name="trophy" size={20} color={colors.tones.orange.fg} />
                    <Text style={styles.statCardLabel}>Average Score</Text>
                  </View>
                  <Text style={[styles.statCardValue, { color: getScoreTone(overallStats.averageScore || 0).fg }]}>
                    {overallStats.averageScore?.toFixed(1) || 0}%
                  </Text>
                  {analytics.trends && (
                    <View style={styles.statTrend}>
                      <Ionicons
                        {...getTrendIcon(analytics.trends.scoreChange)}
                        size={14}
                      />
                      <Text
                        style={[
                          styles.statTrendText,
                          { color: getTrendIcon(analytics.trends.scoreChange).color },
                        ]}
                      >
                        {analytics.trends.scoreChange > 0 ? '+' : ''}
                        {analytics.trends.scoreChange.toFixed(1)}%
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.statCard}>
                  <View style={styles.statCardHeader}>
                    <Ionicons name="star" size={20} color={colors.tones.green.fg} />
                    <Text style={styles.statCardLabel}>Best Score</Text>
                  </View>
                  <Text style={[styles.statCardValue, { color: colors.tones.green.fg }]}>
                    {overallStats.bestScore?.toFixed(1) || 0}%
                  </Text>
                </View>

                <View style={styles.statCard}>
                  <View style={styles.statCardHeader}>
                    <Ionicons name="trending-up" size={20} color={colors.text} />
                    <Text style={styles.statCardLabel}>Improvement</Text>
                  </View>
                  <Text style={[styles.statCardValue, { color: colors.text }]}>
                    {(analytics.trends?.improvementRate ?? 0).toFixed(1)}%
                  </Text>
                </View>
              </View>

              {/* Prescriptive practice */}
              {analytics.practiceRecommendations?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Focus Areas</Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                    Weakest topics — one tap to drill
                  </Text>
                  {analytics.practiceRecommendations.map((rec, index) => (
                    <View key={`${rec.topic}-${index}`} style={styles.subjectCard}>
                      <View style={styles.subjectHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.subjectName} numberOfLines={1}>
                            {rec.topic}
                          </Text>
                          {rec.subject ? (
                            <Text style={[styles.subjectStatText, { marginTop: 2 }]}>
                              {rec.subject}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={[styles.subjectScore, { color: getScoreTone(rec.accuracy).fg }]}>
                          {rec.accuracy}%
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.practiceButton, { backgroundColor: colors.hero }]}
                        onPress={() => handleStartPractice(rec)}
                        disabled={startingPractice === rec.topic}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="flash" size={16} color={colors.heroText} />
                        <Text style={styles.practiceButtonText}>
                          {startingPractice === rec.topic ? 'Starting…' : rec.label || 'Start 15 Qs'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Subject Performance */}
              {analytics.subjectPerformance && analytics.subjectPerformance.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Subject Performance</Text>
                  {analytics.subjectPerformance.map((subject, index) => (
                    <View key={index} style={styles.subjectCard}>
                      <View style={styles.subjectHeader}>
                        <Text style={styles.subjectName} numberOfLines={1}>
                          {typeof subject.subject === 'object' ? subject.subject.name || 'General' : subject.subject || 'General'}
                        </Text>
                        <Text style={[styles.subjectScore, { color: getScoreTone(subject.averageScore).fg }]}>
                          {subject.averageScore.toFixed(1)}%
                        </Text>
                      </View>
                      <View style={styles.subjectStats}>
                        <Text style={styles.subjectStatText}>
                          {subject.attempts} attempts
                        </Text>
                        <Text style={styles.subjectStatText}>
                          Best: {subject.bestScore.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Recent Attempts */}
              {analytics.recentAttempts && analytics.recentAttempts.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recent Attempts</Text>
                  {analytics.recentAttempts.map((attempt, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.attemptCard}
                      onPress={() => navigation.navigate('Result', { attemptId: attempt._id })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.attemptHeader}>
                        <Text style={styles.attemptTitle} numberOfLines={1}>
                          {attempt.examTitle}
                        </Text>
                        <View
                          style={[
                            styles.attemptScoreBadge,
                            { backgroundColor: getScoreTone(attempt.percentage).bg },
                          ]}
                        >
                          <Text style={[styles.attemptScoreText, { color: getScoreTone(attempt.percentage).fg }]}>
                            {attempt.percentage.toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                      <View style={styles.attemptDetails}>
                        <Text style={styles.attemptDetailText}>
                          {attempt.score} / {attempt.totalMarks} marks
                        </Text>
                        <Text style={styles.attemptDetailText}>•</Text>
                        <Text style={styles.attemptDetailText}>{attempt.date}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Performance Insights */}
              {analytics.insights && analytics.insights.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Insights</Text>
                  {analytics.insights.map((insight, index) => (
                    <View key={index} style={styles.insightCard}>
                      <Ionicons name="bulb-outline" size={20} color={colors.text} />
                      <Text style={styles.insightText}>{insight}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    timeRangeContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    timeRangeButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    timeRangeButtonActive: {
      backgroundColor: colors.hero,
      borderColor: colors.hero,
    },
    timeRangeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    timeRangeTextActive: {
      color: colors.heroText,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 8,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      minWidth: '47%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    statCardLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    statCardValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    statTrend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statTrendText: {
      fontSize: 12,
      fontWeight: '600',
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    sectionSubtitle: {
      fontSize: 12,
      marginBottom: 12,
    },
    practiceButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 12,
      paddingVertical: 10,
      borderRadius: 12,
    },
    practiceButtonText: {
      color: colors.heroText,
      fontSize: 13,
      fontWeight: '700',
    },
    subjectCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    subjectHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    subjectName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    subjectScore: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    subjectStats: {
      flexDirection: 'row',
      gap: 12,
    },
    subjectStatText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    attemptCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    attemptHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    attemptTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
      marginRight: 12,
    },
    attemptScoreBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    attemptScoreText: {
      fontSize: 14,
      fontWeight: 'bold',
    },
    attemptDetails: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    attemptDetailText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    insightCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    insightText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
  });

