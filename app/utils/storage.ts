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

    async removeToken() {
        try {
            await SecureStore.deleteItemAsync('userToken');
            return true;
        } catch (error) {
            console.warn('Error removing token:', error);
            return false;
        }
    },

    async setUserData(data: any) {
        try {
            await AsyncStorage.setItem('userData', JSON.stringify(data));
            return true;
        } catch (error) {
            console.warn('Error saving user data:', error);
            return false;
        }
    },

    async getUserData() {
        try {
            const data = await AsyncStorage.getItem('userData');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('Error reading user data:', error);
            return null;
        }
    }
};