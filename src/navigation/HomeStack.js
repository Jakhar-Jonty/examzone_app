import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import WordOfDayDetailScreen from '../screens/WordOfDayDetailScreen';
import QuoteDetailScreen from '../screens/QuoteDetailScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import CategoryDetailScreen from '../screens/CategoryDetailScreen';
import SubCategoryDetailScreen from '../screens/SubCategoryDetailScreen';
import ExamDetailScreen from '../screens/ExamDetailScreen';
import ExamInterfaceScreen from '../screens/ExamInterfaceScreen';
import ResultScreen from '../screens/ResultScreen';
import ArticleDetailScreen from '../screens/ArticleDetailScreen';
import QuestionDetailScreen from '../screens/QuestionDetailScreen';

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="WordOfDayDetail" component={WordOfDayDetailScreen} />
      <Stack.Screen name="QuoteDetail" component={QuoteDetailScreen} />
      <Stack.Screen name="Categories" component={CategoriesScreen} />
      <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
      <Stack.Screen name="SubCategoryDetail" component={SubCategoryDetailScreen} />
      <Stack.Screen name="ExamDetail" component={ExamDetailScreen} />
      <Stack.Screen name="ExamInterface" component={ExamInterfaceScreen} />
      <Stack.Screen name="Result" component={ResultScreen} />
      <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
      <Stack.Screen name="QuestionDetail" component={QuestionDetailScreen} />
    </Stack.Navigator>
  );
}

