import React, { useEffect, useState } from 'react';
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

import { t as tr } from '../i18n';
function Header({ navigation, colors }) {
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
      <Text style={[tw`text-base font-bold`, { color: colors.text }]}>{tr("Categories")}</Text>
      <View style={tw`w-10`} />
    </View>
  );
}

export default function CategoriesScreen({ navigation }) {
  const { colors } = useTheme();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      // Try dedicated categories endpoint first, fall back to dashboard-stats
      try {
        const response = await api.get('/categories');
        setCategories(response.data?.categories || []);
      } catch {
        const response = await api.get('/user/dashboard-stats');
        setCategories(response.data?.categories || []);
      }
    } catch {
      setError('Failed to load categories. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  // ─── Loading ───────────────────────────────────────────
  if (loading && categories.length === 0) {
    return (
      <ScreenWrapper>
        <View style={[tw`flex-1`, { backgroundColor: colors.surface }]}>
          <Header navigation={navigation} colors={colors} />
          <View style={tw`flex-1 items-center justify-center`}>
            <ActivityIndicator size="large" color={colors.text} />
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  // ═══════════════════════════════════════════════════════
  return (
    <ScreenWrapper>
      <View style={[tw`flex-1`, { backgroundColor: colors.surface }]}>
        <Header navigation={navigation} colors={colors} />

        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-5 py-4 pb-10`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.text}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Error */}
          {error && (
            <TouchableOpacity
              style={[tw`flex-row items-center p-3 rounded-2xl mb-4`, { backgroundColor: colors.tones.red.bg }]}
              onPress={fetchCategories}
              activeOpacity={0.7}
            >
              <Ionicons name="alert-circle" size={18} color={colors.tones.red.fg} />
              <Text style={[tw`flex-1 text-xs ml-2`, { color: colors.tones.red.fg }]}>{error}</Text>
              <Ionicons name="refresh" size={16} color={colors.tones.red.fg} />
            </TouchableOpacity>
          )}

          {categories.length === 0 ? (
            /* ─── Empty ───────────────────────────────── */
            <View style={tw`items-center justify-center py-16`}>
              <View
                style={[
                  tw`w-16 h-16 rounded-full items-center justify-center mb-4`,
                  { backgroundColor: colors.cardMuted },
                ]}
              >
                <Ionicons name="folder-open-outline" size={32} color={colors.text} />
              </View>
              <Text style={[tw`text-base font-semibold mb-1`, { color: colors.text }]}>
                {tr("No categories")}
              </Text>
              <Text style={[tw`text-sm text-center`, { color: colors.textSecondary }]}>
                {tr("Check back later for new categories.")}
              </Text>
            </View>
          ) : (
            /* ─── Categories List ─────────────────────── */
            <View style={tw`gap-2.5`}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category._id}
                  style={[
                    tw`flex-row items-center p-3.5 rounded-2xl border`,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() =>
                    navigation.navigate('CategoryDetail', { categoryId: category._id })
                  }
                  activeOpacity={0.7}
                >
                  {/* Logo / Icon */}
                  {category.logo ? (
                    <Image
                      source={{ uri: category.logo }}
                      style={[
                        tw`w-13 h-13 rounded-2xl mr-3.5`,
                        { backgroundColor: colors.card },
                      ]}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        tw`w-13 h-13 rounded-2xl items-center justify-center mr-3.5`,
                        { backgroundColor: colors.cardMuted },
                      ]}
                    >
                      <Ionicons name="book-outline" size={24} color={colors.text} />
                    </View>
                  )}

                  {/* Info */}
                  <View style={tw`flex-1`}>
                    <Text
                      style={[tw`text-sm font-bold mb-0.5`, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {category.displayName || category.name}
                    </Text>
                    {category.description && (
                      <Text
                        style={[tw`text-[11px] leading-4 mb-1.5`, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {category.description}
                      </Text>
                    )}
                    {category.examCount > 0 && (
                      <View style={tw`flex-row items-center gap-1`}>
                        <Ionicons name="document-text-outline" size={12} color={colors.text} />
                        <Text style={[tw`text-[10px] font-semibold`, { color: colors.text }]}>
                          {category.examCount} {category.examCount === 1 ? tr("exam") : tr("exams")}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Chevron */}
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textSecondary}
                    style={tw`ml-2`}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}
