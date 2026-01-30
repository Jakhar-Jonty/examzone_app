import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StudyScreen from '../screens/StudyScreen';
import ArticleDetailScreen from '../screens/ArticleDetailScreen';
import QuestionDetailScreen from '../screens/QuestionDetailScreen';

const Stack = createNativeStackNavigator();

export default function StudyStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="StudyMain" component={StudyScreen} />
      <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
      <Stack.Screen name="QuestionDetail" component={QuestionDetailScreen} />
    </Stack.Navigator>
  );
}

