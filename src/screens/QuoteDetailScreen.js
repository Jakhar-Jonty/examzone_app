import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import tw from 'twrnc';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function QuoteDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { quote: quoteFromParams } = route.params || {};

  const [quote, setQuote] = useState(quoteFromParams);
  const [loading, setLoading] = useState(!quoteFromParams);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!quoteFromParams) fetchQuote();
  }, []);

  const fetchQuote = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/user/motivational-quote');
      setQuote(response.data?.quote || response.data?.motivationalQuote || response.data);
    } catch {
      setError('Failed to load quote. Tap to retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!quote?.quote) return;
    try {
      let message = `💬 "${quote.quote}"`;
      if (quote.author) message += `\n\n— ${quote.author}`;
      await Share.share({ message });
    } catch {}
  };

  // ─── Loading ───────────────────────────────────────────
  if (loading) {
    return (
      <ScreenWrapper>
        <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
          <Header title="Daily Quote" navigation={navigation} colors={colors} />
          <View style={tw`flex-1 items-center justify-center`}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  // ─── Error / Empty ─────────────────────────────────────
  if (error || !quote?.quote) {
    return (
      <ScreenWrapper>
        <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
          <Header title="Daily Quote" navigation={navigation} colors={colors} />
          <View style={tw`flex-1 items-center justify-center px-10`}>
            <View
              style={[
                tw`w-16 h-16 rounded-full items-center justify-center mb-4`,
                { backgroundColor: '#f59e0b' + '10' },
              ]}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={32} color="#f59e0b" />
            </View>
            <Text style={[tw`text-base font-semibold mb-1`, { color: colors.text }]}>
              {error || 'No quote available'}
            </Text>
            <TouchableOpacity
              style={[tw`mt-4 px-5 py-2.5 rounded-xl`, { backgroundColor: colors.primary }]}
              onPress={fetchQuote}
              activeOpacity={0.7}
            >
              <Text style={tw`text-sm font-semibold text-white`}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  // ═══════════════════════════════════════════════════════
  return (
    <ScreenWrapper>
      <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
        <Header
          title="Daily Quote"
          navigation={navigation}
          colors={colors}
          rightAction={
            <TouchableOpacity onPress={handleShare} style={tw`p-2`}>
              <Ionicons name="share-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          }
        />

        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-5 pb-10`}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Quote Visual ─────────────────────────── */}
          <View style={tw`items-center pt-10 pb-8`}>
            {/* Large opening quote mark */}
            <Text style={[tw`text-7xl leading-none mb-2`, { color: colors.primary + '30' }]}>
              "
            </Text>
          </View>

          {/* ─── Quote Text ───────────────────────────── */}
          <View style={tw`px-2 mb-8`}>
            <Text
              style={[
                tw`text-2xl font-semibold leading-9 text-center italic`,
                { color: colors.text, letterSpacing: 0.3 },
              ]}
            >
              {quote.quote}
            </Text>
          </View>

          {/* ─── Author ───────────────────────────────── */}
          {quote.author && (
            <View style={tw`items-center mb-10`}>
              <View
                style={[tw`w-12 h-0.5 mb-4`, { backgroundColor: colors.primary }]}
              />
              <Text style={[tw`text-lg font-semibold`, { color: colors.primary }]}>
                — {quote.author}
              </Text>
            </View>
          )}

          {/* ─── Details Card ─────────────────────────── */}
          {(quote.category || quote.description || quote.scheduledDate) && (
            <View
              style={[
                tw`rounded-2xl p-4 border mb-6`,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {quote.category && (
                <View style={tw`flex-row items-center justify-between py-2.5 border-b`} >
                  <Text style={[tw`text-xs font-semibold`, { color: colors.textSecondary }]}>
                    Category
                  </Text>
                  <View
                    style={[
                      tw`px-3 py-1 rounded-full`,
                      { backgroundColor: colors.primary + '10' },
                    ]}
                  >
                    <Text style={[tw`text-xs font-semibold capitalize`, { color: colors.primary }]}>
                      {quote.category}
                    </Text>
                  </View>
                </View>
              )}

              {quote.scheduledDate && (
                <View
                  style={[
                    tw`flex-row items-center justify-between py-2.5`,
                    quote.description && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <Text style={[tw`text-xs font-semibold`, { color: colors.textSecondary }]}>
                    Date
                  </Text>
                  <Text style={[tw`text-sm font-medium`, { color: colors.text }]}>
                    {new Date(quote.scheduledDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              )}

              {quote.description && (
                <View style={tw`pt-3`}>
                  <Text style={[tw`text-xs font-semibold mb-1.5`, { color: colors.textSecondary }]}>
                    About
                  </Text>
                  <Text style={[tw`text-sm leading-5`, { color: colors.text }]}>
                    {quote.description}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ─── Share Button ─────────────────────────── */}
          <TouchableOpacity
            style={[
              tw`flex-row items-center justify-center py-3.5 rounded-2xl gap-2 border`,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={18} color={colors.primary} />
            <Text style={[tw`text-sm font-semibold`, { color: colors.primary }]}>
              Share Quote
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}

// ─── Shared Header ───────────────────────────────────────
function Header({ title, navigation, colors, rightAction }) {
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
      <Text style={[tw`text-base font-bold`, { color: colors.text }]}>{title}</Text>
      {rightAction || <View style={tw`w-10`} />}
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
// } from 'react-native';
// import { useTheme } from '../context/ThemeContext';
// import { Ionicons } from '@expo/vector-icons';
// import api from '../services/api';

// export default function QuoteDetailScreen({ route, navigation }) {
//   const { colors } = useTheme();
//   const { quote: quoteFromParams } = route.params || {};
//   const [quote, setQuote] = useState(quoteFromParams);
//   const [loading, setLoading] = useState(!quoteFromParams);

//   const styles = createStyles(colors);

//   // Fetch quote if not provided in params
//   useEffect(() => {
//     if (!quoteFromParams) {
//       fetchQuote();
//     }
//   }, []);

//   const fetchQuote = async () => {
//     try {
//       setLoading(true);
//       const response = await api.get('/user/motivational-quote');
//       const quoteData = response.data?.quote || response.data?.motivationalQuote || response.data;
//       setQuote(quoteData);
//     } catch (error) {
//       console.error('Failed to fetch quote:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (loading) {
//     return (
//       <View style={styles.container}>
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//             <Ionicons name="arrow-back" size={24} color={colors.text} />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Daily Quote</Text>
//           <View style={{ width: 24 }} />
//         </View>
//         <View style={styles.emptyContainer}>
//           <ActivityIndicator size="large" color={colors.primary} />
//           <Text style={styles.emptyText}>Loading quote...</Text>
//         </View>
//       </View>
//     );
//   }

//   if (!quote || !quote.quote) {
//     return (
//       <View style={styles.container}>
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//             <Ionicons name="arrow-back" size={24} color={colors.text} />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Daily Quote</Text>
//           <View style={{ width: 24 }} />
//         </View>
//         <View style={styles.emptyContainer}>
//           <Ionicons name="chatbubble-ellipses-outline" size={64} color={colors.textSecondary} />
//           <Text style={styles.emptyText}>No quote available</Text>
//           <TouchableOpacity
//             style={styles.retryButton}
//             onPress={fetchQuote}
//           >
//             <Text style={styles.retryButtonText}>Retry</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//           <Ionicons name="arrow-back" size={24} color={colors.text} />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Daily Quote</Text>
//         <View style={{ width: 24 }} />
//       </View>

//       <ScrollView
//         style={styles.scrollView}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}
//       >
//         {/* Quote Header */}
//         <View style={styles.quoteHeader}>
//           <View style={styles.quoteIconContainer}>
//             <Ionicons name="chatbubble-ellipses" size={48} color={colors.primary} />
//           </View>
//         </View>

//         {/* Quote Text */}
//         <View style={styles.quoteSection}>
//           <Text style={styles.quoteText}>"{quote.quote}"</Text>
//         </View>

//         {/* Author */}
//         {quote.author && (
//           <View style={styles.authorSection}>
//             <View style={styles.authorLine} />
//             <Text style={styles.authorText}>— {quote.author}</Text>
//           </View>
//         )}

//         {/* Category */}
//         {quote.category && (
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Category</Text>
//             <View style={styles.categoryBadge}>
//               <Text style={styles.categoryText}>{quote.category}</Text>
//             </View>
//           </View>
//         )}

//         {/* Description */}
//         {quote.description && (
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>About This Quote</Text>
//             <Text style={styles.descriptionText}>{quote.description}</Text>
//           </View>
//         )}

//         {/* Scheduled Date */}
//         {quote.scheduledDate && (
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Date</Text>
//             <Text style={styles.dateText}>
//               {new Date(quote.scheduledDate).toLocaleDateString('en-US', {
//                 weekday: 'long',
//                 year: 'numeric',
//                 month: 'long',
//                 day: 'numeric',
//               })}
//             </Text>
//           </View>
//         )}

//         {/* Share Button */}
//         <TouchableOpacity
//           style={styles.shareButton}
//           onPress={() => {
//             // TODO: Implement share functionality
//             console.log('Share quote:', quote.quote);
//           }}
//           activeOpacity={0.7}
//         >
//           <Ionicons name="share-outline" size={20} color={colors.primary} />
//           <Text style={styles.shareButtonText}>Share Quote</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     </View>
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
//     },
//     scrollView: {
//       flex: 1,
//     },
//     scrollContent: {
//       padding: 20,
//       paddingBottom: 40,
//     },
//     emptyContainer: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       paddingVertical: 60,
//     },
//     emptyText: {
//       fontSize: 16,
//       color: colors.textSecondary,
//       marginTop: 16,
//     },
//     quoteHeader: {
//       alignItems: 'center',
//       marginBottom: 32,
//       marginTop: 20,
//     },
//     quoteIconContainer: {
//       width: 80,
//       height: 80,
//       borderRadius: 40,
//       backgroundColor: colors.primary + '15',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     quoteSection: {
//       marginBottom: 32,
//       paddingHorizontal: 8,
//     },
//     quoteText: {
//       fontSize: 28,
//       fontWeight: '600',
//       color: colors.text,
//       lineHeight: 40,
//       textAlign: 'center',
//       fontStyle: 'italic',
//       letterSpacing: 0.5,
//     },
//     authorSection: {
//       alignItems: 'center',
//       marginBottom: 40,
//     },
//     authorLine: {
//       width: 60,
//       height: 2,
//       backgroundColor: colors.primary,
//       marginBottom: 16,
//     },
//     authorText: {
//       fontSize: 20,
//       fontWeight: '600',
//       color: colors.primary,
//       textAlign: 'center',
//     },
//     section: {
//       marginBottom: 32,
//     },
//     sectionTitle: {
//       fontSize: 18,
//       fontWeight: 'bold',
//       color: colors.text,
//       marginBottom: 12,
//     },
//     categoryBadge: {
//       backgroundColor: colors.primary + '15',
//       paddingHorizontal: 16,
//       paddingVertical: 8,
//       borderRadius: 20,
//       alignSelf: 'flex-start',
//     },
//     categoryText: {
//       fontSize: 14,
//       color: colors.primary,
//       fontWeight: '600',
//       textTransform: 'capitalize',
//     },
//     descriptionText: {
//       fontSize: 16,
//       color: colors.text,
//       lineHeight: 24,
//     },
//     dateText: {
//       fontSize: 16,
//       color: colors.textSecondary,
//       fontWeight: '500',
//     },
//     shareButton: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'center',
//       backgroundColor: colors.surface,
//       borderRadius: 20,
//       padding: 18,
//       marginTop: 20,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     shareButtonText: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: colors.primary,
//       marginLeft: 8,
//     },
//     retryButton: {
//       marginTop: 20,
//       backgroundColor: colors.primary,
//       paddingHorizontal: 24,
//       paddingVertical: 12,
//       borderRadius: 16,
//     },
//     retryButtonText: {
//       color: colors.background,
//       fontSize: 16,
//       fontWeight: '600',
//     },
//   });

