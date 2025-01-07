import React from 'react';
import {ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import {COLORS} from '@/constants/Colors';
import {t} from '@/constants/locales';


interface SocialLoginButtonsProps {
    onGooglePress: () => void,
    onApplePress?: () => void,
    onFacebookPress?: () => Promise<void>
    loading?: boolean,
}

export default function SocialLoginButtons({
                                               onGooglePress,
                                               onApplePress,
                                               loading = false,
                                               onFacebookPress
                                           }: SocialLoginButtonsProps) {
    return (
        <View style={styles.socialSection}>
            <View style={styles.dividerContainer}>
                <View style={styles.divider}/>
                <Text style={styles.dividerText}>{t('orContinueWith')}</Text>
                <View style={styles.divider}/>
            </View>

            <View style={styles.socialButtonsContainer}>
                <TouchableOpacity
                    style={[styles.socialButton, styles.googleButton, loading && styles.socialButtonDisabled]}
                    onPress={onGooglePress}
                    disabled={loading}
                    accessibilityLabel="Sign in with Google"
                >
                    {loading ? (
                        <ActivityIndicator color={COLORS.primary.accent}/>
                    ) : (
                        <MaterialIcons name="google" size={24} color="#DB4437"/>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.socialButton, styles.facebookButton, loading && styles.socialButtonDisabled]}
                    onPress={onFacebookPress}
                    disabled={loading}
                    accessibilityLabel="Sign in with Facebook"
                >
                    {loading ? (
                        <ActivityIndicator color={COLORS.primary.accent}/>
                    ) : (
                        <MaterialIcons name="facebook" size={24} color="#4267B2"/>
                    )}
                </TouchableOpacity>

                {Platform.OS === 'ios' && onApplePress && (
                    <AppleAuthentication.AppleAuthenticationButton
                        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                        cornerRadius={26}
                        style={styles.appleButton}
                        onPress={onApplePress}
                        disabled={loading}
                    />
                )}
            </View>
        </View>
    );
}


const styles = StyleSheet.create({
    socialSection: {
        marginTop: 24,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
        paddingHorizontal: 16,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: `${COLORS.neutral[300]}40`,
    },
    dividerText: {
        marginHorizontal: 10,
        color: COLORS.neutral[400],
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
    },
    socialButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        marginTop: 16,
        marginBottom: 24,
    },
    socialButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.neutral[50],
    },
    googleButton: {
        borderWidth: 1,
        borderColor: `${COLORS.neutral[300]}30`,
    },
    facebookButton: {
        borderWidth: 1,
        borderColor: `${COLORS.neutral[300]}30`,
    },
    appleButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    socialButtonDisabled: {
        opacity: 0.7,
    },
});
