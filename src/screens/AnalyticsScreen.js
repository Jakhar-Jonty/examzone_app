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

export default function AnalyticsScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('all'); // 'all', 'week', 'month', 'quarter'

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

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getTrendIcon = (change) => {
    if (change > 0) return { name: 'trending-up', color: '#10b981' };
    if (change < 0) return { name: 'trending-down', color: '#ef4444' };
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
            <ActivityIndicator size="large" color={colors.primary} />
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
          {!analytics || !analytics.overallStats ? (
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
                    <Ionicons name="document-text" size={20} color={colors.primary} />
                    <Text style={styles.statCardLabel}>Total Attempts</Text>
                  </View>
                  <Text style={styles.statCardValue}>{analytics.overallStats.totalAttempts || 0}</Text>
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
                    <Ionicons name="trophy" size={20} color="#f59e0b" />
                    <Text style={styles.statCardLabel}>Average Score</Text>
                  </View>
                  <Text style={[styles.statCardValue, { color: getScoreColor(analytics.overallStats.averageScore || 0) }]}>
                    {analytics.overallStats.averageScore?.toFixed(1) || 0}%
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
                    <Ionicons name="star" size={20} color="#10b981" />
                    <Text style={styles.statCardLabel}>Best Score</Text>
                  </View>
                  <Text style={[styles.statCardValue, { color: '#10b981' }]}>
                    {analytics.overallStats.bestScore?.toFixed(1) || 0}%
                  </Text>
                </View>

                <View style={styles.statCard}>
                  <View style={styles.statCardHeader}>
                    <Ionicons name="trending-up" size={20} color={colors.primary} />
                    <Text style={styles.statCardLabel}>Improvement</Text>
                  </View>
                  <Text style={[styles.statCardValue, { color: colors.primary }]}>
                    {analytics.overallStats.improvementRate?.toFixed(1) || 0}%
                  </Text>
                </View>
              </View>

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
                        <Text style={[styles.subjectScore, { color: getScoreColor(subject.averageScore) }]}>
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
                            { backgroundColor: getScoreColor(attempt.percentage) + '20' },
                          ]}
                        >
                          <Text style={[styles.attemptScoreText, { color: getScoreColor(attempt.percentage) }]}>
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
                      <Ionicons name="bulb-outline" size={20} color={colors.primary} />
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
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    timeRangeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    timeRangeTextActive: {
      color: '#FFFFFF',
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
      marginBottom: 16,
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

