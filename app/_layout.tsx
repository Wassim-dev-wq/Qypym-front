import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/src/core/api/auth/useAuth';
import { MenuProvider } from 'react-native-popup-menu';
import { BottomSheetProvider } from '@/src/features/matches/components/bottomSheetContext';
import { AuthNavigationGuard } from "@/src/core/api/auth/AuthNavigationGuard";
import { LoadingScreen } from "@/src/core/api/auth/LoadingScreen";
import { Linking } from 'react-native';
import { router } from 'expo-router';

const client = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isLoading } = useAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    return <>{children}</>;
}

export default function RootLayout() {
    useEffect(() => {
        const handleDeepLink = ({ url }) => {
            if (!url) return;
            const parsedUrl = new URL(url);
            const path = parsedUrl.pathname;
            if (path.startsWith('/matches/')) {
                const matchId = path.split('/matches/')[1];
                router.push({
                    pathname: '/(modals)/[matchId]',
                    params: {matchId}
                });
            }
            if (path.startsWith('/profiles/')) {
                const userId = path.split('/profiles/')[1];
                router.push({
                    pathname: '/(modals)/profile/[userId]',
                    params: {userId}
                });
            }
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);

        Linking.getInitialURL().then(url => {
            if (url) {
                handleDeepLink({ url });
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    return (
        <QueryClientProvider client={client}>
            <AuthProvider>
                <AuthNavigationGuard />
                <AuthGuard>
                    <BottomSheetProvider>
                        <MenuProvider>
                            <Stack screenOptions={{ headerShown: false }} />
                        </MenuProvider>
                    </BottomSheetProvider>
                </AuthGuard>
            </AuthProvider>
        </QueryClientProvider>
    );
}