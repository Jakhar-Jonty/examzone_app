// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   RefreshControl,
//   TextInput,
//   Modal,
//   Animated,
//   Dimensions,
//   Platform,
//   Pressable,
//   LayoutAnimation,
//   UIManager,
// } from 'react-native';
// import ScreenWrapper from '../components/ScreenWrapper';
// import { useTheme } from '../context/ThemeContext';
// import { Ionicons } from '@expo/vector-icons';
// import api from '../services/api';
// import { useAuth } from '../context/AuthContext';
// import tw from 'twrnc';

// const { width: SCREEN_WIDTH } = Dimensions.get('window');

// if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
//   UIManager.setLayoutAnimationEnabledExperimental(true);
// }

// // ─── Animated Card ───────────────────────────────────────────────
// const AnimatedCard = ({ children, index }) => {
//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   const slideAnim = useRef(new Animated.Value(30)).current;

//   useEffect(() => {
//     Animated.parallel([
//       Animated.timing(fadeAnim, {
//         toValue: 1,
//         duration: 400,
//         delay: index * 80,
//         useNativeDriver: true,
//       }),
//       Animated.timing(slideAnim, {
//         toValue: 0,
//         duration: 400,
//         delay: index * 80,
//         useNativeDriver: true,
//       }),
//     ]).start();
//   }, []);

//   return (
//     <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
//       {children}
//     </Animated.View>
//   );
// };

// // ─── Skeleton Loader ─────────────────────────────────────────────
// const SkeletonCard = ({ colors, type }) => {
//   const pulseAnim = useRef(new Animated.Value(0.3)).current;

//   useEffect(() => {
//     const animation = Animated.loop(
//       Animated.sequence([
//         Animated.timing(pulseAnim, {
//           toValue: 0.7,
//           duration: 800,
//           useNativeDriver: true,
//         }),
//         Animated.timing(pulseAnim, {
//           toValue: 0.3,
//           duration: 800,
//           useNativeDriver: true,
//         }),
//       ])
//     );
//     animation.start();
//     return () => animation.stop();
//   }, []);

//   if (type === 'article') {
//     return (
//       <Animated.View
//         style={[
//           tw`rounded-2xl p-4 mb-3.5 flex-row`,
//           {
//             backgroundColor: colors.surface,
//             borderWidth: 1,
//             borderColor: colors.border,
//             opacity: pulseAnim,
//           },
//         ]}
//       >
//         <View
//           style={[
//             tw`w-18 h-18 rounded-2xl mr-3.5`,
//             { backgroundColor: colors.border },
//           ]}
//         />
//         <View style={tw`flex-1 justify-center`}>
//           <View
//             style={[
//               tw`h-3.5 rounded-lg mb-2.5`,
//               { backgroundColor: colors.border, width: '80%' },
//             ]}
//           />
//           <View
//             style={[
//               tw`h-2.5 rounded-md mb-2.5`,
//               { backgroundColor: colors.border, width: '60%' },
//             ]}
//           />
//           <View style={tw`flex-row gap-2`}>
//             <View
//               style={[
//                 tw`h-5.5 w-15 rounded-xl`,
//                 { backgroundColor: colors.border },
//               ]}
//             />
//             <View
//               style={[
//                 tw`h-5.5 w-12.5 rounded-xl`,
//                 { backgroundColor: colors.border },
//               ]}
//             />
//           </View>
//         </View>
//       </Animated.View>
//     );
//   }

//   return (
//     <Animated.View
//       style={[
//         tw`rounded-2xl p-4.5 mb-3.5`,
//         {
//           backgroundColor: colors.surface,
//           borderWidth: 1,
//           borderColor: colors.border,
//           opacity: pulseAnim,
//         },
//       ]}
//     >
//       <View
//         style={[
//           tw`h-3.5 rounded-lg mb-2`,
//           { backgroundColor: colors.border, width: '90%' },
//         ]}
//       />
//       <View
//         style={[
//           tw`h-3.5 rounded-lg mb-3.5`,
//           { backgroundColor: colors.border, width: '70%' },
//         ]}
//       />
//       <View style={tw`flex-row gap-2`}>
//         <View
//           style={[
//             tw`h-6 w-17.5 rounded-xl`,
//             { backgroundColor: colors.border },
//           ]}
//         />
//         <View
//           style={[
//             tw`h-6 w-14 rounded-xl`,
//             { backgroundColor: colors.border },
//           ]}
//         />
//         <View
//           style={[
//             tw`h-6 w-15 rounded-xl`,
//             { backgroundColor: colors.border },
//           ]}
//         />
//       </View>
//     </Animated.View>
//   );
// };

// // ─── Main Screen ─────────────────────────────────────────────────
// export default function StudyScreen({ navigation, route }) {
//   const { colors, isDark } = useTheme();
//   const { user } = useAuth();
//   const initialTab = route?.params?.initialTab || 'articles';
//   const [activeTab, setActiveTab] = useState(initialTab);
//   const [articles, setArticles] = useState([]);
//   const [savedQuestions, setSavedQuestions] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [showFilters, setShowFilters] = useState(false);
//   const [searchFocused, setSearchFocused] = useState(false);

//   const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
//   const headerFadeAnim = useRef(new Animated.Value(0)).current;
//   const scrollY = useRef(new Animated.Value(0)).current;

//   const [articleFilters, setArticleFilters] = useState({
//     category: '',
//     isPremium: '',
//     sortBy: 'createdAt',
//     sortOrder: 'desc',
//   });

//   const [questionFilters, setQuestionFilters] = useState({
//     category: '',
//     subject: '',
//     topic: '',
//     status: '',
//     difficulty: '',
//     sortBy: 'savedAt',
//     sortOrder: 'desc',
//   });

//   const [subjectsAndTopics, setSubjectsAndTopics] = useState([]);
//   const [availableSubjects, setAvailableSubjects] = useState([]);
//   const [availableTopics, setAvailableTopics] = useState([]);
//   const [filteredArticles, setFilteredArticles] = useState([]);
//   const [filteredQuestions, setFilteredQuestions] = useState([]);

//   useEffect(() => {
//     Animated.timing(headerFadeAnim, {
//       toValue: 1,
//       duration: 600,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   useEffect(() => {
//     Animated.spring(tabIndicatorAnim, {
//       toValue: activeTab === 'articles' ? 0 : 1,
//       friction: 8,
//       tension: 60,
//       useNativeDriver: true,
//     }).start();
//   }, [activeTab]);

//   useEffect(() => {
//     if (activeTab === 'articles') fetchArticles();
//     else fetchSavedQuestions();
//   }, [activeTab]);

//   useEffect(() => {
//     if (route?.params?.initialTab && route.params.initialTab !== activeTab) {
//       setActiveTab(route.params.initialTab);
//     }
//   }, [route?.params?.initialTab]);

//   useEffect(() => {
//     if (activeTab === 'articles') applyArticleFilters();
//     else applyQuestionFilters();
//   }, [searchQuery, articles, savedQuestions, articleFilters, questionFilters]);

//   useEffect(() => {
//     if (questionFilters.category) {
//       fetchSubjectsAndTopics();
//     } else {
//       setSubjectsAndTopics([]);
//       setAvailableSubjects([]);
//       setAvailableTopics([]);
//     }
//   }, [questionFilters.category]);

//   useEffect(() => {
//     if (questionFilters.category && subjectsAndTopics.length > 0) {
//       const uniqueSubjects = [
//         ...new Set(
//           subjectsAndTopics
//             .filter((st) => {
//               const stCat = st.category?.toString() || '';
//               const filterCat = questionFilters.category?.toString() || '';
//               return stCat === filterCat || st.categoryName === filterCat;
//             })
//             .map((st) => st.subject)
//             .filter(Boolean)
//         ),
//       ].sort();
//       setAvailableSubjects(uniqueSubjects);
//     } else {
//       setAvailableSubjects([]);
//     }
//   }, [questionFilters.category, subjectsAndTopics]);

//   useEffect(() => {
//     if (questionFilters.subject && questionFilters.category && subjectsAndTopics.length > 0) {
//       const subjectData = subjectsAndTopics.find((s) => {
//         const match = s.subject?.toLowerCase() === questionFilters.subject.toLowerCase();
//         const stCat = s.category?.toString() || '';
//         const filterCat = questionFilters.category?.toString() || '';
//         const catMatch = stCat === filterCat || s.categoryName === filterCat;
//         return match && catMatch;
//       });
//       setAvailableTopics(subjectData ? (subjectData.topics || []).filter(Boolean).sort() : []);
//     } else {
//       setAvailableTopics([]);
//     }
//   }, [questionFilters.subject, questionFilters.category, subjectsAndTopics]);

//   // ── API Calls ──────────────────────────
//   const fetchArticles = async () => {
//     try {
//       setLoading(true);
//       const response = await api.get('/articles');
//       setArticles(response.data.articles || []);
//     } catch (error) {
//       console.error('Failed to fetch articles:', error);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   const fetchSavedQuestions = async () => {
//     try {
//       setLoading(true);
//       const params = new URLSearchParams();
//       if (questionFilters.category) params.append('category', questionFilters.category);
//       if (questionFilters.subject) params.append('subject', questionFilters.subject);
//       if (questionFilters.topic) params.append('topic', questionFilters.topic);
//       if (questionFilters.status) params.append('status', questionFilters.status);
//       if (questionFilters.sortBy) params.append('sortBy', questionFilters.sortBy);
//       if (questionFilters.sortOrder) params.append('sortOrder', questionFilters.sortOrder);

//       const response = await api.get(`/user/questions/saved?${params.toString()}`);
//       const questions = response.data.savedQuestions || [];
//       setSavedQuestions(questions);

