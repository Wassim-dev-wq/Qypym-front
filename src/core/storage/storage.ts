import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
    async getToken() {
        try {
            return await SecureStore.getItemAsync('userToken');
        } catch (error) {
            console.warn('Error reading token:', error);
            return null;
        }
    },

    async setUserId(userId: string): Promise<void> {
        await AsyncStorage.setItem('userId', userId);
    },

    async getUserId(): Promise<string | null> {
        return await AsyncStorage.getItem('userId');
    },

    async removeUserId() {
        try {
            await AsyncStorage.removeItem('userId');
            return true;
        } catch (error) {
            console.warn('Error removing userId:', error);
            return false;
        }
    },

    async getTempToken() {
        try {
            return await SecureStore.getItemAsync('tempToken');
        } catch (error) {
            console.warn('Error reading token:', error);
            return null;
        }
    },

    async setTempToken(token: string) {
        try {
            await SecureStore.setItemAsync('tempToken', token);
            return true;
        } catch (error) {
            console.warn('Error saving token:', error);
            return false;
        }
    },

    async setToken(token: string) {
        try {
            await SecureStore.setItemAsync('userToken', token);
            return true;
        } catch (error) {
            console.warn('Error saving token:', error);
            return false;
        }
    },

    async setTokenExpiry(token: number) {
        try {
            await SecureStore.setItemAsync('expiresIn', String(token));
            return true;
        } catch (error) {
            console.warn('Error saving token:', error);
            return false;
        }
    },

    async setRefreshToken(token: string) {
        try {
            await SecureStore.setItemAsync('refreshToken', token);
            return true;
        } catch (error) {
            console.warn('Error saving token:', error);
            return false;
        }
    },

    async getRefreshToken() {
        try {
            return await SecureStore.getItemAsync('refreshToken');
        } catch (error) {
            console.warn('Error reading token:', error);
            return null;
        }
    },

    async removeToken() {
        try {
            await SecureStore.deleteItemAsync('userToken');
            return true;
        } catch (error) {
            console.warn('Error removing token:', error);
            return false;
        }
    },

    async removeRefreshToken() {
        try {
            await SecureStore.deleteItemAsync('refreshToken');
            return true;
        } catch (error) {
            console.warn('Error removing token:', error);
            return false;
        }
    },

    async removeTokenExpiry() {
        try {
            await SecureStore.deleteItemAsync('expiresIn');
            return true;
        } catch (error) {
            console.warn('Error removing token:', error);
            return false;
        }
    },


};