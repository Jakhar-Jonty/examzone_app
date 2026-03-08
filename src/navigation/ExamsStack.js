import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ExamsScreen from '../screens/ExamsScreen';

const Stack = createNativeStackNavigator();

export default function ExamsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExamsList" component={ExamsScreen} />
    </Stack.Navigator>
  );
}



// import React from 'react';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import ExamsScreen from '../screens/ExamsScreen';
// import ExamDetailScreen from '../screens/ExamDetailScreen';
// import ExamInterfaceScreen from '../screens/ExamInterfaceScreen';
// import ResultScreen from '../screens/ResultScreen';

// const Stack = createNativeStackNavigator();

// export default function ExamsStack() {
//   return (
//     <Stack.Navigator
//       screenOptions={{
//         headerShown: false,
//       }}
//     >
//       <Stack.Screen name="ExamsList" component={ExamsScreen} />
//       <Stack.Screen name="ExamDetail" component={ExamDetailScreen} />
//       <Stack.Screen name="ExamInterface" component={ExamInterfaceScreen} />
//       <Stack.Screen name="Result" component={ResultScreen} />
//     </Stack.Navigator>
//   );
// }


