import React, {useEffect, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    Image,
    Keyboard,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import {router} from 'expo-router';
import {useAuth} from '@/src/core/api/auth/useAuth';
import {Input} from '@/src/shared/ui/Input';
import {authApi} from '@/src/core/api/auth';
import {Formik} from 'formik';
import * as Yup from 'yup';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {t} from 'src/constants/locales';
import {COLORS, THEME_COLORS} from "@/src/constants/Colors";
import {getErrorMessage, logErrorDetails} from "@/src/utils/apiErrors";

const LoginSchema = Yup.object().shape({
    email: Yup.string()
        .email(t('emailInvalid'))
        .required(t('emailRequired')),
    password: Yup.string()
        .min(6, t('passwordMin'))
        .required(t('passwordRequired')),
});

export const ErrorText = React.memo(({error}: { error: string | undefined }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-10)).current;

    useEffect(() => {
        if (error) {
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
        } else {
            fadeAnim.setValue(0);
            slideAnim.setValue(-10);
        }
    }, [error]);

    if (!error) return null;

    return (
        <Animated.View
            style={[
                styles.errorContainer,
                {
                    opacity: fadeAnim,
                    transform: [{translateX: slideAnim}],
                },
            ]}
        >
            <MaterialCommunityIcons name="alert-circle" size={16} color={THEME_COLORS.error}/>
            <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
    );
});

export default function LoginScreen() {
    const {signIn} = useAuth();
    const [socialLoading, setSocialLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const formPositionY = useRef(new Animated.Value(0)).current;
    const socialSectionAnim = useRef(new Animated.Value(1)).current;
    const logoAnim = useRef(new Animated.Value(1)).current;
    const headerPositionY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        authApi.handleLogout();
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
                        toValue: -event.endCoordinates.height * 0.3,
                        duration: Platform.OS === 'ios' ? event.duration : 200,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease),
                    }),
                    Animated.timing(socialSectionAnim, {
                        toValue: 0,
                        duration: Platform.OS === 'ios' ? event.duration : 200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(logoAnim, {
                        toValue: 0.7,
                        duration: Platform.OS === 'ios' ? event.duration : 200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(headerPositionY, {
                        toValue: -20,
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
                    Animated.timing(logoAnim, {
                        toValue: 1,
                        duration: Platform.OS === 'ios' ? event.duration : 200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(headerPositionY, {
                        toValue: 0,
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
        setLoginError('');
        try {
            const authResponse = await authApi.login(values.email, values.password);
            await signIn(authResponse.data.accessToken);
        } catch (error: any) {
            logErrorDetails(error);
            const errorMessage = getErrorMessage(error);
            setLoginError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleForgotPassword = () => {
        router.push('/(auth)/ForgotPasswordScreen');
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
                            <Animated.View
                                style={[
                                    styles.header,
                                    {
                                        opacity: logoAnim,
                                        transform: [{translateY: headerPositionY}]
                                    }
                                ]}
                            >
                                <Image
                                    source={require('@/assets/images/QypymLogo.png')}
                                    style={styles.logoCircle}
                                />
                                <Text style={styles.title}>{t('AppName')}</Text>
                                <Text style={styles.subtitle}>{t('signInToContinue')}</Text>
                            </Animated.View>

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

                                        <View style={styles.inputContainer}>
                                            <View style={styles.inputIconContainer}>
                                                <MaterialCommunityIcons
                                                    name="lock-outline"
                                                    size={22}
                                                    color={COLORS.primary.accent}
                                                />
                                            </View>
                                            <Input
                                                placeholder={t('passwordPlaceholder')}
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

                                        <TouchableOpacity
                                            style={styles.forgotPasswordContainer}
                                            onPress={handleForgotPassword}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.forgotPasswordText}>
                                                {t('forgotPassword')}
                                            </Text>
                                        </TouchableOpacity>

                                        <ErrorText error={loginError}/>

                                        <TouchableOpacity
                                            style={styles.loginButtonContainer}
                                            onPress={() => handleSubmit()}
                                            disabled={isSubmitting}
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient
                                                colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                                                start={{x: 0, y: 0}}
                                                end={{x: 1, y: 1}}
                                                style={styles.loginButton}
                                            >
                                                {isSubmitting ? (
                                                    <ActivityIndicator color="#000" size="small"/>
                                                ) : (
                                                    <Text style={styles.loginButtonText}>
                                                        {t('signIn')}
                                                    </Text>
                                                )}
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </Formik>

                            <Animated.View style={{opacity: socialSectionAnim}}>
                                <View style={styles.separator}>
                                    <View style={styles.separatorLine}/>
                                    <View style={styles.separatorLine}/>
                                </View>


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
    logoCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    logoText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000',
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
    forgotPasswordContainer: {
        alignSelf: 'flex-end',
        marginTop: 4,
        marginBottom: 16,
    },
    forgotPasswordText: {
        color: COLORS.primary.accent,
        fontSize: 14,
        fontWeight: '500',
    },
    loginButtonContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: COLORS.primary.accent,
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
        marginTop: 8,
    },
    loginButton: {
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    loginButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    separator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    separatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255, 184, 0, 0.1)',
    },
    separatorText: {
        color: THEME_COLORS.textSecondary,
        paddingHorizontal: 16,
        fontSize: 14,
    },
    footer: {
        alignItems: 'center',
        marginTop: 24,
    },
    linkText: {
        fontSize: 15,
        color: THEME_COLORS.textSecondary,
    },
    linkTextBold: {
        color: COLORS.primary.accent,
        fontWeight: 'bold',
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
});