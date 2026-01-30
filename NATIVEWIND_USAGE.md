# NativeWind Usage Guide

NativeWind v4 has been successfully set up in the GoPrep mobile app! You can now use Tailwind CSS classes directly in your React Native components.

## Setup Complete ✅

- ✅ NativeWind v4.2.1 installed
- ✅ Tailwind CSS configured
- ✅ Babel plugin configured
- ✅ Global CSS imported
- ✅ Color scheme matching frontend (#16a34a)

## How to Use

### Basic Usage

Instead of using `StyleSheet.create()`, you can use Tailwind classes directly:

```jsx
import { View, Text } from 'react-native';

// Old way (StyleSheet)
<View style={styles.container}>
  <Text style={styles.text}>Hello</Text>
</View>

// New way (NativeWind)
<View className="flex-1 bg-white p-4">
  <Text className="text-2xl font-bold text-gray-800">Hello</Text>
</View>
```

### Using with Theme Context

You can combine NativeWind classes with your theme:

```jsx
import { useTheme } from '../context/ThemeContext';

function MyComponent() {
  const { colors, isDark } = useTheme();
  
  return (
    <View 
      className="flex-1 p-4"
      style={{ backgroundColor: colors.background }}
    >
      <Text 
        className="text-xl font-bold"
        style={{ color: colors.text }}
      >
        Themed Text
      </Text>
    </View>
  );
}
```

### Custom Colors

The Tailwind config includes your custom colors:

```jsx
// Using custom primary color
<View className="bg-primary">
  <Text className="text-primary-dark">Text</Text>
</View>

// Using theme colors
<View className="bg-card dark:bg-card-dark">
  <Text className="text-foreground dark:text-foreground-dark">Text</Text>
</View>
```

### Common Patterns

```jsx
// Card
<View className="bg-white rounded-xl p-4 shadow-lg mb-4">
  <Text className="text-lg font-semibold mb-2">Card Title</Text>
  <Text className="text-gray-600">Card content</Text>
</View>

// Button
<TouchableOpacity className="bg-primary rounded-lg px-6 py-3 items-center">
  <Text className="text-white font-bold">Button</Text>
</TouchableOpacity>

// Flex layouts
<View className="flex-row items-center justify-between">
  <Text className="flex-1">Left</Text>
  <Text>Right</Text>
</View>

// Spacing
<View className="p-4 m-2">
  <Text className="mb-2">Spaced content</Text>
</View>
```

## Migration Strategy

You can gradually migrate components:
1. Start with new components using NativeWind
2. Convert existing components one at a time
3. Mix NativeWind classes with StyleSheet when needed
4. Both approaches work together!

## Available Custom Colors

- `primary` - #16a34a (main brand color)
- `primary-dark` - #15803d
- `primary-light` - #22c55e
- `success` - #10b981
- `warning` - #f59e0b
- `danger` - #ef4444
- `card`, `card-dark` - Card backgrounds
- `surface`, `surface-dark` - Surface colors
- `background`, `background-dark` - Background colors

## Resources

- [NativeWind Docs](https://www.nativewind.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

