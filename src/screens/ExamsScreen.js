import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, getExamStatus } from '../utils/helpers';

export default function ExamsScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalExams: 0,
    limit: 10,
  });
  const [filters, setFilters] = useState({
    category: '',
    language: '',
    sortBy: 'scheduledTime',
    sortOrder: 'desc',
  });

  const styles = createStyles(colors);

  useEffect(() => {
    fetchExams();
  }, [pagination.currentPage, filters, searchQuery]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        ...filters,
      });

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      // Remove empty filter values
      Object.keys(filters).forEach(key => {
        if (!filters[key]) {
          params.delete(key);
        }
      });

      const response = await api.get(`/user/exams?${params.toString()}`);
      setExams(response.data.exams || []);
      setPagination(response.data.pagination || pagination);
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchExams();
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, currentPage: 1 });
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      language: '',
      sortBy: 'scheduledTime',
      sortOrder: 'desc',
    });
    setSearchQuery('');
    setPagination({ ...pagination, currentPage: 1 });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, currentPage: newPage });
    }
  };

  const activeFiltersCount = Object.values(filters).filter(
    (val) => val !== '' && val !== 'scheduledTime' && val !== 'desc'
  ).length + (searchQuery.trim() ? 1 : 0);

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return colors.primary;
      case 'completed':
        return colors.textSecondary;
      case 'paused':
        return '#f59e0b';
      case 'upcoming':
        return '#3b82f6';
      case 'expired':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Exams</Text>
        <Text style={styles.headerSubtitle}>Browse and attempt available exams</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exams by title..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
          activeOpacity={0.7}
        >
          <Ionicons name="filter" size={20} color={colors.primary} />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.filtersHeader}>
            <Text style={styles.filtersTitle}>Filter Exams</Text>
            {activeFiltersCount > 0 && (
              <TouchableOpacity onPress={clearFilters} activeOpacity={0.7}>
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  !filters.category && styles.filterChipActive,
                ]}
                onPress={() => handleFilterChange('category', '')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    !filters.category && styles.filterChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {user?.examPreparations && Array.isArray(user.examPreparations) && user.examPreparations.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterChip,
                    filters.category === cat && styles.filterChipActive,
                  ]}
                  onPress={() => handleFilterChange('category', cat)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filters.category === cat && styles.filterChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Language Filter */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Language</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
              {['', 'English', 'Hindi', 'Both'].map((lang) => (
                <TouchableOpacity
                  key={lang || 'all'}
                  style={[
                    styles.filterChip,
                    filters.language === lang && styles.filterChipActive,
                  ]}
                  onPress={() => handleFilterChange('language', lang)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filters.language === lang && styles.filterChipTextActive,
                    ]}
                  >
                    {lang || 'All'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Sort By */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Sort By</Text>
            <View style={styles.sortContainer}>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  filters.sortBy === 'scheduledTime' && styles.sortButtonActive,
                ]}
                onPress={() => handleFilterChange('sortBy', 'scheduledTime')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.sortButtonText,
                    filters.sortBy === 'scheduledTime' && styles.sortButtonTextActive,
                  ]}
                >
                  Date
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  filters.sortBy === 'title' && styles.sortButtonActive,
                ]}
                onPress={() => handleFilterChange('sortBy', 'title')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.sortButtonText,
                    filters.sortBy === 'title' && styles.sortButtonTextActive,
                  ]}
                >
                  Title
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sort Order */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Order</Text>
            <View style={styles.sortContainer}>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  filters.sortOrder === 'desc' && styles.sortButtonActive,
                ]}
                onPress={() => handleFilterChange('sortOrder', 'desc')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.sortButtonText,
                    filters.sortOrder === 'desc' && styles.sortButtonTextActive,
                  ]}
                >
                  Newest
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  filters.sortOrder === 'asc' && styles.sortButtonActive,
                ]}
                onPress={() => handleFilterChange('sortOrder', 'asc')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.sortButtonText,
                    filters.sortOrder === 'asc' && styles.sortButtonTextActive,
                  ]}
                >
                  Oldest
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Exams List */}
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
        {loading && exams.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading exams...</Text>
          </View>
        ) : exams.length > 0 ? (
          <>
            <View style={styles.resultsInfo}>
              <Text style={styles.resultsText}>
                Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.limit, pagination.totalExams)} of{' '}
                {pagination.totalExams} exams
              </Text>
            </View>

            <View style={styles.examsGrid}>
              {exams.map((exam) => {
                const status = getExamStatus(exam);
                const statusColor = getStatusColor(status);

                return (
                  <View key={exam._id} style={styles.examCard}>
                    <View style={styles.examCardHeader}>
                      <Text style={styles.examCardTitle} numberOfLines={2}>
                        {exam.title}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusColor + '20' },
                        ]}
                      >
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.examCardBody}>
                      <Text style={styles.examCategory} numberOfLines={1}>
                        {exam.category?.name || exam.category}
                        {exam.subCategory && ` → ${exam.subCategory?.name || exam.subCategory}`}
                        {exam.tier && ` → ${exam.tier?.name || exam.tier}`}
                      </Text>

                      <View style={styles.examDetails}>
                        <View style={styles.examDetailRow}>
                          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                          <Text style={styles.examDetailText}>
                            {formatDate(exam.scheduledTime)}
                          </Text>
                        </View>
                        <View style={styles.examDetailRow}>
                          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                          <Text style={styles.examDetailText}>
                            {exam.duration} minutes
                          </Text>
                        </View>
                        <View style={styles.examDetailRow}>
                          <Ionicons name="trophy-outline" size={14} color={colors.textSecondary} />
                          <Text style={styles.examDetailText}>
                            {exam.totalMarks} marks
                          </Text>
                        </View>
                        {exam.language && (
                          <View style={styles.examDetailRow}>
                            <Ionicons name="language-outline" size={14} color={colors.textSecondary} />
                            <Text style={styles.examDetailText}>
                              {exam.language}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.examCardActions}>
                      {exam.isAttempted && exam.attemptId ? (
                        <>
                          <TouchableOpacity
                            style={[styles.examActionButton, styles.viewResultButton]}
                            onPress={() => navigation.navigate('Result', { attemptId: exam.attemptId })}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.viewResultButtonText}>View Result</Text>
                          </TouchableOpacity>
                          {status === 'available' && (
                            <TouchableOpacity
                              style={[styles.examActionButton, styles.retryButton]}
                              onPress={() => navigation.navigate('ExamDetail', { examId: exam._id })}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                              <Text style={styles.retryButtonText}>Retry</Text>
                            </TouchableOpacity>
                          )}
                        </>
                      ) : exam.isPaused ? (
                        <TouchableOpacity
                          style={[styles.examActionButton, styles.startExamButton]}
                          onPress={() => navigation.navigate('ExamDetail', { examId: exam._id })}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="play-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.startExamButtonText}>Continue</Text>
                        </TouchableOpacity>
                      ) : status === 'available' ? (
                        <TouchableOpacity
                          style={[styles.examActionButton, styles.startExamButton]}
                          onPress={() => navigation.navigate('ExamDetail', { examId: exam._id })}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="play-circle-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.startExamButtonText}>Start Exam</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.examActionButton, styles.disabledButton]}>
                          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                          <Text style={styles.disabledButtonText}>
                            {status === 'upcoming' ? 'Upcoming' : status === 'expired' ? 'Expired' : 'Not Available'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    pagination.currentPage === 1 && styles.paginationButtonDisabled,
                  ]}
                  onPress={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={pagination.currentPage === 1 ? colors.textSecondary : colors.primary}
                  />
                  <Text
                    style={[
                      styles.paginationButtonText,
                      pagination.currentPage === 1 && styles.paginationButtonTextDisabled,
                    ]}
                  >
                    Previous
                  </Text>
                </TouchableOpacity>

                <View style={styles.paginationInfo}>
                  <Text style={styles.paginationInfoText}>
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    pagination.currentPage === pagination.totalPages && styles.paginationButtonDisabled,
                  ]}
                  onPress={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.paginationButtonText,
                      pagination.currentPage === pagination.totalPages && styles.paginationButtonTextDisabled,
                    ]}
                  >
                    Next
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={pagination.currentPage === pagination.totalPages ? colors.textSecondary : colors.primary}
                  />
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No exams found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || activeFiltersCount > 0
                ? 'Try adjusting your filters or search query.'
                : 'Check back later for new exams.'}
            </Text>
            {(searchQuery || activeFiltersCount > 0) && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={clearFilters}
                activeOpacity={0.7}
              >
                <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    searchContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    filterButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      position: 'relative',
    },
    filterBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: colors.primary,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    filterBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: 'bold',
    },
    filtersPanel: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    filtersHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    filtersTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    clearFiltersText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
    },
    filterRow: {
      marginBottom: 16,
    },
    filterLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    filterOptions: {
      flexDirection: 'row',
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipText: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '500',
    },
    filterChipTextActive: {
      color: '#FFFFFF',
    },
    sortContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    sortButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    sortButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    sortButtonText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    sortButtonTextActive: {
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
      paddingVertical: 60,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.textSecondary,
    },
    resultsInfo: {
      marginBottom: 16,
    },
    resultsText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    examsGrid: {
      gap: 16,
    },
    examCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    examCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
      gap: 8,
    },
    examCardTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      lineHeight: 22,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      minWidth: 70,
      alignItems: 'center',
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: 'bold',
    },
    examCardBody: {
      marginBottom: 12,
    },
    examCategory: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    examDetails: {
      gap: 8,
    },
    examDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    examDetailText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    examCardActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    examActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      gap: 6,
      flex: 1,
    },
    startExamButton: {
      backgroundColor: colors.primary,
    },
    startExamButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    viewResultButton: {
      backgroundColor: colors.primary,
    },
    viewResultButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    retryButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    retryButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },
    disabledButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      opacity: 0.6,
    },
    disabledButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 24,
      paddingTop: 24,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    paginationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    paginationButtonDisabled: {
      opacity: 0.5,
    },
    paginationButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    paginationButtonTextDisabled: {
      color: colors.textSecondary,
    },
    paginationInfo: {
      paddingHorizontal: 16,
    },
    paginationInfoText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
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
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    clearFiltersButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    clearFiltersButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
