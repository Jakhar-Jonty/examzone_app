import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
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

export default function ResultScreen({ route, navigation }) {
  const { attemptId } = route.params;
  const { colors } = useTheme();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('questions'); // 'questions' or 'analytics'
  const [attemptStatus, setAttemptStatus] = useState(null);
  const [starting, setStarting] = useState(false);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchResult();
  }, [attemptId]);

  const fetchResult = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/exams/result/${attemptId}`);
      setResult(response.data.result);
      
      // Also fetch attempt status to check if retry is available
      if (response.data.result?.exam?._id) {
        try {
          const examResponse = await api.get(`/exams/${response.data.result.exam._id}`);
          if (examResponse.data.attemptStatus) {
            setAttemptStatus(examResponse.data.attemptStatus);
          }
        } catch (err) {
          // Ignore - we just won't show retry option
        }
      }
    } catch (error) {
      console.error('Failed to fetch result:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRetryExam = async () => {
    if (!result?.exam?._id) return;
    
    try {
      setStarting(true);
      const response = await api.post(`/exams/${result.exam._id}/start`);
      const attemptData = response.data.attempt;

      const params = {
        examId: result.exam._id,
        attemptId: attemptData._id,
        exam: response.data.exam,
        attempt: attemptData,
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
      console.error('Failed to start exam:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to start exam');
    } finally {
      setStarting(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchResult();
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    return '#ef4444';
  };

  if (loading && !result) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Result</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!result) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Result</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Result not found</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const percentage = result.percentage || 0;
  const scoreColor = getScoreColor(percentage);
  const correctQuestions = result.answers?.filter((a) => a.isCorrect) || [];
  const wrongQuestions = result.answers?.filter((a) => !a.isCorrect && a.selectedAnswer) || [];
  const unattemptedQuestions = result.answers?.filter((a) => !a.selectedAnswer) || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {result.exam?.title || 'Exam Result'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Score Summary Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <Text style={styles.scoreTitle}>Your Score</Text>
            <Text style={styles.attemptNumber}>Attempt #{result.attemptNumber || 1}</Text>
          </View>

          <View style={styles.scoreMain}>
            <View style={styles.scoreCircle}>
              <Text style={[styles.scorePercentage, { color: scoreColor }]}>
                {percentage.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.scoreDetails}>
              <Text style={styles.scoreValue}>
                {result.totalScore} / {result.exam?.totalMarks || result.totalScore}
              </Text>
              <Text style={styles.scoreLabel}>Total Marks</Text>
            </View>
          </View>

          <View style={styles.scoreStats}>
            <View style={styles.statBox}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.statValue}>{result.correctAnswers || 0}</Text>
              <Text style={styles.statLabel}>Correct</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="close-circle" size={24} color="#ef4444" />
              <Text style={styles.statValue}>{result.incorrectAnswers || 0}</Text>
              <Text style={styles.statLabel}>Wrong</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="remove-circle" size={24} color={colors.textSecondary} />
              <Text style={styles.statValue}>{result.unattempted || 0}</Text>
              <Text style={styles.statLabel}>Unattempted</Text>
            </View>
          </View>

          <View style={styles.timeInfo}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.timeText}>
              Time Taken: {formatTime(result.timeTaken || 0)}
            </Text>
            {result.endTime && (
              <>
                <Text style={styles.timeSeparator}>•</Text>
                <Text style={styles.timeText}>
                  {formatDate(result.endTime)}
                </Text>
              </>
            )}
          </View>

          {/* Attempt Info & Retry Button */}
          {attemptStatus && (
            <View style={styles.attemptInfoSection}>
              <View style={styles.attemptInfoRow}>
                <Text style={styles.attemptInfoLabel}>Attempts:</Text>
                <Text style={styles.attemptInfoValue}>
                  {attemptStatus.attemptCount} / {attemptStatus.maxAttempts || '∞'}
                </Text>
                {attemptStatus.attemptsRemaining > 0 && (
                  <Text style={styles.attemptsRemainingText}>
                    ({attemptStatus.attemptsRemaining} remaining)
                  </Text>
                )}
              </View>
              {attemptStatus.canReattempt && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRetryExam}
                  disabled={starting}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.retryButtonText}>
                    {starting ? 'Starting...' : 'Retry Exam'}
                  </Text>
                </TouchableOpacity>
              )}
              {!attemptStatus.canReattempt && attemptStatus.maxAttempts && (
                <Text style={styles.noAttemptsText}>
                  No more attempts remaining
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'questions' && styles.tabActive]}
            onPress={() => setActiveTab('questions')}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.tabText, activeTab === 'questions' && styles.tabTextActive]}
            >
              Questions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'analytics' && styles.tabActive]}
            onPress={() => setActiveTab('analytics')}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.tabText, activeTab === 'analytics' && styles.tabTextActive]}
            >
              Analytics
            </Text>
          </TouchableOpacity>
        </View>

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <View style={styles.questionsContainer}>
            {result.answers?.map((answer, index) => {
              const question = answer.question;
              if (!question) return null;

              const isCorrect = answer.isCorrect;
              const userAnswer = answer.selectedAnswer;
              const correctAnswer = question.correctAnswer;

              return (
                <View
                  key={index}
                  style={[
                    styles.questionCard,
                    isCorrect ? styles.questionCardCorrect : styles.questionCardWrong,
                  ]}
                >
                  <View style={styles.questionHeader}>
                    <View style={styles.questionHeaderLeft}>
                      <Text style={styles.questionNumber}>Q{index + 1}</Text>
                      {isCorrect ? (
                        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                      ) : (
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                      )}
                    </View>
                    <View style={styles.questionMarks}>
                      <Text style={styles.marksText}>
                        Marks: {answer.marksObtained || 0} /{' '}
                        {question.marks || 1}
                      </Text>
                      {answer.timeSpent > 0 && (
                        <Text style={styles.timeSpentText}>
                          Time: {formatTime(answer.timeSpent)}
                        </Text>
                      )}
                    </View>
                  </View>

                  {question.questionImage && (
                    <View style={styles.questionImageContainer}>
                      <Text style={styles.imagePlaceholder}>[Question Image]</Text>
                    </View>
                  )}

                  <Text style={styles.questionText}>{question.questionText}</Text>

                  <View style={styles.optionsContainer}>
                    {question.options?.map((option, optIndex) => {
                      const isCorrectOption = option.optionLabel === correctAnswer;
                      const isUserAnswer = option.optionLabel === userAnswer;

                      let optionStyle = styles.option;
                      if (isCorrectOption) {
                        optionStyle = styles.optionCorrect;
                      } else if (isUserAnswer && !isCorrect) {
                        optionStyle = styles.optionWrong;
                      }

                      return (
                        <View key={optIndex} style={optionStyle}>
                          <Text style={styles.optionLabel}>{option.optionLabel}.</Text>
                          <Text style={styles.optionText}>{option.optionText}</Text>
                          {isCorrectOption && (
                            <Ionicons name="checkmark" size={16} color="#10b981" />
                          )}
                          {isUserAnswer && !isCorrect && (
                            <Ionicons name="close" size={16} color="#ef4444" />
                          )}
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.answerSummary}>
                    <View style={styles.answerRow}>
                      <Text style={styles.answerLabel}>Your Answer:</Text>
                      <Text
                        style={[
                          styles.answerValue,
                          isCorrect ? styles.answerValueCorrect : styles.answerValueWrong,
                        ]}
                      >
                        {userAnswer || 'Not Attempted'}
                      </Text>
                    </View>
                    <View style={styles.answerRow}>
                      <Text style={styles.answerLabel}>Correct Answer:</Text>
                      <Text style={[styles.answerValue, styles.answerValueCorrect]}>
                        {correctAnswer}
                      </Text>
                    </View>
                  </View>

                  {question.explanation && (
                    <View style={styles.explanationContainer}>
                      <Text style={styles.explanationTitle}>Explanation:</Text>
                      <Text style={styles.explanationText}>{question.explanation}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <View style={styles.analyticsContainer}>
            {/* Performance Breakdown */}
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsTitle}>Performance Breakdown</Text>
              <View style={styles.breakdownGrid}>
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownBarContainer}>
                    <View
                      style={[
                        styles.breakdownBar,
                        {
                          width: `${(correctQuestions.length / (result.answers?.length || 1)) * 100}%`,
                          backgroundColor: '#10b981',
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.breakdownInfo}>
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    <View style={styles.breakdownTextContainer}>
                      <Text style={styles.breakdownLabel}>Correct</Text>
                      <Text style={styles.breakdownValue}>
                        {correctQuestions.length} ({((correctQuestions.length / (result.answers?.length || 1)) * 100).toFixed(1)}%)
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownBarContainer}>
                    <View
                      style={[
                        styles.breakdownBar,
                        {
                          width: `${(wrongQuestions.length / (result.answers?.length || 1)) * 100}%`,
                          backgroundColor: '#ef4444',
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.breakdownInfo}>
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                    <View style={styles.breakdownTextContainer}>
                      <Text style={styles.breakdownLabel}>Wrong</Text>
                      <Text style={styles.breakdownValue}>
                        {wrongQuestions.length} ({((wrongQuestions.length / (result.answers?.length || 1)) * 100).toFixed(1)}%)
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownBarContainer}>
                    <View
                      style={[
                        styles.breakdownBar,
                        {
                          width: `${(unattemptedQuestions.length / (result.answers?.length || 1)) * 100}%`,
                          backgroundColor: colors.textSecondary,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.breakdownInfo}>
                    <Ionicons name="remove-circle" size={20} color={colors.textSecondary} />
                    <View style={styles.breakdownTextContainer}>
                      <Text style={styles.breakdownLabel}>Unattempted</Text>
                      <Text style={styles.breakdownValue}>
                        {unattemptedQuestions.length} ({((unattemptedQuestions.length / (result.answers?.length || 1)) * 100).toFixed(1)}%)
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Time Analysis */}
            {result.timeTaken > 0 && (
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsTitle}>Time Analysis</Text>
                <View style={styles.timeAnalysisRow}>
                  <View style={styles.timeAnalysisItem}>
                    <Text style={styles.timeAnalysisLabel}>Total Time</Text>
                    <Text style={styles.timeAnalysisValue}>
                      {formatTime(result.timeTaken)}
                    </Text>
                  </View>
                  <View style={styles.timeAnalysisItem}>
                    <Text style={styles.timeAnalysisLabel}>Avg per Question</Text>
                    <Text style={styles.timeAnalysisValue}>
                      {formatTime(
                        Math.floor(result.timeTaken / (result.answers?.length || 1))
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Exam Info */}
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsTitle}>Exam Information</Text>
              <View style={styles.infoList}>
                <View style={styles.infoItem}>
                  <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoItemText}>
                    Total Questions: {result.answers?.length || 0}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="trophy-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoItemText}>
                    Total Marks: {result.exam?.totalMarks || 0}
                  </Text>
                </View>
                {result.exam?.duration && (
                  <View style={styles.infoItem}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.infoItemText}>
                      Duration: {result.exam.duration} minutes
                    </Text>
                  </View>
                )}
                {result.exam?.category && (
                  <View style={styles.infoItem}>
                    <Ionicons name="folder-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.infoItemText}>
                      Category: {result.exam.category?.name || result.exam.category}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
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
    scoreCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    scoreHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    scoreTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
    },
    attemptNumber: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    scoreMain: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      gap: 24,
    },
    scoreCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 4,
      borderColor: colors.primary,
    },
    scorePercentage: {
      fontSize: 28,
      fontWeight: 'bold',
    },
    scoreDetails: {
      alignItems: 'center',
    },
    scoreValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    scoreLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    scoreStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    statBox: {
      alignItems: 'center',
      gap: 8,
    },
    statValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    timeInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    timeText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    timeSeparator: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    attemptInfoSection: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      alignItems: 'center',
    },
    attemptInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    attemptInfoLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    attemptInfoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    attemptsRemainingText: {
      fontSize: 13,
      color: '#10b981',
      fontWeight: '500',
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 10,
      gap: 8,
    },
    retryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    noAttemptsText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 4,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    tabActive: {
      backgroundColor: colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: '#FFFFFF',
    },
    questionsContainer: {
      gap: 16,
    },
    questionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 2,
    },
    questionCardCorrect: {
      borderColor: '#10b981',
      backgroundColor: '#10b981' + '10',
    },
    questionCardWrong: {
      borderColor: '#ef4444',
      backgroundColor: '#ef4444' + '10',
    },
    questionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    questionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    questionNumber: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    questionMarks: {
      alignItems: 'flex-end',
    },
    marksText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    timeSpentText: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    questionImageContainer: {
      marginBottom: 16,
      borderRadius: 12,
      overflow: 'hidden',
    },
    imagePlaceholder: {
      padding: 40,
      textAlign: 'center',
      color: colors.textSecondary,
      backgroundColor: colors.background,
    },
    questionText: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
      marginBottom: 16,
    },
    optionsContainer: {
      gap: 12,
      marginBottom: 16,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    optionCorrect: {
      backgroundColor: '#10b981' + '20',
      borderColor: '#10b981',
    },
    optionWrong: {
      backgroundColor: '#ef4444' + '20',
      borderColor: '#ef4444',
    },
    optionLabel: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text,
      minWidth: 24,
    },
    optionText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    answerSummary: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      gap: 12,
    },
    answerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    answerLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    answerValue: {
      fontSize: 14,
      fontWeight: 'bold',
    },
    answerValueCorrect: {
      color: '#10b981',
    },
    answerValueWrong: {
      color: '#ef4444',
    },
    explanationContainer: {
      backgroundColor: colors.primary + '15',
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    explanationTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    explanationText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    analyticsContainer: {
      gap: 16,
    },
    analyticsCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    analyticsTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    breakdownGrid: {
      gap: 16,
    },
    breakdownItem: {
      gap: 8,
    },
    breakdownBar: {
      height: 8,
      borderRadius: 4,
    },
    breakdownLabel: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
    },
    breakdownValue: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    timeAnalysisRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: 16,
    },
    timeAnalysisItem: {
      alignItems: 'center',
      gap: 8,
    },
    timeAnalysisLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    timeAnalysisValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    infoList: {
      gap: 12,
    },
    infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    infoItemText: {
      fontSize: 14,
      color: colors.text,
    },
  });


