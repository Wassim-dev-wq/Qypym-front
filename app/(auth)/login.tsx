import React, {memo, useEffect, useRef, useState} from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Easing,
    Keyboard,
    Platform,
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import {router} from 'expo-router';
import {useAuth} from '@/components/hooks/useAuth';
import {Input} from '@/components/shared/Input';
import {Button} from '@/components/shared/Button';
import {authApi} from '@/components/api/auth';
import {Formik} from 'formik';
import * as Yup from 'yup';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {BlurView} from 'expo-blur';
import {t} from '@/constants/locales';
import SocialLoginButtons from './components/SocialLoginButtons';
import {COLORS} from "@/constants/Colors";

const LoginSchema = Yup.object().shape({
    email: Yup.string()
        .email(t('emailInvalid'))
        .required(t('emailRequired')),
    password: Yup.string()
        .min(6, t('passwordMin'))
        .required(t('passwordRequired')),
});
memo(({error}: { error: string }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-10)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    }, [error]);

    return (
        <Animated.Text style={[
            styles.errorText,
            {
                opacity: fadeAnim,
                transform: [{translateX: slideAnim}],
            },
        ]}>
            {error}
        </Animated.Text>
    );
});

export default function LoginScreen() {
    const {signIn} = useAuth();
    const [socialLoading, setSocialLoading] = useState(false);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const formPositionY = useRef(new Animated.Value(0)).current;
    const socialSectionAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Initial animation
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
                Animated.parallel([
                    Animated.timing(formPositionY, {
                        toValue: -event.endCoordinates.height * 0.5,
                        duration: Platform.OS === 'ios' ? event.duration : 200,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease),
                    }),
                    Animated.timing(socialSectionAnim, {
                        toValue: 0,
                        duration: Platform.OS === 'ios' ? event.duration : 200,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        );

        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            (event) => {
                Animated.parallel([
                    Animated.timing(formPositionY, {
                        toValue: 0,
                        duration: Platform.OS === 'ios' ? event.duration : 200,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease),
                    }),
                    Animated.timing(socialSectionAnim, {
                        toValue: 1,
                        duration: Platform.OS === 'ios' ? event.duration : 200,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    const handleLogin = async (values: { email: string; password: string }, {setSubmitting}: any) => {
        try {
            const authResponse = await authApi.login(values.email, values.password);
            await signIn(authResponse.accessToken);
        } catch (error: any) {
            Alert.alert(t('loginFailed'), error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
        setSocialLoading(true);
        try {
            // Implement social login logic here
            console.log(`${provider} login clicked`);
        } finally {
            setSocialLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light"/>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <LinearGradient
                    colors={[
                        COLORS.primary.dark,
                        COLORS.primary.main,
                        `${COLORS.primary.light}90`,
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
                        <BlurView intensity={15} tint="dark" style={styles.blurContainer}>
                            <View style={styles.header}>
                                <Text style={styles.title}>{t('AppName')}</Text>
                                <Text style={styles.subtitle}>{t('signInToContinue')}</Text>
                            </View>

                            <Formik
                                initialValues={{email: '', password: ''}}
                                validationSchema={LoginSchema}
                                onSubmit={handleLogin}
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
                                        <Input
                                            placeholder={t('emailPlaceholder')}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            onChangeText={handleChange('email')}
                                            onBlur={handleBlur('email')}
                                            value={values.email}
                                            error={touched.email && errors.email}
                                            icon="email"
                                            style={styles.input}
                                        />

                                        <Input
                                            placeholder={t('passwordPlaceholder')}
                                            secureTextEntry
                                            onChangeText={handleChange('password')}
                                            onBlur={handleBlur('password')}
                                            value={values.password}
                                            error={touched.password && errors.password}
                                            icon="lock"
                                            secureTextEntryToggle
                                            style={styles.input}
                                        />

                                        <Button
                                            title={isSubmitting ? t('signingIn') : t('signIn')}
                                            onPress={handleSubmit}
                                            disabled={isSubmitting}
                                            loading={isSubmitting}
                                            style={styles.loginButton}
                                            textStyle={styles.loginButtonText}
                                        />
                                    </View>
                                )}
                            </Formik>

                            <Animated.View style={{opacity: socialSectionAnim}}>
                                <SocialLoginButtons
                                    onGooglePress={() => handleSocialLogin('google')}
                                    onFacebookPress={() => handleSocialLogin('facebook')}
                                    onApplePress={() => handleSocialLogin('apple')}
                                    loading={socialLoading}
                                />

                                <View style={styles.footer}>
                                    <Text style={styles.linkText}>
                                        {t('dontHaveAccount')}{' '}
                                        <Text
                                            style={styles.linkTextBold}
                                            onPress={() => router.push('/(auth)/register')}
                                        >
                                            {t('signUp')}
                                        </Text>
                                    </Text>
                                </View>
                            </Animated.View>
                        </BlurView>
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
        backgroundColor: COLORS.primary.dark,
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
    },
    blurContainer: {
        padding: 24,
        backgroundColor: Platform.select({
            ios: 'rgba(42, 47, 56, 0.8)',
            android: 'rgba(42, 47, 56, 0.9)',
        }),
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 36,
        fontFamily: 'Inter_Bold',
        color: COLORS.neutral[50],
        textShadowColor: COLORS.primary.accent,
        textShadowOffset: {width: 0, height: 0},
        textShadowRadius: 20,
        letterSpacing: 2,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Inter_Regular',
        color: COLORS.neutral[300],
        marginTop: 8,
        opacity: 0.9,
    },
    form: {
        marginBottom: 24,
    },
    input: {
        flex: 1,
        color: COLORS.neutral[50],
        fontSize: 16,
        fontFamily: 'Inter_Regular',
        height: '100%',
        paddingVertical: 8,
        marginBottom: 50,
        backgroundColor: 'transparent',
    },
    loginButton: {
        height: 56,
        backgroundColor: COLORS.primary.accent,
        borderRadius: 16,
        marginTop: 24,
        shadowColor: COLORS.primary.accent,
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    loginButtonText: {
        fontSize: 18,
        fontFamily: 'Inter_SemiBold',
        color: COLORS.primary.dark,
    },
    footer: {
        alignItems: 'center',
        marginTop: 24,
    },
    linkText: {
        fontSize: 15,
        fontFamily: 'Inter_Regular',
        color: COLORS.neutral[300],
    },
    linkTextBold: {
        color: COLORS.primary.accent,
        fontFamily: 'Inter_Bold',
    },
    errorText: {
        color: COLORS.secondary.error,
        fontSize: 12,
        fontFamily: 'Inter_Regular',
        marginTop: 4,
        marginLeft: 12,
    },
});