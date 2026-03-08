import React, { useState, useEffect } from 'react';
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
import { formatDate, getExamStatus } from '../utils/helpers';

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

// ─── Exam Card (reusable) ────────────────────────────────
function ExamCard({ exam, navigation, colors }) {
  const status = getExamStatus(exam);
  const statusColor = getStatusColor(status, colors);

  return (
    <View
      style={[
        tw`rounded-2xl p-4 border`,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* Title & Status */}
      <View style={tw`flex-row justify-between items-start mb-3 gap-2`}>
        <Text
          style={[tw`flex-1 text-sm font-semibold leading-5`, { color: colors.text }]}
          numberOfLines={2}
        >
          {exam.title}
        </Text>
        <View
          style={[
            tw`px-2 py-1 rounded-lg`,
            { backgroundColor: statusColor + '15' },
          ]}
        >
          <Text style={[tw`text-[10px] font-semibold`, { color: statusColor }]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={tw`gap-1.5 mb-3`}>
        <View style={tw`flex-row items-center gap-1.5`}>
          <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
          <Text style={[tw`text-[11px]`, { color: colors.textSecondary }]}>
            {formatDate(exam.scheduledTime)}
          </Text>
        </View>
        <View style={tw`flex-row items-center gap-1.5`}>
          <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
          <Text style={[tw`text-[11px]`, { color: colors.textSecondary }]}>
            {exam.duration} min • {exam.totalMarks} marks
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={[tw`flex-row gap-2 pt-3 border-t`, { borderColor: colors.border }]}>
        {exam.isAttempted && exam.attemptId ? (
          <>
            <TouchableOpacity
              style={[
                tw`flex-1 flex-row items-center justify-center py-2.5 rounded-xl gap-1.5`,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => navigation.navigate('Result', { attemptId: exam.attemptId })}
              activeOpacity={0.7}
            >
              <Ionicons name="eye-outline" size={14} color="#fff" />
              <Text style={tw`text-xs font-bold text-white`}>Result</Text>
            </TouchableOpacity>
            {status === 'available' && (
              <TouchableOpacity
                style={[
                  tw`flex-1 flex-row items-center justify-center py-2.5 rounded-xl gap-1.5 border`,
                  { borderColor: colors.primary },
                ]}
                onPress={() => navigation.navigate('ExamDetail', { examId: exam._id })}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={14} color={colors.primary} />
                <Text style={[tw`text-xs font-bold`, { color: colors.primary }]}>Retry</Text>
              </TouchableOpacity>
            )}
          </>
        ) : exam.isPaused ? (
          <TouchableOpacity
            style={[
              tw`flex-1 flex-row items-center justify-center py-2.5 rounded-xl gap-1.5`,
              { backgroundColor: '#f59e0b' },
            ]}
            onPress={() => navigation.navigate('ExamDetail', { examId: exam._id })}
            activeOpacity={0.7}
          >
            <Ionicons name="play" size={14} color="#fff" />
            <Text style={tw`text-xs font-bold text-white`}>Continue</Text>
          </TouchableOpacity>
        ) : status === 'available' ? (
          <TouchableOpacity
            style={[
              tw`flex-1 flex-row items-center justify-center py-2.5 rounded-xl gap-1.5`,
              { backgroundColor: colors.primary },
            ]}
            onPress={() => navigation.navigate('ExamDetail', { examId: exam._id })}
            activeOpacity={0.7}
          >
            <Ionicons name="play-circle" size={14} color="#fff" />
            <Text style={tw`text-xs font-bold text-white`}>Start Exam</Text>
          </TouchableOpacity>
        ) : status === 'upcoming' ? (
          <View
            style={[
              tw`flex-1 flex-row items-center justify-center py-2.5 rounded-xl gap-1.5 border opacity-50`,
              { borderColor: colors.border },
            ]}
          >
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={[tw`text-xs font-semibold`, { color: colors.textSecondary }]}>
              Coming Soon
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────
function getStatusColor(status, colors) {
  switch (status) {
    case 'available': return colors.primary;
    case 'completed': return '#10b981';
    case 'paused': return '#f59e0b';
    case 'upcoming': return '#3b82f6';
    case 'expired': return '#9ca3af';
    default: return colors.textSecondary;
  }
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

  useEffect(() => {
    fetchCategory();
  }, [categoryId]);

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
    fetchCategory();
  };

  // ─── Loading ───────────────────────────────────────────
  if (loading && !category) {
    return (
      <ScreenWrapper>
        <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
          <Header title="Category" navigation={navigation} colors={colors} />
          <View style={tw`flex-1 items-center justify-center`}>
            <ActivityIndicator size="large" color={colors.primary} />
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
          {/* ─── Category Info ─────────────────────────── */}
          <View
            style={[
              tw`flex-row rounded-2xl p-4 mt-4 mb-6 border`,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {category.logo ? (
              <Image
                source={{ uri: category.logo }}
                style={[tw`w-16 h-16 rounded-2xl mr-4`, { backgroundColor: colors.background }]}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  tw`w-16 h-16 rounded-2xl items-center justify-center mr-4`,
                  { backgroundColor: colors.primary + '10' },
                ]}
              >
                <Ionicons name="folder" size={32} color={colors.primary} />
              </View>
            )}
            <View style={tw`flex-1`}>
              <Text style={[tw`text-lg font-bold mb-1`, { color: colors.text }]}>
                {category.displayName || category.name}
              </Text>
              {category.description && (
                <Text
                  style={[tw`text-xs leading-4 mb-2`, { color: colors.textSecondary }]}
                  numberOfLines={3}
                >
                  {category.description}
                </Text>
              )}
              <View style={tw`flex-row gap-2`}>
                {category.examCount > 0 && (
                  <View
                    style={[tw`px-2.5 py-1 rounded-lg`, { backgroundColor: colors.primary + '12' }]}
                  >
                    <Text style={[tw`text-[10px] font-semibold`, { color: colors.primary }]}>
                      {category.examCount} {category.examCount === 1 ? 'Exam' : 'Exams'}
                    </Text>
                  </View>
                )}
                {category.questionCount > 0 && (
                  <View
                    style={[tw`px-2.5 py-1 rounded-lg`, { backgroundColor: '#3b82f6' + '12' }]}
                  >
                    <Text style={[tw`text-[10px] font-semibold`, { color: '#3b82f6' }]}>
                      {category.questionCount} Questions
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* ─── Subcategories ─────────────────────────── */}
          {category.subCategories?.length > 0 && (
            <SectionBlock title="Subcategories" colors={colors}>
              <View style={tw`gap-2`}>
                {category.subCategories.map((sub) => (
                  <TouchableOpacity
                    key={sub._id}
                    style={[
                      tw`flex-row items-center p-3.5 rounded-2xl border`,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                    onPress={() =>
                      navigation.navigate('SubCategoryDetail', { subCategoryId: sub._id })
                    }
                    activeOpacity={0.7}
                  >
                    {sub.logo ? (
                      <Image
                        source={{ uri: sub.logo }}
                        style={[
                          tw`w-11 h-11 rounded-xl mr-3`,
                          { backgroundColor: colors.background },
                        ]}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          tw`w-11 h-11 rounded-xl items-center justify-center mr-3`,
                          { backgroundColor: colors.primary + '10' },
                        ]}
                      >
                        <Ionicons name="layers-outline" size={20} color={colors.primary} />
                      </View>
                    )}

                    <View style={tw`flex-1`}>
                      <Text style={[tw`text-sm font-semibold`, { color: colors.text }]}>
                        {sub.displayName || sub.name}
                      </Text>
                      {sub.description && (
                        <Text
                          style={[tw`text-[11px] mt-0.5`, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {sub.description}
                        </Text>
                      )}
                      {sub.examCount > 0 && (
                        <Text style={[tw`text-[10px] mt-1`, { color: colors.textSecondary }]}>
                          {sub.examCount} {sub.examCount === 1 ? 'exam' : 'exams'}
                        </Text>
                      )}
                    </View>

                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </SectionBlock>
          )}

          {/* ─── Category-Level Exams ─────────────────── */}
          {categoryExams.length > 0 && (
            <SectionBlock title="Exams" colors={colors}>
              <View style={tw`gap-3`}>
                {categoryExams.map((exam) => (
                  <ExamCard
                    key={exam._id}
                    exam={exam}
                    navigation={navigation}
                    colors={colors}
                  />
                ))}
              </View>
            </SectionBlock>
          )}

          {/* ─── Tiers (Expandable) ───────────────────── */}
          {categoryTiers.length > 0 && (
            <SectionBlock title="Tiers" colors={colors}>
              <View style={tw`gap-2`}>
                {categoryTiers.map((tier) => {
                  const nodeKey = getNodeKey({
                    type: 'tier',
                    category: categoryId,
                    tier: tier._id,
                  });
                  const tierExams = exams[nodeKey] || [];
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
                            <View style={tw`items-center py-6`}>
                              <ActivityIndicator size="small" color={colors.primary} />
                            </View>
                          ) : tierExams.length > 0 ? (
                            <View style={tw`gap-3 mt-3`}>
                              {tierExams.map((exam) => (
                                <ExamCard
                                  key={exam._id}
                                  exam={exam}
                                  navigation={navigation}
                                  colors={colors}
                                />
                              ))}
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





// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   ActivityIndicator,
//   RefreshControl,
//   Image,
// } from 'react-native';
// import ScreenWrapper from '../components/ScreenWrapper';
// import { useTheme } from '../context/ThemeContext';
// import api from '../services/api';
// import { Ionicons } from '@expo/vector-icons';
// import { formatDate, getExamStatus } from '../utils/helpers';

// export default function CategoryDetailScreen({ route, navigation }) {
//   const { categoryId } = route.params;
//   const { colors } = useTheme();
//   const [category, setCategory] = useState(null);
//   const [tiers, setTiers] = useState([]);
//   const [exams, setExams] = useState({});
//   const [expandedNodes, setExpandedNodes] = useState(new Set());
//   const [loading, setLoading] = useState(true);
//   const [loadingExams, setLoadingExams] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);

//   useEffect(() => {
//     fetchCategory();
//   }, [categoryId]);

//   const fetchCategory = async () => {
//     try {
//       setLoading(true);
//       const response = await api.get(`/categories/${categoryId}`);
//       setCategory(response.data.category);
//       await fetchTiers();
//       // Fetch category-level exams on initial load
//       await fetchExamsForNode({ type: 'category', category: categoryId });
//     } catch (error) {
//       console.error('Failed to fetch category:', error);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   const fetchTiers = async () => {
//     try {
//       const response = await api.get(`/categories/${categoryId}/tiers`);
//       setTiers(response.data.tiers || []);
//     } catch (error) {
//       console.error('Failed to fetch tiers:', error);
//     }
//   };

//   const fetchExamsForNode = async (node) => {
//     const nodeKey = getNodeKey(node);
//     if (exams[nodeKey]) {
//       return; // Already loaded
//     }

//     try {
//       setLoadingExams(true);
//       const params = [];
//       if (node.category) params.push(`category=${node.category}`);
//       if (node.subCategory) params.push(`subCategory=${node.subCategory}`);
//       if (node.tier) params.push(`tier=${node.tier}`);
//       params.push('status=active');
//       params.push('minimal=true');

//       const response = await api.get(`/user/exams?${params.join('&')}`);
//       setExams(prev => ({
//         ...prev,
//         [nodeKey]: response.data.exams || []
//       }));
//     } catch (error) {
//       console.error('Failed to fetch exams:', error);
//     } finally {
//       setLoadingExams(false);
//     }
//   };

//   const getNodeKey = (node) => {
//     return `${node.type}_${node.category || ''}_${node.subCategory || ''}_${node.tier || ''}`;
//   };

//   const toggleNode = async (nodeKey, node) => {
//     const newExpanded = new Set(expandedNodes);
//     const isExpanding = !newExpanded.has(nodeKey);

//     if (isExpanding) {
//       newExpanded.add(nodeKey);
//       await fetchExamsForNode(node);
//     } else {
//       newExpanded.delete(nodeKey);
//     }
//     setExpandedNodes(newExpanded);
//   };

//   const onRefresh = () => {
//     setRefreshing(true);
//     fetchCategory();
//   };

//   const styles = createStyles(colors);

//   if (loading && !category) {
//     return (
//       <ScreenWrapper>
//         <View style={styles.container}>
//           <View style={styles.header}>
//             <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//               <Ionicons name="arrow-back" size={24} color={colors.text} />
//             </TouchableOpacity>
//             <Text style={styles.headerTitle}>Category</Text>
//             <View style={{ width: 24 }} />
//           </View>
//           <View style={styles.loadingContainer}>
//             <ActivityIndicator size="large" color={colors.primary} />
//           </View>
//         </View>
//       </ScreenWrapper>
//     );
//   }

//   if (!category) {
//     return (
//       <ScreenWrapper>
//         <View style={styles.container}>
//           <View style={styles.header}>
//             <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//               <Ionicons name="arrow-back" size={24} color={colors.text} />
//             </TouchableOpacity>
//             <Text style={styles.headerTitle}>Category</Text>
//             <View style={{ width: 24 }} />
//           </View>
//           <View style={styles.emptyContainer}>
//             <Text style={styles.emptyText}>Category not found</Text>
//           </View>
//         </View>
//       </ScreenWrapper>
//     );
//   }

//   const categoryExams = exams[getNodeKey({ type: 'category', category: categoryId })] || [];
//   const categoryTiers = tiers.filter(t => !t.subCategory);

//   return (
//     <ScreenWrapper>
//       <View style={styles.container}>
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//             <Ionicons name="arrow-back" size={24} color={colors.text} />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle} numberOfLines={1}>
//             {category.displayName || category.name}
//           </Text>
//           <View style={{ width: 24 }} />
//         </View>

//         <ScrollView
//           style={styles.scrollView}
//           contentContainerStyle={styles.scrollContent}
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               tintColor={colors.primary}
//             />
//           }
//           showsVerticalScrollIndicator={false}
//         >
//           {/* Category Header */}
//           <View style={styles.categoryHeader}>
//             {category.logo ? (
//               <Image
//                 source={{ uri: category.logo }}
//                 style={styles.categoryLogo}
//                 resizeMode="cover"
//               />
//             ) : (
//               <View style={styles.categoryIconContainer}>
//                 <Ionicons name="folder" size={48} color={colors.primary} />
//               </View>
//             )}
//             <View style={styles.categoryInfo}>
//               <Text style={styles.categoryName}>
//                 {category.displayName || category.name}
//               </Text>
//               {category.description && (
//                 <Text style={styles.categoryDescription}>
//                   {category.description}
//                 </Text>
//               )}
//               <View style={styles.categoryBadges}>
//                 {category.examCount > 0 && (
//                   <View style={styles.badge}>
//                     <Text style={styles.badgeText}>
//                       {category.examCount} {category.examCount === 1 ? 'Exam' : 'Exams'}
//                     </Text>
//                   </View>
//                 )}
//                 {category.questionCount > 0 && (
//                   <View style={styles.badge}>
//                     <Text style={styles.badgeText}>
//                       {category.questionCount} {category.questionCount === 1 ? 'Question' : 'Questions'}
//                     </Text>
//                   </View>
//                 )}
//               </View>
//             </View>
//           </View>

//           {/* Subcategories */}
//           {category.subCategories && category.subCategories.length > 0 && (
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>Subcategories</Text>
//               {category.subCategories.map((subCategory) => (
//                 <TouchableOpacity
//                   key={subCategory._id}
//                   style={styles.subCategoryCard}
//                   onPress={() => {
//                     navigation.navigate('SubCategoryDetail', { subCategoryId: subCategory._id });
//                   }}
//                   activeOpacity={0.7}
//                 >
//                   <View style={styles.subCategoryLeft}>
//                     {subCategory.logo ? (
//                       <Image
//                         source={{ uri: subCategory.logo }}
//                         style={styles.subCategoryLogo}
//                         resizeMode="cover"
//                       />
//                     ) : (
//                       <View style={styles.subCategoryIconContainer}>
//                         <Ionicons name="layers" size={24} color={colors.primary} />
//                       </View>
//                     )}
//                     <View style={styles.subCategoryInfo}>
//                       <Text style={styles.subCategoryName}>
//                         {subCategory.displayName || subCategory.name}
//                       </Text>
//                       {subCategory.description && (
//                         <Text style={styles.subCategoryDescription} numberOfLines={2}>
//                           {subCategory.description}
//                         </Text>
//                       )}
//                       {subCategory.examCount > 0 && (
//                         <Text style={styles.subCategoryExamCount}>
//                           {subCategory.examCount} {subCategory.examCount === 1 ? 'exam' : 'exams'}
//                         </Text>
//                       )}
//                     </View>
//                   </View>
//                   <Ionicons
//                     name="chevron-forward"
//                     size={20}
//                     color={colors.textSecondary}
//                   />
//                 </TouchableOpacity>
//               ))}
//             </View>
//           )}

//           {/* Category-level Exams */}
//           {categoryExams.length > 0 && (
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>Exams</Text>
//               <View style={styles.examsGrid}>
//                 {categoryExams.map((exam) => {
//                   const status = getExamStatus(exam);
//                   return (
//                     <View
//                       key={exam._id}
//                       style={styles.examCard}
//                     >
//                       <View style={styles.examCardHeader}>
//                         <Text style={styles.examCardTitle} numberOfLines={2}>
//                           {exam.title}
//                         </Text>
//                         <View style={[
//                           styles.statusBadge,
//                           status === 'available' && styles.statusBadgeAvailable,
//                           status === 'completed' && styles.statusBadgeCompleted,
//                           status === 'upcoming' && styles.statusBadgeUpcoming,
//                         ]}>
//                           <Text style={styles.statusBadgeText}>
//                             {status.charAt(0).toUpperCase() + status.slice(1)}
//                           </Text>
//                         </View>
//                       </View>
//                       <View style={styles.examCardDetails}>
//                         <View style={styles.examDetailRow}>
//                           <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
//                           <Text style={styles.examDetailText}>
//                             {formatDate(exam.scheduledTime)}
//                           </Text>
//                         </View>
//                         <View style={styles.examDetailRow}>
//                           <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
//                           <Text style={styles.examDetailText}>
//                             {exam.duration} min • {exam.totalMarks} marks
//                           </Text>
//                         </View>
//                       </View>

//                       {/* Action Buttons */}
//                       <View style={styles.examCardActions}>
//                         {exam.isAttempted && exam.attemptId ? (
//                           <>
//                             <TouchableOpacity
//                               style={[styles.examActionButton, styles.viewResultButton]}
//                               onPress={() => navigation.navigate('Result', { attemptId: exam.attemptId })}
//                               activeOpacity={0.7}
//                             >
//                               <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
//                               <Text style={styles.viewResultButtonText}>View Result</Text>
//                             </TouchableOpacity>
//                             {status === 'available' && (
//                               <TouchableOpacity
//                                 style={[styles.examActionButton, styles.retryButton]}
//                                 onPress={() => navigation.navigate('ExamDetail', { examId: exam._id })}
//                                 activeOpacity={0.7}
//                               >
//                                 <Ionicons name="refresh-outline" size={16} color={colors.primary} />
//                                 <Text style={styles.retryButtonText}>Retry</Text>
//                               </TouchableOpacity>
//                             )}
//                           </>
//                         ) : exam.isPaused ? (
//                           <TouchableOpacity
//                             style={[styles.examActionButton, styles.startExamButton]}
//                             onPress={() => navigation.navigate('ExamDetail', { examId: exam._id })}
//                             activeOpacity={0.7}
//                           >
//                             <Ionicons name="play-outline" size={16} color="#FFFFFF" />
//                             <Text style={styles.startExamButtonText}>Continue</Text>
//                           </TouchableOpacity>
//                         ) : status === 'available' ? (
//                           <TouchableOpacity
//                             style={[styles.examActionButton, styles.startExamButton]}
//                             onPress={() => navigation.navigate('ExamDetail', { examId: exam._id })}
//                             activeOpacity={0.7}
//                           >
//                             <Ionicons name="play-circle-outline" size={16} color="#FFFFFF" />
//                             <Text style={styles.startExamButtonText}>Start Exam</Text>
//                           </TouchableOpacity>
//                         ) : status === 'upcoming' ? (
//                           <View style={[styles.examActionButton, styles.disabledButton]}>
//                             <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
//                             <Text style={styles.disabledButtonText}>Coming Soon</Text>
//                           </View>
//                         ) : null}
//                       </View>
//                     </View>
//                   );
//                 })}
//               </View>
//             </View>
//           )}

//           {/* Category-level Tiers */}
//           {categoryTiers.length > 0 && (
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>Tiers</Text>
//               {categoryTiers.map((tier) => {
//                 const nodeKey = getNodeKey({ type: 'tier', category: categoryId, tier: tier._id });
//                 const tierExams = exams[nodeKey] || [];
//                 const isExpanded = expandedNodes.has(nodeKey);

//                 return (
//                   <View key={tier._id} style={styles.tierCard}>
//                     <TouchableOpacity
//                       style={styles.tierHeader}
//                       onPress={() => toggleNode(nodeKey, { type: 'tier', category: categoryId, tier: tier._id })}
//                       activeOpacity={0.7}
//                     >
//                       <View style={styles.tierHeaderLeft}>
//                         <Ionicons name="layers" size={20} color={colors.primary} />
//                         <Text style={styles.tierName}>{tier.name}</Text>
//                       </View>
//                       <Ionicons
//                         name={isExpanded ? 'chevron-down' : 'chevron-forward'}
//                         size={20}
//                         color={colors.textSecondary}
//                       />
//                     </TouchableOpacity>
//                     {isExpanded && (
//                       <View style={styles.tierContent}>
//                         {loadingExams ? (
//                           <ActivityIndicator size="small" color={colors.primary} />
//                         ) : tierExams.length > 0 ? (
//                           <View style={styles.examsGrid}>
//                             {tierExams.map((exam) => {
//                               const status = getExamStatus(exam);
//                               return (
//                                 <View
//                                   key={exam._id}
//                                   style={styles.examCard}
//                                 >
//                                   <View style={styles.examCardHeader}>
//                                     <Text style={styles.examCardTitle} numberOfLines={2}>
//                                       {exam.title}
//                                     </Text>
//                                     <View style={[
//                                       styles.statusBadge,
//                                       status === 'available' && styles.statusBadgeAvailable,
//                                       status === 'completed' && styles.statusBadgeCompleted,
//                                       status === 'upcoming' && styles.statusBadgeUpcoming,
//                                     ]}>
//                                       <Text style={styles.statusBadgeText}>
//                                         {status.charAt(0).toUpperCase() + status.slice(1)}
//                                       </Text>
//                                     </View>
//                                   </View>
//                                   <View style={styles.examCardDetails}>
//                                     <View style={styles.examDetailRow}>
//                                       <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
//                                       <Text style={styles.examDetailText}>
//                                         {formatDate(exam.scheduledTime)}
//                                       </Text>
//                                     </View>
//                                     <View style={styles.examDetailRow}>
//                                       <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
//                                       <Text style={styles.examDetailText}>
//                                         {exam.duration} min • {exam.totalMarks} marks
//                                       </Text>
//                                     </View>
//                                   </View>

//                                   {/* Action Buttons */}
//                                   <View style={styles.examCardActions}>
//                                     {exam.isAttempted && exam.attemptId ? (
//                                       <>
//                                         <TouchableOpacity
//                                           style={[styles.examActionButton, styles.viewResultButton]}
//                                           onPress={() => navigation.navigate('Result', { attemptId: exam.attemptId })}
//                                           activeOpacity={0.7}
//                                         >
//                                           <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
//                                           <Text style={styles.viewResultButtonText}>View Result</Text>
//                                         </TouchableOpacity>
//                                         {status === 'available' && (
//                                           <TouchableOpacity
//                                             style={[styles.examActionButton, styles.retryButton]}
//                                             onPress={() => navigation.navigate('ExamDetail', { examId: exam._id })}
//                                             activeOpacity={0.7}
//                                           >
//                                             <Ionicons name="refresh-outline" size={16} color={colors.primary} />
//                                             <Text style={styles.retryButtonText}>Retry</Text>
//                                           </TouchableOpacity>
//                                         )}
//                                       </>
//                                     ) : exam.isPaused ? (
//                                       <TouchableOpacity
//                                         style={[styles.examActionButton, styles.startExamButton]}
//                                         onPress={() => navigation.navigate('ExamDetail', { examId: exam._id })}
//                                         activeOpacity={0.7}
//                                       >
//                                         <Ionicons name="play-outline" size={16} color="#FFFFFF" />
//                                         <Text style={styles.startExamButtonText}>Continue</Text>
//                                       </TouchableOpacity>
//                                     ) : status === 'available' ? (
//                                       <TouchableOpacity
//                                         style={[styles.examActionButton, styles.startExamButton]}
//                                         onPress={() => navigation.navigate('ExamDetail', { examId: exam._id })}
//                                         activeOpacity={0.7}
//                                       >
//                                         <Ionicons name="play-circle-outline" size={16} color="#FFFFFF" />
//                                         <Text style={styles.startExamButtonText}>Start Exam</Text>
//                                       </TouchableOpacity>
//                                     ) : status === 'upcoming' ? (
//                                       <View style={[styles.examActionButton, styles.disabledButton]}>
//                                         <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
//                                         <Text style={styles.disabledButtonText}>Coming Soon</Text>
//                                       </View>
//                                     ) : null}
//                                   </View>
//                                 </View>
//                               );
//                             })}
//                           </View>
//                         ) : (
//                           <Text style={styles.emptyText}>No exams available</Text>
//                         )}
//                       </View>
//                     )}
//                   </View>
//                 );
//               })}
//             </View>
//           )}

//           {/* Empty State */}
//           {(!category.subCategories || category.subCategories.length === 0) &&
//             categoryTiers.length === 0 &&
//             categoryExams.length === 0 && (
//               <View style={styles.emptyContainer}>
//                 <Ionicons name="folder-open" size={64} color={colors.textSecondary} />
//                 <Text style={styles.emptyText}>No content available</Text>
//                 <Text style={styles.emptySubtext}>
//                   This category doesn't have any subcategories, tiers, or exams yet.
//                 </Text>
//               </View>
//             )}
//         </ScrollView>
//       </View>
//     </ScreenWrapper>
//   );
// }

// const createStyles = (colors) =>
//   StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: colors.background,
//     },
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 20,
//       paddingTop: 20,
//       paddingBottom: 16,
//       borderBottomWidth: 1,
//       borderBottomColor: colors.border,
//     },
//     backButton: {
//       padding: 8,
//     },
//     headerTitle: {
//       fontSize: 20,
//       fontWeight: 'bold',
//       color: colors.text,
//       flex: 1,
//       textAlign: 'center',
//     },
//     scrollView: {
//       flex: 1,
//     },
//     scrollContent: {
//       padding: 20,
//       paddingBottom: 40,
//     },
//     loadingContainer: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     categoryHeader: {
//       flexDirection: 'row',
//       backgroundColor: colors.surface,
//       borderRadius: 20,
//       padding: 20,
//       marginBottom: 24,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     categoryLogo: {
//       width: 80,
//       height: 80,
//       borderRadius: 16,
//       marginRight: 16,
//     },
//     categoryIconContainer: {
//       width: 80,
//       height: 80,
//       borderRadius: 16,
//       backgroundColor: colors.primary + '15',
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginRight: 16,
//     },
//     categoryInfo: {
//       flex: 1,
//     },
//     categoryName: {
//       fontSize: 24,
//       fontWeight: 'bold',
//       color: colors.text,
//       marginBottom: 8,
//     },
//     categoryDescription: {
//       fontSize: 14,
//       color: colors.textSecondary,
//       lineHeight: 20,
//       marginBottom: 12,
//     },
//     categoryBadges: {
//       flexDirection: 'row',
//       gap: 8,
//     },
//     badge: {
//       backgroundColor: colors.primary + '20',
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//       borderRadius: 12,
//     },
//     badgeText: {
//       fontSize: 12,
//       color: colors.primary,
//       fontWeight: '600',
//     },
//     section: {
//       marginBottom: 28,
//     },
//     sectionTitle: {
//       fontSize: 22,
//       fontWeight: 'bold',
//       color: colors.text,
//       marginBottom: 16,
//     },
//     examsGrid: {
//       gap: 12,
//     },
//     examCard: {
//       backgroundColor: colors.surface,
//       borderRadius: 16,
//       padding: 16,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     examCardHeader: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'flex-start',
//       marginBottom: 12,
//       gap: 8,
//     },
//     examCardTitle: {
//       flex: 1,
//       fontSize: 15,
//       fontWeight: '600',
//       color: colors.text,
//       lineHeight: 20,
//     },
//     statusBadge: {
//       paddingHorizontal: 8,
//       paddingVertical: 4,
//       borderRadius: 12,
//     },
//     statusBadgeAvailable: {
//       backgroundColor: colors.primary + '20',
//     },
//     statusBadgeCompleted: {
//       backgroundColor: colors.textSecondary + '20',
//     },
//     statusBadgeUpcoming: {
//       backgroundColor: '#f59e0b' + '20',
//     },
//     statusBadgeText: {
//       fontSize: 10,
//       fontWeight: '600',
//       color: colors.text,
//     },
//     examCardDetails: {
//       gap: 8,
//     },
//     examDetailRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 6,
//     },
//     examDetailText: {
//       fontSize: 12,
//       color: colors.textSecondary,
//     },
//     examCardActions: {
//       flexDirection: 'row',
//       gap: 8,
//       marginTop: 12,
//       paddingTop: 12,
//       borderTopWidth: 1,
//       borderTopColor: colors.border,
//     },
//     examActionButton: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'center',
//       paddingVertical: 10,
//       paddingHorizontal: 16,
//       borderRadius: 12,
//       gap: 6,
//       flex: 1,
//     },
//     startExamButton: {
//       backgroundColor: colors.primary,
//     },
//     startExamButtonText: {
//       fontSize: 14,
//       fontWeight: '700',
//       color: '#FFFFFF',
//     },
//     viewResultButton: {
//       backgroundColor: colors.primary,
//     },
//     viewResultButtonText: {
//       fontSize: 14,
//       fontWeight: '700',
//       color: '#FFFFFF',
//     },
//     retryButton: {
//       backgroundColor: colors.surface,
//       borderWidth: 1,
//       borderColor: colors.primary,
//     },
//     retryButtonText: {
//       fontSize: 14,
//       fontWeight: '700',
//       color: colors.primary,
//     },
//     disabledButton: {
//       backgroundColor: colors.surface,
//       borderWidth: 1,
//       borderColor: colors.border,
//       opacity: 0.6,
//     },
//     disabledButtonText: {
//       fontSize: 14,
//       fontWeight: '600',
//       color: colors.textSecondary,
//     },
//     tierCard: {
//       backgroundColor: colors.surface,
//       borderRadius: 16,
//       marginBottom: 12,
//       borderWidth: 1,
//       borderColor: colors.border,
//       overflow: 'hidden',
//     },
//     tierHeader: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       padding: 16,
//     },
//     tierHeaderLeft: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 12,
//       flex: 1,
//     },
//     tierName: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: colors.text,
//     },
//     tierContent: {
//       padding: 16,
//       paddingTop: 0,
//     },
//     subCategoryCard: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       backgroundColor: colors.surface,
//       borderRadius: 16,
//       padding: 16,
//       marginBottom: 12,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     subCategoryLeft: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       flex: 1,
//       gap: 12,
//     },
//     subCategoryLogo: {
//       width: 48,
//       height: 48,
//       borderRadius: 12,
//     },
//     subCategoryIconContainer: {
//       width: 48,
//       height: 48,
//       borderRadius: 12,
//       backgroundColor: colors.primary + '15',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     subCategoryInfo: {
//       flex: 1,
//     },
//     subCategoryName: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: colors.text,
//       marginBottom: 4,
//     },
//     subCategoryDescription: {
//       fontSize: 13,
//       color: colors.textSecondary,
//       marginBottom: 4,
//     },
//     subCategoryExamCount: {
//       fontSize: 12,
//       color: colors.textSecondary,
//     },
//     emptyContainer: {
//       alignItems: 'center',
//       paddingVertical: 40,
//     },
//     emptyText: {
//       fontSize: 16,
//       color: colors.textSecondary,
//       marginTop: 16,
//       fontWeight: '600',
//     },
//     emptySubtext: {
//       fontSize: 14,
//       color: colors.textSecondary,
//       marginTop: 8,
//       textAlign: 'center',
//     },
//   });

