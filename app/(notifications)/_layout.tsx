import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function ProfileLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                    gestureEnabled: true,
                    gestureDirection: 'vertical',
                    fullScreenGestureEnabled: true,
                    contentStyle: { backgroundColor: 'transparent' },
                }}
            />
        </Stack>
    );
}