//       if (questionFilters.category && subjectsAndTopics.length === 0 && questions.length > 0) {
//         const extracted = extractSubjectsAndTopics(questions, questionFilters.category);
//         if (extracted.length > 0) setSubjectsAndTopics(extracted);
//       }
//     } catch (error) {
//       console.error('Failed to fetch saved questions:', error);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   const extractSubjectsAndTopics = (questions, categoryFilter) => {
//     const grouped = {};
//     questions.forEach((item) => {
//       const q = item.question;
//       if (!q) return;
//       const qCat = q.category?.toString() || '';
//       const fCat = categoryFilter?.toString() || '';
//       if (qCat !== fCat && q.category !== fCat) return;
//       const subject = q.subject;
//       if (!subject) return;
//       if (!grouped[subject]) grouped[subject] = { subject, topics: [], category: fCat };
//       if (q.topic && !grouped[subject].topics.includes(q.topic)) grouped[subject].topics.push(q.topic);
//     });
//     return Object.values(grouped).map((item) => ({ ...item, topics: item.topics.sort() }));
//   };

//   const fetchSubjectsAndTopics = async () => {
//     try {
//       const queryParams = questionFilters.category ? `?category=${questionFilters.category}` : '';
//       const response = await api.get(`/user/subjects-topics${queryParams}`);
//       setSubjectsAndTopics(response.data?.subjectsAndTopics || []);
//     } catch (error) {
//       setSubjectsAndTopics([]);
//       setAvailableSubjects([]);
//       setAvailableTopics([]);
//     }
//   };

//   // ── Filters ────────────────────────────
//   const applyArticleFilters = () => {
//     let filtered = [...articles];
//     if (searchQuery.trim()) {
//       const q = searchQuery.toLowerCase();
//       filtered = filtered.filter(
//         (a) =>
//           a.title?.toLowerCase().includes(q) ||
//           a.description?.toLowerCase().includes(q) ||
//           a.category?.toLowerCase().includes(q)
//       );
//     }
//     if (articleFilters.category) filtered = filtered.filter((a) => a.category === articleFilters.category);
//     if (articleFilters.isPremium === 'premium') filtered = filtered.filter((a) => a.isPremium);
//     else if (articleFilters.isPremium === 'free') filtered = filtered.filter((a) => !a.isPremium);
//     filtered.sort((a, b) => {
//       const aVal = a[articleFilters.sortBy] || a.createdAt;
//       const bVal = b[articleFilters.sortBy] || b.createdAt;
//       return articleFilters.sortOrder === 'asc'
//         ? new Date(aVal) - new Date(bVal)
//         : new Date(bVal) - new Date(aVal);
//     });
//     setFilteredArticles(filtered);
//   };

//   const applyQuestionFilters = () => {
//     let filtered = [...savedQuestions];
//     if (searchQuery.trim()) {
//       const q = searchQuery.toLowerCase();
//       filtered = filtered.filter(
//         (item) =>
//           item.question?.questionText?.toLowerCase().includes(q) ||
//           item.question?.subject?.toLowerCase().includes(q) ||
//           item.question?.topic?.toLowerCase().includes(q)
//       );
//     }
//     if (questionFilters.subject)
//       filtered = filtered.filter((i) => i.question?.subject?.toLowerCase() === questionFilters.subject.toLowerCase());
//     if (questionFilters.topic)
//       filtered = filtered.filter((i) => i.question?.topic?.toLowerCase() === questionFilters.topic.toLowerCase());
//     if (questionFilters.status) filtered = filtered.filter((i) => i.status === questionFilters.status);
//     if (questionFilters.difficulty)
//       filtered = filtered.filter((i) => i.question?.difficulty === questionFilters.difficulty);
//     filtered.sort((a, b) => {
//       const aVal = a[questionFilters.sortBy] || a.savedAt;
//       const bVal = b[questionFilters.sortBy] || b.savedAt;
//       return questionFilters.sortOrder === 'asc'
//         ? new Date(aVal) - new Date(bVal)
//         : new Date(bVal) - new Date(aVal);
//     });
//     setFilteredQuestions(filtered);
//   };

//   // ── Handlers ───────────────────────────
//   const onRefresh = () => {
//     setRefreshing(true);
//     activeTab === 'articles' ? fetchArticles() : fetchSavedQuestions();
//   };

//   const handleArticlePress = (article) => navigation.navigate('ArticleDetail', { articleId: article._id });

//   const handleQuestionPress = (savedQuestion) =>
//     navigation.navigate('QuestionDetail', {
//       questionId: savedQuestion.question?._id,
//       savedQuestionId: savedQuestion._id,
//     });

//   const handleUnsaveQuestion = async (savedQuestionId, questionId) => {
//     try {
//       LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
//       await api.delete(`/user/questions/unsave/${questionId}`);
//       setSavedQuestions((prev) => prev.filter((i) => i._id !== savedQuestionId));
//       setFilteredQuestions((prev) => prev.filter((i) => i._id !== savedQuestionId));
//     } catch (error) {
//       console.error('Failed to unsave question:', error);
//     }
//   };

//   const clearFilters = () => {
//     if (activeTab === 'articles') {
//       setArticleFilters({ category: '', isPremium: '', sortBy: 'createdAt', sortOrder: 'desc' });
//     } else {
//       setQuestionFilters({
//         category: '',
//         subject: '',
//         topic: '',
//         status: '',
//         difficulty: '',
//         sortBy: 'savedAt',
//         sortOrder: 'desc',
//       });
//     }
//   };

//   const getActiveFiltersCount = () => {
//     if (activeTab === 'articles') {
//       return Object.values(articleFilters).filter((v) => v && v !== 'createdAt' && v !== 'desc').length;
//     }
//     return Object.values(questionFilters).filter((v) => v && v !== 'savedAt' && v !== 'desc').length;
//   };

//   const getUniqueCategories = () => {
//     if (activeTab === 'articles') return [...new Set(articles.map((a) => a.category).filter(Boolean))].sort();
//     return user?.examPreparations || [];
//   };

//   // ── Helpers ────────────────────────────
//   const getArticleIcon = (category) => {
//     const icons = { Science: '🔬', Math: '📐', History: '🏛️', English: '📚', Technology: '💻' };
//     return icons[category] || '📄';
//   };

//   const getDifficultyColor = (difficulty) => {
//     switch (difficulty) {
//       case 'Easy':
//         return { bg: '#10b98118', text: '#10b981', border: '#10b98130' };
//       case 'Medium':
//         return { bg: '#f59e0b18', text: '#f59e0b', border: '#f59e0b30' };
//       case 'Hard':
//         return { bg: '#ef444418', text: '#ef4444', border: '#ef444430' };
//       default:
//         return { bg: colors.background, text: colors.textSecondary, border: colors.border };
//     }
//   };

//   const getStatusConfig = (status) => {
//     switch (status) {
//       case 'needs-review':
//         return { icon: 'alert-circle', color: '#f59e0b', label: 'Needs Review' };
//       case 'reviewed':
//         return { icon: 'checkmark-circle', color: colors.primary, label: 'Reviewed' };
//       case 'mastered':
//         return { icon: 'star', color: '#8b5cf6', label: 'Mastered' };
//       default:
//         return { icon: 'time', color: colors.textSecondary, label: 'Pending' };
//     }
//   };

//   const formatDate = (dateString) => {
//     const date = new Date(dateString);
//     const diff = new Date() - date;
//     const days = Math.floor(diff / (1000 * 60 * 60 * 24));
//     if (days === 0) return 'Today';
//     if (days === 1) return 'Yesterday';
//     if (days < 7) return `${days}d ago`;
//     if (days < 30) return `${Math.floor(days / 7)}w ago`;
//     return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
//   };

//   const tabTranslateX = tabIndicatorAnim.interpolate({
//     inputRange: [0, 1],
//     outputRange: [0, (SCREEN_WIDTH - 48) / 2 + 4],
//   });

//   const headerScale = scrollY.interpolate({
//     inputRange: [-50, 0, 50],
//     outputRange: [1.02, 1, 0.98],
//     extrapolate: 'clamp',
//   });

//   const resultCount = activeTab === 'articles' ? filteredArticles.length : filteredQuestions.length;
//   const filtersActive = getActiveFiltersCount();

//   // ── Filter Chip Component ──────────────
//   const FilterChip = ({ label, active, onPress }) => (
//     <TouchableOpacity
//       style={[
//         tw`px-4.5 py-2.5 rounded-xl mr-2`,
//         { borderWidth: 1.5 },
//         active
//           ? { backgroundColor: colors.primary + '15', borderColor: colors.primary }
//           : { backgroundColor: colors.surface, borderColor: colors.border },
//       ]}
//       onPress={onPress}
//     >
//       <Text
//         style={[
//           tw`text-[13px]`,
//           active
//             ? { color: colors.primary, fontWeight: '700' }
//             : { color: colors.textSecondary, fontWeight: '500' },
//         ]}
//       >
//         {label}
//       </Text>
//     </TouchableOpacity>
//   );

//   // ── Filter Option Component ────────────
//   const FilterOption = ({ label, active, onPress, icon, customActiveStyle }) => (
//     <TouchableOpacity
//       style={[
//         tw`flex-1 py-3 px-2 rounded-xl items-center justify-center`,
//         { borderWidth: 1.5 },
//         active
//           ? [{ backgroundColor: colors.primary + '12', borderColor: colors.primary }, customActiveStyle]
//           : { backgroundColor: colors.surface, borderColor: colors.border },
//       ]}
//       onPress={onPress}
//     >
//       {icon && (
//         <Ionicons
//           name={icon}
//           size={14}
//           color={active ? colors.primary : colors.textSecondary}
//           style={tw`mb-0.5`}
//         />
//       )}
//       <Text
//         style={[
//           tw`text-[13px] text-center`,
//           active
//             ? { color: colors.primary, fontWeight: '700' }
//             : { color: colors.textSecondary, fontWeight: '500' },
//         ]}
//       >
//         {label}
//       </Text>
//     </TouchableOpacity>
//   );

//   // ── Filter Group Component ─────────────
//   const FilterGroup = ({ icon, label, children, noBorder }) => (
//     <View
//       style={[
//         tw`px-6 py-4.5`,
//         !noBorder && { borderBottomWidth: 1, borderBottomColor: colors.border + '60' },
//       ]}
//     >
//       <View style={tw`flex-row items-center gap-2 mb-3.5`}>
//         <Ionicons name={icon} size={16} color={colors.primary} />
//         <Text style={[tw`text-[15px]`, { color: colors.text, fontWeight: '700' }]}>{label}</Text>
//       </View>
//       {children}
//     </View>
//   );

