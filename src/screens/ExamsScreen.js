import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import tw from 'twrnc';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useFocusExam, useSubExam, matchesSubExam } from '../context/AppConfigContext';
import SubExamChips from '../components/SubExamChips';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import ExamCard, { ExamSearchBar, filterExamsByChip } from '../components/ExamCard';
import ExamFiltersSheet, { ActiveFilterPills } from '../components/ExamFiltersSheet';
import { ExamHighlightsBlock } from '../components/ExamHighlights';
import { ExamCardSkeleton, ExamCardSkeletonList } from '../components/ExamCardSkeleton';
import { EXAM_SORT_OPTIONS, sortExams } from '../utils/examSort';
import {
  filterCategoriesForUser,
  sortToServerParams,
  examFilterToAttemptStatus,
} from '../utils/examListParams';
import { t as tr } from '../i18n';

const ItemSeparator = () => <View style={tw`h-3`} />;

function deriveDifficultyLabel(difficultyDistribution) {
  if (!difficultyDistribution) return null;
  const easy = Number(difficultyDistribution.easy) || 0;
  const medium = Number(difficultyDistribution.medium) || 0;
  const hard = Number(difficultyDistribution.hard) || 0;
  const total = easy + medium + hard;
  if (total <= 0) return null;

  const max = Math.max(easy, medium, hard);
  if (hard === max && hard >= 35) return 'Hard';
  if (medium === max && medium >= 35) return 'Medium';
  if (easy === max && easy >= 35) return 'Easy';
  if (hard >= 25 && medium >= 25 && easy >= 25) return 'Mixed';
  if (hard === max) return 'Hard';
  if (medium === max) return 'Medium';
  return 'Easy';
}

