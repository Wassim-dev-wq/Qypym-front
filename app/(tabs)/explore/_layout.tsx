import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function ExploreLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                gestureEnabled: true,
                fullScreenGestureEnabled: Platform.OS === 'ios',

            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    animation: 'none'
                }}
            />
        </Stack>
    );
}