//   // ─────────────────────────────────────────────────────────────────
//   return (
//     <ScreenWrapper>
//       <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
//         {/* ═══ HEADER ═══ */}
//         <Animated.View
//           style={[
//             tw`px-5 pt-3 pb-3.5`,
//             { opacity: headerFadeAnim, transform: [{ scale: headerScale }] },
//           ]}
//         >
//           <View style={tw`flex-row items-center justify-between`}>
//             <View>
//               <Text style={[tw`text-[28px] tracking-tight`, { color: colors.text, fontWeight: '800' }]}>
//                 Study
//               </Text>
//               <Text style={[tw`text-[13px] mt-0.5`, { color: colors.textSecondary, fontWeight: '500' }]}>
//                 {activeTab === 'articles'
//                   ? `${articles.length} articles available`
//                   : `${savedQuestions.length} saved questions`}
//               </Text>
//             </View>
//             <TouchableOpacity
//               style={[tw`w-10 h-10 rounded-full justify-center items-center`, { backgroundColor: colors.primary + '12' }]}
//               onPress={onRefresh}
//               activeOpacity={0.7}
//             >
//               <Ionicons name="refresh" size={20} color={colors.primary} />
//             </TouchableOpacity>
//           </View>
//         </Animated.View>

//         {/* ═══ TABS ═══ */}
//         <View style={tw`px-5 mb-1`}>
//           <View
//             style={[
//               tw`flex-row rounded-2xl p-1 relative`,
//               { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
//             ]}
//           >
//             {/* Sliding Indicator */}
//             <Animated.View
//               style={[
//                 tw`absolute top-1 left-1 bottom-1 rounded-xl`,
//                 {
//                   backgroundColor: colors.primary,
//                   width: (SCREEN_WIDTH - 48) / 2 - 4,
//                   transform: [{ translateX: tabTranslateX }],
//                   ...Platform.select({
//                     ios: {
//                       shadowColor: colors.primary,
//                       shadowOffset: { width: 0, height: 4 },
//                       shadowOpacity: 0.3,
//                       shadowRadius: 8,
//                     },
//                     android: { elevation: 4 },
//                   }),
//                 },
//               ]}
//             />

//             {/* Articles Tab */}
//             <TouchableOpacity
//               style={tw`flex-1 flex-row items-center justify-center py-3 px-3 rounded-xl z-1 gap-1.5`}
//               onPress={() => {
//                 setSearchQuery('');
//                 setActiveTab('articles');
//               }}
//               activeOpacity={0.7}
//             >
//               <Ionicons
//                 name={activeTab === 'articles' ? 'document-text' : 'document-text-outline'}
//                 size={18}
//                 color={activeTab === 'articles' ? '#FFFFFF' : colors.textSecondary}
//               />
//               <Text
//                 style={[
//                   tw`text-sm`,
//                   {
//                     fontWeight: '600',
//                     color: activeTab === 'articles' ? '#FFFFFF' : colors.textSecondary,
//                   },
//                 ]}
//               >
//                 Articles
//               </Text>
//               {articles.length > 0 && (
//                 <View
//                   style={[
//                     tw`px-1.5 py-0.5 rounded-lg ml-0.5`,
//                     {
//                       backgroundColor: activeTab === 'articles' ? 'rgba(255,255,255,0.25)' : colors.border,
//                     },
//                   ]}
//                 >
//                   <Text
//                     style={[
//                       tw`text-[11px]`,
//                       {
//                         fontWeight: '700',
//                         color: activeTab === 'articles' ? '#FFFFFF' : colors.textSecondary,
//                       },
//                     ]}
//                   >
//                     {articles.length}
//                   </Text>
//                 </View>
//               )}
//             </TouchableOpacity>

//             {/* Questions Tab */}
//             <TouchableOpacity
//               style={tw`flex-1 flex-row items-center justify-center py-3 px-3 rounded-xl z-1 gap-1.5`}
//               onPress={() => {
//                 setSearchQuery('');
//                 setActiveTab('questionBank');
//               }}
//               activeOpacity={0.7}
//             >
//               <Ionicons
//                 name={activeTab === 'questionBank' ? 'bookmark' : 'bookmark-outline'}
//                 size={18}
//                 color={activeTab === 'questionBank' ? '#FFFFFF' : colors.textSecondary}
//               />
//               <Text
//                 style={[
//                   tw`text-sm`,
//                   {
//                     fontWeight: '600',
//                     color: activeTab === 'questionBank' ? '#FFFFFF' : colors.textSecondary,
//                   },
//                 ]}
//               >
//                 Questions
//               </Text>
//               {savedQuestions.length > 0 && (
//                 <View
//                   style={[
//                     tw`px-1.5 py-0.5 rounded-lg ml-0.5`,
//                     {
//                       backgroundColor: activeTab === 'questionBank' ? 'rgba(255,255,255,0.25)' : colors.border,
//                     },
//                   ]}
//                 >
//                   <Text
//                     style={[
//                       tw`text-[11px]`,
//                       {
//                         fontWeight: '700',
//                         color: activeTab === 'questionBank' ? '#FFFFFF' : colors.textSecondary,
//                       },
//                     ]}
//                   >
//                     {savedQuestions.length}
//                   </Text>
//                 </View>
//               )}
//             </TouchableOpacity>
//           </View>
//         </View>

//         {/* ═══ SEARCH & FILTER ═══ */}
//         <View style={tw`flex-row px-5 pt-3.5 pb-1 gap-2.5`}>
//           {/* Search Input */}
//           <View
//             style={[
//               tw`flex-1 flex-row items-center px-3.5 h-12 rounded-[14px]`,
//               {
//                 borderWidth: 1.5,
//                 borderColor: searchFocused ? colors.primary : colors.border,
//                 backgroundColor: searchFocused
//                   ? isDark
//                     ? colors.surface
//                     : colors.primary + '06'
//                   : colors.surface,
//                 ...(searchFocused &&
//                   Platform.select({
//                     ios: {
//                       shadowColor: colors.primary,
//                       shadowOffset: { width: 0, height: 2 },
//                       shadowOpacity: 0.1,
//                       shadowRadius: 8,
//                     },
//                     android: { elevation: 2 },
//                   })),
//               },
//             ]}
//           >
//             <Ionicons
//               name="search"
//               size={18}
//               color={searchFocused ? colors.primary : colors.textSecondary}
//               style={tw`mr-2.5`}
//             />
//             <TextInput
//               style={[tw`flex-1 text-[15px]`, { color: colors.text, fontWeight: '500' }]}
//               placeholder={`Search ${activeTab === 'articles' ? 'articles' : 'saved questions'}...`}
//               placeholderTextColor={colors.textSecondary + '80'}
//               value={searchQuery}
//               onChangeText={setSearchQuery}
//               onFocus={() => setSearchFocused(true)}
//               onBlur={() => setSearchFocused(false)}
//               returnKeyType="search"
//             />
//             {searchQuery.length > 0 && (
//               <TouchableOpacity
//                 onPress={() => setSearchQuery('')}
//                 style={tw`ml-2`}
//                 hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
//               >
//                 <View
//                   style={[
//                     tw`w-5 h-5 rounded-full justify-center items-center`,
//                     { backgroundColor: colors.textSecondary + '80' },
//                   ]}
//                 >
//                   <Ionicons name="close" size={14} color={colors.background} />
//                 </View>
//               </TouchableOpacity>
//             )}
//           </View>

//           {/* Filter Button */}
//           <TouchableOpacity
//             style={[
//               tw`w-12 h-12 justify-center items-center rounded-[14px] relative`,
//               {
//                 borderWidth: 1.5,
//                 backgroundColor: filtersActive > 0 ? colors.primary : colors.primary + '12',
//                 borderColor: filtersActive > 0 ? colors.primary : colors.primary + '25',
//               },
//             ]}
//             onPress={() => setShowFilters(true)}
//             activeOpacity={0.7}
//           >
//             <Ionicons name="options" size={20} color={filtersActive > 0 ? '#FFFFFF' : colors.primary} />
//             {filtersActive > 0 && (
//               <View
//                 style={[
//                   tw`absolute -top-1 -right-1 rounded-full min-w-[18px] h-[18px] justify-center items-center px-1`,
//                   { backgroundColor: colors.error, borderWidth: 2, borderColor: colors.background },
//                 ]}
//               >
//                 <Text style={tw`text-white text-[10px] font-extrabold`}>{filtersActive}</Text>
//               </View>
//             )}
//           </TouchableOpacity>
//         </View>

//         {/* ═══ RESULTS BAR ═══ */}
//         {!loading && (searchQuery || filtersActive > 0) && (
//           <View style={tw`flex-row items-center justify-between px-5.5 pt-2.5 pb-0.5`}>
//             <Text style={[tw`text-[13px]`, { color: colors.textSecondary, fontWeight: '500' }]}>
//               {resultCount} result{resultCount !== 1 ? 's' : ''} found
//             </Text>
//             <TouchableOpacity
//               onPress={() => {
//                 setSearchQuery('');
//                 clearFilters();
//               }}
//               hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
//             >
//               <Text style={[tw`text-[13px]`, { color: colors.primary, fontWeight: '600' }]}>Clear all</Text>
//             </TouchableOpacity>
//           </View>
//         )}

