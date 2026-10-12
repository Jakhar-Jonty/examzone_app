import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import { EXAM_SORT_OPTIONS } from '../utils/examSort';

const LANGUAGES = ['', 'English', 'Hindi', 'Both'];
const PREMIUM_OPTIONS = [
  { key: '', label: 'All' },
  { key: 'free', label: 'Free' },
  { key: 'premium', label: 'Pro' },
];
const DIFFICULTY_OPTIONS = [
  { key: '', label: 'Any' },
  { key: 'Easy', label: 'Easy' },
  { key: 'Medium', label: 'Medium' },
  { key: 'Hard', label: 'Hard' },
];

function Section({ title, children, colors }) {
  return (
    <View style={tw`mb-5`}>
      <Text style={[tw`text-sm font-bold mb-2.5`, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function OptionPill({ label, active, onPress, colors }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        tw`px-3.5 py-2 rounded-full mr-2 mb-2`,
        active
          ? { backgroundColor: colors.hero }
          : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
      ]}
    >
      <Text
        style={[
          tw`text-xs font-bold`,
          { color: active ? colors.heroText : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ExamFiltersSheet({
  visible,
  onClose,
  colors,
  categories = [],
  categoryId,
  language,
  premium,
  difficulty,
  sortBy,
  onApply,
}) {
  const [draftCategory, setDraftCategory] = useState(categoryId || '');
  const [draftLanguage, setDraftLanguage] = useState(language || '');
  const [draftPremium, setDraftPremium] = useState(premium || '');
  const [draftDifficulty, setDraftDifficulty] = useState(difficulty || '');
  const [draftSort, setDraftSort] = useState(sortBy || 'newest');

  useEffect(() => {
    if (visible) {
      setDraftCategory(categoryId || '');
      setDraftLanguage(language || '');
      setDraftPremium(premium || '');
      setDraftDifficulty(difficulty || '');
      setDraftSort(sortBy || 'newest');
    }
  }, [visible, categoryId, language, premium, difficulty, sortBy]);

  const handleApply = () => {
    onApply({
      category: draftCategory,
      language: draftLanguage,
      premium: draftPremium,
      difficulty: draftDifficulty,
      sortBy: draftSort,
    });
    onClose();
  };

  const handleReset = () => {
    setDraftCategory('');
    setDraftLanguage('');
    setDraftPremium('');
    setDraftDifficulty('');
    setDraftSort('newest');
  };

  const activeDraftCount =
    (draftCategory ? 1 : 0) +
    (draftLanguage ? 1 : 0) +
    (draftPremium ? 1 : 0) +
    (draftDifficulty ? 1 : 0) +
    (draftSort !== 'newest' ? 1 : 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={tw`flex-1 justify-end bg-black/45`} onPress={onClose}>
        <Pressable
          style={[tw`rounded-t-3xl max-h-[85%]`, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={tw`items-center pt-3 pb-2`}>
            <View style={[tw`w-10 h-1 rounded-full`, { backgroundColor: colors.border }]} />
          </View>

          <View style={tw`flex-row items-center justify-between px-5 pb-3`}>
            <Text style={[tw`text-lg font-bold`, { color: colors.text }]}>Filters & sort</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={tw`px-5`}
            contentContainerStyle={tw`pb-4`}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Section title="Sort by" colors={colors}>
              <View style={tw`flex-row flex-wrap`}>
                {EXAM_SORT_OPTIONS.map(({ key, label }) => (
                  <OptionPill
                    key={key}
                    label={label}
                    active={draftSort === key}
                    onPress={() => setDraftSort(key)}
                    colors={colors}
                  />
                ))}
              </View>
            </Section>

            {categories.length > 0 && (
              <Section title="Category" colors={colors}>
                <View style={tw`flex-row flex-wrap`}>
                  <OptionPill
                    label="All categories"
                    active={!draftCategory}
                    onPress={() => setDraftCategory('')}
                    colors={colors}
                  />
                  {categories.map((cat) => (
                    <OptionPill
                      key={cat._id}
                      label={cat.displayName || cat.name}
                      active={draftCategory === cat._id}
                      onPress={() => setDraftCategory(cat._id)}
                      colors={colors}
                    />
                  ))}
                </View>
              </Section>
            )}

            <Section title="Language" colors={colors}>
              <View style={tw`flex-row flex-wrap`}>
                {LANGUAGES.map((lang) => (
                  <OptionPill
                    key={lang || 'all'}
                    label={lang || 'All languages'}
                    active={draftLanguage === lang}
                    onPress={() => setDraftLanguage(lang)}
                    colors={colors}
                  />
                ))}
              </View>
            </Section>

            <Section title="Access" colors={colors}>
              <View style={tw`flex-row flex-wrap`}>
                {PREMIUM_OPTIONS.map(({ key, label }) => (
                  <OptionPill
                    key={key || 'all'}
                    label={label}
                    active={draftPremium === key}
                    onPress={() => setDraftPremium(key)}
                    colors={colors}
                  />
                ))}
              </View>
            </Section>

            <Section title="Difficulty" colors={colors}>
              <View style={tw`flex-row flex-wrap`}>
                {DIFFICULTY_OPTIONS.map(({ key, label }) => (
                  <OptionPill
                    key={key || 'any'}
                    label={label}
                    active={draftDifficulty === key}
                    onPress={() => setDraftDifficulty(key)}
                    colors={colors}
                  />
                ))}
              </View>
            </Section>
          </ScrollView>

          <View
            style={[
              tw`flex-row gap-3 px-5 py-4 border-t`,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <TouchableOpacity
              style={[
                tw`flex-1 py-3.5 rounded-xl items-center border`,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
              onPress={handleReset}
              activeOpacity={0.75}
            >
              <Text style={[tw`text-sm font-semibold`, { color: colors.text }]}>
                Reset{activeDraftCount > 0 ? ` (${activeDraftCount})` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[tw`flex-1 py-3.5 rounded-2xl items-center`, { backgroundColor: colors.hero }]}
              onPress={handleApply}
              activeOpacity={0.85}
            >
              <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function ActiveFilterPills({ items, onRemove, onClearAll, colors }) {
  if (!items.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw`gap-2 pb-1`}
    >
      {items.map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          onPress={() => onRemove(key)}
          activeOpacity={0.75}
          style={[
            tw`flex-row items-center px-3 py-1.5 rounded-full gap-1`,
            { backgroundColor: colors.cardMuted },
          ]}
          accessibilityLabel={`Remove filter ${label}`}
        >
          <Text style={[tw`text-[11px] font-bold`, { color: colors.text }]}>{label}</Text>
          <Ionicons name="close" size={14} color={colors.text} />
        </TouchableOpacity>
      ))}
      {items.length > 1 && (
        <TouchableOpacity onPress={onClearAll} activeOpacity={0.7} style={tw`justify-center px-1`}>
          <Text style={[tw`text-[11px] font-semibold`, { color: colors.textSecondary }]}>
            Clear all
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
