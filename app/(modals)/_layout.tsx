import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import React from "react";

export default function ModalLayout() {
    return (
        <Stack screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
        }}>
            <Stack.Screen
                name="feedback/[matchId]"
                options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom',
                    animationDuration: 300,
                }}
            />
        </Stack>
    );
}