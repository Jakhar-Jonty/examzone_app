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
import WrongBookScreen from '../screens/WrongBookScreen';
import PyqScreen from '../screens/PyqScreen';
import HaryanaGkScreen from '../screens/HaryanaGkScreen';
import CurrentAffairsScreen from '../screens/CurrentAffairsScreen';
import CurrentAffairDetailScreen from '../screens/CurrentAffairDetailScreen';

const Stack = createNativeStackNavigator();

export default function StudyStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudyMain" component={StudyScreen} />
      <Stack.Screen name="WrongBook" component={WrongBookScreen} />
      <Stack.Screen name="Pyq" component={PyqScreen} />
      <Stack.Screen name="HaryanaGk" component={HaryanaGkScreen} />
      <Stack.Screen name="CurrentAffairs" component={CurrentAffairsScreen} />
      <Stack.Screen name="CurrentAffairDetail" component={CurrentAffairDetailScreen} />
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
