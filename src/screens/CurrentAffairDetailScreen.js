import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { currentAffairsService, pickLang } from '../services/currentAffairsService';
import { t as tr } from '../i18n';

/** One current-affairs note: summary, exam facts and its MCQs. */
export default function CurrentAffairDetailScreen({ navigation, route }) {
  const { id, hindi: initialHindi = false } = route.params || {};
  const { colors } = useTheme();
  const [hindi, setHindi] = useState(initialHindi);
  const [item, setItem] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    currentAffairsService
      .get(id)
      .then(setItem)
      .catch(() => {
        Alert.alert(tr("Current affairs"), tr("This item is no longer available."));
        navigation.goBack();
      });
  }, [id, navigation]);

  const startQuiz = async () => {
    if (starting) return;
    try {
      setStarting(true);
      const session = await currentAffairsService.startQuiz({ id });
      navigation.navigate('PracticeInterface', { sessionId: session._id, sessionType: session.sessionType });
    } catch (e) {
      Alert.alert(tr("Could not start"), e?.response?.data?.message || tr("Please try again."));
    } finally {
      setStarting(false);
    }
  };

  const card = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };
  const date = item?.date
    ? new Date(`${item.date}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : '';

  return (
    <ScreenWrapper backgroundColor={colors.surface}>
      <View style={tw`flex-row items-center justify-between px-3 pt-2 pb-2`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`} accessibilityLabel={tr("Back")}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setHindi((h) => !h)}
          activeOpacity={0.8}
          accessibilityLabel={tr("Language: {0}. Tap to switch.", hindi ? 'Hindi' : 'English')}
          style={[tw`flex-row rounded-full p-1 mr-2`, card]}
        >
          {['EN', 'हिन्दी'].map((label, i) => {
            const on = (i === 1) === hindi;
            return (
              <View key={label} style={[tw`px-2.5 py-1.5 rounded-full`, on && { backgroundColor: colors.hero }]}>
                <Text style={[tw`text-xs font-bold`, { color: on ? colors.heroText : colors.textSecondary }]}>{tr(label)}</Text>
              </View>
            );
          })}
        </TouchableOpacity>
      </View>

      {!item ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={tw`px-5 pt-1 pb-8`} showsVerticalScrollIndicator={false}>
            <Text style={[tw`text-xs font-bold tracking-wider`, { color: colors.textSecondary }]}>
              {date.toUpperCase()}
              {item.region === 'National' ? tr(" · NATIONAL") : tr(" · HARYANA")}
            </Text>
            <Text style={[tw`text-2xl font-extrabold mt-1.5 leading-8`, { color: colors.text }]}>
              {pickLang(hindi, item.title, item.titleHindi)}
            </Text>
            <Text style={[tw`text-[15px] mt-3 leading-6`, { color: colors.text }]}>
              {pickLang(hindi, item.summary, item.summaryHindi)}
            </Text>

            {item.keyPoints?.length > 0 && (
              <View style={[tw`p-4 rounded-3xl mt-5`, card]}>
                <Text style={[tw`text-sm font-extrabold mb-2`, { color: colors.text }]}>
                  {hindi ? 'परीक्षा के लिए मुख्य तथ्य' : tr("Key facts for the exam")}
                </Text>
                {item.keyPoints.map((k, i) => (
                  <View key={k._id || i} style={tw`flex-row mt-1.5`}>
                    <View style={[tw`w-1.5 h-1.5 rounded-full mt-2 mr-2.5`, { backgroundColor: colors.text }]} />
                    <Text style={[tw`flex-1 text-sm leading-6`, { color: colors.text }]}>{pickLang(hindi, k.text, k.textHindi)}</Text>
                  </View>
                ))}
              </View>
            )}

            {item.tags?.length > 0 && (
              <View style={tw`flex-row flex-wrap gap-1.5 mt-4`}>
                {item.tags.map((t) => (
                  <View key={t} style={[tw`px-2.5 py-1 rounded-full`, { backgroundColor: colors.surfaceMuted }]}>
                    <Text style={[tw`text-xs font-semibold`, { color: colors.textSecondary }]}>{t}</Text>
                  </View>
                ))}
              </View>
            )}

            {!!item.sourceUrl && (
              <TouchableOpacity onPress={() => Linking.openURL(item.sourceUrl)} style={tw`flex-row items-center mt-4`}>
                <Ionicons name="open-outline" size={14} color={colors.textSecondary} />
                <Text style={[tw`text-xs font-semibold ml-1 underline`, { color: colors.textSecondary }]}>{tr("Source")}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {item.questionCount > 0 && (
            <View style={[tw`px-5 pt-3 pb-4`, { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }]}>
              <TouchableOpacity
                onPress={startQuiz}
                disabled={starting}
                activeOpacity={0.85}
                style={[tw`flex-row items-center justify-center h-12 rounded-2xl`, { backgroundColor: colors.hero }]}
              >
                {starting ? (
                  <ActivityIndicator color={colors.heroText} />
                ) : (
                  <>
                    <Ionicons name="flash" size={16} color={colors.heroAccent} />
                    <Text style={[tw`text-[15px] font-bold ml-1.5`, { color: colors.heroText }]}>
                      {hindi ? `${item.questionCount} प्रश्न हल करें` : tr("Practice {0} MCQs", item.questionCount)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </ScreenWrapper>
  );
}
