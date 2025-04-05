import React from 'react';
import { Stack } from 'expo-router';
import ForgotPasswordScreen from "@/app/(auth)/ForgotPasswordScreen";

export default function AuthLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="ForgotPasswordScreen" />
        </Stack>
    );
}
