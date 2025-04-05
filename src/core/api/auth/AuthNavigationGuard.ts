import React, { useEffect, useState } from 'react';
import { SplashScreen, useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/src/core/api/auth/useAuth';

SplashScreen.preventAutoHideAsync().catch(console.error);

export function AuthNavigationGuard() {
    const { isLoading, isSignedIn } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const [splashTimer, setSplashTimer] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSplashTimer(false);
        }, 4000);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (isLoading || splashTimer) return;
        SplashScreen.hideAsync().catch(console.error);

        const topSegment = segments[0];

        if (!isSignedIn && topSegment === '(tabs)') {
            router.replace('/(auth)');
        }
        if (isSignedIn && topSegment === '(auth)') {
            router.replace('/(tabs)/explore');
        }
    }, [isLoading, isSignedIn, segments, router, splashTimer]);

    return null;
}