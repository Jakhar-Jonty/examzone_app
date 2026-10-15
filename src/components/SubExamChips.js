import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { useTheme } from '../context/ThemeContext';
import { useFocusExam, useSubExam } from '../context/AppConfigContext';

const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * "All HSSC · CET · Police …" chips. Renders nothing until 2+ sub-exams of
 * the focus exam have live exams.
 */
export default function SubExamChips({ style }) {
  const { colors } = useTheme();
  const focus = useFocusExam();
  const { options, selectedId, select } = useSubExam();
  if (!focus || !options.length) return null;

  const chips = [{ _id: null, name: `All ${focus.name}` }, ...options];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={style} contentContainerStyle={tw`gap-2`}>
      {chips.map((c) => {
        const on = String(c._id) === String(selectedId);
        return (
          <TouchableOpacity
            key={String(c._id)}
            onPress={() => select(c._id)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[
              tw`px-3.5 h-9 rounded-full items-center justify-center`,
              on ? { backgroundColor: colors.hero } : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
            ]}
          >
            <Text style={[tw`text-xs font-bold`, { color: on ? colors.heroText : colors.text }]}>{titleCase(c.name)}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
