import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { formatDate, getExamStatus } from '../utils/helpers';

export default function SubCategoryDetailScreen({ route, navigation }) {
  const { subCategoryId } = route.params;
  const { colors } = useTheme();
  const [subCategory, setSubCategory] = useState(null);
  const [parentCategory, setParentCategory] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedTierId, setSelectedTierId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingExams, setLoadingExams] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalExams: 0,
    limit: 20,
  });

  useEffect(() => {
    fetchSubCategory();
  }, [subCategoryId]);

  useEffect(() => {
    if (subCategoryId) {
      if (selectedTierId) {
        // Fetch exams for selected tier
        fetchExams(1, false);
      } else {
        // Fetch subcategory-level exams (no tier filter)
        fetchExams(1, false);
      }
    }
  }, [subCategoryId, selectedTierId, searchQuery]);

  const fetchSubCategory = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/categories/${subCategoryId}`);
      const categoryData = response.data.category;
      
      setSubCategory(categoryData);
      
      // Get parent category ID
      let parentCategoryId = null;
      if (categoryData.parentCategory) {
        if (typeof categoryData.parentCategory === 'string') {
          // It's just an ID
          parentCategoryId = categoryData.parentCategory;
          // Fetch the parent details
          try {
            const parentResponse = await api.get(`/categories/${parentCategoryId}`);
            setParentCategory(parentResponse.data.category);
          } catch (error) {
            console.error('Failed to fetch parent category:', error);
          }
        } else {
          // It's already populated
          parentCategoryId = categoryData.parentCategory._id || categoryData.parentCategory;
          setParentCategory(categoryData.parentCategory);
        }
      }
      
      // Fetch tiers for this subcategory
      if (parentCategoryId) {
        await fetchTiers(parentCategoryId);
      }
    } catch (error) {
      console.error('Failed to fetch subcategory:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTiers = async (categoryId) => {
    try {
      const response = await api.get(`/categories/${categoryId}/tiers?subCategoryId=${subCategoryId}`);
      setTiers(response.data.tiers || []);
    } catch (error) {
      console.error('Failed to fetch tiers:', error);
    }
  };

  const fetchExams = async (page = 1, append = false) => {
    try {
      setLoadingExams(true);
      const params = [
        `subCategory=${subCategoryId}`,
        'status=active',
        'minimal=true',
        `page=${page}`,
        `limit=${pagination.limit}`,
      ];

      // Add tier filter if selected
      if (selectedTierId) {
        params.push(`tier=${selectedTierId}`);
      }

      // Add search query
      if (searchQuery.trim()) {
        params.push(`search=${encodeURIComponent(searchQuery.trim())}`);
      }

      const response = await api.get(`/user/exams?${params.join('&')}`);
      const examsData = response.data.exams || [];
      
      if (append) {
        setExams(prev => [...prev, ...examsData]);
      } else {
        setExams(examsData);
      }
      
      setPagination(response.data.pagination || pagination);
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    } finally {
      setLoadingExams(false);
    }
  };

  const handleTierSelect = async (tierId) => {
    if (selectedTierId === tierId) {
      // Deselect if same tier clicked
      setSelectedTierId(null);
      setPagination({ currentPage: 1, totalPages: 1, totalExams: 0, limit: 20 });
      setExams([]);
    } else {
      // Select new tier
      setSelectedTierId(tierId);
      setPagination({ currentPage: 1, totalPages: 1, totalExams: 0, limit: 20 });
      await fetchExams(1, false);
    }
  };

  const loadMoreExams = () => {
    if (pagination.currentPage < pagination.totalPages && !loadingExams) {
      fetchExams(pagination.currentPage + 1, true);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchExams(newPage, false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubCategory();
    if (selectedTierId) {
      fetchExams(1, false);
    }
  };

  const styles = createStyles(colors);

  if (loading && !subCategory) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Subcategory</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!subCategory) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Subcategory</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Subcategory not found</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const hasTiers = tiers.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {subCategory.displayName || subCategory.name}
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
        {/* Subcategory Header */}
        <View style={styles.subCategoryHeader}>
          {subCategory.logo ? (
            <Image
              source={{ uri: subCategory.logo }}
              style={styles.subCategoryLogo}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.subCategoryIconContainer}>
              <Ionicons name="layers" size={48} color={colors.primary} />
            </View>
          )}
          <View style={styles.subCategoryInfo}>
            <Text style={styles.subCategoryName}>
              {subCategory.displayName || subCategory.name}
            </Text>
            {parentCategory && (
              <Text style={styles.parentCategory}>
                {parentCategory.displayName || parentCategory.name}
              </Text>
            )}
            {subCategory.description && (
              <Text style={styles.subCategoryDescription}>
                {subCategory.description}
              </Text>
            )}
            {subCategory.examCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {subCategory.examCount} {subCategory.examCount === 1 ? 'Exam' : 'Exams'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Tiers - Horizontal Scroll */}
        {hasTiers && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Tier</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tiersContainer}
            >
              {tiers.map((tier, index) => {
                const isSelected = selectedTierId === tier._id;
                return (
                  <TouchableOpacity
                    key={tier._id}
                    style={[
                      styles.tierCardHorizontal,
                      index === 0 && styles.tierCardFirst,
                      isSelected && styles.tierCardSelected,
                    ]}
                    onPress={() => handleTierSelect(tier._id)}
                    activeOpacity={0.7}
                  >
                    {tier.image ? (
                      <Image
                        source={{ uri: tier.image }}
                        style={styles.tierImageHorizontal}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.tierIconContainerHorizontal}>
                        <Ionicons name="book" size={32} color={colors.primary} />
                      </View>
                    )}
                    <Text style={[
                      styles.tierNameHorizontal,
                      isSelected && styles.tierNameSelected,
                    ]} numberOfLines={2}>
                      {tier.name}
                    </Text>
                    {tier.description && (
                      <Text style={styles.tierDescriptionHorizontal} numberOfLines={2}>
                        {tier.description}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exams..."
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
        </View>

        {/* Exams List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedTierId 
                ? tiers.find(t => t._id === selectedTierId)?.name || 'Exams'
                : 'Exams'}
            </Text>
            {pagination.totalExams > 0 && (
              <Text style={styles.examCountText}>
                {pagination.totalExams} {pagination.totalExams === 1 ? 'exam' : 'exams'}
              </Text>
            )}
          </View>
            
            {loadingExams && exams.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : exams.length > 0 ? (
              <>
                <View style={styles.examsGrid}>
                  {exams.map((exam) => {
                const status = getExamStatus(exam);
                return (
                  <View
                    key={exam._id}
                    style={styles.examCard}
                  >
                    <View style={styles.examCardHeader}>
                      <Text style={styles.examCardTitle} numberOfLines={2}>
                        {exam.title}
                      </Text>
                      <View style={[
                        styles.statusBadge,
                        status === 'available' && styles.statusBadgeAvailable,
                        status === 'completed' && styles.statusBadgeCompleted,
                        status === 'upcoming' && styles.statusBadgeUpcoming,
                      ]}>
                        <Text style={styles.statusBadgeText}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.examCardDetails}>
                      <View style={styles.examDetailRow}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.examDetailText}>
                          {formatDate(exam.scheduledTime)}
                        </Text>
                      </View>
                      <View style={styles.examDetailRow}>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.examDetailText}>
                          {exam.duration} min
                        </Text>
                        <Ionicons name="trophy-outline" size={14} color={colors.textSecondary} style={{ marginLeft: 12 }} />
                        <Text style={styles.examDetailText}>
                          {exam.totalMarks} marks
                        </Text>
                      </View>
                      {exam.totalQuestions && (
                        <View style={styles.examDetailRow}>
                          <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
                          <Text style={styles.examDetailText}>
                            {exam.totalQuestions} questions
                          </Text>
                        </View>
                      )}
                      {exam.language && (
                        <View style={styles.examDetailRow}>
                          <Ionicons name="language-outline" size={14} color={colors.textSecondary} />
                          <Text style={styles.examDetailText}>
                            {exam.language}
                          </Text>
                        </View>
                      )}
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
                      ) : status === 'upcoming' ? (
                        <View style={[styles.examActionButton, styles.disabledButton]}>
                          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                          <Text style={styles.disabledButtonText}>Coming Soon</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
                </View>
                
                {/* Pagination Controls */}
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
                      <Ionicons name="chevron-back" size={20} color={pagination.currentPage === 1 ? colors.textSecondary : colors.primary} />
                      <Text style={[
                        styles.paginationButtonText,
                        pagination.currentPage === 1 && styles.paginationButtonTextDisabled,
                      ]}>
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
                      <Text style={[
                        styles.paginationButtonText,
                        pagination.currentPage === pagination.totalPages && styles.paginationButtonTextDisabled,
                      ]}>
                        Next
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color={pagination.currentPage === pagination.totalPages ? colors.textSecondary : colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
                
                {/* Load More Button (Alternative) */}
                {pagination.currentPage < pagination.totalPages && (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={loadMoreExams}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.loadMoreText}>
                      Load More ({pagination.totalExams - exams.length} remaining)
                    </Text>
                    {loadingExams && (
                      <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                )}
                
                {pagination.totalExams > 0 && (
                  <Text style={styles.paginationText}>
                    Showing {exams.length} of {pagination.totalExams} exams
                  </Text>
                )}
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No exams found</Text>
                {searchQuery && (
                  <Text style={styles.emptySubtext}>
                    Try adjusting your search query
                  </Text>
                )}
              </View>
            )}
          </View>

        {/* Empty State - No tiers and no exams */}
        {!hasTiers && exams.length === 0 && !loadingExams && (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No content available</Text>
            <Text style={styles.emptySubtext}>
              This subcategory doesn't have any tiers or exams yet.
            </Text>
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
    subCategoryHeader: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    subCategoryLogo: {
      width: 80,
      height: 80,
      borderRadius: 16,
      marginRight: 16,
    },
    subCategoryIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 16,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    subCategoryInfo: {
      flex: 1,
    },
    subCategoryName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    parentCategory: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
      marginBottom: 8,
    },
    subCategoryDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    badge: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    badgeText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '600',
    },
    section: {
      marginBottom: 28,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    examCountText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    tiersContainer: {
      paddingLeft: 0,
      paddingRight: 20,
    },
    tierCardHorizontal: {
      width: 160,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      marginRight: 12,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.border,
    },
    tierCardFirst: {
      marginLeft: 0,
    },
    tierCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    tierImageHorizontal: {
      width: 64,
      height: 64,
      borderRadius: 16,
      marginBottom: 12,
    },
    tierIconContainerHorizontal: {
      width: 64,
      height: 64,
      borderRadius: 16,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    tierNameHorizontal: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 6,
    },
    tierNameSelected: {
      color: colors.primary,
    },
    tierDescriptionHorizontal: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    searchContainer: {
      marginBottom: 20,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
    loadMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary + '15',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginTop: 16,
    },
    loadMoreText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    paginationText: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 12,
    },
    paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 20,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    paginationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
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
      flex: 1,
      alignItems: 'center',
    },
    paginationInfoText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    examsGrid: {
      gap: 12,
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
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      lineHeight: 20,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusBadgeAvailable: {
      backgroundColor: colors.primary + '20',
    },
    statusBadgeCompleted: {
      backgroundColor: colors.textSecondary + '20',
    },
    statusBadgeUpcoming: {
      backgroundColor: '#f59e0b' + '20',
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.text,
    },
    examCardDetails: {
      gap: 8,
    },
    examDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    examDetailText: {
      fontSize: 12,
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
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 16,
      fontWeight: '600',
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
  });

