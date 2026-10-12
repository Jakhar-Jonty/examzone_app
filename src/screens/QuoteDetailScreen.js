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
        <View style={[tw`flex-1`, { backgroundColor: colors.surface }]}>
          <Header title="Daily Quote" navigation={navigation} colors={colors} />
          <View style={tw`flex-1 items-center justify-center`}>
            <ActivityIndicator size="large" color={colors.text} />
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  // ─── Error / Empty ─────────────────────────────────────
  if (error || !quote?.quote) {
    return (
      <ScreenWrapper>
        <View style={[tw`flex-1`, { backgroundColor: colors.surface }]}>
          <Header title="Daily Quote" navigation={navigation} colors={colors} />
          <View style={tw`flex-1 items-center justify-center px-10`}>
            <View
              style={[
                tw`w-16 h-16 rounded-full items-center justify-center mb-4`,
                { backgroundColor: colors.tones.orange.bg },
              ]}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.tones.orange.fg} />
            </View>
            <Text style={[tw`text-base font-semibold mb-1`, { color: colors.text }]}>
              {error || 'No quote available'}
            </Text>
            <TouchableOpacity
              style={[tw`mt-4 px-5 py-2.5 rounded-xl`, { backgroundColor: colors.hero }]}
              onPress={fetchQuote}
              activeOpacity={0.7}
            >
              <Text style={[tw`text-sm font-semibold`, { color: colors.heroText }]}>Retry</Text>
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
            <Text style={[tw`text-7xl leading-none mb-2`, { color: colors.text + '30' }]}>
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
                style={[tw`w-12 h-0.5 mb-4`, { backgroundColor: colors.hero }]}
              />
              <Text style={[tw`text-lg font-semibold`, { color: colors.text }]}>
                — {quote.author}
              </Text>
            </View>
          )}

          {/* ─── Details Card ─────────────────────────── */}
          {(quote.category || quote.description || quote.scheduledDate) && (
            <View
              style={[
                tw`rounded-2xl p-4 border mb-6`,
                { backgroundColor: colors.card, borderColor: colors.border },
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
                      { backgroundColor: colors.cardMuted },
                    ]}
                  >
                    <Text style={[tw`text-xs font-semibold capitalize`, { color: colors.text }]}>
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
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={18} color={colors.text} />
            <Text style={[tw`text-sm font-semibold`, { color: colors.text }]}>
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
