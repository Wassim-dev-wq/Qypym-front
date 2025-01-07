import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/components/hooks/useAuth';
import { Stack, Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

function RootLayoutNav() {
    const { isLoading, isSignedIn } = useAuth();

    useEffect(() => {
        if (!isLoading) {
            SplashScreen.hideAsync().catch(console.error);
        }
    }, [isLoading]);

    if (isLoading) {
        return null;
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            {isSignedIn ? (
                // Protected routes
                <Stack.Screen
                    name="home"
                    options={{
                        animation: 'fade',
                        gestureEnabled: false
                    }}
                />
            ) : (
                // Auth routes
                <Stack.Screen
                    //name="(auth)"
                    name="home"
                    options={{
                        animation: 'fade',
                        gestureEnabled: false
                    }}
                />
            )}
        </Stack>
    );
}

export default function RootLayout() {
    useEffect(() => {
        SplashScreen.preventAutoHideAsync().catch(console.error);
    }, []);

    return (
        <AuthProvider>
            <RootLayoutNav />
        </AuthProvider>
    );
}