import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import ExamCard from './ExamCard';

import { t as tr } from '../i18n';
export function ExamHighlightSection({
  title,
  subtitle,
  icon,
  exams,
  navigation,
  colors,
  tone,
  highlightTag,
}) {
  if (!exams?.length) return null;

  return (
    <View style={tw`mb-5`}>
      <View style={tw`flex-row items-start gap-2 mb-3`}>
        <View
          style={[
            tw`w-7 h-7 rounded-lg items-center justify-center mt-0.5`,
            { backgroundColor: (tone || colors.tones.green).bg },
          ]}
        >
          <Ionicons name={icon} size={14} color={(tone || colors.tones.green).fg} />
        </View>
        <View style={tw`flex-1`}>
          <Text style={[tw`text-base font-extrabold`, { color: colors.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[tw`text-[11px] mt-0.5`, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={tw`gap-3`}>
        {exams.map((exam) => (
          <ExamCard
            key={exam._id}
            exam={exam}
            navigation={navigation}
            colors={colors}
            showBreadcrumb
            highlightTag={highlightTag}
          />
        ))}
      </View>
    </View>
  );
}

export function ExamHighlightsBlock({ highlights, navigation, colors }) {
  if (!highlights) return null;

  const { newExams = [], pausedExams = [], recommendedExams = [] } = highlights;
  const hasAny =
    newExams.length > 0 || pausedExams.length > 0 || recommendedExams.length > 0;
  if (!hasAny) return null;

  return (
    <View style={tw`mb-2`}>
      {pausedExams.length > 0 && (
        <ExamHighlightSection
          title={tr("Continue")}
          subtitle={tr("Pick up where you left off")}
          icon="pause-circle"
          exams={pausedExams}
          navigation={navigation}
          colors={colors}
          tone={colors.tones.orange}
          highlightTag="continue"
        />
      )}
      {newExams.length > 0 && (
        <ExamHighlightSection
          title={tr("New")}
          subtitle={tr("Published in the last 48 hours")}
          icon="sparkles"
          exams={newExams}
          navigation={navigation}
          colors={colors}
          tone={colors.tones.blue}
          highlightTag="new"
        />
      )}
      {recommendedExams.length > 0 && (
        <ExamHighlightSection
          title={tr("Recommended")}
          subtitle={tr("Popular exams you haven't attempted yet")}
          icon="star"
          exams={recommendedExams}
          navigation={navigation}
          colors={colors}
          tone={colors.tones.purple}
          highlightTag="recommended"
        />
      )}
    </View>
  );
}
