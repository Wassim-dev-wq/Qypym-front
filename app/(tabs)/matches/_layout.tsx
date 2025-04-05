import React from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { COLORS } from "@/src/constants/Colors";

export default function MatchesLayout() {
    return (
        <Stack screenOptions={{
            headerShown: false,
            headerStyle: { backgroundColor: COLORS.primary.dark },
            headerTintColor: COLORS.neutral[50],
            headerTitleStyle: { fontSize: 20, fontWeight: "bold" },
            title: "",
            gestureEnabled: true,
            fullScreenGestureEnabled: Platform.OS === 'ios',
            animation: 'slide_from_right',
        }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="createMatch" />
            <Stack.Screen name="MatchDetailsScreen" />
            <Stack.Screen name="OwnedMatchDetailsScreen" />
            <Stack.Screen
                name="[matchId]/index"
                options={{
                    headerShown: true,
                    animation: 'slide_from_right',
                }}
            />

            <Stack.Screen
                name="[matchId]/manage"
                options={{
                    headerShown: true,
                    animation: 'slide_from_right',
                }}
            />
        </Stack>
    );
}