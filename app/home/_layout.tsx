import { Stack } from 'expo-router';

export default function HomeLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainHomeScreen" />
            <Stack.Screen
                name="MatchDetailsScreen"
                options={{
                    presentation: 'card',
                    animation: 'slide_from_right',
                    gestureEnabled: true,
                    gestureDirection: 'horizontal',
                }}
            />
        </Stack>
    );
}
