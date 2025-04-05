import React from 'react';
import { View, StyleSheet } from 'react-native';
import { THEME_COLORS } from '@/src/constants/Colors';
import {PlayerProfile} from "@/app/(tabs)/profile/components";
import {useAuth} from "@/src/core/api/auth/useAuth";
import {useLocalSearchParams} from "expo-router";

export default function PlayerProfileScreen() {
    const {userId} = useLocalSearchParams<{ userId: string }>();
    return (
        <View style={styles.container}>
            <PlayerProfile userId={userId as string} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME_COLORS.background,
    },
});
