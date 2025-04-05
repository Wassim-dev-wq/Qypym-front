import React, {useEffect, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    Keyboard,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import {router} from 'expo-router';
import {Formik} from 'formik';
import * as Yup from 'yup';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';

import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {t} from 'src/constants/locales';
import {Input} from '@/src/shared/ui/Input';
import {authApi} from '@/src/core/api/auth';
import {getErrorMessage, logErrorDetails} from '@/src/utils/apiErrors';
import {ErrorText} from "@/app/(auth)/login";

const EmailSchema = Yup.object().shape({
    email: Yup.string()
        .email(t('emailInvalid'))
        .required(t('emailRequired')),
});


export default function ForgotPasswordScreen() {
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [userId, setUserId] = useState('');

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const formPositionY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
                easing: Easing.out(Easing.quad),
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (event) => {
                Animated.timing(formPositionY, {
                    toValue: -event.endCoordinates.height * 0.3,
                    duration: Platform.OS === 'ios' ? event.duration : 200,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.ease),
                }).start();
            }
        );

        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            (event) => {
                Animated.timing(formPositionY, {
                    toValue: 0,
                    duration: Platform.OS === 'ios' ? event.duration : 200,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.ease),
                }).start();
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    const handleForgotPassword = async (values: { email: string }, {setSubmitting}: any) => {
        setError('');
        setSuccess(false);

        try {
            const response = await authApi.forgotPassword(values.email);
            setUserId(response.data.userId);
            setSuccess(true);
            setTimeout(() => {
                router.push({
                    pathname: '/(auth)/VerifyResetScreen',
                    params: {
                        email: values.email,
                        userId: response.data.userId
                    }
                });
            }, 1500);
        } catch (error: any) {
            logErrorDetails(error);
            const errorMessage = getErrorMessage(error);
            setError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light"/>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <LinearGradient
                    colors={[
                        'rgba(10, 10, 10, 0.98)',
                        'rgba(17, 17, 17, 0.95)',
                        'rgba(26, 26, 26, 0.9)',
                    ]}
                    style={styles.gradient}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                >
                    <Animated.View
                        style={[
                            styles.content,
                            {
                                opacity: fadeAnim,
                                transform: [
                                    {scale: scaleAnim},
                                    {translateY: formPositionY},
                                ],
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={['rgba(26,26,26,0.9)', 'rgba(17,17,17,0.8)']}
                            style={styles.cardGradient}
                        >
                            <View style={styles.header}>
                                <MaterialCommunityIcons
                                    name="lock-reset"
                                    size={50}
                                    color={COLORS.primary.accent}
                                    style={styles.icon}
                                />
                                <Text style={styles.title}>{t('resetPassword')}</Text>
                                <Text style={styles.subtitle}>
                                    {t('enterEmailForPasswordReset')}
                                </Text>
                            </View>

                            <Formik
                                initialValues={{email: ''}}
                                validationSchema={EmailSchema}
                                onSubmit={handleForgotPassword}
                            >
                                {({
                                      handleChange,
                                      handleBlur,
                                      handleSubmit,
                                      values,
                                      errors,
                                      touched,
                                      isSubmitting,
                                  }) => (
                                    <View style={styles.form}>
                                        <View style={styles.inputContainer}>
                                            <View style={styles.inputIconContainer}>
                                                <MaterialCommunityIcons
                                                    name="email-outline"
                                                    size={22}
                                                    color={COLORS.primary.accent}
                                                />
                                            </View>
                                            <Input
                                                placeholder={t('emailPlaceholder')}
                                                autoCapitalize="none"
                                                keyboardType="email-address"
                                                onChangeText={handleChange('email')}
                                                onBlur={handleBlur('email')}
                                                value={values.email}
                                                error={touched.email ? errors.email : ''}
                                                style={styles.input}
                                                placeholderTextColor={THEME_COLORS.textPlaceholder}
                                            />
                                        </View>
                                        <ErrorText error={touched.email ? errors.email : ''}/>

                                        {error ? <ErrorText error={error}/> : null}

                                        {success && (
                                            <View style={styles.successContainer}>
                                                <MaterialCommunityIcons
                                                    name="check-circle"
                                                    size={20}
                                                    color={THEME_COLORS.success}
                                                />
                                                <Text style={styles.successText}>
                                                    {t('resetEmailSent')}
                                                </Text>
                                            </View>
                                        )}

                                        <TouchableOpacity
                                            style={styles.submitButtonContainer}
                                            onPress={() => handleSubmit()}
                                            disabled={isSubmitting}
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient
                                                colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                                                start={{x: 0, y: 0}}
                                                end={{x: 1, y: 1}}
                                                style={styles.submitButton}
                                            >
                                                {isSubmitting ? (
                                                    <ActivityIndicator color="#000" size="small"/>
                                                ) : (
                                                    <Text style={styles.submitButtonText}>
                                                        {t('sendResetCode')}
                                                    </Text>
                                                )}
                                            </LinearGradient>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.backToLoginButton}
                                            onPress={() => router.push('/(auth)/login')}
                                        >
                                            <Text style={styles.backToLoginText}>
                                                {t('backToLogin')}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </Formik>
                        </LinearGradient>
                    </Animated.View>
                </LinearGradient>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    );
}

const {width} = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME_COLORS.background,
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    content: {
        width: width * 0.9,
        maxWidth: 400,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    cardGradient: {
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    icon: {
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
        textShadowColor: 'rgba(255, 184, 0, 0.3)',
        textShadowOffset: {width: 0, height: 0},
        textShadowRadius: 10,
    },
    subtitle: {
        fontSize: 16,
        color: THEME_COLORS.textSecondary,
        marginTop: 8,
        textAlign: 'center',
    },
    form: {
        marginBottom: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(26,26,26,0.5)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
        marginBottom: 8,
        overflow: 'hidden',
    },
    inputIconContainer: {
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        color: THEME_COLORS.textPrimary,
        fontSize: 16,
        height: 50,
        paddingVertical: 8,
        paddingHorizontal: 8,
        backgroundColor: 'transparent',
    },
    submitButtonContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: COLORS.primary.accent,
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
        marginTop: 16,
    },
    submitButton: {
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    submitButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    backToLoginButton: {
        alignItems: 'center',
        marginTop: 16,
        padding: 8,
    },
    backToLoginText: {
        color: COLORS.primary.accent,
        fontSize: 16,
        fontWeight: '500',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    errorText: {
        color: THEME_COLORS.error,
        fontSize: 14,
        marginLeft: 8,
    },
    successContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(39, 174, 96, 0.1)',
        borderRadius: 8,
        padding: 12,
        marginVertical: 12,
    },
    successText: {
        color: THEME_COLORS.success || '#27ae60',
        fontSize: 14,
        marginLeft: 8,
    },
});