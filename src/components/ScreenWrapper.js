import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

/**
 * ScreenWrapper — wraps screen content with correct safe area insets.
 * Handles Dynamic Island, notch, and home indicator on all iOS/Android devices.
 *
 * Props:
 *   edges: array of sides to apply insets to. Default: ['top', 'left', 'right']
 *          (bottom is usually handled by the tab bar or ScrollView padding)
 *   style: extra styles for the outer container
 *   backgroundColor: override background color
 */
export default function ScreenWrapper({
    children,
    edges = ['top', 'left', 'right'],
    style,
    backgroundColor,
}) {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();

    const padding = {
        paddingTop: edges.includes('top') ? insets.top : 0,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        paddingLeft: edges.includes('left') ? insets.left : 0,
        paddingRight: edges.includes('right') ? insets.right : 0,
    };

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: backgroundColor || colors.background },
                padding,
                style,
            ]}
        >
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