export default function ExamsScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const focus = useFocusExam();
  const { selectedId: subExamId } = useSubExam();
  const subExamRef = useRef(subExamId);
  subExamRef.current = subExamId;

  const [exams, setExams] = useState([]);
  const [highlights, setHighlights] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [examFilter, setExamFilter] = useState('all');
  const [examTypeFilter, setExamTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showFiltersSheet, setShowFiltersSheet] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalExams: 0,
    limit: 12,
  });
  const [filters, setFilters] = useState({
    category: '',
    language: '',
    premium: '',
    difficulty: '',
    sortBy: 'scheduledTime',
    sortOrder: 'desc',
  });

  const filtersRef = useRef(filters);
  const paginationRef = useRef(pagination);
  const searchQueryRef = useRef(searchQuery);
  const examFilterRef = useRef(examFilter);
  const examTypeFilterRef = useRef(examTypeFilter);
  const sortByRef = useRef(sortBy);
  const pyqCacheRef = useRef([]);

  filtersRef.current = filters;
  paginationRef.current = pagination;
  searchQueryRef.current = searchQuery;
  examFilterRef.current = examFilter;
  examTypeFilterRef.current = examTypeFilter;
  sortByRef.current = sortBy;

  useEffect(() => {
    api
      .get('/categories')
      .then((r) => setCategories(r.data?.categories || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const delay = searchQuery.trim() ? 400 : 0;
    const t = setTimeout(() => fetchExams(1, false), delay);
    return () => clearTimeout(t);
  }, [filters, searchQuery, examFilter, examTypeFilter, sortBy, subExamId]);

  const applyPyqClientFilters = (examList) => {
    let filtered = [...(examList || [])];

    filtered = filtered.filter((exam) => exam.examType === 'pyq' && matchesSubExam(exam, subExamRef.current));

    const q = searchQueryRef.current.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((exam) => exam.title?.toLowerCase().includes(q));
    }

    const currentFilters = filtersRef.current;
    if (currentFilters.category) {
      filtered = filtered.filter((exam) => {
        const catId = exam.category?._id?.toString?.() || exam.category?.toString?.();
        return catId === currentFilters.category;
      });
    }

    if (currentFilters.language) {
      filtered = filtered.filter((exam) => exam.language === currentFilters.language);
    }

    if (currentFilters.premium === 'free') {
      filtered = filtered.filter((exam) => !exam.isPremium);
    } else if (currentFilters.premium === 'premium') {
      filtered = filtered.filter((exam) => exam.isPremium);
    }

    if (currentFilters.difficulty) {
      filtered = filtered.filter((exam) => {
        const level = exam.difficultyLevel || deriveDifficultyLabel(exam.difficultyDistribution);
        return level === currentFilters.difficulty;
      });
    }

    filtered = filterExamsByChip(filtered, examFilterRef.current);
    return sortExams(filtered, sortByRef.current);
  };

  const fetchExams = async (page = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      const limit = paginationRef.current.limit;

      if (examTypeFilterRef.current === 'pyq') {
        if (!append || page === 1) {
          const response = await api.get('/exams/available?examType=pyq');
          pyqCacheRef.current = applyPyqClientFilters(response.data.exams || []);
        }

        const totalExams = pyqCacheRef.current.length;
        const totalPages = Math.max(1, Math.ceil(totalExams / limit));
        const start = (page - 1) * limit;
        const pageExams = pyqCacheRef.current.slice(start, start + limit);

        setExams((prev) => (append ? [...prev, ...pageExams] : pageExams));
        if (!append) setHighlights(null);

        setPagination((prev) => ({
          ...prev,
          currentPage: page,
          totalPages,
          totalExams,
          limit,
        }));
        return;
      }

      const currentFilters = filtersRef.current;
      const params = new URLSearchParams({
        page: page.toString(),
        limit: paginationRef.current.limit.toString(),
        minimal: 'true',
        status: 'active',
      });

      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const q = searchQueryRef.current.trim();
      if (q) params.append('search', q);
      if (subExamRef.current) params.append('subExam', subExamRef.current);

      const attemptStatus = examFilterToAttemptStatus(examFilterRef.current);
      if (attemptStatus) params.append('attemptStatus', attemptStatus);

      if (!append && page === 1) {
        params.append('includeHighlights', 'true');
      }

      const response = await api.get(`/user/exams?${params.toString()}`);
      const newExams = response.data.exams || [];
      setExams((prev) => (append ? [...prev, ...newExams] : newExams));

      if (!append && response.data.highlights) {
        setHighlights(response.data.highlights);
      }

      setPagination((prev) => ({
        ...prev,
        ...(response.data.pagination || {}),
        currentPage: page,
      }));
    } catch (err) {
      console.error('Failed to fetch exams:', err);
      setError(tr("Failed to load exams. Pull down to retry."));
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchExams(1, false);
  };

  const loadMore = () => {
    if (loading || loadingMore || refreshing) return;
    if (pagination.currentPage >= pagination.totalPages) return;
    fetchExams(pagination.currentPage + 1, true);
  };

  const handleSheetApply = ({
    category,
    language,
    premium,
    difficulty,
    sortBy: nextSort,
  }) => {
    setSortBy(nextSort);
    const serverSort = sortToServerParams(nextSort);
    setFilters({
      category,
      language,
      premium,
      difficulty,
      ...serverSort,
    });
  };

  const removeActiveFilter = (key) => {
    if (key === 'category') setFilters((prev) => ({ ...prev, category: '' }));
    else if (key === 'language') setFilters((prev) => ({ ...prev, language: '' }));
    else if (key === 'premium') setFilters((prev) => ({ ...prev, premium: '' }));
    else if (key === 'difficulty') setFilters((prev) => ({ ...prev, difficulty: '' }));
    else if (key === 'sort') {
      setSortBy('newest');
      setFilters((prev) => ({
        ...prev,
        sortBy: 'scheduledTime',
        sortOrder: 'desc',
      }));
    }     else if (key === 'search') setSearchQuery('');
    else if (key === 'status') setExamFilter('all');
    else if (key === 'examType') setExamTypeFilter('');
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      language: '',
      premium: '',
      difficulty: '',
      sortBy: 'scheduledTime',
      sortOrder: 'desc',
    });
    setSearchQuery('');
    setExamFilter('all');
    setExamTypeFilter('');
    setSortBy('newest');
  };

  // Focus mode: one exam family, so no category filter
  const profileCategories = useMemo(
    () => (focus ? [] : filterCategoriesForUser(categories, user)),
    [categories, user, focus]
  );

  const sheetFiltersCount =
    (filters.category ? 1 : 0) +
    (filters.language ? 1 : 0) +
    (filters.premium ? 1 : 0) +
    (filters.difficulty ? 1 : 0) +
    (sortBy !== 'newest' ? 1 : 0);

  const activeFiltersCount =
    sheetFiltersCount +
    (searchQuery.trim() ? 1 : 0) +
    (examFilter !== 'all' ? 1 : 0) +
    (examTypeFilter ? 1 : 0);

  const sortLabel =
    tr(EXAM_SORT_OPTIONS.find((o) => o.key === sortBy)?.label || 'Newest');

  const activePills = useMemo(() => {
    const pills = [];
    if (filters.category) {
      const cat = profileCategories.find((c) => c._id === filters.category);
      pills.push({
        key: 'category',
        label: cat?.displayName || cat?.name || tr("Category"),
      });
    }
    if (filters.language) pills.push({ key: 'language', label: filters.language });
    if (filters.premium === 'free') pills.push({ key: 'premium', label: tr("Free") });
    if (filters.premium === 'premium') pills.push({ key: 'premium', label: tr("Pro") });
    if (filters.difficulty) pills.push({ key: 'difficulty', label: filters.difficulty });
    if (sortBy !== 'newest') pills.push({ key: 'sort', label: sortLabel });
    if (searchQuery.trim()) pills.push({ key: 'search', label: `"${searchQuery.trim()}"` });
    if (examFilter !== 'all') {
      pills.push({
        key: 'status',
        label: examFilter === 'available' ? tr("Available") : tr("Attempted"),
      });
    }
    if (examTypeFilter === 'pyq') pills.push({ key: 'examType', label: 'PYQ' });
    return pills;
  }, [filters, sortBy, sortLabel, searchQuery, examFilter, examTypeFilter, profileCategories]);

  const sheetPills = activePills.filter((p) => !['status', 'examType', 'search'].includes(p.key));

  const renderExam = useCallback(
    ({ item: exam }) => (
      <ExamCard exam={exam} navigation={navigation} colors={colors} showBreadcrumb />
    ),
    [navigation, colors]
  );

  const showHighlights =
    examFilter === 'all' &&
    !examTypeFilter &&
    !searchQuery.trim() &&
    sheetFiltersCount === 0 &&
    sortBy === 'newest';

  const listHeader = useMemo(
    () => (
      <View style={tw`mb-1`}>
        {showHighlights && (
          <ExamHighlightsBlock
            highlights={highlights}
            navigation={navigation}
            colors={colors}
          />
        )}

        {error && (
            <View
              style={[
              tw`flex-row items-center p-3 rounded-2xl mb-4`,
              { backgroundColor: colors.tones.red.bg },
            ]}
          >
            <Ionicons name="alert-circle" size={20} color={colors.tones.red.fg} style={tw`mr-2`} />
            <Text style={[tw`flex-1 text-sm`, { color: colors.tones.red.fg }]}>{error}</Text>
            <TouchableOpacity onPress={() => fetchExams(1, false)} activeOpacity={0.7}>
              <Text style={[tw`text-sm font-bold`, { color: colors.text }]}>{tr("Retry")}</Text>
            </TouchableOpacity>
              </View>
            )}

        {showHighlights && highlights && (
          <Text style={[tw`text-lg font-extrabold mb-3 mt-1`, { color: colors.text }]}>{tr("All exams")}</Text>
        )}
          </View>
    ),
    [
      showHighlights,
      highlights,
      navigation,
      colors,
      error,
      pagination.totalExams,
    ]
  );

  return (
    <>
    <ScreenWrapper backgroundColor={colors.surface}>
      <View style={[tw`flex-1`, { backgroundColor: colors.surface }]}>
        {/* Compact sticky header: title, search, one chip row */}
        <View style={tw`px-5 pt-2 pb-1`}>
          <View style={tw`flex-row items-center justify-between mb-2.5`}>
            <Text style={[tw`text-2xl font-extrabold`, { color: colors.text }]}>{tr("Exams")}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ExamHistory')}
              style={[
                tw`w-10 h-10 rounded-full items-center justify-center`,
                { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
              ]}
              activeOpacity={0.7}
              accessibilityLabel={tr("Exam history")}
            >
              <Ionicons name="time-outline" size={19} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ExamSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            colors={colors}
            compact
            placeholder={tr("Search exams")}
            rightAccessory={
              <TouchableOpacity
                style={[
                  tw`w-11 h-11 rounded-2xl items-center justify-center relative`,
                  { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
                ]}
                onPress={() => setShowFiltersSheet(true)}
                activeOpacity={0.75}
                accessibilityLabel={tr("Filters and sort")}
              >
                <Ionicons name="options-outline" size={19} color={colors.text} />
                {sheetFiltersCount > 0 && (
                  <View
                    style={[
                      tw`absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full items-center justify-center px-1`,
                      { backgroundColor: colors.hero },
                    ]}
                  >
                    <Text style={[tw`text-[9px] font-bold`, { color: colors.heroText }]}>{sheetFiltersCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            }
          />
          <SubExamChips style={tw`mt-2.5 mb-1.5`} />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={tw`-mx-5`}
            contentContainerStyle={tw`px-5 gap-2 pb-1.5`}
          >
            {[
              { key: 'all', label: pagination.totalExams ? tr("All {0}", pagination.totalExams) : tr("All"), on: examFilter === 'all', onPress: () => setExamFilter('all') },
              { key: 'available', label: tr("Available"), on: examFilter === 'available', onPress: () => setExamFilter('available') },
              { key: 'attempted', label: tr("Attempted"), on: examFilter === 'attempted', onPress: () => setExamFilter('attempted') },
              { key: 'pyq', label: 'PYQ', on: examTypeFilter === 'pyq', onPress: () => setExamTypeFilter(examTypeFilter === 'pyq' ? '' : 'pyq') },
            ].map((chip, i) => (
              <React.Fragment key={chip.key}>
                {i === 3 && <View style={[tw`w-px my-1.5`, { backgroundColor: colors.border }]} />}
                <TouchableOpacity
                  style={[
                    tw`px-3.5 py-2 rounded-full`,
                    chip.on
                      ? { backgroundColor: colors.hero }
                      : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
                  ]}
                  onPress={chip.onPress}
                  activeOpacity={0.75}
                >
                  <Text style={[tw`text-xs font-bold`, { color: chip.on ? colors.heroText : colors.textSecondary }]}>
                    {tr(chip.label)}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </ScrollView>

          {sheetPills.length > 0 && (
            <View style={tw`mt-1`}>
              <ActiveFilterPills items={sheetPills} onRemove={removeActiveFilter} onClearAll={clearFilters} colors={colors} />
            </View>
          )}
        </View>
        {loading && exams.length === 0 ? (
            <View style={tw`flex-1 px-5 pt-4`}>
              <ExamCardSkeletonList count={5} colors={colors} />
          </View>
        ) : (
          <FlatList
            data={exams}
            keyExtractor={(item) => item._id}
            renderItem={renderExam}
            style={tw`flex-1`}
              contentContainerStyle={tw`px-5 pt-4 pb-10`}
            showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={ItemSeparator}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.text}
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
              ListHeaderComponent={listHeader}
            ListFooterComponent={
              loadingMore ? (
                  <View style={tw`pt-2`}>
                    <ExamCardSkeleton colors={colors} />
                </View>
              ) : exams.length > 0 && pagination.currentPage >= pagination.totalPages ? (
                <Text style={[tw`text-center text-xs py-5`, { color: colors.textSecondary }]}>
                  {tr("You're all caught up")}
                </Text>
              ) : null
            }
            ListEmptyComponent={
              !loading ? (
                  <View style={tw`items-center justify-center py-12`}>
                    <Ionicons name="document-outline" size={56} color={colors.textSecondary} />
                    <Text style={[tw`text-base font-semibold mt-4 mb-2`, { color: colors.text }]}>
                    {tr("No exams found")}
                  </Text>
                    <Text
                      style={[tw`text-sm text-center mb-6 px-4`, { color: colors.textSecondary }]}
                    >
                    {searchQuery || activeFiltersCount > 0
                        ? tr("Try adjusting your filters or search.")
                        : focus
                          ? tr("No {0} exams are available yet.", focus.name)
                          : user?.examPreparations?.length
                          ? tr("No exams are available for your categories yet.")
                          : tr("Add exam categories in your profile to see exams here.")}
                  </Text>
                  {(searchQuery || activeFiltersCount > 0) && (
                    <TouchableOpacity
                      style={[tw`py-3 px-6 rounded-2xl`, { backgroundColor: colors.hero }]}
                      onPress={clearFilters}
                      activeOpacity={0.7}
                    >
                        <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>{tr("Clear filters")}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null
            }
          />
        )}
      </View>
    </ScreenWrapper>

      <ExamFiltersSheet
        visible={showFiltersSheet}
        onClose={() => setShowFiltersSheet(false)}
        colors={colors}
        categories={profileCategories}
        categoryId={filters.category}
        language={filters.language}
        premium={filters.premium}
        difficulty={filters.difficulty}
        sortBy={sortBy}
        onApply={handleSheetApply}
      />
    </>
  );
}
