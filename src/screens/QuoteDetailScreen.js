import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function QuoteDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { quote: quoteFromParams } = route.params || {};
  const [quote, setQuote] = useState(quoteFromParams);
  const [loading, setLoading] = useState(!quoteFromParams);

  const styles = createStyles(colors);

  // Fetch quote if not provided in params
  useEffect(() => {
    if (!quoteFromParams) {
      fetchQuote();
    }
  }, []);

  const fetchQuote = async () => {
    try {
      setLoading(true);
      const response = await api.get('/user/motivational-quote');
      const quoteData = response.data?.quote || response.data?.motivationalQuote || response.data;
      setQuote(quoteData);
    } catch (error) {
      console.error('Failed to fetch quote:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daily Quote</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>Loading quote...</Text>
        </View>
      </View>
    );
  }

  if (!quote || !quote.quote) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daily Quote</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No quote available</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchQuote}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Quote</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quote Header */}
        <View style={styles.quoteHeader}>
          <View style={styles.quoteIconContainer}>
            <Ionicons name="chatbubble-ellipses" size={48} color={colors.primary} />
          </View>
        </View>

        {/* Quote Text */}
        <View style={styles.quoteSection}>
          <Text style={styles.quoteText}>"{quote.quote}"</Text>
        </View>

        {/* Author */}
        {quote.author && (
          <View style={styles.authorSection}>
            <View style={styles.authorLine} />
            <Text style={styles.authorText}>— {quote.author}</Text>
          </View>
        )}

        {/* Category */}
        {quote.category && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{quote.category}</Text>
            </View>
          </View>
        )}

        {/* Description */}
        {quote.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About This Quote</Text>
            <Text style={styles.descriptionText}>{quote.description}</Text>
          </View>
        )}

        {/* Scheduled Date */}
        {quote.scheduledDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date</Text>
            <Text style={styles.dateText}>
              {new Date(quote.scheduledDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        )}

        {/* Share Button */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => {
            // TODO: Implement share functionality
            console.log('Share quote:', quote.quote);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={20} color={colors.primary} />
          <Text style={styles.shareButtonText}>Share Quote</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
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
      marginTop: 16,
    },
    quoteHeader: {
      alignItems: 'center',
      marginBottom: 32,
      marginTop: 20,
    },
    quoteIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    quoteSection: {
      marginBottom: 32,
      paddingHorizontal: 8,
    },
    quoteText: {
      fontSize: 28,
      fontWeight: '600',
      color: colors.text,
      lineHeight: 40,
      textAlign: 'center',
      fontStyle: 'italic',
      letterSpacing: 0.5,
    },
    authorSection: {
      alignItems: 'center',
      marginBottom: 40,
    },
    authorLine: {
      width: 60,
      height: 2,
      backgroundColor: colors.primary,
      marginBottom: 16,
    },
    authorText: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.primary,
      textAlign: 'center',
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    categoryBadge: {
      backgroundColor: colors.primary + '15',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      alignSelf: 'flex-start',
    },
    categoryText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    descriptionText: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
    },
    dateText: {
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    shareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 18,
      marginTop: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    shareButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
      marginLeft: 8,
    },
    retryButton: {
      marginTop: 20,
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 16,
    },
    retryButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '600',
    },
  });

