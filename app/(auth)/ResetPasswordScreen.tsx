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
import {router, useLocalSearchParams} from 'expo-router';
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

const ResetPasswordSchema = Yup.object().shape({
    password: Yup.string()
        .min(6, t('passwordMin'))
        .required(t('passwordRequired')),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], t('passwordsMustMatch'))
        .required(t('confirmPasswordRequired')),
});

export default function ResetPasswordScreen() {
    const params = useLocalSearchParams();
    const userId = params.userId as string;

    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

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

    const handleResetPassword = async (values: { password: string }, {setSubmitting}: any) => {
        setError('');
        setSuccess(false);

        try {
            await authApi.resetPassword(userId, values.password);
            setSuccess(true);

            setTimeout(() => {
                router.replace('/(auth)/login');
            }, 2000);
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
                                    name="form-textbox-password"
                                    size={50}
                                    color={COLORS.primary.accent}
                                    style={styles.icon}
                                />
                                <Text style={styles.title}>{t('createNewPassword')}</Text>
                                <Text style={styles.subtitle}>
                                    {t('chooseNewPasswordInfo')}
                                </Text>
                            </View>

                            <Formik
                                initialValues={{password: '', confirmPassword: ''}}
                                validationSchema={ResetPasswordSchema}
                                onSubmit={handleResetPassword}
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
                                                    name="lock-outline"
                                                    size={22}
                                                    color={COLORS.primary.accent}
                                                />
                                            </View>
                                            <Input
                                                placeholder={t('newPasswordPlaceholder')}
                                                secureTextEntry
                                                onChangeText={handleChange('password')}
                                                onBlur={handleBlur('password')}
                                                value={values.password}
                                                error={touched.password ? errors.password : ''}
                                                style={styles.input}
                                                placeholderTextColor={THEME_COLORS.textPlaceholder}
                                                secureTextEntryToggle
                                            />
                                        </View>
                                        <ErrorText error={touched.password ? errors.password : ''}/>

                                        <View style={styles.inputContainer}>
                                            <View style={styles.inputIconContainer}>
                                                <MaterialCommunityIcons
                                                    name="lock-check-outline"
                                                    size={22}
                                                    color={COLORS.primary.accent}
                                                />
                                            </View>
                                            <Input
                                                placeholder={t('confirmPasswordPlaceholder')}
                                                secureTextEntry
                                                onChangeText={handleChange('confirmPassword')}
                                                onBlur={handleBlur('confirmPassword')}
                                                value={values.confirmPassword}
                                                error={touched.confirmPassword ? errors.confirmPassword : ''}
                                                style={styles.input}
                                                placeholderTextColor={THEME_COLORS.textPlaceholder}
                                                secureTextEntryToggle
                                            />
                                        </View>
                                        <ErrorText error={touched.confirmPassword ? errors.confirmPassword : ''}/>

                                        {error ? <ErrorText error={error}/> : null}

                                        {success && (
                                            <View style={styles.successContainer}>
                                                <MaterialCommunityIcons
                                                    name="check-circle"
                                                    size={20}
                                                    color={THEME_COLORS.success}
                                                />
                                                <Text style={styles.successText}>
                                                    {t('passwordResetSuccessful')}
                                                </Text>
                                            </View>
                                        )}

                                        <TouchableOpacity
                                            style={styles.submitButtonContainer}
                                            onPress={() => handleSubmit()}
                                            disabled={isSubmitting || success}
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
                                                        {t('resetPassword')}
                                                    </Text>
                                                )}
                                            </LinearGradient>
                                        </TouchableOpacity>

                                        {!success && (
                                            <TouchableOpacity
                                                style={styles.backButton}
                                                onPress={() => router.back()}
                                            >
                                                <Text style={styles.backButtonText}>
                                                    {t('goBack')}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
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
        marginTop: 8,
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
    backButton: {
        alignItems: 'center',
        marginTop: 16,
        padding: 8,
    },
    backButtonText: {
        color: THEME_COLORS.textSecondary,
        fontSize: 14,
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
        marginLeft: 6,
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