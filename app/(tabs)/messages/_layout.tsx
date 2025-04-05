import {Stack} from 'expo-router';
import {Platform} from 'react-native';
import {COLORS} from "@/src/constants/Colors";

export default function MessagesLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                gestureEnabled: true,
                fullScreenGestureEnabled: Platform.OS === 'ios',
            }}
        >
            <Stack.Screen name="index" options={{
            }}/>
            <Stack.Screen name="[id]" options={{
            }}/>
        </Stack>
    );
}