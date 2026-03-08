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
import * as Speech from 'expo-speech';
import api from '../services/api';

// ─── Reusable Header ────────────────────────────────────
function ScreenHeader({ title, navigation, colors, rightAction }) {
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

// ─── Section Block ───────────────────────────────────────
function Section({ title, children, colors }) {
  return (
    <View style={tw`mb-6`}>
      <Text style={[tw`text-xs font-bold uppercase mb-2 px-0.5`, { color: colors.textSecondary, letterSpacing: 0.5 }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export default function WordOfDayDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { word: wordFromParams } = route.params || {};

  const [word, setWord] = useState(wordFromParams);
  const [loading, setLoading] = useState(!wordFromParams);
  const [error, setError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!wordFromParams) fetchWordOfDay();
  }, []);

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const fetchWordOfDay = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/user/word-of-day');
      setWord(response.data?.wordOfDay || response.data?.word || response.data);
    } catch {
      setError('Failed to load word. Tap to retry.');
    } finally {
      setLoading(false);
    }
  };

  const speakWord = () => {
    if (!word?.word) return;
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(word.word, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.8,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const handleShare = async () => {
    if (!word?.word) return;
    try {
      let message = `📖 Word of the Day: ${word.word}`;
      if (word.meaning) message += `\n\nMeaning: ${word.meaning}`;
      if (word.example) message += `\n\nExample: "${word.example}"`;
      await Share.share({ message });
    } catch {}
  };

  // ─── Loading ───────────────────────────────────────────
  if (loading) {
    return (
      <ScreenWrapper>
        <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
          <ScreenHeader title="Word of the Day" navigation={navigation} colors={colors} />
          <View style={tw`flex-1 items-center justify-center`}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[tw`mt-3 text-sm`, { color: colors.textSecondary }]}>Loading...</Text>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  // ─── Error / Empty ─────────────────────────────────────
  if (error || !word?.word) {
    return (
      <ScreenWrapper>
        <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
          <ScreenHeader title="Word of the Day" navigation={navigation} colors={colors} />
          <View style={tw`flex-1 items-center justify-center px-10`}>
            <View
              style={[
                tw`w-16 h-16 rounded-full items-center justify-center mb-4`,
                { backgroundColor: colors.primary + '10' },
              ]}
            >
              <Ionicons name="book-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[tw`text-base font-semibold mb-1`, { color: colors.text }]}>
              {error || 'No word available'}
            </Text>
            <TouchableOpacity
              style={[tw`mt-4 px-5 py-2.5 rounded-xl`, { backgroundColor: colors.primary }]}
              onPress={fetchWordOfDay}
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
        <ScreenHeader
          title="Word of the Day"
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
          {/* ─── Word Hero ────────────────────────────── */}
          <View style={tw`items-center py-8`}>
            <View style={tw`flex-row items-center gap-3 mb-2`}>
              <Text
                style={[
                  tw`text-4xl font-bold`,
                  { color: colors.primary, letterSpacing: -1 },
                ]}
              >
                {word.word}
              </Text>
              <TouchableOpacity
                style={[
                  tw`w-11 h-11 rounded-full items-center justify-center`,
                  { backgroundColor: colors.primary + '12' },
                ]}
                onPress={speakWord}
                activeOpacity={0.7}
              >
                {isSpeaking ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="volume-high" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>

            {word.pronunciation && (
              <Text style={[tw`text-base italic`, { color: colors.textSecondary }]}>
                {word.pronunciation}
              </Text>
            )}

            {word.type && (
              <View
                style={[
                  tw`mt-2 px-3 py-1 rounded-full`,
                  { backgroundColor: colors.primary + '10' },
                ]}
              >
                <Text style={[tw`text-xs font-semibold italic`, { color: colors.primary }]}>
                  {word.type}
                </Text>
              </View>
            )}
          </View>

          {/* ─── Meaning ──────────────────────────────── */}
          <Section title="Meaning" colors={colors}>
            <View
              style={[
                tw`p-4 rounded-2xl border`,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[tw`text-base leading-6`, { color: colors.text }]}>
                {word.meaning}
              </Text>
            </View>
          </Section>

          {/* ─── Example ──────────────────────────────── */}
          {word.example && (
            <Section title="Example" colors={colors}>
              <View
                style={[
                  tw`p-4 rounded-2xl border-l-4`,
                  { backgroundColor: colors.primary + '08', borderLeftColor: colors.primary },
                ]}
              >
                <Text style={[tw`text-sm leading-5 italic`, { color: colors.text }]}>
                  "{word.example}"
                </Text>
              </View>
            </Section>
          )}

          {/* ─── Synonyms & Antonyms ──────────────────── */}
          {(word.synonyms?.length > 0 || word.antonyms?.length > 0) && (
            <View style={tw`flex-row gap-3 mb-6`}>
              {word.synonyms?.length > 0 && (
                <View style={tw`flex-1`}>
                  <Text
                    style={[
                      tw`text-xs font-bold uppercase mb-2 px-0.5`,
                      { color: colors.textSecondary, letterSpacing: 0.5 },
                    ]}
                  >
                    Synonyms
                  </Text>
                  <View
                    style={[
                      tw`p-3 rounded-2xl border`,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <View style={tw`flex-row flex-wrap gap-1.5`}>
                      {word.synonyms.map((s, i) => (
                        <View
                          key={i}
                          style={[
                            tw`px-2.5 py-1 rounded-full`,
                            { backgroundColor: '#10b981' + '12' },
                          ]}
                        >
                          <Text style={tw`text-xs font-medium text-green-600`}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {word.antonyms?.length > 0 && (
                <View style={tw`flex-1`}>
                  <Text
                    style={[
                      tw`text-xs font-bold uppercase mb-2 px-0.5`,
                      { color: colors.textSecondary, letterSpacing: 0.5 },
                    ]}
                  >
                    Antonyms
                  </Text>
                  <View
                    style={[
                      tw`p-3 rounded-2xl border`,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <View style={tw`flex-row flex-wrap gap-1.5`}>
                      {word.antonyms.map((a, i) => (
                        <View
                          key={i}
                          style={[
                            tw`px-2.5 py-1 rounded-full`,
                            { backgroundColor: '#ef4444' + '12' },
                          ]}
                        >
                          <Text style={tw`text-xs font-medium text-red-500`}>{a}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ─── Usage Notes ──────────────────────────── */}
          {word.usageNotes && (
            <Section title="Usage Notes" colors={colors}>
              <View
                style={[
                  tw`p-4 rounded-2xl border`,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[tw`text-sm leading-5`, { color: colors.text }]}>
                  {word.usageNotes}
                </Text>
              </View>
            </Section>
          )}

          {/* ─── Etymology ────────────────────────────── */}
          {word.etymology && (
            <Section title="Origin" colors={colors}>
              <View
                style={[
                  tw`p-4 rounded-2xl border`,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={tw`flex-row items-start gap-2.5`}>
                  <Ionicons name="earth-outline" size={16} color={colors.textSecondary} style={tw`mt-0.5`} />
                  <Text style={[tw`flex-1 text-sm leading-5 italic`, { color: colors.textSecondary }]}>
                    {word.etymology}
                  </Text>
                </View>
              </View>
            </Section>
          )}
        </ScrollView>
      </View>
    </ScreenWrapper>
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
// import * as Speech from 'expo-speech';
// import api from '../services/api';

// export default function WordOfDayDetailScreen({ route, navigation }) {
//   const { colors } = useTheme();
//   const { word: wordFromParams } = route.params || {};
//   const [word, setWord] = useState(wordFromParams);
//   const [loading, setLoading] = useState(!wordFromParams);
//   const [isSpeaking, setIsSpeaking] = useState(false);

//   const styles = createStyles(colors);

//   // Fetch word if not provided in params
//   useEffect(() => {
//     if (!wordFromParams) {
//       fetchWordOfDay();
//     }
//   }, []);

//   const fetchWordOfDay = async () => {
//     try {
//       setLoading(true);
//       const response = await api.get('/user/word-of-day');
//       const wordData = response.data?.wordOfDay || response.data?.word || response.data;
//       setWord(wordData);
//     } catch (error) {
//       console.error('Failed to fetch word of day:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const speakWord = () => {
//     if (!word || !word.word) {
//       console.log('No word to speak:', word);
//       return;
//     }
    
//     if (isSpeaking) {
//       Speech.stop();
//       setIsSpeaking(false);
//     } else {
//       setIsSpeaking(true);
//       Speech.speak(word.word, {
//         language: 'en-US',
//         pitch: 1.0,
//         rate: 0.8,
//         onDone: () => setIsSpeaking(false),
//         onStopped: () => setIsSpeaking(false),
//         onError: (error) => {
//           console.error('Speech error:', error);
//           setIsSpeaking(false);
//         },
//       });
//     }
//   };

//   // Debug: Log the word data
//   React.useEffect(() => {
//     // console.log('WordOfDayDetailScreen - route.params:', route.params);
//     // console.log('WordOfDayDetailScreen - word data:', word);
//     // console.log('WordOfDayDetailScreen - word.word:', word?.word);
//   }, [word, route.params]);

//   if (loading) {
//     return (
//       <View style={styles.container}>
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//             <Ionicons name="arrow-back" size={24} color={colors.text} />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Word of the Day</Text>
//           <View style={{ width: 24 }} />
//         </View>
//         <View style={styles.emptyContainer}>
//           <ActivityIndicator size="large" color={colors.primary} />
//           <Text style={styles.emptyText}>Loading word...</Text>
//         </View>
//       </View>
//     );
//   }

//   if (!word || !word.word) {
//     return (
//       <View style={styles.container}>
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//             <Ionicons name="arrow-back" size={24} color={colors.text} />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Word of the Day</Text>
//           <View style={{ width: 24 }} />
//         </View>
//         <View style={styles.emptyContainer}>
//           <Ionicons name="book-outline" size={64} color={colors.textSecondary} />
//           <Text style={styles.emptyText}>No word data available</Text>
//           <TouchableOpacity
//             style={styles.retryButton}
//             onPress={fetchWordOfDay}
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
//         <Text style={styles.headerTitle}>Word of the Day</Text>
//         <View style={{ width: 24 }} />
//       </View>

//       <ScrollView
//         style={styles.scrollView}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}
//       >
//         {/* Word Header */}
//         <View style={styles.wordHeader}>
//           <View style={styles.wordHeaderContent}>
//             <Text style={styles.wordText}>{word.word}</Text>
//             {word.pronunciation && (
//               <Text style={styles.pronunciation}>{word.pronunciation}</Text>
//             )}
//           </View>
//           <TouchableOpacity
//             style={styles.speakButton}
//             onPress={speakWord}
//             activeOpacity={0.7}
//           >
//             {isSpeaking ? (
//               <ActivityIndicator size="small" color={colors.primary} />
//             ) : (
//               <Ionicons name="volume-high" size={28} color={colors.primary} />
//             )}
//           </TouchableOpacity>
//         </View>

//         {/* Word Type */}
//         {word.type && (
//           <View style={styles.typeContainer}>
//             <Text style={styles.typeLabel}>Type:</Text>
//             <Text style={styles.typeText}>{word.type}</Text>
//           </View>
//         )}

//         {/* Meaning */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Meaning</Text>
//           <Text style={styles.meaningText}>{word.meaning}</Text>
//         </View>

//         {/* Example */}
//         {word.example && (
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Example</Text>
//             <Text style={styles.exampleText}>"{word.example}"</Text>
//           </View>
//         )}

//         {/* Synonyms */}
//         {word.synonyms && word.synonyms.length > 0 && (
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Synonyms</Text>
//             <View style={styles.tagsContainer}>
//               {word.synonyms.map((synonym, index) => (
//                 <View key={index} style={styles.tag}>
//                   <Text style={styles.tagText}>{synonym}</Text>
//                 </View>
//               ))}
//             </View>
//           </View>
//         )}

//         {/* Antonyms */}
//         {word.antonyms && word.antonyms.length > 0 && (
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Antonyms</Text>
//             <View style={styles.tagsContainer}>
//               {word.antonyms.map((antonym, index) => (
//                 <View key={index} style={styles.tag}>
//                   <Text style={styles.tagText}>{antonym}</Text>
//                 </View>
//               ))}
//             </View>
//           </View>
//         )}

//         {/* Usage Notes */}
//         {word.usageNotes && (
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Usage Notes</Text>
//             <Text style={styles.usageText}>{word.usageNotes}</Text>
//           </View>
//         )}

//         {/* Etymology */}
//         {word.etymology && (
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Origin</Text>
//             <Text style={styles.etymologyText}>{word.etymology}</Text>
//           </View>
//         )}
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
//     },
//     emptyText: {
//       fontSize: 16,
//       color: colors.textSecondary,
//     },
//     wordHeader: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'flex-start',
//       marginBottom: 24,
//       paddingBottom: 24,
//       borderBottomWidth: 2,
//       borderBottomColor: colors.border,
//     },
//     wordHeaderContent: {
//       flex: 1,
//     },
//     wordText: {
//       fontSize: 42,
//       fontWeight: 'bold',
//       color: colors.primary,
//       marginBottom: 8,
//       letterSpacing: -1,
//     },
//     pronunciation: {
//       fontSize: 18,
//       color: colors.textSecondary,
//       fontStyle: 'italic',
//     },
//     speakButton: {
//       width: 56,
//       height: 56,
//       borderRadius: 28,
//       backgroundColor: colors.primary + '15',
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginLeft: 16,
//     },
//     typeContainer: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginBottom: 24,
//     },
//     typeLabel: {
//       fontSize: 14,
//       color: colors.textSecondary,
//       marginRight: 8,
//     },
//     typeText: {
//       fontSize: 14,
//       color: colors.text,
//       fontWeight: '600',
//       fontStyle: 'italic',
//     },
//     section: {
//       marginBottom: 28,
//     },
//     sectionTitle: {
//       fontSize: 18,
//       fontWeight: 'bold',
//       color: colors.text,
//       marginBottom: 12,
//     },
//     meaningText: {
//       fontSize: 16,
//       color: colors.text,
//       lineHeight: 24,
//     },
//     exampleText: {
//       fontSize: 16,
//       color: colors.text,
//       lineHeight: 24,
//       fontStyle: 'italic',
//       paddingLeft: 16,
//       borderLeftWidth: 3,
//       borderLeftColor: colors.primary,
//     },
//     tagsContainer: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     tag: {
//       backgroundColor: colors.primary + '15',
//       paddingHorizontal: 14,
//       paddingVertical: 8,
//       borderRadius: 16,
//       marginRight: 8,
//       marginBottom: 8,
//     },
//     tagText: {
//       fontSize: 14,
//       color: colors.primary,
//       fontWeight: '600',
//     },
//     usageText: {
//       fontSize: 15,
//       color: colors.text,
//       lineHeight: 22,
//     },
//     etymologyText: {
//       fontSize: 15,
//       color: colors.text,
//       lineHeight: 22,
//       fontStyle: 'italic',
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

