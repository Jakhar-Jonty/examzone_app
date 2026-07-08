import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TestSeriesScreen from '../screens/TestSeriesScreen';
import TestSeriesDetailScreen from '../screens/TestSeriesDetailScreen';
import MyTestSeriesScreen from '../screens/MyTestSeriesScreen';

const Stack = createNativeStackNavigator();

export default function SeriesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TestSeriesList" component={TestSeriesScreen} />
      <Stack.Screen name="TestSeriesDetail" component={TestSeriesDetailScreen} />
      <Stack.Screen name="MyTestSeries" component={MyTestSeriesScreen} />
    </Stack.Navigator>
  );
}