//         {/* ═══ CONTENT ═══ */}
//         <Animated.ScrollView
//           style={tw`flex-1`}
//           contentContainerStyle={tw`p-5 pt-3.5 pb-10`}
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               tintColor={colors.primary}
//               colors={[colors.primary]}
//             />
//           }
//           showsVerticalScrollIndicator={false}
//           onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
//             useNativeDriver: true,
//           })}
//           scrollEventThrottle={16}
//         >
//           {loading ? (
//             <View>
//               {[0, 1, 2, 3].map((i) => (
//                 <SkeletonCard key={i} colors={colors} type={activeTab === 'articles' ? 'article' : 'question'} />
//               ))}
//             </View>
//           ) : activeTab === 'articles' ? (
//             <>
//               {filteredArticles.length === 0 ? (
//                 /* ── Empty Articles ── */
//                 <View style={tw`items-center justify-center py-15 px-8`}>
//                   <View
//                     style={[
//                       tw`w-24 h-24 rounded-full justify-center items-center mb-5`,
//                       { backgroundColor: colors.primary + '10' },
//                     ]}
//                   >
//                     <Ionicons name="document-text-outline" size={48} color={colors.primary + '60'} />
//                   </View>
//                   <Text style={[tw`text-xl mb-2`, { color: colors.text, fontWeight: '700' }]}>No articles found</Text>
//                   <Text
//                     style={[tw`text-sm text-center leading-5 mb-5`, { color: colors.textSecondary }]}
//                   >
//                     {searchQuery || filtersActive > 0
//                       ? 'Try adjusting your search or filters'
//                       : 'Check back later for new study materials'}
//                   </Text>
//                   {(searchQuery || filtersActive > 0) && (
//                     <TouchableOpacity
//                       style={[tw`flex-row items-center gap-1.5 px-5 py-2.5 rounded-xl`, { backgroundColor: colors.primary + '12' }]}
//                       onPress={() => {
//                         setSearchQuery('');
//                         clearFilters();
//                       }}
//                     >
//                       <Ionicons name="refresh" size={16} color={colors.primary} />
//                       <Text style={[tw`text-sm`, { color: colors.primary, fontWeight: '600' }]}>Reset filters</Text>
//                     </TouchableOpacity>
//                   )}
//                 </View>
//               ) : (
//                 /* ── Article Cards ── */
//                 filteredArticles.map((article, index) => (
//                   <AnimatedCard key={article._id} index={index}>
//                     <Pressable
//                       style={({ pressed }) => [
//                         tw`flex-row items-center rounded-2xl p-3.5 mb-3`,
//                         {
//                           backgroundColor: colors.surface,
//                           borderWidth: 1,
//                           borderColor: colors.border,
//                           ...(pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] }),
//                           ...Platform.select({
//                             ios: {
//                               shadowColor: isDark ? '#000' : colors.text,
//                               shadowOffset: { width: 0, height: 2 },
//                               shadowOpacity: isDark ? 0.3 : 0.06,
//                               shadowRadius: 12,
//                             },
//                             android: { elevation: isDark ? 0 : 2 },
//                           }),
//                         },
//                       ]}
//                       onPress={() => handleArticlePress(article)}
//                     >
//                       {/* Thumbnail */}
//                       <View
//                         style={[
//                           tw`w-16 h-16 rounded-2xl justify-center items-center mr-3.5`,
//                           { backgroundColor: colors.primary + '12' },
//                         ]}
//                       >
//                         <Text style={tw`text-[28px]`}>{getArticleIcon(article.category)}</Text>
//                       </View>

//                       {/* Content */}
//                       <View style={tw`flex-1`}>
//                         <View style={tw`flex-row items-start gap-1.5`}>
//                           <Text
//                             style={[tw`flex-1 text-[15px] mb-1 leading-[21px]`, { color: colors.text, fontWeight: '700' }]}
//                             numberOfLines={2}
//                           >
//                             {article.title}
//                           </Text>
//                           {article.isPremium && (
//                             <View
//                               style={[
//                                 tw`w-6 h-6 rounded-full justify-center items-center mt-0.5`,
//                                 { backgroundColor: '#f59e0b18' },
//                               ]}
//                             >
//                               <Ionicons name="diamond" size={10} color="#f59e0b" />
//                             </View>
//                           )}
//                         </View>

//                         {article.description && (
//                           <Text
//                             style={[tw`text-[13px] mb-2.5 leading-[19px]`, { color: colors.textSecondary }]}
//                             numberOfLines={2}
//                           >
//                             {article.description}
//                           </Text>
//                         )}

//                         <View style={tw`flex-row items-center gap-2`}>
//                           {article.category && (
//                             <View style={[tw`px-2.5 py-1 rounded-lg`, { backgroundColor: colors.primary + '12' }]}>
//                               <Text style={[tw`text-[11px]`, { color: colors.primary, fontWeight: '600' }]}>
//                                 {article.category}
//                               </Text>
//                             </View>
//                           )}
//                           <View style={tw`flex-row items-center gap-1`}>
//                             <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
//                             <Text style={[tw`text-[11px]`, { color: colors.textSecondary, fontWeight: '500' }]}>
//                               {formatDate(article.createdAt)}
//                             </Text>
//                           </View>
//                         </View>
//                       </View>

//                       {/* Arrow */}
//                       <View
//                         style={[
//                           tw`ml-2 w-7 h-7 rounded-full justify-center items-center`,
//                           { backgroundColor: colors.background },
//                         ]}
//                       >
//                         <Ionicons name="chevron-forward" size={18} color={colors.textSecondary + '80'} />
//                       </View>
//                     </Pressable>
//                   </AnimatedCard>
//                 ))
//               )}
//             </>
//           ) : (
//             <>
//               {filteredQuestions.length === 0 ? (
//                 /* ── Empty Questions ── */
//                 <View style={tw`items-center justify-center py-15 px-8`}>
//                   <View
//                     style={[
//                       tw`w-24 h-24 rounded-full justify-center items-center mb-5`,
//                       { backgroundColor: colors.primary + '10' },
//                     ]}
//                   >
//                     <Ionicons name="bookmark-outline" size={48} color={colors.primary + '60'} />
//                   </View>
//                   <Text style={[tw`text-xl mb-2`, { color: colors.text, fontWeight: '700' }]}>No saved questions</Text>
//                   <Text
//                     style={[tw`text-sm text-center leading-5 mb-5`, { color: colors.textSecondary }]}
//                   >
//                     {searchQuery || filtersActive > 0
//                       ? 'Try adjusting your search or filters'
//                       : 'Save questions from exam results to build your personal question bank'}
//                   </Text>
//                   {(searchQuery || filtersActive > 0) && (
//                     <TouchableOpacity
//                       style={[tw`flex-row items-center gap-1.5 px-5 py-2.5 rounded-xl`, { backgroundColor: colors.primary + '12' }]}
//                       onPress={() => {
//                         setSearchQuery('');
//                         clearFilters();
//                       }}
//                     >
//                       <Ionicons name="refresh" size={16} color={colors.primary} />
//                       <Text style={[tw`text-sm`, { color: colors.primary, fontWeight: '600' }]}>Reset filters</Text>
//                     </TouchableOpacity>
//                   )}
//                 </View>
//               ) : (
//                 /* ── Question Cards ── */
//                 filteredQuestions.map((savedQuestion, index) => {
//                   const question = savedQuestion.question;
//                   if (!question) return null;
//                   const diffColors = getDifficultyColor(question.difficulty);
//                   const statusConfig = getStatusConfig(savedQuestion.status);

//                   return (
//                     <AnimatedCard key={savedQuestion._id} index={index}>
//                       <View
//                         style={[
//                           tw`rounded-2xl mb-3.5 overflow-hidden`,
//                           {
//                             backgroundColor: colors.surface,
//                             borderWidth: 1,
//                             borderColor: colors.border,
//                             ...Platform.select({
//                               ios: {
//                                 shadowColor: isDark ? '#000' : colors.text,
//                                 shadowOffset: { width: 0, height: 2 },
//                                 shadowOpacity: isDark ? 0.3 : 0.06,
//                                 shadowRadius: 12,
//                               },
//                               android: { elevation: isDark ? 0 : 2 },
//                             }),
//                           },
//                         ]}
//                       >
//                         {/* Difficulty Accent Strip */}
//                         <View style={[tw`h-[3px] w-full`, { backgroundColor: diffColors.text }]} />

//                         <Pressable
//                           style={({ pressed }) => [tw`p-4 pt-3.5`, pressed && { opacity: 0.8 }]}
//                           onPress={() => handleQuestionPress(savedQuestion)}
//                         >
//                           {/* Top Row */}
//                           <View style={tw`flex-row items-center justify-between mb-2.5`}>
//                             <View
//                               style={[tw`px-2.5 py-0.5 rounded-lg`, { backgroundColor: colors.primary + '12' }]}
//                             >
//                               <Text style={[tw`text-xs`, { color: colors.primary, fontWeight: '700' }]}>
//                                 Q{index + 1}
//                               </Text>
//                             </View>
//                             <View
//                               style={[
//                                 tw`flex-row items-center gap-1 px-2.5 py-1 rounded-lg`,
//                                 { backgroundColor: statusConfig.color + '15' },
//                               ]}
//                             >
//                               <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
//                               <Text style={[tw`text-[11px]`, { color: statusConfig.color, fontWeight: '600' }]}>
//                                 {statusConfig.label}
//                               </Text>
//                             </View>
//                           </View>

//                           {/* Question Text */}
//                           <Text
//                             style={[tw`text-[15px] leading-[23px] mb-3`, { color: colors.text, fontWeight: '500' }]}
//                             numberOfLines={3}
//                           >
//                             {question.questionText}
//                           </Text>

//                           {/* Meta Badges */}
//                           <View style={tw`flex-row flex-wrap gap-1.5`}>
//                             {question.subject && (
//                               <View
//                                 style={[
//                                   tw`flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg`,
//                                   {
//                                     backgroundColor: colors.primary + '10',
//                                     borderWidth: 1,
//                                     borderColor: colors.primary + '20',
//                                   },
//                                 ]}
//                               >
//                                 <Ionicons name="book-outline" size={11} color={colors.primary} />
//                                 <Text style={[tw`text-[11px]`, { color: colors.primary, fontWeight: '600' }]}>
//                                   {question.subject}
//                                 </Text>
//                               </View>
//                             )}
//                             {question.topic && (
//                               <View
//                                 style={[
//                                   tw`px-2.5 py-1.5 rounded-lg`,
//                                   { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
//                                 ]}
//                               >
//                                 <Text style={[tw`text-[11px]`, { color: colors.textSecondary, fontWeight: '500' }]}>
//                                   {question.topic}
//                                 </Text>
//                               </View>
//                             )}
//                             {question.difficulty && (
//                               <View
//                                 style={[
//                                   tw`px-2.5 py-1.5 rounded-lg`,
//                                   {
//                                     backgroundColor: diffColors.bg,
//                                     borderWidth: 1,
//                                     borderColor: diffColors.border,
//                                   },
//                                 ]}
//                               >
//                                 <Text style={[tw`text-[11px]`, { color: diffColors.text, fontWeight: '700' }]}>
//                                   {question.difficulty}
//                                 </Text>
//                               </View>
//                             )}
//                           </View>

