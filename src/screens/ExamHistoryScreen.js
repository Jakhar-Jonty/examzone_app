import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { formatDate } from '../utils/helpers';

export default function ExamHistoryScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    sortBy: 'date',
    sortOrder: 'desc',
    startDate: '',
    endDate: '',
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalAttempts: 0,
  });
  const [categories, setCategories] = useState([]);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchCategories();
    fetchExamHistory();
  }, [filters, searchQuery]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchExamHistory = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 12,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        search: searchQuery,
        ...(filters.category && { category: filters.category }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      };

      const response = await api.get('/user/exam-history', { params });
      if (page === 1) {
        setAttempts(response.data.attempts || []);
      } else {
        setAttempts((prev) => [...prev, ...(response.data.attempts || [])]);
      }
      setPagination(response.data.pagination || pagination);
    } catch (error) {
      console.error('Failed to fetch exam history:', error);
      Alert.alert('Error', 'Failed to load exam history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchExamHistory(1);
  };

  const loadMore = () => {
    if (pagination.currentPage < pagination.totalPages && !loading) {
      fetchExamHistory(pagination.currentPage + 1);
    }
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Exam History</Text>
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={styles.filterButton}
            activeOpacity={0.7}
          >
            <Ionicons name="filter" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exams..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Summary */}
        {attempts.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{pagination.totalAttempts}</Text>
              <Text style={styles.statLabel}>Total Attempts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10b981' }]}>
                {attempts.filter((a) => a.percentage >= 80).length}
              </Text>
              <Text style={styles.statLabel}>Excellent</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#f59e0b' }]}>
                {attempts.filter((a) => a.percentage >= 60 && a.percentage < 80).length}
              </Text>
              <Text style={styles.statLabel}>Good</Text>
            </View>
          </View>
        )}

        {/* Attempts List */}
        {loading && attempts.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : attempts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No exam attempts found</Text>
            <Text style={styles.emptySubtext}>Start taking exams to see your history here</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            onScrollEndDrag={loadMore}
          >
            {attempts.map((attempt) => (
              <TouchableOpacity
                key={attempt._id}
                style={styles.attemptCard}
                onPress={() => navigation.navigate('Result', { attemptId: attempt._id })}
                activeOpacity={0.7}
              >
                <View style={styles.attemptHeader}>
                  <View style={styles.attemptHeaderLeft}>
                    <Text style={styles.attemptTitle} numberOfLines={1}>
                      {attempt.exam?.title || 'Unknown Exam'}
                    </Text>
                    <Text style={styles.attemptDate}>
                      {formatDate(attempt.endTime || attempt.createdAt)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.scoreBadge,
                      { backgroundColor: getScoreColor(attempt.percentage) + '20' },
                    ]}
                  >
                    <Text style={[styles.scoreText, { color: getScoreColor(attempt.percentage) }]}>
                      {Math.round(attempt.percentage)}%
                    </Text>
                  </View>
                </View>

                <View style={styles.attemptStats}>
                  <View style={styles.statRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.statText}>
                      {attempt.correctAnswers || 0} Correct
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Ionicons name="close-circle" size={16} color="#ef4444" />
                    <Text style={styles.statText}>
                      {attempt.incorrectAnswers || 0} Incorrect
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.statText}>
                      {formatTime(attempt.timeTaken)}
                    </Text>
                  </View>
                </View>

                <View style={styles.attemptFooter}>
                  <Text style={styles.attemptScore}>
                    Score: {attempt.totalScore} / {attempt.exam?.totalMarks || attempt.totalScore}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}

            {pagination.currentPage < pagination.totalPages && (
              <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore} activeOpacity={0.7}>
                <Text style={styles.loadMoreText}>Load More</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {/* Filters Modal */}
        <Modal
          visible={showFilters}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowFilters(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filters</Text>
                <TouchableOpacity
                  onPress={() => setShowFilters(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.filterContent}>
                <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>Sort By</Text>
                  <View style={styles.filterOptions}>
                    {['date', 'score', 'percentage'].map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.filterChip,
                          filters.sortBy === option && styles.filterChipActive,
                        ]}
                        onPress={() => setFilters({ ...filters, sortBy: option })}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            filters.sortBy === option && styles.filterChipTextActive,
                          ]}
                        >
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>Order</Text>
                  <View style={styles.filterOptions}>
                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        filters.sortOrder === 'desc' && styles.filterChipActive,
                      ]}
                      onPress={() => setFilters({ ...filters, sortOrder: 'desc' })}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          filters.sortOrder === 'desc' && styles.filterChipTextActive,
                        ]}
                      >
                        Newest First
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        filters.sortOrder === 'asc' && styles.filterChipActive,
                      ]}
                      onPress={() => setFilters({ ...filters, sortOrder: 'asc' })}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          filters.sortOrder === 'asc' && styles.filterChipTextActive,
                        ]}
                      >
                        Oldest First
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={() => {
                    setFilters({
                      category: '',
                      sortBy: 'date',
                      sortOrder: 'desc',
                      startDate: '',
                      endDate: '',
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalButtonTextSecondary}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={() => setShowFilters(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalButtonTextPrimary}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    },
    filterButton: {
      padding: 8,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginHorizontal: 20,
      marginTop: 16,
      marginBottom: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      paddingVertical: 12,
    },
    clearButton: {
      padding: 4,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
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
    attemptCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    attemptHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    attemptHeaderLeft: {
      flex: 1,
      marginRight: 12,
    },
    attemptTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    attemptDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    scoreBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    scoreText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    attemptStats: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 12,
    },
    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    attemptFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    attemptScore: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    loadMoreButton: {
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    loadMoreText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    filterContent: {
      maxHeight: 400,
      padding: 20,
    },
    filterGroup: {
      marginBottom: 24,
    },
    filterLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    filterOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    filterChip: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    filterChipTextActive: {
      color: '#FFFFFF',
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 12,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    modalButtonSecondary: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalButtonPrimary: {
      backgroundColor: colors.primary,
    },
    modalButtonTextSecondary: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    modalButtonTextPrimary: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

