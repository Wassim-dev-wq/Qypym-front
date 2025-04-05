import React, {useRef} from 'react';
import {Animated, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {COLORS, THEME_COLORS} from "@/src/constants/Colors";

export const IconButton = ({
                               icon,
                               onPress,
                               color = THEME_COLORS.textPrimary,
                               size = 24,
                               style = {},
                               background = true,
                           }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.9,
                duration: 100,
                useNativeDriver: true
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 4,
                tension: 40,
                useNativeDriver: true
            })
        ]).start();

        if (onPress) onPress();
    };

    return (
        <Animated.View style={{transform: [{scale: scaleAnim}]}}>
            <TouchableOpacity
                onPress={handlePress}
                style={[
                    styles.iconButton,
                    background && styles.iconButtonBackground,
                    style
                ]}
                activeOpacity={0.7}
            >
                <MaterialCommunityIcons name={icon} size={size} color={color}/>
            </TouchableOpacity>
        </Animated.View>
    );
};

export const StatCard = ({icon, value, label, trend = null}) => {
    return (
        <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
                <MaterialCommunityIcons name={icon} size={18} color={COLORS.primary.accent}/>
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
            {trend && (
                <View
                    style={[styles.trendIcon, {backgroundColor: trend === 'up' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}]}>
                    <MaterialCommunityIcons
                        name={trend === 'up' ? 'arrow-up' : 'arrow-down'}
                        size={12}
                        color={trend === 'up' ? THEME_COLORS.success : THEME_COLORS.error}
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconButtonBackground: {
        backgroundColor: THEME_COLORS.cardAccent,
    },
    statRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%'
    },
    statCard: {
        flex: 1,
        padding: 16,
        backgroundColor: 'rgba(26,26,26,0.9)',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
        position: 'relative'
    },
    statIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 184, 0, 0.1)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: THEME_COLORS.textPrimary
    },
    statLabel: {
        fontSize: 12,
        color: THEME_COLORS.textSecondary
    },
    trendIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center'
    },
    chartContainer: {
        marginVertical: 20,
        backgroundColor: 'rgba(26,26,26,0.9)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)'
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginBottom: 16
    },
    chartBars: {
        height: 150,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end'
    },
    barColumn: {
        flex: 1,
        height: '100%',
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: 4
    },
    barFill: {
        width: '80%',
        backgroundColor: COLORS.primary.accent,
        borderRadius: 4,
        minHeight: 5
    },
    barLabel: {
        fontSize: 10,
        color: THEME_COLORS.textSecondary,
        marginTop: 4
    },
    section: {
        marginBottom: 24
    },
    secTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginBottom: 16
    },
    infoRow: {
        flexDirection: 'row',
        gap: 12
    },
    infoBox: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
        backgroundColor: 'rgba(26,26,26,0.9)'
    },
    infoLab: {
        fontSize: 13,
        color: THEME_COLORS.textSecondary
    },
    infoVal: {
        fontSize: 15,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary
    }
});
