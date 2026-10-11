import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import ExamCard from './ExamCard';

export function ExamHighlightSection({
  title,
  subtitle,
  icon,
  exams,
  navigation,
  colors,
  accentColor,
  highlightTag,
}) {
  if (!exams?.length) return null;

  return (
    <View style={tw`mb-5`}>
      <View style={tw`flex-row items-start gap-2 mb-3`}>
        <View
          style={[
            tw`w-6 h-6 rounded-full items-center justify-center mt-0.5`,
            { backgroundColor: (accentColor || colors.primary) + '18' },
          ]}
        >
          <Ionicons name={icon} size={13} color={accentColor || colors.primary} />
        </View>
        <View style={tw`flex-1`}>
          <Text style={[tw`text-sm font-bold`, { color: colors.text }]}>{title}</Text>
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
          title="Continue"
          subtitle="Pick up where you left off"
          icon="pause-circle"
          exams={pausedExams}
          navigation={navigation}
          colors={colors}
          accentColor="#f59e0b"
          highlightTag="continue"
        />
      )}
      {newExams.length > 0 && (
        <ExamHighlightSection
          title="New"
          subtitle="Published in the last 48 hours"
          icon="sparkles"
          exams={newExams}
          navigation={navigation}
          colors={colors}
          highlightTag="new"
        />
      )}
      {recommendedExams.length > 0 && (
        <ExamHighlightSection
          title="Recommended"
          subtitle="Popular exams you haven't attempted yet"
          icon="star"
          exams={recommendedExams}
          navigation={navigation}
          colors={colors}
          accentColor="#8b5cf6"
          highlightTag="recommended"
        />
      )}
    </View>
  );
}
