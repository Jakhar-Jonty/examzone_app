import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { t as tr, isHindi } from '../i18n';
import { AGE, HSSC_OFFICIAL_URL, MARKING, PATTERN, QUALIFYING, SOURCE_NOTE, SYLLABUS, TIPS } from '../content/hsscCetInfo';

/** HSSC CET (Group C) at a glance: pattern, marking, qualifying marks, syllabus, tips. */
export default function HsscInfoScreen({ navigation }) {
  const { colors } = useTheme();
  const L = isHindi() ? 'hi' : 'en';
  const card = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };
  const muted = { backgroundColor: colors.surfaceMuted };

  const Section = ({ icon, iconColor, title, children }) => (
    <View style={[tw`p-4 rounded-3xl mb-4`, card]}>
      <View style={tw`flex-row items-center mb-3`}>
        <Ionicons name={icon} size={18} color={iconColor || colors.text} />
        <Text style={[tw`text-base font-extrabold ml-2`, { color: colors.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );

  return (
    <ScreenWrapper backgroundColor={colors.surface}>
      <View style={tw`flex-row items-center px-3 pt-2 pb-2`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`} accessibilityLabel={tr('Back')}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[tw`text-xl font-extrabold ml-1`, { color: colors.text }]}>{tr('HSSC CET (Group C)')}</Text>
      </View>

      <ScrollView contentContainerStyle={tw`px-5 pt-2 pb-12`} showsVerticalScrollIndicator={false}>
        <View style={[tw`p-5 rounded-3xl mb-4`, { backgroundColor: colors.hero }]}>
          <Text style={[tw`text-sm leading-5`, { color: colors.heroTextSecondary }]}>
            {tr('Exam pattern, marking, qualifying marks and syllabus in one place.')}
          </Text>
          <View style={tw`flex-row gap-2 mt-4`}>
            <TouchableOpacity
              onPress={() => navigation.navigate('SeriesTab')}
              activeOpacity={0.85}
              style={[tw`flex-1 h-11 rounded-2xl items-center justify-center`, { backgroundColor: colors.heroText }]}
            >
              <Text style={[tw`text-sm font-bold`, { color: colors.hero }]}>{tr('Take a full mock')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('StudyTab', { screen: 'Pyq', initial: false })}
              activeOpacity={0.85}
              style={[tw`flex-1 h-11 rounded-2xl items-center justify-center`, { backgroundColor: colors.heroRaised }]}
            >
              <Text style={[tw`text-sm font-bold`, { color: colors.heroText }]}>{tr('Previous year papers')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Section icon="document-text-outline" title={tr('Exam pattern')}>
          <View style={tw`flex-row flex-wrap -mx-1`}>
            {PATTERN.map((p) => (
              <View key={p.label.en} style={tw`w-1/2 px-1 mb-2`}>
                <View style={[tw`p-3 rounded-2xl`, muted]}>
                  <Text style={[tw`text-[11px]`, { color: colors.textSecondary }]}>{p.label[L]}</Text>
                  <Text style={[tw`text-sm font-bold mt-0.5`, { color: colors.text }]}>{p.value[L]}</Text>
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Section icon="warning-outline" iconColor={colors.tones.orange.fg} title={tr('Marking — read this carefully')}>
          {MARKING[L].map((m, i) => (
            <Text
              key={i}
              style={[tw`text-sm leading-5 mb-2`, { color: i === 2 ? colors.tones.red.fg : colors.text, fontWeight: i === 2 ? '700' : '400' }]}
            >
              • {m}
            </Text>
          ))}
        </Section>

        <Section icon="ribbon-outline" title={tr('Minimum qualifying marks')}>
          {QUALIFYING.map((q) => (
            <View key={q.label.en} style={[tw`flex-row items-center justify-between px-4 py-3 rounded-2xl mb-2`, muted]}>
              <Text style={[tw`text-sm flex-1 pr-2`, { color: colors.text }]}>{q.label[L]}</Text>
              <Text style={[tw`text-base font-extrabold`, { color: colors.text }]}>{q.value}</Text>
            </View>
          ))}
          <Text style={[tw`text-sm mt-1 leading-5`, { color: colors.text }]}>
            {tr('Age')}: {AGE[L]}
          </Text>
        </Section>

        <Section icon="book-outline" title={tr('Syllabus')}>
          {SYLLABUS.map((s) => (
            <View key={s.key} style={[tw`p-4 rounded-2xl mb-2`, muted]}>
              <View style={tw`flex-row items-center justify-between`}>
                <Text style={[tw`text-sm font-extrabold flex-1`, { color: colors.text }]}>{s.title[L]}</Text>
                {s.link ? (
                  <TouchableOpacity onPress={() => navigation.navigate('StudyTab', { screen: s.link, initial: false })} hitSlop={8}>
                    <Text style={[tw`text-xs font-semibold underline`, { color: colors.text }]}>{tr('Practise')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text style={[tw`text-xs leading-5 mt-1`, { color: colors.textSecondary }]}>{s.topics[L]}</Text>
            </View>
          ))}
        </Section>

        <Section icon="bulb-outline" iconColor={colors.tones.green.fg} title={tr('Tips')}>
          {TIPS[L].map((t, i) => (
            <View key={i} style={tw`flex-row items-start mb-2`}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.tones.green.fg} style={tw`mt-0.5`} />
              <Text style={[tw`text-sm leading-5 ml-2 flex-1`, { color: colors.text }]}>{t}</Text>
            </View>
          ))}
        </Section>

        <Text style={[tw`text-xs leading-5`, { color: colors.textSecondary }]}>
          {SOURCE_NOTE[L]}{' '}
          <Text style={[tw`font-semibold underline`, { color: colors.text }]} onPress={() => Linking.openURL(HSSC_OFFICIAL_URL)}>
            hssc.gov.in
          </Text>
        </Text>
      </ScrollView>
    </ScreenWrapper>
  );
}
