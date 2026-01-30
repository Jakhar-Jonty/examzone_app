import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import api from '../services/api';
import { formatDate } from '../utils/helpers';

export default function ExamDetailScreen({ route, navigation }) {
  const { examId } = route.params;
  const { colors } = useTheme();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [examStatus, setExamStatus] = useState(null); // 'new', 'paused', 'completed'
  const [attemptStatus, setAttemptStatus] = useState(null);
  const [completedAttemptId, setCompletedAttemptId] = useState(null);
  const [attemptHistory, setAttemptHistory] = useState([]);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchExamDetails();
  }, [examId]);

  const fetchExamDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/exams/${examId}`);
      setExam(response.data.exam);

      // Check attempt status
      if (response.data.attemptStatus) {
        setAttemptStatus(response.data.attemptStatus);
        if (response.data.attemptStatus.isCompleted) {
          setExamStatus('completed');
          setCompletedAttemptId(response.data.attemptStatus.completedAttemptId);
        } else if (response.data.attemptStatus.isPaused) {
          setExamStatus('paused');
          // Store paused attempt ID for resuming
          if (response.data.attemptStatus.pausedAttemptId) {
            setCompletedAttemptId(response.data.attemptStatus.pausedAttemptId);
          }
        } else {
          setExamStatus('new');
        }
      } else {
        setExamStatus('new');
      }

      // Set attempt history
      if (response.data.attemptHistory) {
        setAttemptHistory(response.data.attemptHistory);
      }
    } catch (error) {
      console.error('Failed to fetch exam:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load exam');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async () => {
    try {
      setStarting(true);
      const response = await api.post(`/exams/${examId}/start`);
      const attemptData = response.data.attempt;

      const params = {
        examId: examId,
        attemptId: attemptData._id,
        exam: response.data.exam || exam,
        attempt: attemptData,
        isResumed: response.data.isResumed || false,
      };

      // Use CommonActions to navigate to ExamsStack -> ExamInterface
      // This works regardless of which stack we're currently in
      navigation.dispatch(
        CommonActions.navigate({
          name: 'ExamsStack',
          params: {
            screen: 'ExamInterface',
            params,
          },
        })
      );
    } catch (error) {
      console.error('Failed to start/resume exam:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to start/resume exam');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Exam Details</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!exam) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Exam Details</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Exam not found</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const questionCount = typeof exam.questions === 'number' ? exam.questions : exam.questions?.length || 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {exam.title}
          </Text>
          <View style={{ width: 24 }} />
        </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Exam Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Total Questions: <Text style={styles.infoValue}>{questionCount}</Text>
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Duration: <Text style={styles.infoValue}>{exam.duration} minutes</Text>
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="trophy-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Total Marks: <Text style={styles.infoValue}>{exam.totalMarks}</Text>
            </Text>
          </View>
          {exam.scheduledTime && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={styles.infoText}>
                Scheduled: <Text style={styles.infoValue}>{formatDate(exam.scheduledTime)}</Text>
              </Text>
            </View>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Instructions:</Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={styles.instructionText}>
                Read each question carefully before answering
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={styles.instructionText}>
                You can navigate between questions using Previous/Next buttons
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={styles.instructionText}>
                Use "Mark for Review" to flag questions you want to revisit
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={styles.instructionText}>
                You can change your answers before submitting
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={styles.instructionText}>
                The exam will auto-submit when time runs out
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={styles.instructionText}>
                Once submitted, you cannot go back to change answers
              </Text>
            </View>
          </View>
        </View>

        {/* Status and Actions */}
        {examStatus === 'completed' ? (
          <View style={styles.statusCard}>
            <View style={styles.completedHeader}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.completedTitle}>Exam Already Completed</Text>
            </View>
            {attemptStatus && (
              <View style={styles.attemptStats}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Attempts:</Text>
                  <Text style={styles.statValue}>
                    {attemptStatus.attemptCount} / {attemptStatus.maxAttempts}
                    {attemptStatus.attemptsRemaining > 0 && (
                      <Text style={styles.attemptsRemainingText}>
                        {' '}({attemptStatus.attemptsRemaining} remaining)
                      </Text>
                    )}
                  </Text>
                </View>
                {attemptStatus.bestScore !== null && attemptStatus.latestScore !== null && (
                  <View style={styles.scoreGrid}>
                    <View style={styles.scoreCard}>
                      <View style={styles.scoreCardHeader}>
                        <Ionicons name="trophy" size={16} color="#f59e0b" />
                        <Text style={styles.scoreCardLabel}>Best Score</Text>
                      </View>
                      <Text style={styles.scoreCardValue}>
                        {attemptStatus.bestScore} / {exam.totalMarks}
                      </Text>
                      <Text style={styles.scoreCardPercentage}>
                        {attemptStatus.bestScore && exam.totalMarks
                          ? `${Math.round((attemptStatus.bestScore / exam.totalMarks) * 100)}%`
                          : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.scoreCard}>
                      <View style={styles.scoreCardHeader}>
                        <Ionicons name="trending-up" size={16} color={colors.primary} />
                        <Text style={styles.scoreCardLabel}>Latest Score</Text>
                      </View>
                      <Text style={[styles.scoreCardValue, { color: colors.primary }]}>
                        {attemptStatus.latestScore} / {exam.totalMarks}
                      </Text>
                      <Text style={styles.scoreCardPercentage}>
                        {attemptStatus.latestPercentage !== null
                          ? `${Math.round(attemptStatus.latestPercentage)}%`
                          : 'N/A'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.viewResultButton]}
                onPress={() => {
                  if (completedAttemptId) {
                    navigation.navigate('Result', { attemptId: completedAttemptId });
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="eye-outline" size={20} color="#FFFFFF" />
                <Text style={styles.viewResultButtonText}>View Result</Text>
              </TouchableOpacity>
              {attemptStatus?.canReattempt && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.retryButton]}
                  onPress={handleStartExam}
                  disabled={starting}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh-outline" size={20} color={colors.primary} />
                  <Text style={styles.retryButtonText}>
                    {starting ? 'Starting...' : 'Re-attempt Exam'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Attempt History */}
            {attemptHistory && attemptHistory.length > 0 && (
              <View style={styles.historySection}>
                <View style={styles.historyHeader}>
                  <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                  <Text style={styles.historyTitle}>Attempt History</Text>
                </View>
                <View style={styles.historyList}>
                  {attemptHistory.map((historyItem) => (
                    <TouchableOpacity
                      key={historyItem._id}
                      style={styles.historyItem}
                      onPress={() => navigation.navigate('Result', { attemptId: historyItem._id })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.historyItemLeft}>
                        <Text style={styles.historyItemAttempt}>
                          Attempt {historyItem.attemptNumber}
                        </Text>
                        <Text style={styles.historyItemDate}>
                          {formatDate(historyItem.date)}
                        </Text>
                      </View>
                      <View style={styles.historyItemRight}>
                        <Text style={styles.historyItemScore}>
                          {historyItem.score} / {exam.totalMarks}
                        </Text>
                        <Text style={styles.historyItemPercentage}>
                          ({Math.round(historyItem.percentage)}%)
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        ) : examStatus === 'paused' ? (
          <View style={styles.statusCard}>
            <View style={styles.pausedHeader}>
              <Ionicons name="pause-circle" size={24} color="#f59e0b" />
              <Text style={styles.pausedTitle}>Exam Paused</Text>
            </View>
            <Text style={styles.pausedSubtitle}>
              Your exam progress has been saved. Continue where you left off.
            </Text>
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={handleStartExam}
              disabled={starting}
              activeOpacity={0.7}
            >
              <Ionicons name="play" size={20} color="#FFFFFF" />
              <Text style={styles.startButtonText}>
                {starting ? 'Resuming...' : 'Resume Exam'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.startButton]}
            onPress={handleStartExam}
            disabled={starting}
            activeOpacity={0.7}
          >
            <Ionicons name="play-circle" size={20} color="#FFFFFF" />
            <Text style={styles.startButtonText}>
              {starting ? 'Starting...' : 'Start Exam'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
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
      flex: 1,
      textAlign: 'center',
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
      fontSize: 16,
      color: colors.textSecondary,
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 12,
    },
    infoText: {
      fontSize: 15,
      color: colors.text,
    },
    infoValue: {
      fontWeight: 'bold',
      color: colors.text,
    },
    instructionsCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    instructionsTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    instructionsList: {
      gap: 12,
    },
    instructionItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    instructionText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    statusCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    completedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    completedTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#10b981',
    },
    pausedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
    },
    pausedTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#f59e0b',
    },
    pausedSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    pausedInfo: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pausedInfoText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    attemptStats: {
      marginBottom: 20,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    statLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    statValue: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text,
    },
    attemptsRemainingText: {
      fontSize: 13,
      color: '#10b981',
      fontWeight: '500',
    },
    scoreGrid: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
    },
    scoreCard: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    scoreCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    scoreCardLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    scoreCardValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#10b981',
      marginBottom: 4,
    },
    scoreCardPercentage: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    actionButtons: {
      gap: 12,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      gap: 8,
    },
    startButton: {
      backgroundColor: colors.primary,
    },
    startButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    viewResultButton: {
      backgroundColor: colors.primary,
    },
    viewResultButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    retryButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    retryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
    },
    historySection: {
      marginTop: 24,
      paddingTop: 24,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    historyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    historyTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    historyList: {
      gap: 12,
    },
    historyItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    historyItemLeft: {
      flex: 1,
    },
    historyItemAttempt: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    historyItemDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    historyItemRight: {
      alignItems: 'flex-end',
    },
    historyItemScore: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 2,
    },
    historyItemPercentage: {
      fontSize: 12,
      color: colors.textSecondary,
    },
  });


