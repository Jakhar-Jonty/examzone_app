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
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { formatDate, getExamStatus } from '../utils/helpers';

export default function CategoryDetailScreen({ route, navigation }) {
  const { categoryId } = route.params;
  const { colors } = useTheme();
  const [category, setCategory] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [exams, setExams] = useState({});
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingExams, setLoadingExams] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCategory();
  }, [categoryId]);

  const fetchCategory = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/categories/${categoryId}`);
      setCategory(response.data.category);
      await fetchTiers();
      // Fetch category-level exams on initial load
      await fetchExamsForNode({ type: 'category', category: categoryId });
    } catch (error) {
      console.error('Failed to fetch category:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTiers = async () => {
    try {
      const response = await api.get(`/categories/${categoryId}/tiers`);
      setTiers(response.data.tiers || []);
    } catch (error) {
      console.error('Failed to fetch tiers:', error);
    }
  };

  const fetchExamsForNode = async (node) => {
    const nodeKey = getNodeKey(node);
    if (exams[nodeKey]) {
      return; // Already loaded
    }

    try {
      setLoadingExams(true);
      const params = [];
      if (node.category) params.push(`category=${node.category}`);
      if (node.subCategory) params.push(`subCategory=${node.subCategory}`);
      if (node.tier) params.push(`tier=${node.tier}`);
      params.push('status=active');
      params.push('minimal=true');

      const response = await api.get(`/user/exams?${params.join('&')}`);
      setExams(prev => ({
        ...prev,
        [nodeKey]: response.data.exams || []
      }));
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    } finally {
      setLoadingExams(false);
    }
  };

  const getNodeKey = (node) => {
    return `${node.type}_${node.category || ''}_${node.subCategory || ''}_${node.tier || ''}`;
  };

  const toggleNode = async (nodeKey, node) => {
    const newExpanded = new Set(expandedNodes);
    const isExpanding = !newExpanded.has(nodeKey);
    
    if (isExpanding) {
      newExpanded.add(nodeKey);
      await fetchExamsForNode(node);
    } else {
      newExpanded.delete(nodeKey);
    }
    setExpandedNodes(newExpanded);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategory();
  };

  const styles = createStyles(colors);

  if (loading && !category) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Category</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!category) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Category</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Category not found</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const categoryExams = exams[getNodeKey({ type: 'category', category: categoryId })] || [];
  const categoryTiers = tiers.filter(t => !t.subCategory);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {category.displayName || category.name}
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
        {/* Category Header */}
        <View style={styles.categoryHeader}>
          {category.logo ? (
            <Image
              source={{ uri: category.logo }}
              style={styles.categoryLogo}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.categoryIconContainer}>
              <Ionicons name="folder" size={48} color={colors.primary} />
            </View>
          )}
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryName}>
              {category.displayName || category.name}
            </Text>
            {category.description && (
              <Text style={styles.categoryDescription}>
                {category.description}
              </Text>
            )}
            <View style={styles.categoryBadges}>
              {category.examCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {category.examCount} {category.examCount === 1 ? 'Exam' : 'Exams'}
                  </Text>
                </View>
              )}
              {category.questionCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {category.questionCount} {category.questionCount === 1 ? 'Question' : 'Questions'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Subcategories */}
        {category.subCategories && category.subCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subcategories</Text>
            {category.subCategories.map((subCategory) => (
              <TouchableOpacity
                key={subCategory._id}
                style={styles.subCategoryCard}
                onPress={() => {
                  navigation.navigate('SubCategoryDetail', { subCategoryId: subCategory._id });
                }}
                activeOpacity={0.7}
              >
                <View style={styles.subCategoryLeft}>
                  {subCategory.logo ? (
                    <Image
                      source={{ uri: subCategory.logo }}
                      style={styles.subCategoryLogo}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.subCategoryIconContainer}>
                      <Ionicons name="layers" size={24} color={colors.primary} />
                    </View>
                  )}
                  <View style={styles.subCategoryInfo}>
                    <Text style={styles.subCategoryName}>
                      {subCategory.displayName || subCategory.name}
                    </Text>
                    {subCategory.description && (
                      <Text style={styles.subCategoryDescription} numberOfLines={2}>
                        {subCategory.description}
                      </Text>
                    )}
                    {subCategory.examCount > 0 && (
                      <Text style={styles.subCategoryExamCount}>
                        {subCategory.examCount} {subCategory.examCount === 1 ? 'exam' : 'exams'}
                      </Text>
                    )}
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Category-level Exams */}
        {categoryExams.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exams</Text>
            <View style={styles.examsGrid}>
              {categoryExams.map((exam) => {
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
                        <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                        <Text style={styles.examDetailText}>
                          {formatDate(exam.scheduledTime)}
                        </Text>
                      </View>
                      <View style={styles.examDetailRow}>
                        <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                        <Text style={styles.examDetailText}>
                          {exam.duration} min • {exam.totalMarks} marks
                        </Text>
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
          </View>
        )}

        {/* Category-level Tiers */}
        {categoryTiers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tiers</Text>
            {categoryTiers.map((tier) => {
              const nodeKey = getNodeKey({ type: 'tier', category: categoryId, tier: tier._id });
              const tierExams = exams[nodeKey] || [];
              const isExpanded = expandedNodes.has(nodeKey);

              return (
                <View key={tier._id} style={styles.tierCard}>
                  <TouchableOpacity
                    style={styles.tierHeader}
                    onPress={() => toggleNode(nodeKey, { type: 'tier', category: categoryId, tier: tier._id })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tierHeaderLeft}>
                      <Ionicons name="layers" size={20} color={colors.primary} />
                      <Text style={styles.tierName}>{tier.name}</Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.tierContent}>
                      {loadingExams ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : tierExams.length > 0 ? (
                        <View style={styles.examsGrid}>
                          {tierExams.map((exam) => {
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
                                    <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                                    <Text style={styles.examDetailText}>
                                      {formatDate(exam.scheduledTime)}
                                    </Text>
                                  </View>
                                  <View style={styles.examDetailRow}>
                                    <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                                    <Text style={styles.examDetailText}>
                                      {exam.duration} min • {exam.totalMarks} marks
                                    </Text>
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
                      ) : (
                        <Text style={styles.emptyText}>No exams available</Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {(!category.subCategories || category.subCategories.length === 0) &&
         categoryTiers.length === 0 &&
         categoryExams.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No content available</Text>
            <Text style={styles.emptySubtext}>
              This category doesn't have any subcategories, tiers, or exams yet.
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
    categoryHeader: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryLogo: {
      width: 80,
      height: 80,
      borderRadius: 16,
      marginRight: 16,
    },
    categoryIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 16,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    categoryInfo: {
      flex: 1,
    },
    categoryName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    categoryDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    categoryBadges: {
      flexDirection: 'row',
      gap: 8,
    },
    badge: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
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
    tierCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    tierHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
    },
    tierHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    tierName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    tierContent: {
      padding: 16,
      paddingTop: 0,
    },
    subCategoryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    subCategoryLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    subCategoryLogo: {
      width: 48,
      height: 48,
      borderRadius: 12,
    },
    subCategoryIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    subCategoryInfo: {
      flex: 1,
    },
    subCategoryName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    subCategoryDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    subCategoryExamCount: {
      fontSize: 12,
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

