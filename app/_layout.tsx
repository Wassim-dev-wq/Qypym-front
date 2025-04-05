import {useEffect, useState} from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
                <Stack.Screen
                    name="home"
                    options={{
                        animation: 'fade',
                        gestureEnabled: false
                    }}
                />
            ) : (
                <Stack.Screen
                    name="(auth)"
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
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 0.1 * 60 * 1000,
                gcTime: 30 * 60 * 1000,
                retry: 2,
                refetchOnWindowFocus: false,
            },
        },
    }));

    useEffect(() => {
        SplashScreen.preventAutoHideAsync().catch(console.error);
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <RootLayoutNav />
            </AuthProvider>
        </QueryClientProvider>
    );
}
