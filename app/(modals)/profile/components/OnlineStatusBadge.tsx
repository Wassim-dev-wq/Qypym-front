import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, THEME_COLORS } from '@/src/constants/Colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUserPresence } from '@/src/core/hooks/useUserPresence';

interface OnlineStatusBadgeProps {
    userId: string;
    style?: any;
    showIcon?: boolean;
}


export const OnlineStatusBadge = ({ userId, style, showIcon = true }: OnlineStatusBadgeProps) => {
    const { isOnline, lastActiveText } = useUserPresence(userId);

    return (
        <View style={[styles.container, style]}>
            <LinearGradient
                colors={isOnline
                    ? ['rgba(22, 163, 74, 0.2)', 'rgba(22, 163, 74, 0.05)']
                    : ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.05)']}
                style={styles.gradient}
            >
                {showIcon && (
                    <MaterialCommunityIcons
                        name={isOnline ? "circle" : "clock-outline"}
                        size={14}
                        color={isOnline ? THEME_COLORS.success : THEME_COLORS.textSecondary}
                        style={styles.icon}
                    />
                )}
                <Text
                    style={[
                        styles.text,
                        isOnline ? styles.onlineText : styles.offlineText
                    ]}
                >
                    {lastActiveText}
                </Text>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    gradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    icon: {
        marginRight: 6,
    },
    text: {
        fontSize: 13,
        fontWeight: '500',
    },
    onlineText: {
        color: THEME_COLORS.success,
    },
    offlineText: {
        color: THEME_COLORS.textSecondary,
    }
});