//                           {/* Notes */}
//                           {savedQuestion.notes && (
//                             <View
//                               style={[
//                                 tw`flex-row items-start gap-1.5 mt-3 pt-2.5`,
//                                 { borderTopWidth: 1, borderTopColor: colors.border + '60' },
//                               ]}
//                             >
//                               <Ionicons name="create-outline" size={13} color={colors.textSecondary} />
//                               <Text
//                                 style={[tw`flex-1 text-xs italic leading-[18px]`, { color: colors.textSecondary }]}
//                                 numberOfLines={2}
//                               >
//                                 {savedQuestion.notes}
//                               </Text>
//                             </View>
//                           )}
//                         </Pressable>

//                         {/* Actions */}
//                         <View
//                           style={[
//                             tw`flex-row`,
//                             { borderTopWidth: 1, borderTopColor: colors.border },
//                           ]}
//                         >
//                           <TouchableOpacity
//                             style={tw`flex-1 flex-row items-center justify-center py-3 gap-1.5`}
//                             onPress={() => handleQuestionPress(savedQuestion)}
//                             activeOpacity={0.7}
//                           >
//                             <Ionicons name="eye-outline" size={16} color={colors.primary} />
//                             <Text style={[tw`text-[13px]`, { color: colors.primary, fontWeight: '600' }]}>
//                               View Details
//                             </Text>
//                           </TouchableOpacity>
//                           <View style={[tw`w-px`, { backgroundColor: colors.border }]} />
//                           <TouchableOpacity
//                             style={tw`flex-1 flex-row items-center justify-center py-3 gap-1.5`}
//                             onPress={() => handleUnsaveQuestion(savedQuestion._id, question._id)}
//                             activeOpacity={0.7}
//                           >
//                             <Ionicons name="bookmark-outline" size={16} color={colors.error} />
//                             <Text style={[tw`text-[13px]`, { color: colors.error, fontWeight: '600' }]}>Remove</Text>
//                           </TouchableOpacity>
//                         </View>
//                       </View>
//                     </AnimatedCard>
//                   );
//                 })
//               )}
//             </>
//           )}
//         </Animated.ScrollView>

//         {/* ═══ FILTER MODAL ═══ */}
//         <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
//           <Pressable style={tw`flex-1 bg-black/50 justify-end`} onPress={() => setShowFilters(false)}>
//             <Pressable
//               style={[
//                 tw`rounded-t-[28px] max-h-[82%]`,
//                 {
//                   backgroundColor: colors.background,
//                   ...Platform.select({
//                     ios: {
//                       shadowColor: '#000',
//                       shadowOffset: { width: 0, height: -4 },
//                       shadowOpacity: 0.15,
//                       shadowRadius: 20,
//                     },
//                     android: { elevation: 24 },
//                   }),
//                 },
//               ]}
//               onPress={(e) => e.stopPropagation()}
//             >
//               {/* Handle */}
//               <View style={tw`items-center pt-2.5 pb-1`}>
//                 <View style={[tw`w-10 h-1 rounded-full`, { backgroundColor: colors.border }]} />
//               </View>

//               {/* Header */}
//               <View
//                 style={[
//                   tw`flex-row items-center justify-between px-6 pt-2 pb-4`,
//                   { borderBottomWidth: 1, borderBottomColor: colors.border },
//                 ]}
//               >
//                 <View>
//                   <Text style={[tw`text-[22px] tracking-tight`, { color: colors.text, fontWeight: '800' }]}>
//                     Filters
//                   </Text>
//                   <Text style={[tw`text-[13px] mt-0.5`, { color: colors.textSecondary, fontWeight: '500' }]}>
//                     {filtersActive > 0
//                       ? `${filtersActive} filter${filtersActive > 1 ? 's' : ''} active`
//                       : 'Refine your results'}
//                   </Text>
//                 </View>
//                 <TouchableOpacity
//                   onPress={() => setShowFilters(false)}
//                   style={tw`p-1`}
//                   hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
//                 >
//                   <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
//                 </TouchableOpacity>
//               </View>

//               {/* Filter Content */}
//               <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false} bounces={false}>
//                 {activeTab === 'articles' ? (
//                   <>
//                     <FilterGroup icon="folder-outline" label="Category">
//                       <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                         <FilterChip
//                           label="All"
//                           active={!articleFilters.category}
//                           onPress={() => setArticleFilters({ ...articleFilters, category: '' })}
//                         />
//                         {getUniqueCategories().map((cat) => (
//                           <FilterChip
//                             key={cat}
//                             label={cat}
//                             active={articleFilters.category === cat}
//                             onPress={() => setArticleFilters({ ...articleFilters, category: cat })}
//                           />
//                         ))}
//                       </ScrollView>
//                     </FilterGroup>

//                     <FilterGroup icon="pricetag-outline" label="Type">
//                       <View style={tw`flex-row gap-2`}>
//                         {[
//                           { value: '', label: 'All', icon: 'apps-outline' },
//                           { value: 'free', label: 'Free', icon: 'gift-outline' },
//                           { value: 'premium', label: 'Premium', icon: 'diamond-outline' },
//                         ].map((type) => (
//                           <FilterOption
//                             key={type.value}
//                             label={type.label}
//                             icon={type.icon}
//                             active={articleFilters.isPremium === type.value}
//                             onPress={() => setArticleFilters({ ...articleFilters, isPremium: type.value })}
//                           />
//                         ))}
//                       </View>
//                     </FilterGroup>

//                     <FilterGroup icon="swap-vertical-outline" label="Sort By">
//                       <View style={tw`flex-row gap-2`}>
//                         {[
//                           { value: 'createdAt', label: 'Date' },
//                           { value: 'title', label: 'Title' },
//                         ].map((sort) => (
//                           <FilterOption
//                             key={sort.value}
//                             label={sort.label}
//                             active={articleFilters.sortBy === sort.value}
//                             onPress={() => setArticleFilters({ ...articleFilters, sortBy: sort.value })}
//                           />
//                         ))}
//                       </View>
//                     </FilterGroup>

//                     <FilterGroup icon="arrow-down-outline" label="Order" noBorder>
//                       <View style={tw`flex-row gap-2`}>
//                         {[
//                           { value: 'desc', label: 'Newest First', icon: 'arrow-down' },
//                           { value: 'asc', label: 'Oldest First', icon: 'arrow-up' },
//                         ].map((order) => (
//                           <FilterOption
//                             key={order.value}
//                             label={order.label}
//                             icon={order.icon}
//                             active={articleFilters.sortOrder === order.value}
//                             onPress={() => setArticleFilters({ ...articleFilters, sortOrder: order.value })}
//                           />
//                         ))}
//                       </View>
//                     </FilterGroup>
//                   </>
//                 ) : (
//                   <>
//                     <FilterGroup icon="folder-outline" label="Category">
//                       <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                         <FilterChip
//                           label="All"
//                           active={!questionFilters.category}
//                           onPress={() =>
//                             setQuestionFilters({ ...questionFilters, category: '', subject: '', topic: '' })
//                           }
//                         />
//                         {getUniqueCategories().map((cat) => (
//                           <FilterChip
//                             key={cat}
//                             label={cat}
//                             active={questionFilters.category === cat}
//                             onPress={() =>
//                               setQuestionFilters({ ...questionFilters, category: cat, subject: '', topic: '' })
//                             }
//                           />
//                         ))}
//                       </ScrollView>
//                     </FilterGroup>

//                     {questionFilters.category && availableSubjects.length > 0 && (
//                       <FilterGroup icon="book-outline" label="Subject">
//                         <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                           <FilterChip
//                             label="All"
//                             active={!questionFilters.subject}
//                             onPress={() => setQuestionFilters({ ...questionFilters, subject: '', topic: '' })}
//                           />
//                           {availableSubjects.map((subject) => (
//                             <FilterChip
//                               key={subject}
//                               label={subject}
//                               active={questionFilters.subject === subject}
//                               onPress={() => setQuestionFilters({ ...questionFilters, subject, topic: '' })}
//                             />
//                           ))}
//                         </ScrollView>
//                       </FilterGroup>
//                     )}

//                     {questionFilters.subject && availableTopics.length > 0 && (
//                       <FilterGroup icon="layers-outline" label="Topic">
//                         <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                           <FilterChip
//                             label="All"
//                             active={!questionFilters.topic}
//                             onPress={() => setQuestionFilters({ ...questionFilters, topic: '' })}
//                           />
//                           {availableTopics.map((topic) => (
//                             <FilterChip
//                               key={topic}
//                               label={topic}
//                               active={questionFilters.topic === topic}
//                               onPress={() => setQuestionFilters({ ...questionFilters, topic })}
//                             />
//                           ))}
//                         </ScrollView>
//                       </FilterGroup>
//                     )}

//                     <FilterGroup icon="flag-outline" label="Status">
//                       <View style={tw`flex-row gap-2`}>
//                         {[
//                           { value: '', label: 'All' },
//                           { value: 'needs-review', label: 'Review' },
//                           { value: 'reviewed', label: 'Reviewed' },
//                           { value: 'mastered', label: 'Mastered' },
//                         ].map((status) => (
//                           <FilterOption
//                             key={status.value}
//                             label={status.label}
//                             active={questionFilters.status === status.value}
//                             onPress={() => setQuestionFilters({ ...questionFilters, status: status.value })}
//                           />
//                         ))}
//                       </View>
//                     </FilterGroup>

