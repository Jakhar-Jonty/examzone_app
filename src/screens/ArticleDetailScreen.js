import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Image,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
// Using simple text rendering for now - can be enhanced with HTML renderer later

export default function ArticleDetailScreen({ route, navigation }) {
  const { articleId } = route.params;
  const { colors } = useTheme();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchArticle();
  }, [articleId]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/articles/${articleId}`);
      setArticle(response.data.article);
    } catch (error) {
      console.error('Failed to fetch article:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (type = 'pdf') => {
    try {
      const url = `${api.defaults.baseURL}/articles/${articleId}/download?type=${type}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Article</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  if (!article) {
    return (
      <ScreenWrapper>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Article</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Article not found</Text>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {article.title}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Thumbnail */}
          {article.thumbnail && (
            <Image
              source={{ uri: article.thumbnail }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          )}

          {/* Article Info */}
          <View style={styles.articleInfo}>
            <View style={styles.metaRow}>
              {article.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{article.category}</Text>
                </View>
              )}
              {article.isPremium && (
                <View style={styles.premiumBadge}>
                  <Ionicons name="diamond" size={14} color="#f59e0b" />
                  <Text style={styles.premiumText}>Premium</Text>
                </View>
              )}
              {article.createdAt && (
                <Text style={styles.dateText}>{formatDate(article.createdAt)}</Text>
              )}
            </View>

            {article.subjects && article.subjects.length > 0 && (
              <View style={styles.subjectsContainer}>
                {article.subjects.map((subject, index) => (
                  <View key={index} style={styles.subjectBadge}>
                    <Text style={styles.subjectText}>{subject}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Article Content */}
          <View style={styles.contentContainer}>
            <Text style={styles.contentText}>
              {article.content
                ? article.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                : 'No content available.'}
            </Text>
          </View>

          {/* Download Buttons */}
          {(article.docxFile || article.pdfFile) && (
            <View style={styles.downloadSection}>
              <Text style={styles.downloadTitle}>Downloads</Text>
              <View style={styles.downloadButtons}>
                {article.pdfFile && (
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => handleDownload('pdf')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="document-text" size={20} color={colors.primary} />
                    <Text style={styles.downloadButtonText}>PDF</Text>
                  </TouchableOpacity>
                )}
                {article.docxFile && (
                  <TouchableOpacity
                    style={[styles.downloadButton, styles.downloadButtonSecondary]}
                    onPress={() => handleDownload('docx')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="document" size={20} color={colors.text} />
                    <Text style={[styles.downloadButtonText, styles.downloadButtonTextSecondary]}>
                      DOCX
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </ScrollView>
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginHorizontal: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    thumbnail: {
      width: '100%',
      height: 200,
      backgroundColor: colors.surface,
    },
    articleInfo: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    categoryBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.primary + '20',
    },
    categoryText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    premiumBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: '#f59e0b20',
    },
    premiumText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#f59e0b',
    },
    dateText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    subjectsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    subjectBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: colors.surface,
    },
    subjectText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    contentContainer: {
      padding: 20,
    },
    contentText: {
      fontSize: 16,
      lineHeight: 24,
      color: colors.text,
    },
    downloadSection: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 20,
    },
    downloadTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    downloadButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    downloadButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.primary + '20',
      borderWidth: 1,
      borderColor: colors.primary,
      gap: 8,
    },
    downloadButtonSecondary: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    downloadButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    downloadButtonTextSecondary: {
      color: colors.text,
    },
  });

