import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import tw from 'twrnc';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { formatDate } from '../utils/helpers';

// ─── Helpers ─────────────────────────────────────────────
// Green ≥ 80, orange ≥ 60, red below — { fg, bg } theme tone.
const getScoreTone = (pct, colors) => {
  if (pct >= 80) return colors.tones.green;
  if (pct >= 60) return colors.tones.orange;
  return colors.tones.red;
};

const formatTime = (seconds) => {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
};

const LIMIT = 15;

// ─── Main Component ──────────────────────────────────────
export default function ExamHistoryScreen({ navigation }) {
  const { colors } = useTheme();

  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    sortBy: 'date',
    sortOrder: 'desc',
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalAttempts: 0,
  });

  const searchDebounceRef = useRef(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // ─── Fetch on filter change (instant) ──────────────────
  useEffect(() => {
    fetchExamHistory(1);
  }, [filters]);

  // ─── Fetch on search change (debounced) ────────────────
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchExamHistory(1);
    }, 400);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchQuery]);

  const fetchExamHistory = async (page = 1) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: LIMIT.toString(),
        sortBy: filtersRef.current.sortBy,
        sortOrder: filtersRef.current.sortOrder,
      });

      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const response = await api.get(`/user/exam-history?${params.toString()}`);

      if (page === 1) {
        setAttempts(response.data.attempts || []);
      } else {
        setAttempts((prev) => [...prev, ...(response.data.attempts || [])]);
      }

      setPagination(
        response.data.pagination || { currentPage: page, totalPages: 1, totalAttempts: 0 }
      );
    } catch {
      if (page === 1) setError('Failed to load exam history.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchExamHistory(1);
  };

  const loadMore = () => {
    if (pagination.currentPage < pagination.totalPages && !loading && !loadingMore) {
      fetchExamHistory(pagination.currentPage + 1);
    }
  };

  const clearFilters = () => {
    setFilters({ sortBy: 'date', sortOrder: 'desc' });
    setSearchQuery('');
  };

  // ─── Render Attempt Card ───────────────────────────────
  const renderAttempt = ({ item: attempt }) => {
    const pct = attempt.percentage || 0;
    const scoreTone = getScoreTone(pct, colors);

    return (
      <TouchableOpacity
        style={[
          tw`flex-row items-center p-3.5 rounded-2xl border mb-2.5`,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() => navigation.navigate('Result', { attemptId: attempt._id })}
        activeOpacity={0.7}
      >
        {/* Score Circle */}
        <View
          style={[
            tw`w-12 h-12 rounded-full items-center justify-center mr-3`,
            { backgroundColor: scoreTone.bg },
          ]}
        >
          <Text style={[tw`text-sm font-bold`, { color: scoreTone.fg }]}>
            {Math.round(pct)}%
          </Text>
        </View>

        {/* Info */}
        <View style={tw`flex-1`}>
          <Text
            style={[tw`text-sm font-semibold`, { color: colors.text }]}
            numberOfLines={1}
          >
            {attempt.exam?.title || 'Unknown Exam'}
          </Text>
          <View style={tw`flex-row items-center mt-1 gap-3`}>
            <View style={tw`flex-row items-center gap-1`}>
              <Ionicons name="checkmark-circle" size={12} color={colors.tones.green.fg} />
              <Text style={[tw`text-[11px]`, { color: colors.textSecondary }]}>
                {attempt.correctAnswers || 0}
              </Text>
            </View>
            <View style={tw`flex-row items-center gap-1`}>
              <Ionicons name="close-circle" size={12} color={colors.tones.red.fg} />
              <Text style={[tw`text-[11px]`, { color: colors.textSecondary }]}>
                {attempt.incorrectAnswers || 0}
              </Text>
            </View>
            <Text style={[tw`text-[11px]`, { color: colors.textSecondary }]}>
              {formatTime(attempt.timeTaken)}
            </Text>
          </View>
          <Text style={[tw`text-[10px] mt-0.5`, { color: colors.textSecondary }]}>
            {formatDate(attempt.endTime || attempt.createdAt)}
          </Text>
        </View>

        {/* Score + Chevron */}
        <View style={tw`items-end ml-2`}>
          <Text style={[tw`text-xs font-bold`, { color: colors.text }]}>
            {attempt.totalScore}/{attempt.exam?.totalMarks || '—'}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.textSecondary}
            style={tw`mt-1`}
          />
        </View>
      </TouchableOpacity>
    );
  };

  // ═══════════════════════════════════════════════════════
  return (
    <ScreenWrapper>
      <View style={[tw`flex-1`, { backgroundColor: colors.surface }]}>
        {/* ─── Header ─────────────────────────────────── */}
        <View
          style={[
            tw`flex-row items-center justify-between px-4 pt-4 pb-3 border-b`,
            { borderColor: colors.border },
          ]}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[tw`text-base font-bold`, { color: colors.text }]}>Exam History</Text>
          <TouchableOpacity onPress={() => setShowFilters(true)} style={tw`p-2`}>
            <Ionicons name="options-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* ─── Search ─────────────────────────────────── */}
        <View style={tw`px-5 pt-3 pb-1`}>
          <View
            style={[
              tw`flex-row items-center rounded-xl px-3.5 py-2.5 border gap-2`,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={[tw`flex-1 text-sm`, { color: colors.text }]}
              placeholder="Search exams..."
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
        </View>

        {/* ─── Summary Bar ────────────────────────────── */}
        {pagination.totalAttempts > 0 && !loading && (
          <View style={tw`px-5 py-2`}>
            <Text style={[tw`text-xs`, { color: colors.textSecondary }]}>
              {pagination.totalAttempts} attempt{pagination.totalAttempts !== 1 ? 's' : ''} total
            </Text>
          </View>
        )}

        {/* ─── Error ──────────────────────────────────── */}
        {error && (
          <TouchableOpacity
            style={[tw`mx-5 mt-2 p-3 rounded-2xl flex-row items-center`, { backgroundColor: colors.tones.red.bg }]}
            onPress={() => fetchExamHistory(1)}
            activeOpacity={0.7}
          >
            <Ionicons name="alert-circle" size={18} color={colors.tones.red.fg} />
            <Text style={[tw`flex-1 text-xs ml-2`, { color: colors.tones.red.fg }]}>{error}</Text>
            <Ionicons name="refresh" size={16} color={colors.tones.red.fg} />
          </TouchableOpacity>
        )}

        {/* ─── Content ────────────────────────────────── */}
        {loading && attempts.length === 0 ? (
          <View style={tw`flex-1 items-center justify-center`}>
            <ActivityIndicator size="large" color={colors.text} />
          </View>
        ) : attempts.length === 0 ? (
          <View style={tw`flex-1 items-center justify-center px-10`}>
            <View
              style={[
                tw`w-16 h-16 rounded-full items-center justify-center mb-4`,
                { backgroundColor: colors.cardMuted },
              ]}
            >
              <Ionicons name="document-text-outline" size={32} color={colors.text} />
            </View>
            <Text style={[tw`text-base font-semibold mb-1`, { color: colors.text }]}>
              No attempts yet
            </Text>
            <Text style={[tw`text-sm text-center mb-5`, { color: colors.textSecondary }]}>
              {searchQuery
                ? 'No results match your search.'
                : 'Start taking exams to see your history.'}
            </Text>
            {searchQuery ? (
              <TouchableOpacity
                style={[tw`px-5 py-2.5 rounded-xl`, { backgroundColor: colors.hero }]}
                onPress={() => setSearchQuery('')}
                activeOpacity={0.7}
              >
                <Text style={[tw`text-sm font-semibold`, { color: colors.heroText }]}>Clear Search</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[tw`px-5 py-2.5 rounded-xl`, { backgroundColor: colors.hero }]}
                onPress={() => navigation.navigate('ExamsTab', { screen: 'ExamsList' })}
                activeOpacity={0.7}
              >
                <Text style={[tw`text-sm font-semibold`, { color: colors.heroText }]}>Browse Exams</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={attempts}
            keyExtractor={(item) => item._id}
            renderItem={renderAttempt}
            style={tw`flex-1`}
            contentContainerStyle={tw`px-5 pt-2 pb-10`}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.text}
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              loadingMore ? (
                <View style={tw`py-4 items-center`}>
                  <ActivityIndicator size="small" color={colors.text} />
                </View>
              ) : null
            }
          />
        )}

        {/* ─── Filters Modal ──────────────────────────── */}
        <Modal
          visible={showFilters}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFilters(false)}
        >
          <View style={tw`flex-1 justify-end bg-black/50`}>
            <View style={[tw`rounded-t-3xl`, { backgroundColor: colors.card }]}>
              {/* Modal Header */}
              <View
                style={[
                  tw`flex-row items-center justify-between p-5 border-b`,
                  { borderColor: colors.border },
                ]}
              >
                <Text style={[tw`text-lg font-bold`, { color: colors.text }]}>Filters</Text>
                <TouchableOpacity onPress={() => setShowFilters(false)} activeOpacity={0.7}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Filter Options */}
              <View style={tw`p-5`}>
                {/* Sort By */}
                <View style={tw`mb-5`}>
                  <Text style={[tw`text-sm font-semibold mb-2.5`, { color: colors.text }]}>
                    Sort By
                  </Text>
                  <View style={tw`flex-row flex-wrap gap-2`}>
                    {[
                      { key: 'date', label: 'Date' },
                      { key: 'score', label: 'Score' },
                      { key: 'percentage', label: 'Percentage' },
                    ].map(({ key, label }) => {
                      const isActive = filters.sortBy === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={[
                            tw`px-4 py-2.5 rounded-full border`,
                            isActive
                              ? { backgroundColor: colors.hero, borderColor: colors.hero }
                              : { backgroundColor: colors.card, borderColor: colors.border },
                          ]}
                          onPress={() => setFilters((f) => ({ ...f, sortBy: key }))}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              tw`text-xs font-semibold`,
                              { color: isActive ? colors.heroText : colors.text },
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Order */}
                <View style={tw`mb-5`}>
                  <Text style={[tw`text-sm font-semibold mb-2.5`, { color: colors.text }]}>
                    Order
                  </Text>
                  <View style={tw`flex-row gap-2`}>
                    {[
                      { key: 'desc', label: 'Newest First' },
                      { key: 'asc', label: 'Oldest First' },
                    ].map(({ key, label }) => {
                      const isActive = filters.sortOrder === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={[
                            tw`flex-1 py-2.5 rounded-xl items-center border`,
                            isActive
                              ? { backgroundColor: colors.hero, borderColor: colors.hero }
                              : { backgroundColor: colors.card, borderColor: colors.border },
                          ]}
                          onPress={() => setFilters((f) => ({ ...f, sortOrder: key }))}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              tw`text-xs font-semibold`,
                              { color: isActive ? colors.heroText : colors.text },
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Modal Footer */}
              <View
                style={[
                  tw`flex-row gap-3 p-5 border-t`,
                  { borderColor: colors.border },
                ]}
              >
                <TouchableOpacity
                  style={[
                    tw`flex-1 py-3 rounded-xl items-center border`,
                    { borderColor: colors.border },
                  ]}
                  onPress={() => {
                    clearFilters();
                    setShowFilters(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[tw`text-sm font-semibold`, { color: colors.text }]}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    tw`flex-1 py-3 rounded-xl items-center`,
                    { backgroundColor: colors.hero },
                  ]}
                  onPress={() => setShowFilters(false)}
                  activeOpacity={0.7}
                >
                  <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenWrapper>
  );
}
