import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, THEME_COLORS } from '@/src/constants/Colors';

interface ProgressBarProps {
    currentStep: number;
    totalSteps: number;
}

export const ProgressBar = ({ currentStep, totalSteps }: ProgressBarProps) => {
    const progress = (currentStep / totalSteps) * 100;
    return (
        <View style={styles.progressBox}>
            <LinearGradient
                colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${progress}%` }]}
            />
            <Text style={styles.progressCount}>{`${currentStep}/${totalSteps}`}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    progressBox: {
        height: 6,
        backgroundColor: 'rgba(50,50,50,0.5)',
        borderRadius: 3,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
    },
    progressFill: {
        height: 6,
        borderRadius: 3,
        position: 'absolute',
        left: 0,
        top: 0,
    },
    progressCount: {
        position: 'absolute',
        right: 0,
        top: -18,
        fontSize: 12,
        color: THEME_COLORS.textSecondary,
    },
});