import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
} from 'react-native';
import tw from 'twrnc';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import ExamCard, {
  ExamFilterChips,
  ExamSortChips,
  filterExamsByChip,
  examFilterCounts,
} from '../components/ExamCard';
import { ExamCardSkeletonList } from '../components/ExamCardSkeleton';
import { sortExams } from '../utils/examSort';
import { trackRecentSubcategory } from '../utils/recentSubcategories';
import { t as tr } from '../i18n';

// ─── Shared Components ───────────────────────────────────
function Header({ title, navigation, colors }) {
  return (
    <View
      style={[
        tw`flex-row items-center justify-between px-4 pt-4 pb-3 border-b`,
        { borderColor: colors.border },
      ]}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </TouchableOpacity>
      <Text
        style={[tw`flex-1 text-base font-bold text-center mx-2`, { color: colors.text }]}
        numberOfLines={1}
      >
        {title}
      </Text>
      <View style={tw`w-10`} />
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────
const LIMIT = 20;

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
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [examFilter, setExamFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalExams: 0,
  });

  const searchDebounceRef = useRef(null);
  const selectedTierRef = useRef(null);

  // ─── Initial load ──────────────────────────────────────
  useEffect(() => {
    trackRecentSubcategory(subCategoryId);
    fetchSubCategory();
  }, [subCategoryId]);

  // ─── Fetch exams when tier or search changes (debounced for search) ──
  useEffect(() => {
    if (!subCategory) return;

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchExams(1);
    }, searchQuery ? 400 : 0); // Instant for tier change, debounced for search

    return () => clearTimeout(searchDebounceRef.current);
  }, [selectedTierId, searchQuery, subCategory]);

  // ─── Fetch subcategory + tiers ─────────────────────────
  const fetchSubCategory = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/categories/${subCategoryId}`);
      const categoryData = response.data.category;
      setSubCategory(categoryData);

      // Determine parent ID
      const parentId =
        typeof categoryData.parentCategory === 'string'
          ? categoryData.parentCategory
          : categoryData.parentCategory?._id;

      if (typeof categoryData.parentCategory !== 'string' && categoryData.parentCategory) {
        setParentCategory(categoryData.parentCategory);
      }

      // Fetch parent details + tiers in parallel
      if (parentId) {
        const [parentRes, tiersRes] = await Promise.all([
          typeof categoryData.parentCategory === 'string'
            ? api.get(`/categories/${parentId}`).catch(() => null)
            : Promise.resolve(null),
          api
            .get(`/categories/${parentId}/tiers?subCategoryId=${subCategoryId}`)
            .catch(() => ({ data: { tiers: [] } })),
        ]);

        if (parentRes?.data?.category) setParentCategory(parentRes.data.category);
        setTiers(tiersRes.data.tiers || []);
      }
    } catch {
      setError('Failed to load. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ─── Fetch exams ───────────────────────────────────────
  const fetchExams = async (page = 1) => {
    try {
      setLoadingExams(true);

      const params = new URLSearchParams({
        subCategory: subCategoryId,
        status: 'active',
        minimal: 'true',
        page: page.toString(),
        limit: LIMIT.toString(),
      });

      if (selectedTierId) params.set('tier', selectedTierId);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const response = await api.get(`/user/exams?${params.toString()}`);

      setExams(response.data.exams || []);
      setPagination({
        currentPage: response.data.pagination?.currentPage || page,
        totalPages: response.data.pagination?.totalPages || 1,
        totalExams: response.data.pagination?.totalExams || 0,
      });
    } catch {
      setExams([]);
    } finally {
      setLoadingExams(false);
    }
  };

  const handleTierSelect = (tierId) => {
    // Toggle - deselect if same
    setSelectedTierId((prev) => (prev === tierId ? null : tierId));
    // useEffect will handle the fetch
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchExams(page);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setExams([]);
    setSelectedTierId(null);
    setSearchQuery('');
    setExamFilter('all');
    fetchSubCategory();
  };

  // ─── Loading ───────────────────────────────────────────
  if (loading && !subCategory) {
    return (
      <ScreenWrapper>
        <View style={[tw`flex-1`, { backgroundColor: colors.surface }]}>
          <Header title={tr("Subcategory")} navigation={navigation} colors={colors} />
          <View style={tw`flex-1 px-5 pt-4`}>
            <ExamCardSkeletonList count={4} colors={colors} />
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  // ─── Error / Empty ─────────────────────────────────────
  if (error || !subCategory) {
    return (
      <ScreenWrapper>
        <View style={[tw`flex-1`, { backgroundColor: colors.surface }]}>
          <Header title={tr("Subcategory")} navigation={navigation} colors={colors} />
          <View style={tw`flex-1 items-center justify-center px-10`}>
            <Ionicons name="layers-outline" size={48} color={colors.textSecondary} />
            <Text style={[tw`text-base font-semibold mt-3`, { color: colors.text }]}>
              {error || tr("Subcategory not found")}
            </Text>
            <TouchableOpacity
              style={[tw`mt-4 px-5 py-2.5 rounded-xl`, { backgroundColor: colors.hero }]}
              onPress={fetchSubCategory}
              activeOpacity={0.7}
            >
              <Text style={[tw`text-sm font-semibold`, { color: colors.heroText }]}>{tr("Retry")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  // ─── Computed ──────────────────────────────────────────
  const selectedTierName = tiers.find((t) => t._id === selectedTierId)?.name;
  const filteredExams = sortExams(filterExamsByChip(exams, examFilter), sortBy);
  const examCounts = examFilterCounts(exams);
  const isEmpty = tiers.length === 0 && exams.length === 0 && !loadingExams && !searchQuery;

  // ═══════════════════════════════════════════════════════
  return (
    <ScreenWrapper>
      <View style={[tw`flex-1`, { backgroundColor: colors.surface }]}>
        <Header
          title={subCategory.displayName || subCategory.name}
          navigation={navigation}
          colors={colors}
        />

        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-5 pb-10`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.text}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Compact subcategory banner ───────────── */}
          <View style={tw`flex-row items-center mt-4 mb-5`}>
            {subCategory.logo ? (
              <Image
                source={{ uri: subCategory.logo }}
                style={[
                  tw`w-14 h-14 rounded-2xl mr-3.5`,
                  { backgroundColor: colors.card },
                ]}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  tw`w-14 h-14 rounded-2xl items-center justify-center mr-3.5`,
                  { backgroundColor: colors.cardMuted },
                ]}
              >
                <Ionicons name="layers" size={24} color={colors.text} />
              </View>
            )}
            <View style={tw`flex-1`}>
              <Text style={[tw`text-base font-bold`, { color: colors.text }]} numberOfLines={1}>
                {subCategory.displayName || subCategory.name}
              </Text>
              {parentCategory && (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('CategoryDetail', {
                      categoryId: parentCategory._id,
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Text style={[tw`text-[11px] font-semibold mt-0.5`, { color: colors.text }]}>
                    {parentCategory.displayName || parentCategory.name}
                  </Text>
                </TouchableOpacity>
              )}
              {subCategory.description ? (
                <Text
                  style={[tw`text-[11px] leading-4 mt-0.5`, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {subCategory.description}
                </Text>
              ) : null}
              {subCategory.examCount > 0 && (
                <View
                  style={[
                    tw`self-start px-2 py-0.5 rounded-md mt-2`,
                    { backgroundColor: colors.cardMuted },
                  ]}
                >
                  <Text style={[tw`text-[10px] font-semibold`, { color: colors.text }]}>
                    {subCategory.examCount} {subCategory.examCount === 1 ? tr("exam") : tr("exams")}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ─── Tier Chips ───────────────────────────── */}
          {tiers.length > 0 && (
            <View style={tw`mb-4`}>
              <Text style={[tw`text-sm font-bold mb-2.5`, { color: colors.text }]}>
                {tr("Filter by Tier")}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={tw`gap-2`}
              >
                {/* All chip */}
                <TouchableOpacity
                  style={[
                    tw`px-4 py-2.5 rounded-xl border`,
                    !selectedTierId
                      ? { backgroundColor: colors.cardMuted, borderColor: colors.hero }
                      : { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => setSelectedTierId(null)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      tw`text-xs font-semibold`,
                      { color: !selectedTierId ? colors.text : colors.text },
                    ]}
                  >
                    {tr("All")}
                  </Text>
                </TouchableOpacity>

                {tiers.map((tier) => {
                  const isSelected = selectedTierId === tier._id;
                  return (
                    <TouchableOpacity
                      key={tier._id}
                      style={[
                        tw`flex-row items-center px-4 py-2.5 rounded-xl border gap-2`,
                        isSelected
                          ? { backgroundColor: colors.cardMuted, borderColor: colors.hero }
                          : { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                      onPress={() => handleTierSelect(tier._id)}
                      activeOpacity={0.7}
                    >
                      {tier.image ? (
                        <Image
                          source={{ uri: tier.image }}
                          style={tw`w-5 h-5 rounded`}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons
                          name="layers"
                          size={14}
                          color={isSelected ? colors.text : colors.textSecondary}
                        />
                      )}
                      <Text
                        style={[
                          tw`text-xs font-semibold`,
                          { color: isSelected ? colors.text : colors.text },
                        ]}
                        numberOfLines={1}
                      >
                        {tier.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ─── Search ───────────────────────────────── */}
          <View
            style={[
              tw`flex-row items-center rounded-xl px-3.5 py-2.5 mb-4 border gap-2`,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={[tw`flex-1 text-sm`, { color: colors.text }]}
              placeholder={tr("Search exams...")}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* ─── Exams Section ─────────────────────────── */}
          <View style={tw`mb-6`}>
            {/* Section Header */}
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <Text style={[tw`text-base font-bold`, { color: colors.text }]}>
                {selectedTierName || tr("Exams")}
              </Text>
              {pagination.totalExams > 0 && (
                <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>
                  {pagination.totalExams} {pagination.totalExams === 1 ? tr("exam") : tr("exams")}
                </Text>
              )}
            </View>

            <ExamFilterChips
              value={examFilter}
              onChange={setExamFilter}
              colors={colors}
              counts={examCounts}
            />

            <ExamSortChips value={sortBy} onChange={setSortBy} colors={colors} />

            {/* Loading */}
            {loadingExams && exams.length === 0 ? (
              <ExamCardSkeletonList count={4} colors={colors} />
            ) : filteredExams.length > 0 ? (
              <>
                {/* Exam Cards */}
                <View style={tw`gap-3`}>
                  {filteredExams.map((exam) => (
                    <ExamCard
                      key={exam._id}
                      exam={exam}
                      navigation={navigation}
                      colors={colors}
                      showBreadcrumb={false}
                    />
                  ))}
                </View>

                {/* Pagination — single approach, no "load more" conflict */}
                {pagination.totalPages > 1 && (
                  <View
                    style={[
                      tw`flex-row items-center justify-between mt-5 pt-4 border-t`,
                      { borderColor: colors.border },
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        tw`flex-row items-center py-2 px-3.5 rounded-xl border gap-1`,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          opacity: pagination.currentPage === 1 ? 0.4 : 1,
                        },
                      ]}
                      onPress={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="chevron-back"
                        size={16}
                        color={
                          pagination.currentPage === 1 ? colors.textSecondary : colors.text
                        }
                      />
                      <Text
                        style={[
                          tw`text-xs font-semibold`,
                          {
                            color:
                              pagination.currentPage === 1
                                ? colors.textSecondary
                                : colors.text,
                          },
                        ]}
                      >
                        {tr("Prev")}
                      </Text>
                    </TouchableOpacity>

                    <Text style={[tw`text-xs font-medium`, { color: colors.textSecondary }]}>
                      {pagination.currentPage} / {pagination.totalPages}
                    </Text>

                    <TouchableOpacity
                      style={[
                        tw`flex-row items-center py-2 px-3.5 rounded-xl border gap-1`,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          opacity:
                            pagination.currentPage === pagination.totalPages ? 0.4 : 1,
                        },
                      ]}
                      onPress={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.totalPages}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          tw`text-xs font-semibold`,
                          {
                            color:
                              pagination.currentPage === pagination.totalPages
                                ? colors.textSecondary
                                : colors.text,
                          },
                        ]}
                      >
                        {tr("Next")}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={
                          pagination.currentPage === pagination.totalPages
                            ? colors.textSecondary
                            : colors.text
                        }
                      />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Results count */}
                {pagination.totalExams > 0 && (
                  <Text style={[tw`text-[10px] text-center mt-2`, { color: colors.textSecondary }]}>
                    {tr("Showing")} {(pagination.currentPage - 1) * LIMIT + 1}–
                    {Math.min(pagination.currentPage * LIMIT, pagination.totalExams)} {tr("of")}{' '}
                    {pagination.totalExams}
                  </Text>
                )}
              </>
            ) : exams.length > 0 ? (
              <View style={tw`items-center py-12`}>
                <Text style={[tw`text-sm font-semibold`, { color: colors.text }]}>
                  {tr("No exams match this filter")}
                </Text>
              </View>
            ) : (
              /* Empty exams */
              <View style={tw`items-center py-12`}>
                <View
                  style={[
                    tw`w-14 h-14 rounded-full items-center justify-center mb-3`,
                    { backgroundColor: colors.cardMuted },
                  ]}
                >
                  <Ionicons name="document-outline" size={24} color={colors.text} />
                </View>
                <Text style={[tw`text-sm font-semibold mb-1`, { color: colors.text }]}>
                  {tr("No exams found")}
                </Text>
                {searchQuery ? (
                  <Text style={[tw`text-xs text-center`, { color: colors.textSecondary }]}>
                    {tr("Try a different search term")}
                  </Text>
                ) : selectedTierId ? (
                  <Text style={[tw`text-xs text-center`, { color: colors.textSecondary }]}>
                    {tr("No exams in this tier yet")}
                  </Text>
                ) : null}
              </View>
            )}
          </View>

          {/* ─── Global Empty State ───────────────────── */}
          {isEmpty && (
            <View style={tw`items-center py-12 px-8`}>
              <View
                style={[
                  tw`w-16 h-16 rounded-full items-center justify-center mb-4`,
                  { backgroundColor: colors.cardMuted },
                ]}
              >
                <Ionicons name="folder-open-outline" size={32} color={colors.text} />
              </View>
              <Text style={[tw`text-base font-semibold mb-1`, { color: colors.text }]}>
                {tr("No content yet")}
              </Text>
              <Text style={[tw`text-sm text-center`, { color: colors.textSecondary }]}>
                {tr("This subcategory doesn't have any tiers or exams yet.")}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}
