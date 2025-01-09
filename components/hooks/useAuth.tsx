import { createContext, useContext, useState, useEffect } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { storage } from '@/app/utils/storage';
import { authApi } from '@/components/api/auth';
import * as SplashScreen from 'expo-splash-screen';


interface AuthContextType {
    signIn: (token: string, userData?: any) => Promise<void>;
    signOut: () => Promise<void>;
    isLoading: boolean;
    isSignedIn: boolean;
    userData: any;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        initializeAuth();
        setupAppStateHandler();
    }, []);

    useEffect(() => {
        if (!isLoading) {
            const route = isSignedIn ? '/home/MainHomeScreen' : '/home/MainHomeScreen';
            router.replace(route);
        }
    }, [isSignedIn, isLoading]);

    const initializeAuth = async () => {
        try {
            const token = await storage.getToken();
            if (token) {
                try {
                    await authApi.verifyToken();
                    setIsSignedIn(true);
                } catch (error) {
                    await storage.removeToken();
                    setIsSignedIn(false);
                }
            }
        } catch (error) {
            console.warn('Auth initialization error:', error);
        } finally {
            setIsLoading(false);
            await SplashScreen.hideAsync();
        }
    };

    const setupAppStateHandler = () => {
        const subscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState === 'active') {
                const token = await storage.getToken();
                if (token) {
                    try {
                        await authApi.verifyToken();
                    } catch (error) {
                        await signOut();
                    }
                }
            }
        });

        return () => {
            subscription.remove();
        };
    };

    const signIn = async (token: string, newUserData?: any) => {
        try {
            await storage.setToken(token);
            if (newUserData) {
                await storage.setUserData(newUserData);
                setUserData(newUserData);
            }
            setIsSignedIn(true);
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            console.log('Signing out');
            await Promise.all([
                storage.removeToken(),
                storage.setUserData(null)
            ]);
            setIsSignedIn(false);
            setUserData(null);
            console.log('Signed out');
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ signIn, signOut, isLoading, isSignedIn, userData }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
