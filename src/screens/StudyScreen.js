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
} from 'react-native';
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Study</Text>
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
                          onPress={() => setArticleFilters({...articleFilters, category: ''})}
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
                            onPress={() => setArticleFilters({...articleFilters, category: cat})}
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
                            onPress={() => setArticleFilters({...articleFilters, isPremium: type})}
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
                            onPress={() => setArticleFilters({...articleFilters, sortBy: sort})}
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
                            onPress={() => setArticleFilters({...articleFilters, sortOrder: order})}
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
                          onPress={() => setQuestionFilters({...questionFilters, category: '', subject: '', topic: ''})}
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
                            onPress={() => setQuestionFilters({...questionFilters, category: cat, subject: '', topic: ''})}
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
                            onPress={() => setQuestionFilters({...questionFilters, subject: '', topic: ''})}
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
                              onPress={() => setQuestionFilters({...questionFilters, subject, topic: ''})}
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
                            onPress={() => setQuestionFilters({...questionFilters, topic: ''})}
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
                              onPress={() => setQuestionFilters({...questionFilters, topic})}
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
                            onPress={() => setQuestionFilters({...questionFilters, status})}
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
                            onPress={() => setQuestionFilters({...questionFilters, difficulty})}
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
                            onPress={() => setQuestionFilters({...questionFilters, sortBy: sort})}
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
                            onPress={() => setQuestionFilters({...questionFilters, sortOrder: order})}
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
