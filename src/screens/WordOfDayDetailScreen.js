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
import { t as tr } from '../i18n';

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
        <View style={[tw`flex-1`, { backgroundColor: colors.surface }]}>
          <ScreenHeader title={tr("Word of the Day")} navigation={navigation} colors={colors} />
          <View style={tw`flex-1 items-center justify-center`}>
            <ActivityIndicator size="large" color={colors.text} />
            <Text style={[tw`mt-3 text-sm`, { color: colors.textSecondary }]}>{tr("Loading...")}</Text>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  // ─── Error / Empty ─────────────────────────────────────
  if (error || !word?.word) {
    return (
      <ScreenWrapper>
        <View style={[tw`flex-1`, { backgroundColor: colors.surface }]}>
          <ScreenHeader title={tr("Word of the Day")} navigation={navigation} colors={colors} />
          <View style={tw`flex-1 items-center justify-center px-10`}>
            <View
              style={[
                tw`w-16 h-16 rounded-full items-center justify-center mb-4`,
                { backgroundColor: colors.cardMuted },
              ]}
            >
              <Ionicons name="book-outline" size={32} color={colors.text} />
            </View>
            <Text style={[tw`text-base font-semibold mb-1`, { color: colors.text }]}>
              {error || tr("No word available")}
            </Text>
            <TouchableOpacity
              style={[tw`mt-4 px-5 py-2.5 rounded-xl`, { backgroundColor: colors.hero }]}
              onPress={fetchWordOfDay}
              activeOpacity={0.7}
            >
              <Text style={[tw`text-sm font-semibold`, { color: colors.heroText }]}>{tr("Retry")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  // ═══════════════════════════════════════════════════════
  return (
    <ScreenWrapper>
      <View style={[tw`flex-1`, { backgroundColor: colors.surface }]}>
        <ScreenHeader
          title={tr("Word of the Day")}
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
                  { color: colors.text, letterSpacing: -1 },
                ]}
              >
                {word.word}
              </Text>
              <TouchableOpacity
                style={[
                  tw`w-11 h-11 rounded-full items-center justify-center`,
                  { backgroundColor: colors.cardMuted },
                ]}
                onPress={speakWord}
                activeOpacity={0.7}
              >
                {isSpeaking ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Ionicons name="volume-high" size={22} color={colors.text} />
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
                  { backgroundColor: colors.cardMuted },
                ]}
              >
                <Text style={[tw`text-xs font-semibold italic`, { color: colors.text }]}>
                  {word.type}
                </Text>
              </View>
            )}
          </View>

          {/* ─── Meaning ──────────────────────────────── */}
          <Section title={tr("Meaning")} colors={colors}>
            <View
              style={[
                tw`p-4 rounded-2xl border`,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[tw`text-base leading-6`, { color: colors.text }]}>
                {word.meaning}
              </Text>
            </View>
          </Section>

          {/* ─── Example ──────────────────────────────── */}
          {word.example && (
            <Section title={tr("Example")} colors={colors}>
              <View
                style={[
                  tw`p-4 rounded-2xl border-l-4`,
                  { backgroundColor: colors.cardMuted, borderLeftColor: colors.hero },
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
                    {tr("Synonyms")}
                  </Text>
                  <View
                    style={[
                      tw`p-3 rounded-2xl border`,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <View style={tw`flex-row flex-wrap gap-1.5`}>
                      {word.synonyms.map((s, i) => (
                        <View
                          key={i}
                          style={[
                            tw`px-2.5 py-1 rounded-full`,
                            { backgroundColor: colors.tones.green.bg },
                          ]}
                        >
                          <Text style={[tw`text-xs font-medium`, { color: colors.tones.green.fg }]}>{s}</Text>
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
                    {tr("Antonyms")}
                  </Text>
                  <View
                    style={[
                      tw`p-3 rounded-2xl border`,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <View style={tw`flex-row flex-wrap gap-1.5`}>
                      {word.antonyms.map((a, i) => (
                        <View
                          key={i}
                          style={[
                            tw`px-2.5 py-1 rounded-full`,
                            { backgroundColor: colors.tones.red.bg },
                          ]}
                        >
                          <Text style={[tw`text-xs font-medium`, { color: colors.tones.red.fg }]}>{a}</Text>
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
            <Section title={tr("Usage Notes")} colors={colors}>
              <View
                style={[
                  tw`p-4 rounded-2xl border`,
                  { backgroundColor: colors.card, borderColor: colors.border },
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
            <Section title={tr("Origin")} colors={colors}>
              <View
                style={[
                  tw`p-4 rounded-2xl border`,
                  { backgroundColor: colors.card, borderColor: colors.border },
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
