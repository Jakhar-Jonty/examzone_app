import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import tw from 'twrnc';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import ExamCard, {
  ExamFilterChips,
  ExamSearchBar,
  ExamSortChips,
  filterExamsByChip,
  examFilterCounts,
} from '../components/ExamCard';
import { ExamCardSkeletonList } from '../components/ExamCardSkeleton';
import { sortExams } from '../utils/examSort';
import {
  getRecentSubcategoryIds,
  sortByRecentIds,
  trackRecentSubcategory,
} from '../utils/recentSubcategories';

// ─── Shared Header ───────────────────────────────────────
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

function getNodeKey(node) {
  return `${node.type}_${node.category || ''}_${node.subCategory || ''}_${node.tier || ''}`;
}

// ─── Main Component ──────────────────────────────────────
export default function CategoryDetailScreen({ route, navigation }) {
  const { categoryId } = route.params;
  const { colors } = useTheme();

  const [category, setCategory] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [exams, setExams] = useState({});
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingNodes, setLoadingNodes] = useState(new Set()); // Per-node loading
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [examFilter, setExamFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recentSubIds, setRecentSubIds] = useState([]);
  const searchDebounceRef = useRef(null);

  useEffect(() => {
    fetchCategory();
    getRecentSubcategoryIds().then(setRecentSubIds);
  }, [categoryId]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const q = encodeURIComponent(searchQuery.trim());
        const res = await api.get(
          `/user/exams?category=${categoryId}&search=${q}&status=active&minimal=true&limit=50`
        );
        setSearchResults(res.data.exams || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchQuery, categoryId]);

  const fetchCategory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch category, tiers, and category-level exams in parallel
      const [catRes, tiersRes, examsRes] = await Promise.all([
        api.get(`/categories/${categoryId}`),
        api.get(`/categories/${categoryId}/tiers`).catch(() => ({ data: { tiers: [] } })),
        api.get(`/user/exams?category=${categoryId}&status=active&minimal=true`).catch(() => ({
          data: { exams: [] },
        })),
      ]);

      setCategory(catRes.data.category);
      setTiers(tiersRes.data.tiers || []);

      const catNodeKey = getNodeKey({ type: 'category', category: categoryId });
      setExams((prev) => ({ ...prev, [catNodeKey]: examsRes.data.exams || [] }));
    } catch {
      setError('Failed to load category. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchExamsForNode = async (node) => {
    const nodeKey = getNodeKey(node);
    if (exams[nodeKey]) return;

    try {
      // Per-node loading tracking
      setLoadingNodes((prev) => new Set(prev).add(nodeKey));

      const params = [];
      if (node.category) params.push(`category=${node.category}`);
      if (node.subCategory) params.push(`subCategory=${node.subCategory}`);
      if (node.tier) params.push(`tier=${node.tier}`);
      params.push('status=active', 'minimal=true');

      const response = await api.get(`/user/exams?${params.join('&')}`);
      setExams((prev) => ({ ...prev, [nodeKey]: response.data.exams || [] }));
    } catch {
      // Set empty to prevent re-fetch
      setExams((prev) => ({ ...prev, [nodeKey]: [] }));
    } finally {
      setLoadingNodes((prev) => {
        const next = new Set(prev);
        next.delete(nodeKey);
        return next;
      });
    }
  };

  const toggleNode = async (nodeKey, node) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeKey)) {
      newExpanded.delete(nodeKey);
    } else {
      newExpanded.add(nodeKey);
      await fetchExamsForNode(node);
    }
    setExpandedNodes(newExpanded);
  };

  const onRefresh = () => {
    setRefreshing(true);
    setExams({});
    setExpandedNodes(new Set());
    setSearchQuery('');
    setSearchResults([]);
    fetchCategory();
  };

  // ─── Loading ───────────────────────────────────────────
  if (loading && !category) {
    return (
      <ScreenWrapper>
        <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
          <Header title="Category" navigation={navigation} colors={colors} />
          <View style={tw`flex-1 px-5 pt-4`}>
            <ExamCardSkeletonList count={4} colors={colors} />
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  // ─── Error / Empty ─────────────────────────────────────
  if (error || !category) {
    return (
      <ScreenWrapper>
        <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
          <Header title="Category" navigation={navigation} colors={colors} />
          <View style={tw`flex-1 items-center justify-center px-10`}>
            <Ionicons name="folder-open-outline" size={48} color={colors.textSecondary} />
            <Text style={[tw`text-base font-semibold mt-3 mb-1`, { color: colors.text }]}>
              {error || 'Category not found'}
            </Text>
            <TouchableOpacity
              style={[tw`mt-4 px-5 py-2.5 rounded-xl`, { backgroundColor: colors.primary }]}
              onPress={fetchCategory}
              activeOpacity={0.7}
            >
              <Text style={tw`text-sm font-semibold text-white`}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  // ─── Computed ──────────────────────────────────────────
  const categoryNodeKey = getNodeKey({ type: 'category', category: categoryId });
  const categoryExams = exams[categoryNodeKey] || [];
  const categoryTiers = tiers.filter((t) => !t.subCategory);
  const sortedSubCategories = sortByRecentIds(category.subCategories || [], recentSubIds);
  const filteredCategoryExams = sortExams(
    filterExamsByChip(categoryExams, examFilter),
    sortBy
  );
  const categoryExamCounts = examFilterCounts(categoryExams);
  const filteredSearchExams = sortExams(
    filterExamsByChip(searchResults, examFilter),
    sortBy
  );
  const searchExamCounts = examFilterCounts(searchResults);
  const showExamTools =
    searchQuery.trim() ||
    categoryExams.length > 0 ||
    categoryTiers.length > 0;

  const openSubCategory = async (subId) => {
    await trackRecentSubcategory(subId);
    setRecentSubIds((prev) => [String(subId), ...prev.filter((id) => id !== String(subId))]);
    navigation.navigate('SubCategoryDetail', { subCategoryId: subId });
  };

  const isEmpty =
    (!category.subCategories || category.subCategories.length === 0) &&
    categoryTiers.length === 0 &&
    categoryExams.length === 0;

  // ═══════════════════════════════════════════════════════
  return (
    <ScreenWrapper>
      <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
        <Header
          title={category.displayName || category.name}
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
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Compact category banner ───────────────── */}
          <View style={tw`flex-row items-center mt-4 mb-5`}>
            {category.logo ? (
              <Image
                source={{ uri: category.logo }}
                style={[
                  tw`w-14 h-14 rounded-2xl mr-3.5`,
                  { backgroundColor: colors.surface },
                ]}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  tw`w-14 h-14 rounded-2xl items-center justify-center mr-3.5`,
                  { backgroundColor: colors.primary + '10' },
                ]}
              >
                <Ionicons name="book-outline" size={24} color={colors.primary} />
              </View>
            )}
            <View style={tw`flex-1`}>
              <Text style={[tw`text-base font-bold`, { color: colors.text }]} numberOfLines={1}>
                {category.displayName || category.name}
              </Text>
              {category.description ? (
                <Text
                  style={[tw`text-[11px] leading-4 mt-0.5`, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {category.description}
                </Text>
              ) : null}
              <View style={tw`flex-row flex-wrap gap-1.5 mt-2`}>
                {category.examCount > 0 && (
                  <View
                    style={[tw`px-2 py-0.5 rounded-md`, { backgroundColor: colors.primary + '12' }]}
                  >
                    <Text style={[tw`text-[10px] font-semibold`, { color: colors.primary }]}>
                      {category.examCount} {category.examCount === 1 ? 'exam' : 'exams'}
                    </Text>
                  </View>
                )}
                {category.questionCount > 0 && (
                  <View
                    style={[tw`px-2 py-0.5 rounded-md`, { backgroundColor: colors.border }]}
                  >
                    <Text style={[tw`text-[10px] font-medium`, { color: colors.textSecondary }]}>
                      {category.questionCount} questions
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* ─── Browse: Home-style subcategory tiles ──── */}
          {category.subCategories?.length > 0 ? (
            <View style={tw`mb-6`}>
              <Text style={[tw`text-base font-bold mb-3`, { color: colors.text }]}>Browse</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={tw`pr-1`}
              >
                {sortedSubCategories.map((sub) => {
                  const isRecent = recentSubIds.includes(String(sub._id));
                  return (
                  <TouchableOpacity
                    key={sub._id}
                    style={[tw`items-center mr-3.5`, { width: 72 }]}
                    onPress={() => openSubCategory(sub._id)}
                    activeOpacity={0.7}
                  >
                    <View style={tw`relative`}>
                      {sub.logo ? (
                        <Image
                          source={{ uri: sub.logo }}
                          style={[
                            tw`w-12 h-12 rounded-2xl mb-1.5`,
                            { backgroundColor: colors.surface },
                          ]}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            tw`w-12 h-12 rounded-2xl items-center justify-center mb-1.5`,
                            { backgroundColor: colors.primary + '10' },
                          ]}
                        >
                          <Ionicons name="book-outline" size={20} color={colors.primary} />
                        </View>
                      )}
                      {isRecent && (
                        <View
                          style={[
                            tw`absolute -top-1 -right-1 w-4 h-4 rounded-full items-center justify-center`,
                            { backgroundColor: colors.primary },
                          ]}
                        >
                          <Ionicons name="time" size={9} color="#fff" />
                        </View>
                      )}
                    </View>
                    <Text
                      style={[tw`text-[10px] font-medium text-center`, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {sub.displayName || sub.name}
                    </Text>
                    {sub.examCount > 0 ? (
                      <Text style={[tw`text-[9px] mt-0.5`, { color: colors.textSecondary }]}>
                        {sub.examCount} exams
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
                })}
              </ScrollView>
            </View>
          ) : (
            !isEmpty && (
              <View style={tw`mb-4`}>
                <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>
                  No subcategories — browse exams below.
                </Text>
              </View>
            )
          )}

          {showExamTools && (
            <View style={tw`mb-4`}>
              <ExamSearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                colors={colors}
                placeholder="Search exams in this category..."
              />
              <ExamSortChips value={sortBy} onChange={setSortBy} colors={colors} />
            </View>
          )}

          {searchQuery.trim() ? (
            <SectionBlock title="Search results" colors={colors}>
              <ExamFilterChips
                value={examFilter}
                onChange={setExamFilter}
                colors={colors}
                counts={searchExamCounts}
              />
              {searchLoading ? (
                <ExamCardSkeletonList count={3} colors={colors} />
              ) : filteredSearchExams.length > 0 ? (
                <View style={tw`gap-3`}>
                  {filteredSearchExams.map((exam) => (
                    <ExamCard
                      key={exam._id}
                      exam={exam}
                      navigation={navigation}
                      colors={colors}
                      showBreadcrumb={false}
                    />
                  ))}
                </View>
              ) : (
                <Text style={[tw`text-xs text-center py-6`, { color: colors.textSecondary }]}>
                  No exams match your search
                </Text>
              )}
            </SectionBlock>
          ) : (
            <>
          {/* ─── Category-Level Exams ─────────────────── */}
          {categoryExams.length > 0 && (
            <SectionBlock title="Exams" colors={colors}>
              <ExamFilterChips
                value={examFilter}
                onChange={setExamFilter}
                colors={colors}
                counts={categoryExamCounts}
              />
              {filteredCategoryExams.length > 0 ? (
                <View style={tw`gap-3`}>
                  {filteredCategoryExams.map((exam) => (
                    <ExamCard
                      key={exam._id}
                      exam={exam}
                      navigation={navigation}
                      colors={colors}
                      showBreadcrumb={false}
                    />
                  ))}
                </View>
              ) : (
                <Text style={[tw`text-xs text-center py-6`, { color: colors.textSecondary }]}>
                  No exams match this filter
                </Text>
              )}
            </SectionBlock>
          )}

          {/* ─── Tiers (Expandable) ───────────────────── */}
          {categoryTiers.length > 0 && (
            <SectionBlock
              title={categoryExams.length > 0 ? 'Tiers' : 'Exams'}
              colors={colors}
            >
              <View style={tw`gap-2`}>
                {categoryTiers.map((tier) => {
                  const nodeKey = getNodeKey({
                    type: 'tier',
                    category: categoryId,
                    tier: tier._id,
                  });
                  const tierExams = exams[nodeKey] || [];
                  const filteredTierExams = sortExams(
                    filterExamsByChip(tierExams, examFilter),
                    sortBy
                  );
                  const isExpanded = expandedNodes.has(nodeKey);
                  const isLoadingNode = loadingNodes.has(nodeKey);

                  return (
                    <View
                      key={tier._id}
                      style={[
                        tw`rounded-2xl border overflow-hidden`,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      {/* Tier Header */}
                      <TouchableOpacity
                        style={tw`flex-row items-center justify-between p-3.5`}
                        onPress={() =>
                          toggleNode(nodeKey, {
                            type: 'tier',
                            category: categoryId,
                            tier: tier._id,
                          })
                        }
                        activeOpacity={0.7}
                      >
                        <View style={tw`flex-row items-center gap-3 flex-1`}>
                          <View
                            style={[
                              tw`w-9 h-9 rounded-xl items-center justify-center`,
                              { backgroundColor: colors.primary + '10' },
                            ]}
                          >
                            <Ionicons name="layers" size={18} color={colors.primary} />
                          </View>
                          <View style={tw`flex-1`}>
                            <Text style={[tw`text-sm font-semibold`, { color: colors.text }]}>
                              {tier.name}
                            </Text>
                            {tier.description && (
                              <Text
                                style={[tw`text-[10px] mt-0.5`, { color: colors.textSecondary }]}
                                numberOfLines={1}
                              >
                                {tier.description}
                              </Text>
                            )}
                          </View>
                        </View>
                        <Ionicons
                          name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                          size={18}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>

                      {/* Tier Content */}
                      {isExpanded && (
                        <View
                          style={[
                            tw`px-3.5 pb-3.5 pt-0`,
                            { borderTopWidth: 1, borderTopColor: colors.border },
                          ]}
                        >
                          {isLoadingNode ? (
                            <ExamCardSkeletonList count={2} colors={colors} />
                          ) : filteredTierExams.length > 0 ? (
                            <View style={tw`gap-3 mt-3`}>
                              {filteredTierExams.map((exam) => (
                                <ExamCard
                                  key={exam._id}
                                  exam={exam}
                                  navigation={navigation}
                                  colors={colors}
                                  showBreadcrumb={false}
                                />
                              ))}
                            </View>
                          ) : tierExams.length > 0 ? (
                            <View style={tw`items-center py-6`}>
                              <Text
                                style={[tw`text-xs`, { color: colors.textSecondary }]}
                              >
                                No exams match this filter
                              </Text>
                            </View>
                          ) : (
                            <View style={tw`items-center py-6`}>
                              <Text
                                style={[tw`text-xs`, { color: colors.textSecondary }]}
                              >
                                No exams in this tier
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </SectionBlock>
          )}

            </>
          )}

          {/* ─── Empty State ──────────────────────────── */}
          {isEmpty && (
            <View style={tw`items-center py-16 px-8`}>
              <View
                style={[
                  tw`w-16 h-16 rounded-full items-center justify-center mb-4`,
                  { backgroundColor: colors.primary + '10' },
                ]}
              >
                <Ionicons name="folder-open-outline" size={32} color={colors.primary} />
              </View>
              <Text style={[tw`text-base font-semibold mb-1`, { color: colors.text }]}>
                No content yet
              </Text>
              <Text
                style={[tw`text-sm text-center`, { color: colors.textSecondary }]}
              >
                This category doesn't have any subcategories, tiers, or exams yet.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}

// ─── Section Title Block ─────────────────────────────────
function SectionBlock({ title, children, colors }) {
  return (
    <View style={tw`mb-6`}>
      <Text style={[tw`text-base font-bold mb-3`, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}
