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
  Image,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFocusExam } from '../context/AppConfigContext';
import { t as tr } from '../i18n';
import { features } from '../config/features';

export default function StudyScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const focus = useFocusExam();
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
  // Focus mode: the focus exam is the implied category (its chips are hidden)
  const qCategory = questionFilters.category || (focus ? String(focus.id) : '');

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
    if (qCategory) {
      fetchSubjectsAndTopics();
    } else {
      setSubjectsAndTopics([]);
      setAvailableSubjects([]);
      setAvailableTopics([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qCategory]);

  useEffect(() => {
    if (qCategory && subjectsAndTopics.length > 0) {
      // Compare category as string (handle both ObjectId string and category code)
      const uniqueSubjects = [...new Set(
        subjectsAndTopics
          .filter(st => {
            const stCategory = st.category?.toString() || st.category || '';
            const filterCategory = qCategory?.toString() || qCategory || '';
            return stCategory === filterCategory || st.categoryName === filterCategory;
          })
          .map(st => st.subject)
          .filter(Boolean)
      )].sort();
      setAvailableSubjects(uniqueSubjects);
    } else {
      setAvailableSubjects([]);
    }
  }, [qCategory, subjectsAndTopics]);

  useEffect(() => {
    if (questionFilters.subject && qCategory && subjectsAndTopics.length > 0) {
      const subjectData = subjectsAndTopics.find(s => {
        const subjectMatch = s.subject?.toLowerCase() === questionFilters.subject.toLowerCase();
        const stCategory = s.category?.toString() || s.category || '';
        const filterCategory = qCategory?.toString() || qCategory || '';
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
  }, [questionFilters.subject, qCategory, subjectsAndTopics]);

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
      params.append('source', 'manual');

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
      const queryParams = qCategory ? `?category=${qCategory}` : '';
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
    <ScreenWrapper backgroundColor={colors.surface}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{tr("Study")}</Text>
        </View>

        {/* Quick actions — compact row so Articles / Question Bank stay on screen */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate('WrongBook')}
            activeOpacity={0.85}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors.tones.red.bg }]}>
              <Ionicons name="close-circle-outline" size={18} color={colors.tones.red.fg} />
            </View>
            <Text style={styles.quickTitle} numberOfLines={1}>{tr("Wrong Book")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate('Pyq')}
            activeOpacity={0.85}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors.tones.blue.bg }]}>
              <Ionicons name="book-outline" size={18} color={colors.tones.blue.fg} />
            </View>
            <Text style={styles.quickTitle} numberOfLines={1}>{tr("PYQ")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate('PracticeSessions')}
            activeOpacity={0.85}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors.tones.orange.bg }]}>
              <Ionicons name="flash-outline" size={18} color={colors.tones.orange.fg} />
            </View>
            <Text style={styles.quickTitle} numberOfLines={1}>{tr("Practice")}</Text>
          </TouchableOpacity>
          {features.studyPlans && (
            <TouchableOpacity
              style={styles.quickTile}
              onPress={() => navigation.navigate('StudyPlans')}
              activeOpacity={0.85}
            >
              <View style={[styles.quickIcon, { backgroundColor: colors.tones.purple.bg }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.tones.purple.fg} />
              </View>
              <Text style={styles.quickTitle} numberOfLines={1}>{tr("Plans")}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Haryana GK hub — slim banner */}
        <TouchableOpacity
          style={styles.hrBanner}
          onPress={() => navigation.navigate('HaryanaGk')}
          activeOpacity={0.85}
        >
          <View style={styles.hrIcon}>
            <Ionicons name="map-outline" size={18} color={colors.heroAccent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hrTitle}>{tr("Haryana GK")}</Text>
            <Text style={styles.hrSub} numberOfLines={1}>{tr("Topic tests · history, districts, culture, schemes")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.heroTextSecondary} />
        </TouchableOpacity>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'articles' && styles.tabActive]}
            onPress={() => setActiveTab('articles')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="document-text-outline"
              size={17}
              color={activeTab === 'articles' ? colors.text : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'articles' && styles.tabTextActive]}>
              {tr("Articles")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'questionBank' && styles.tabActive]}
            onPress={() => setActiveTab('questionBank')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="bookmark"
              size={17}
              color={activeTab === 'questionBank' ? colors.text : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'questionBank' && styles.tabTextActive]}>
              {tr("Question Bank")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search and Filter Bar */}
        <View style={styles.searchFilterRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={tr("Search {0}...", tr(activeTab === 'articles' ? 'articles' : 'questions'))}
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
            <Ionicons name="options-outline" size={20} color={colors.text} />
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
              tintColor={colors.text}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.text} />
            </View>
          ) : activeTab === 'articles' ? (
            <>
              {filteredArticles.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>{tr("No articles found")}</Text>
                  <Text style={styles.emptySubtext}>
                    {searchQuery || getActiveFiltersCount() > 0
                      ? tr("Try adjusting your search or filters")
                      : tr("Check back later for new articles")}
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
                    {article.thumbnail ? (
                      <Image
                        source={{ uri: article.thumbnail }}
                        style={styles.articleThumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.articleThumbnail, styles.articleThumbnailEmpty]}>
                        <Ionicons name="document-text-outline" size={22} color={colors.textSecondary} />
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
                            <Ionicons name="diamond" size={11} color={colors.tones.purple.fg} />
                            <Text style={styles.premiumText}>{tr("PRO")}</Text>
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
                  <Text style={styles.emptyText}>{tr("No saved questions")}</Text>
                  <Text style={styles.emptySubtext}>
                    {searchQuery || getActiveFiltersCount() > 0
                      ? tr("Try adjusting your search or filters")
                      : tr("Save questions from exam results to build your question bank")}
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
                          <Ionicons name="eye-outline" size={17} color={colors.text} />
                          <Text style={styles.actionText}>{tr("View")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.unsaveButton]}
                          onPress={() => handleUnsaveQuestion(savedQuestion._id, question._id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="bookmark" size={17} color={colors.tones.red.fg} />
                          <Text style={[styles.actionText, styles.unsaveText]}>{tr("Remove")}</Text>
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
                <Text style={styles.modalTitle}>{tr("Filters")}</Text>
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
                    {/* Category Filter (hidden in focus mode) */}
                    {!focus && (
                    <View style={styles.filterGroup}>
                      <Text style={styles.filterLabel}>{tr("Category")}</Text>
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
                          ]}>{tr("All")}</Text>
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
                    )}

                    {/* Premium Filter */}
                    <View style={styles.filterGroup}>
                      <Text style={styles.filterLabel}>{tr("Type")}</Text>
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
                              {type === '' ? tr("All") : type === 'free' ? tr("Free") : tr("Premium")}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Sort */}
                    <View style={styles.filterGroup}>
                      <Text style={styles.filterLabel}>{tr("Sort By")}</Text>
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
                              {sort === 'createdAt' ? tr("Date") : tr("Title")}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.filterGroup}>
                      <Text style={styles.filterLabel}>{tr("Order")}</Text>
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
                              {order === 'desc' ? tr("Newest") : tr("Oldest")}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    {/* Category Filter (hidden in focus mode) */}
                    {!focus && (
                    <View style={styles.filterGroup}>
                      <Text style={styles.filterLabel}>{tr("Category")}</Text>
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
                          ]}>{tr("All")}</Text>
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
                    )}

                    {/* Subject Filter */}
                    {qCategory && availableSubjects.length > 0 && (
                      <View style={styles.filterGroup}>
                        <Text style={styles.filterLabel}>{tr("Subject")}</Text>
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
                            ]}>{tr("All")}</Text>
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
                        <Text style={styles.filterLabel}>{tr("Topic")}</Text>
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
                            ]}>{tr("All")}</Text>
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
                      <Text style={styles.filterLabel}>{tr("Status")}</Text>
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
                              {status === '' ? tr("All") : status.replace('-', ' ')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Difficulty Filter */}
                    <View style={styles.filterGroup}>
                      <Text style={styles.filterLabel}>{tr("Difficulty")}</Text>
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
                              {difficulty ? tr(difficulty) : tr("All")}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Sort */}
                    <View style={styles.filterGroup}>
                      <Text style={styles.filterLabel}>{tr("Sort By")}</Text>
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
                              {sort === 'savedAt' ? tr("Date") : tr("Status")}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.filterGroup}>
                      <Text style={styles.filterLabel}>{tr("Order")}</Text>
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
                              {order === 'desc' ? tr("Newest") : tr("Oldest")}
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
                  <Text style={styles.clearFiltersText}>{tr("Clear All")}</Text>
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
                  <Text style={styles.applyFiltersText}>{tr("Apply")}</Text>
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
      backgroundColor: colors.surface,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 8,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
    },
    quickActions: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingBottom: 8,
      gap: 8,
    },
    quickTile: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 6,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickTitle: { fontSize: 11, fontWeight: '700', color: colors.text },
    hrBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 16,
      marginBottom: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: colors.hero,
    },
    hrIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.heroRaised,
    },
    hrTitle: { fontSize: 14, fontWeight: '800', color: colors.heroText },
    hrSub: { fontSize: 11, color: colors.heroTextSecondary, marginTop: 1 },
    tabContainer: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginTop: 4,
      padding: 4,
      borderRadius: 16,
      backgroundColor: colors.surfaceMuted,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 12,
      gap: 6,
    },
    tabActive: {
      backgroundColor: colors.card,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.text,
    },
    notebookFilterRow: {
      maxHeight: 44,
      marginTop: 10,
    },
    notebookFilterContent: {
      paddingHorizontal: 20,
      gap: 8,
    },
    notebookChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    notebookChipActive: {
      backgroundColor: colors.hero,
      borderColor: colors.hero,
    },
    notebookChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    notebookChipTextActive: {
      color: colors.heroText,
    },
    mistakeBadge: {
      backgroundColor: colors.tones.red.bg,
    },
    mistakeBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.tones.red.fg,
    },
    wrongCountBadge: {
      backgroundColor: colors.tones.orange.bg,
    },
    wrongCountText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.tones.orange.fg,
    },
    searchFilterRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 12,
      gap: 8,
    },
    searchContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      height: 44,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    clearButton: {
      marginLeft: 8,
    },
    filterButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      position: 'relative',
    },
    filterBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: colors.hero,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    filterBadgeText: {
      color: colors.heroText,
      fontSize: 10,
      fontWeight: 'bold',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
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
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    articleThumbnail: {
      width: 60,
      height: 60,
      borderRadius: 14,
      backgroundColor: colors.surfaceMuted,
      marginRight: 12,
    },
    articleThumbnailEmpty: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    articleContent: {
      flex: 1,
    },
    articleTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    articleDescription: {
      fontSize: 13,
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
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 14,
      marginBottom: 10,
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
      borderRadius: 12,
      backgroundColor: colors.surfaceMuted,
      gap: 6,
    },
    unsaveButton: {
      backgroundColor: colors.tones.red.bg,
    },
    actionText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    unsaveText: {
      color: colors.tones.red.fg,
    },
    metaBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: colors.surfaceMuted,
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
      borderRadius: 8,
      backgroundColor: colors.tones.purple.bg,
    },
    premiumText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.tones.purple.fg,
    },
    difficultyEasy: {
      backgroundColor: colors.tones.green.bg,
    },
    difficultyMedium: {
      backgroundColor: colors.tones.orange.bg,
    },
    difficultyHard: {
      backgroundColor: colors.tones.red.bg,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: colors.tones.blue.bg,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.tones.blue.fg,
      textTransform: 'capitalize',
    },
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.card,
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
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    filterChipActive: {
      backgroundColor: colors.hero,
      borderColor: colors.hero,
    },
    filterChipText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    filterChipTextActive: {
      color: colors.heroText,
      fontWeight: '700',
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
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    filterOptionActive: {
      backgroundColor: colors.hero,
      borderColor: colors.hero,
    },
    filterOptionText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    filterOptionTextActive: {
      color: colors.heroText,
      fontWeight: '700',
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
      borderRadius: 14,
      backgroundColor: colors.card,
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
      borderRadius: 14,
      backgroundColor: colors.hero,
      alignItems: 'center',
    },
    applyFiltersText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.heroText,
    },
  });


