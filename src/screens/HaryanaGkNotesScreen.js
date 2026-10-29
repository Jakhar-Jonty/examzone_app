import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { practiceSessionService } from '../services/practiceSessionService';
import { t as tr, isHindi } from '../i18n';

/** One-page revision notes for a Haryana GK topic, with a button to take its test. */
export default function HaryanaGkNotesScreen({ route, navigation }) {
  const { topicKey, topicLabel } = route.params || {};
  const { colors } = useTheme();
  const L = isHindi() ? 'hi' : 'en';
  const [notes, setNotes] = useState(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  // same test the Haryana GK hub starts for this topic
  const startTest = async () => {
    if (starting || !topicLabel) return;
    try {
      setStarting(true);
      const { session } = await practiceSessionService.create({
        sessionType: 'topic-wise',
        filters: { subject: 'Haryana GK', topics: [topicLabel] },
        questionCount: 15,
        strict: true,
      });
      navigation.navigate('PracticeInterface', { sessionId: session._id, sessionType: session.sessionType });
    } catch (e) {
      Alert.alert(tr('Could not start'), e?.response?.data?.message || tr('Please try again.'));
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    api
      .get(`/haryana-gk/notes/${topicKey}`)
      .then((r) => setNotes(r.data))
      .catch((e) => setError(tr(e?.response?.data?.message || 'Could not load notes. Please try again.')));
  }, [topicKey]);

  const card = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };

  return (
    <ScreenWrapper backgroundColor={colors.surface}>
      <View style={tw`flex-row items-center px-3 pt-2 pb-2`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`} accessibilityLabel={tr('Back')}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[tw`text-lg font-extrabold ml-1 flex-1`, { color: colors.text }]} numberOfLines={1}>
          {notes ? notes.title[L] : tr('Notes')}
        </Text>
      </View>

      {!notes && !error ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : error ? (
        <Text style={[tw`text-sm text-center mt-10 px-8`, { color: colors.textSecondary }]}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={tw`px-5 pt-2 pb-12`} showsVerticalScrollIndicator={false}>
          {notes.sections.map((sec) => (
            <View key={sec.heading.en} style={[tw`p-4 rounded-3xl mb-3`, card]}>
              <Text style={[tw`text-base font-extrabold mb-2`, { color: colors.text }]}>{sec.heading[L]}</Text>
              {sec.points.map((p, i) => (
                <View key={i} style={tw`flex-row items-start mb-2`}>
                  <View style={[tw`w-1.5 h-1.5 rounded-full mt-2 mr-2.5`, { backgroundColor: colors.text }]} />
                  <Text style={[tw`flex-1 text-sm leading-6`, { color: colors.text }]}>{p[L]}</Text>
                </View>
              ))}
            </View>
          ))}

          {!!topicLabel && (
            <TouchableOpacity
              onPress={startTest}
              disabled={starting}
              activeOpacity={0.85}
              style={[tw`mt-2 rounded-2xl items-center justify-center flex-row`, { height: 52, backgroundColor: colors.hero }]}
            >
              {starting ? (
                <ActivityIndicator color={colors.heroText} />
              ) : (
                <>
                  <Ionicons name="play-circle-outline" size={18} color={colors.heroText} />
                  <Text style={[tw`text-base font-bold ml-2`, { color: colors.heroText }]}>{tr('Take the topic test')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}