//                     <FilterGroup icon="speedometer-outline" label="Difficulty">
//                       <View style={tw`flex-row gap-2`}>
//                         {[
//                           { value: '', label: 'All' },
//                           { value: 'Easy', label: 'Easy' },
//                           { value: 'Medium', label: 'Medium' },
//                           { value: 'Hard', label: 'Hard' },
//                         ].map((d) => {
//                           const dc = getDifficultyColor(d.value);
//                           return (
//                             <FilterOption
//                               key={d.value}
//                               label={d.label}
//                               active={questionFilters.difficulty === d.value}
//                               onPress={() => setQuestionFilters({ ...questionFilters, difficulty: d.value })}
//                               customActiveStyle={
//                                 d.value
//                                   ? { backgroundColor: dc.bg, borderColor: dc.border }
//                                   : undefined
//                               }
//                             />
//                           );
//                         })}
//                       </View>
//                     </FilterGroup>

//                     <FilterGroup icon="swap-vertical-outline" label="Sort By">
//                       <View style={tw`flex-row gap-2`}>
//                         {[
//                           { value: 'savedAt', label: 'Date Saved' },
//                           { value: 'status', label: 'Status' },
//                         ].map((sort) => (
//                           <FilterOption
//                             key={sort.value}
//                             label={sort.label}
//                             active={questionFilters.sortBy === sort.value}
//                             onPress={() => setQuestionFilters({ ...questionFilters, sortBy: sort.value })}
//                           />
//                         ))}
//                       </View>
//                     </FilterGroup>

//                     <FilterGroup icon="arrow-down-outline" label="Order" noBorder>
//                       <View style={tw`flex-row gap-2`}>
//                         {[
//                           { value: 'desc', label: 'Newest First', icon: 'arrow-down' },
//                           { value: 'asc', label: 'Oldest First', icon: 'arrow-up' },
//                         ].map((order) => (
//                           <FilterOption
//                             key={order.value}
//                             label={order.label}
//                             icon={order.icon}
//                             active={questionFilters.sortOrder === order.value}
//                             onPress={() => setQuestionFilters({ ...questionFilters, sortOrder: order.value })}
//                           />
//                         ))}
//                       </View>
//                     </FilterGroup>
//                   </>
//                 )}
//               </ScrollView>

//               {/* Footer */}
//               <View
//                 style={[
//                   tw`flex-row px-6 py-4 gap-3`,
//                   {
//                     borderTopWidth: 1,
//                     borderTopColor: colors.border,
//                     paddingBottom: Platform.OS === 'ios' ? 34 : 16,
//                   },
//                 ]}
//               >
//                 <TouchableOpacity
//                   style={[
//                     tw`flex-row items-center justify-center gap-1.5 py-4 rounded-[14px]`,
//                     {
//                       flex: 0.45,
//                       backgroundColor: colors.surface,
//                       borderWidth: 1.5,
//                       borderColor: colors.border,
//                     },
//                   ]}
//                   onPress={clearFilters}
//                   activeOpacity={0.7}
//                 >
//                   <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
//                   <Text style={[tw`text-[15px]`, { color: colors.textSecondary, fontWeight: '600' }]}>Clear All</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   style={[
//                     tw`flex-row items-center justify-center gap-1.5 py-4 rounded-[14px]`,
//                     {
//                       flex: 0.55,
//                       backgroundColor: colors.primary,
//                       ...Platform.select({
//                         ios: {
//                           shadowColor: colors.primary,
//                           shadowOffset: { width: 0, height: 4 },
//                           shadowOpacity: 0.3,
//                           shadowRadius: 8,
//                         },
//                         android: { elevation: 4 },
//                       }),
//                     },
//                   ]}
//                   onPress={() => {
//                     setShowFilters(false);
//                     if (activeTab === 'questionBank') fetchSavedQuestions();
//                   }}
//                   activeOpacity={0.7}
//                 >
//                   <Ionicons name="checkmark" size={18} color="#FFFFFF" />
//                   <Text style={tw`text-[15px] text-white font-bold`}>Apply Filters</Text>
//                 </TouchableOpacity>
//               </View>
//             </Pressable>
//           </Pressable>
//         </Modal>
//       </View>
//     </ScreenWrapper>
//   );
// }








