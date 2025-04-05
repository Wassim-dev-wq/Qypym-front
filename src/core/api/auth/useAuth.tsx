import React, {createContext, useContext, useEffect, useState} from 'react';
import {authApi} from '@/src/core/api/auth';
import {storage} from '@/src/core/storage/storage';
import { User } from '@/src/types/user/user';
import {userApi} from "@/src/core/hooks/useUserFetch";

interface AuthContextType {
    isLoading: boolean;
    isSignedIn: boolean;
    userId: string | null;
    user: User | null;

    signIn(token: string): Promise<void>;
    signOut(): Promise<void>;
    refreshUser(): Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({children}: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    const loadCurrentUser = async () => {
        try {
            const currentUser = await userApi.getCurrentUser();
            setUser(currentUser);
            setUserId(currentUser.keycloakUserId);
            setIsSignedIn(true);
            return currentUser;
        } catch (error) {
            await handleSignOut();
            throw error;
        }
    };

    const handleSignOut = async () => {
        await storage.removeToken();
        setUser(null);
        setUserId(null);
        setIsSignedIn(false);
    };

    useEffect(() => {
        const checkAuthState = async () => {
            try {
                const token = await storage.getToken();
                if (token) {
                    const isValid = await authApi.verifyToken();
                    if (isValid) {
                        await loadCurrentUser();
                    } else {
                        await handleSignOut();
                    }
                }
            } catch (error) {
                console.error('Auth check error:', error);
                await handleSignOut();
            } finally {
                setIsLoading(false);
            }
        };

        checkAuthState();
    }, []);

    async function signIn(token: string) {
        try {
            await storage.setToken(token);
            await loadCurrentUser();
        } catch (error) {
            await handleSignOut();
            throw error;
        }
    }

    async function signOut() {
        await handleSignOut();
    }

    async function refreshUser() {
        try {
            return await loadCurrentUser();
        } catch (error) {
            await handleSignOut();
            throw error;
        }
    }

    return (
        <AuthContext.Provider
            value={{
                isLoading,
                isSignedIn,
                userId,
                user,
                signIn,
                signOut,
                refreshUser
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used inside AuthProvider');
    }
    return ctx;
}
