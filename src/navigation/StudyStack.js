import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StudyScreen from '../screens/StudyScreen';
import ArticleDetailScreen from '../screens/ArticleDetailScreen';
import QuestionDetailScreen from '../screens/QuestionDetailScreen';
import PracticeSessionsScreen from '../screens/PracticeSessionsScreen';
import PracticeInterfaceScreen from '../screens/PracticeInterfaceScreen';
import PracticeResultScreen from '../screens/PracticeResultScreen';
import StudyPlansScreen from '../screens/StudyPlansScreen';
import StudyPlanCreateScreen from '../screens/StudyPlanCreateScreen';

const Stack = createNativeStackNavigator();

export default function StudyStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudyMain" component={StudyScreen} />
      <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
      <Stack.Screen name="QuestionDetail" component={QuestionDetailScreen} />
      <Stack.Screen name="PracticeSessions" component={PracticeSessionsScreen} />
      <Stack.Screen
        name="PracticeInterface"
        component={PracticeInterfaceScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="PracticeResult" component={PracticeResultScreen} />
      <Stack.Screen name="StudyPlans" component={StudyPlansScreen} />
      <Stack.Screen name="StudyPlanCreate" component={StudyPlanCreateScreen} />
    </Stack.Navigator>
  );
}