import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function StudyScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const initialTab = route?.params?.initialTab || 'articles';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [articles, setArticles] = useState([]);
  const [savedQuestions, setSavedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Article filters
  const [articleFilters, setArticleFilters] = useState({
    category: '',
    isPremium: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Question filters
  const [questionFilters, setQuestionFilters] = useState({
    category: '',
    subject: '',
    topic: '',
    status: '',
    difficulty: '',
    sortBy: 'savedAt',
    sortOrder: 'desc',
  });

  const [subjectsAndTopics, setSubjectsAndTopics] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableTopics, setAvailableTopics] = useState([]);

  const [filteredArticles, setFilteredArticles] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);

  const styles = createStyles(colors);

  useEffect(() => {
    if (activeTab === 'articles') {
      fetchArticles();
    } else {
      fetchSavedQuestions();
    }
  }, [activeTab]);

  useEffect(() => {
    if (route?.params?.initialTab && route.params.initialTab !== activeTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  useEffect(() => {
    if (activeTab === 'articles') {
      applyArticleFilters();
    } else {
      applyQuestionFilters();
    }
  }, [searchQuery, articles, savedQuestions, articleFilters, questionFilters]);

  useEffect(() => {
    if (questionFilters.category) {
      fetchSubjectsAndTopics();
    } else {
      setSubjectsAndTopics([]);
      setAvailableSubjects([]);
      setAvailableTopics([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionFilters.category]);

  useEffect(() => {
    if (questionFilters.category && subjectsAndTopics.length > 0) {
      // Compare category as string (handle both ObjectId string and category code)
      const uniqueSubjects = [...new Set(
        subjectsAndTopics
          .filter(st => {
            const stCategory = st.category?.toString() || st.category || '';
            const filterCategory = questionFilters.category?.toString() || questionFilters.category || '';
            return stCategory === filterCategory || st.categoryName === filterCategory;
          })
          .map(st => st.subject)
          .filter(Boolean)
      )].sort();
      setAvailableSubjects(uniqueSubjects);
    } else {
      setAvailableSubjects([]);
    }
  }, [questionFilters.category, subjectsAndTopics]);

  useEffect(() => {
    if (questionFilters.subject && questionFilters.category && subjectsAndTopics.length > 0) {
      const subjectData = subjectsAndTopics.find(s => {
        const subjectMatch = s.subject?.toLowerCase() === questionFilters.subject.toLowerCase();
        const stCategory = s.category?.toString() || s.category || '';
        const filterCategory = questionFilters.category?.toString() || questionFilters.category || '';
        const categoryMatch = stCategory === filterCategory || s.categoryName === filterCategory;
        return subjectMatch && categoryMatch;
      });
      if (subjectData) {
        setAvailableTopics((subjectData.topics || []).filter(Boolean).sort());
      } else {
        setAvailableTopics([]);
      }
    } else {
      setAvailableTopics([]);
    }
  }, [questionFilters.subject, questionFilters.category, subjectsAndTopics]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/articles');
      setArticles(response.data.articles || []);
    } catch (error) {
      console.error('Failed to fetch articles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSavedQuestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (questionFilters.category) params.append('category', questionFilters.category);
      if (questionFilters.subject) params.append('subject', questionFilters.subject);
      if (questionFilters.topic) params.append('topic', questionFilters.topic);
      if (questionFilters.status) params.append('status', questionFilters.status);
      if (questionFilters.sortBy) params.append('sortBy', questionFilters.sortBy);
      if (questionFilters.sortOrder) params.append('sortOrder', questionFilters.sortOrder);

      const response = await api.get(`/user/questions/saved?${params.toString()}`);
      const questions = response.data.savedQuestions || [];
      setSavedQuestions(questions);

      // If subjects/topics API failed, extract from saved questions as fallback
      if (questionFilters.category && subjectsAndTopics.length === 0 && questions.length > 0) {
        const extracted = extractSubjectsAndTopics(questions, questionFilters.category);
        if (extracted.length > 0) {
          setSubjectsAndTopics(extracted);
        }
      }
    } catch (error) {
      console.error('Failed to fetch saved questions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const extractSubjectsAndTopics = (questions, categoryFilter) => {
    const grouped = {};
    questions.forEach(item => {
      const question = item.question;
      if (!question) return;

      const questionCategory = question.category?.toString() || question.category || '';
      const filterCategory = categoryFilter?.toString() || categoryFilter || '';

      // Only include if category matches
      if (questionCategory !== filterCategory && question.category !== filterCategory) {
        return;
      }

      const subject = question.subject;
      if (!subject) return;

      if (!grouped[subject]) {
        grouped[subject] = {
          subject: subject,
          topics: [],
          category: filterCategory,
        };
      }

      if (question.topic && !grouped[subject].topics.includes(question.topic)) {
        grouped[subject].topics.push(question.topic);
      }
    });

    return Object.values(grouped).map(item => ({
      ...item,
      topics: item.topics.sort(),
    }));
  };

  const fetchSubjectsAndTopics = async () => {
    try {
      const queryParams = questionFilters.category ? `?category=${questionFilters.category}` : '';
      const response = await api.get(`/user/subjects-topics${queryParams}`);
      setSubjectsAndTopics(response.data?.subjectsAndTopics || []);
    } catch (error) {
      console.error('Failed to fetch subjects and topics:', error);
      // Don't show error to user - just use empty array, filters will still work
      setSubjectsAndTopics([]);
      setAvailableSubjects([]);
      setAvailableTopics([]);
    }
  };

  const applyArticleFilters = () => {
    let filtered = [...articles];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(article =>
        article.title?.toLowerCase().includes(query) ||
        article.description?.toLowerCase().includes(query) ||
        article.category?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (articleFilters.category) {
      filtered = filtered.filter(article => article.category === articleFilters.category);
    }

    // Premium filter
    if (articleFilters.isPremium === 'premium') {
      filtered = filtered.filter(article => article.isPremium === true);
    } else if (articleFilters.isPremium === 'free') {
      filtered = filtered.filter(article => !article.isPremium);
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[articleFilters.sortBy] || a.createdAt;
      const bVal = b[articleFilters.sortBy] || b.createdAt;
      if (articleFilters.sortOrder === 'asc') {
        return new Date(aVal) - new Date(bVal);
      }
      return new Date(bVal) - new Date(aVal);
    });

    setFilteredArticles(filtered);
  };

  const applyQuestionFilters = () => {
    let filtered = [...savedQuestions];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.question?.questionText?.toLowerCase().includes(query) ||
        item.question?.subject?.toLowerCase().includes(query) ||
        item.question?.topic?.toLowerCase().includes(query)
      );
    }

    // Subject filter
    if (questionFilters.subject) {
      filtered = filtered.filter(item =>
        item.question?.subject?.toLowerCase() === questionFilters.subject.toLowerCase()
      );
    }

    // Topic filter
    if (questionFilters.topic) {
      filtered = filtered.filter(item =>
        item.question?.topic?.toLowerCase() === questionFilters.topic.toLowerCase()
      );
    }

    // Status filter
    if (questionFilters.status) {
      filtered = filtered.filter(item => item.status === questionFilters.status);
    }

    // Difficulty filter
    if (questionFilters.difficulty) {
      filtered = filtered.filter(item =>
        item.question?.difficulty === questionFilters.difficulty
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[questionFilters.sortBy] || a.savedAt;
      const bVal = b[questionFilters.sortBy] || b.savedAt;
      if (questionFilters.sortOrder === 'asc') {
        return new Date(aVal) - new Date(bVal);
      }
      return new Date(bVal) - new Date(aVal);
    });

    setFilteredQuestions(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'articles') {
      fetchArticles();
    } else {
      fetchSavedQuestions();
    }
  };

  const handleArticlePress = (article) => {
    navigation.navigate('ArticleDetail', { articleId: article._id });
  };

  const handleQuestionPress = (savedQuestion) => {
    navigation.navigate('QuestionDetail', {
      questionId: savedQuestion.question?._id,
      savedQuestionId: savedQuestion._id,
    });
  };

  const handleUnsaveQuestion = async (savedQuestionId, questionId) => {
    try {
      await api.delete(`/user/questions/unsave/${questionId}`);
      setSavedQuestions(prev => prev.filter(item => item._id !== savedQuestionId));
      setFilteredQuestions(prev => prev.filter(item => item._id !== savedQuestionId));
    } catch (error) {
      console.error('Failed to unsave question:', error);
    }
  };

  const clearFilters = () => {
    if (activeTab === 'articles') {
      setArticleFilters({
        category: '',
        isPremium: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    } else {
      setQuestionFilters({
        category: '',
        subject: '',
        topic: '',
        status: '',
        difficulty: '',
        sortBy: 'savedAt',
        sortOrder: 'desc',
      });
    }
  };

  const getActiveFiltersCount = () => {
    if (activeTab === 'articles') {
      return Object.values(articleFilters).filter(v => v && v !== 'createdAt' && v !== 'desc').length;
    } else {
      return Object.values(questionFilters).filter(v => v && v !== 'savedAt' && v !== 'desc').length;
    }
  };

  const getUniqueCategories = () => {
    if (activeTab === 'articles') {
      return [...new Set(articles.map(a => a.category).filter(Boolean))].sort();
    } else {
      return user?.examPreparations || [];
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Study</Text>
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('PracticeSessions')}
            activeOpacity={0.85}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="flash" size={22} color={colors.primary} />
            </View>
            <View style={styles.quickText}>
              <Text style={styles.quickTitle}>Practice</Text>
              <Text style={styles.quickSub}>Targeted question drills</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('StudyPlans')}
            activeOpacity={0.85}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#3b82f618' }]}>
              <Ionicons name="calendar" size={22} color="#3b82f6" />
            </View>
            <View style={styles.quickText}>
              <Text style={styles.quickTitle}>Study Plans</Text>
              <Text style={styles.quickSub}>Track topics & milestones</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'articles' && styles.tabActive]}
            onPress={() => setActiveTab('articles')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="document-text-outline"
              size={20}
              color={activeTab === 'articles' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'articles' && styles.tabTextActive]}>
              Articles
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'questionBank' && styles.tabActive]}
            onPress={() => setActiveTab('questionBank')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="bookmark"
              size={20}
              color={activeTab === 'questionBank' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'questionBank' && styles.tabTextActive]}>
              Question Bank
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search and Filter Bar */}
        <View style={styles.searchFilterRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${activeTab === 'articles' ? 'articles' : 'questions'}...`}
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
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="filter" size={20} color={colors.primary} />
            {getActiveFiltersCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
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
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : activeTab === 'articles' ? (
            <>
              {filteredArticles.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>No articles found</Text>
                  <Text style={styles.emptySubtext}>
                    {searchQuery || getActiveFiltersCount() > 0
                      ? 'Try adjusting your search or filters'
                      : 'Check back later for new articles'}
                  </Text>
                </View>
              ) : (
                filteredArticles.map((article) => (
                  <TouchableOpacity
                    key={article._id}
                    style={styles.articleCard}
                    onPress={() => handleArticlePress(article)}
                    activeOpacity={0.7}
                  >
                    {article.thumbnail && (
                      <View style={styles.articleThumbnail}>
                        <Text style={styles.thumbnailPlaceholder}>📄</Text>
                      </View>
                    )}
                    <View style={styles.articleContent}>
                      <Text style={styles.articleTitle} numberOfLines={2}>
                        {article.title}
                      </Text>
                      {article.description && (
                        <Text style={styles.articleDescription} numberOfLines={2}>
                          {article.description}
                        </Text>
                      )}
                      <View style={styles.articleMeta}>
                        {article.category && (
                          <View style={styles.metaBadge}>
                            <Text style={styles.metaText}>{article.category}</Text>
                          </View>
                        )}
                        {article.isPremium && (
                          <View style={styles.premiumBadge}>
                            <Ionicons name="diamond" size={12} color="#f59e0b" />
                            <Text style={styles.premiumText}>Premium</Text>
                          </View>
                        )}
                        {article.createdAt && (
                          <Text style={styles.metaDate}>
                            {new Date(article.createdAt).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))
              )}
            </>
          ) : (
            <>
              {filteredQuestions.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="bookmark-outline" size={64} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>No saved questions</Text>
                  <Text style={styles.emptySubtext}>
                    {searchQuery || getActiveFiltersCount() > 0
                      ? 'Try adjusting your search or filters'
                      : 'Save questions from exam results to build your question bank'}
                  </Text>
                </View>
              ) : (
                filteredQuestions.map((savedQuestion) => {
                  const question = savedQuestion.question;
                  if (!question) return null;

                  return (
                    <View key={savedQuestion._id} style={styles.questionCard}>
                      <TouchableOpacity
                        onPress={() => handleQuestionPress(savedQuestion)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.questionContent}>
                          <View style={styles.questionHeader}>
                            <Text style={styles.questionText} numberOfLines={3}>
                              {question.questionText}
                            </Text>
                          </View>
                          <View style={styles.questionMeta}>
                            {question.subject && (
                              <View style={styles.metaBadge}>
                                <Text style={styles.metaText}>{question.subject}</Text>
                              </View>
                            )}
                            {question.topic && (
                              <View style={styles.metaBadge}>
                                <Text style={styles.metaText}>{question.topic}</Text>
                              </View>
                            )}
                            {question.difficulty && (
                              <View style={[
                                styles.metaBadge,
                                question.difficulty === 'Easy' && styles.difficultyEasy,
                                question.difficulty === 'Medium' && styles.difficultyMedium,
                                question.difficulty === 'Hard' && styles.difficultyHard,
                              ]}>
                                <Text style={styles.metaText}>{question.difficulty}</Text>
                              </View>
                            )}
                            {savedQuestion.status && (
                              <View style={styles.statusBadge}>
                                <Text style={styles.statusText}>
                                  {savedQuestion.status.replace('-', ' ')}
                                </Text>
                              </View>
                            )}
                          </View>
                          {savedQuestion.notes && (
                            <Text style={styles.questionNotes} numberOfLines={2}>
                              📝 {savedQuestion.notes}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                      <View style={styles.questionActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleQuestionPress(savedQuestion)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="eye-outline" size={18} color={colors.primary} />
                          <Text style={styles.actionText}>View</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.unsaveButton]}
                          onPress={() => handleUnsaveQuestion(savedQuestion._id, question._id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="bookmark" size={18} color={colors.error} />
                          <Text style={[styles.actionText, styles.unsaveText]}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>

        {/* Filter Modal */}
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
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {activeTab === 'articles' ? (
                  <>
                    {/* Category Filter */}
                    <View style={styles.filterGroup}>
                      <Text style={styles.filterLabel}>Category</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                        <TouchableOpacity
                          style={[
                            styles.filterChip,
                            !articleFilters.category && styles.filterChipActive,
                          ]}
                          onPress={() => setArticleFilters({ ...articleFilters, category: '' })}
                        >
                          <Text style={[
                            styles.filterChipText,
                            !articleFilters.category && styles.filterChipTextActive,
                          ]}>All</Text>
                        </TouchableOpacity>
                        {getUniqueCategories().map((cat) => (
                          <TouchableOpacity
                            key={cat}
                            style={[
                              styles.filterChip,
                              articleFilters.category === cat && styles.filterChipActive,
                            ]}
                            onPress={() => setArticleFilters({ ...articleFilters, category: cat })}
                          >
                            <Text style={[
                              styles.filterChipText,
                              articleFilters.category === cat && styles.filterChipTextActive,
                            ]}>{cat}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {/* Premium Filter */}
                    <View style={styles.filterGroup}>
                      <Text style={styles.filterLabel}>Type</Text>
                      <View style={styles.filterRow}>
                        {['', 'free', 'premium'].map((type) => (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.filterOption,
                              articleFilters.isPremium === type && styles.filterOptionActive,
                            ]}
                            onPress={() => setArticleFilters({ ...articleFilters, isPremium: type })}
                          >
                            <Text style={[
                              styles.filterOptionText,
                              articleFilters.isPremium === type && styles.filterOptionTextActive,
                            ]}>
                              {type === '' ? 'All' : type === 'free' ? 'Free' : 'Premium'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Sort */}
                    <View style={styles.filterGroup}>
                      <Text style={styles.filterLabel}>Sort By</Text>
                      <View style={styles.filterRow}>
                        {['createdAt', 'title'].map((sort) => (
                          <TouchableOpacity
                            key={sort}
                            style={[
                              styles.filterOption,
                              articleFilters.sortBy === sort && styles.filterOptionActive,
                            ]}
                            onPress={() => setArticleFilters({ ...articleFilters, sortBy: sort })}
                          >
                            <Text style={[
                              styles.filterOptionText,
                              articleFilters.sortBy === sort && styles.filterOptionTextActive,
                            ]}>
                              {sort === 'createdAt' ? 'Date' : 'Title'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.filterGroup}>
                      <Text style={styles.filterLabel}>Order</Text>
                      <View style={styles.filterRow}>
                        {['desc', 'asc'].map((order) => (
                          <TouchableOpacity
                            key={order}
                            style={[
                              styles.filterOption,
                              articleFilters.sortOrder === order && styles.filterOptionActive,
                            ]}
                            onPress={() => setArticleFilters({ ...articleFilters, sortOrder: order })}
                          >
                            <Text style={[
                              styles.filterOptionText,
                              articleFilters.sortOrder === order && styles.filterOptionTextActive,
                            ]}>
                              {order === 'desc' ? 'Newest' : 'Oldest'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    {/* Category Filter */}
                    <View style={styles.filterGroup}>
                      <Text style={styles.filterLabel}>Category</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                        <TouchableOpacity
                          style={[
                            styles.filterChip,
                            !questionFilters.category && styles.filterChipActive,
                          ]}
                          onPress={() => setQuestionFilters({ ...questionFilters, category: '', subject: '', topic: '' })}
                        >
                          <Text style={[
                            styles.filterChipText,
                            !questionFilters.category && styles.filterChipTextActive,
                          ]}>All</Text>
                        </TouchableOpacity>
                        {getUniqueCategories().map((cat) => (
                          <TouchableOpacity
                            key={cat}
                            style={[
                              styles.filterChip,
                              questionFilters.category === cat && styles.filterChipActive,
                            ]}
                            onPress={() => setQuestionFilters({ ...questionFilters, category: cat, subject: '', topic: '' })}
                          >
                            <Text style={[
                              styles.filterChipText,
                              questionFilters.category === cat && styles.filterChipTextActive,
                            ]}>{cat}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {/* Subject Filter */}
                    {questionFilters.category && availableSubjects.length > 0 && (
                      <View style={styles.filterGroup}>
                        <Text style={styles.filterLabel}>Subject</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                          <TouchableOpacity
                            style={[
                              styles.filterChip,
                              !questionFilters.subject && styles.filterChipActive,
                            ]}
                            onPress={() => setQuestionFilters({ ...questionFilters, subject: '', topic: '' })}
                          >
                            <Text style={[
                              styles.filterChipText,
                              !questionFilters.subject && styles.filterChipTextActive,
                            ]}>All</Text>
                          </TouchableOpacity>
                          {availableSubjects.map((subject) => (
                            <TouchableOpacity
                              key={subject}
                              style={[
                                styles.filterChip,
                                questionFilters.subject === subject && styles.filterChipActive,
                              ]}
                              onPress={() => setQuestionFilters({ ...questionFilters, subject, topic: '' })}
                            >
                              <Text style={[
                                styles.filterChipText,
                                questionFilters.subject === subject && styles.filterChipTextActive,
                              ]}>{subject}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Topic Filter */}
                    {questionFilters.subject && availableTopics.length > 0 && (
                      <View style={styles.filterGroup}>
                        <Text style={styles.filterLabel}>Topic</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                          <TouchableOpacity
                            style={[
                              styles.filterChip,
                              !questionFilters.topic && styles.filterChipActive,
                            ]}
                            onPress={() => setQuestionFilters({ ...questionFilters, topic: '' })}
                          >
                            <Text style={[
                              styles.filterChipText,
                              !questionFilters.topic && styles.filterChipTextActive,
                            ]}>All</Text>
                          </TouchableOpacity>
                          {availableTopics.map((topic) => (
                            <TouchableOpacity
                              key={topic}
                              style={[
                                styles.filterChip,
                                questionFilters.topic === topic && styles.filterChipActive,
                              ]}
                              onPress={() => setQuestionFilters({ ...questionFilters, topic })}
                            >
                              <Text style={[
                                styles.filterChipText,
                                questionFilters.topic === topic && styles.filterChipTextActive,
                              ]}>{topic}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Status Filter */}
                    <View style={styles.filterGroup}>
                      <Text style={styles.filterLabel}>Status</Text>
                      <View style={styles.filterRow}>
                        {['', 'needs-review', 'reviewed', 'mastered'].map((status) => (
                          <TouchableOpacity
                            key={status}
                            style={[
                              styles.filterOption,
                              questionFilters.status === status && styles.filterOptionActive,
                            ]}
                            onPress={() => setQuestionFilters({ ...questionFilters, status })}
                          >
                            <Text style={[
                              styles.filterOptionText,
                              questionFilters.status === status && styles.filterOptionTextActive,
                            ]}>
                              {status === '' ? 'All' : status.replace('-', ' ')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Difficulty Filter */}
                    <View style={styles.filterGroup}>
                      <Text style={styles.filterLabel}>Difficulty</Text>
                      <View style={styles.filterRow}>
                        {['', 'Easy', 'Medium', 'Hard'].map((difficulty) => (
                          <TouchableOpacity
                            key={difficulty}
                            style={[
                              styles.filterOption,
                              questionFilters.difficulty === difficulty && styles.filterOptionActive,
                            ]}
                            onPress={() => setQuestionFilters({ ...questionFilters, difficulty })}
                          >
                            <Text style={[
                              styles.filterOptionText,
                              questionFilters.difficulty === difficulty && styles.filterOptionTextActive,
                            ]}>
                              {difficulty || 'All'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Sort */}
                    <View style={styles.filterGroup}>
                      <Text style={styles.filterLabel}>Sort By</Text>
                      <View style={styles.filterRow}>
                        {['savedAt', 'status'].map((sort) => (
                          <TouchableOpacity
                            key={sort}
                            style={[
                              styles.filterOption,
                              questionFilters.sortBy === sort && styles.filterOptionActive,
                            ]}
                            onPress={() => setQuestionFilters({ ...questionFilters, sortBy: sort })}
                          >
                            <Text style={[
                              styles.filterOptionText,
                              questionFilters.sortBy === sort && styles.filterOptionTextActive,
                            ]}>
                              {sort === 'savedAt' ? 'Date' : 'Status'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.filterGroup}>
                      <Text style={styles.filterLabel}>Order</Text>
                      <View style={styles.filterRow}>
                        {['desc', 'asc'].map((order) => (
                          <TouchableOpacity
                            key={order}
                            style={[
                              styles.filterOption,
                              questionFilters.sortOrder === order && styles.filterOptionActive,
                            ]}
                            onPress={() => setQuestionFilters({ ...questionFilters, sortOrder: order })}
                          >
                            <Text style={[
                              styles.filterOptionText,
                              questionFilters.sortOrder === order && styles.filterOptionTextActive,
                            ]}>
                              {order === 'desc' ? 'Newest' : 'Oldest'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.clearFiltersButton}
                  onPress={clearFilters}
                  activeOpacity={0.7}
                >
                  <Text style={styles.clearFiltersText}>Clear All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.applyFiltersButton}
                  onPress={() => {
                    setShowFilters(false);
                    if (activeTab === 'questionBank') {
                      fetchSavedQuestions();
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.applyFiltersText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenWrapper>
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
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    quickActions: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 10,
    },
    quickCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickText: { flex: 1 },
    quickTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    quickSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingTop: 12,
      gap: 8,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    tabActive: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.primary,
    },
    searchFilterRow: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingTop: 12,
      gap: 8,
    },
    searchContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
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
    },
    clearButton: {
      marginLeft: 8,
    },
    filterButton: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      position: 'relative',
    },
    filterBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
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
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
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
      paddingHorizontal: 40,
    },
    articleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    articleThumbnail: {
      width: 60,
      height: 60,
      borderRadius: 12,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    thumbnailPlaceholder: {
      fontSize: 24,
    },
    articleContent: {
      flex: 1,
    },
    articleTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    articleDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    articleMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    questionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    questionContent: {
      marginBottom: 12,
    },
    questionHeader: {
      marginBottom: 12,
    },
    questionText: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
      lineHeight: 22,
    },
    questionMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8,
    },
    questionNotes: {
      fontSize: 13,
      color: colors.textSecondary,
      fontStyle: 'italic',
      marginTop: 8,
    },
    questionActions: {
      flexDirection: 'row',
      gap: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    unsaveButton: {
      borderColor: colors.error + '40',
    },
    actionText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    unsaveText: {
      color: colors.error,
    },
    metaBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: colors.background,
    },
    metaText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    metaDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    premiumBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: '#f59e0b20',
    },
    premiumText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#f59e0b',
    },
    difficultyEasy: {
      backgroundColor: '#10b98120',
    },
    difficultyMedium: {
      backgroundColor: '#f59e0b20',
    },
    difficultyHard: {
      backgroundColor: '#ef444420',
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: colors.primary + '20',
    },
    statusText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.primary,
      textTransform: 'capitalize',
    },
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    modalCloseButton: {
      padding: 8,
    },
    modalScroll: {
      maxHeight: 400,
    },
    filterGroup: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    filterLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    filterChips: {
      flexDirection: 'row',
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    filterChipActive: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    filterChipText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    filterChipTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
    },
    filterOption: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    filterOptionActive: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    filterOptionText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    filterOptionTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    modalFooter: {
      flexDirection: 'row',
      padding: 20,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    clearFiltersButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    clearFiltersText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    applyFiltersButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    applyFiltersText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });


