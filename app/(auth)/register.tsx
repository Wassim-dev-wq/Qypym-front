import React, {useEffect, useRef, useState} from 'react';
import {
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
import {StatusBar} from 'expo-status-bar';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';

import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {t} from 'src/constants/locales';
import {useAuth} from '@/src/core/api/auth/useAuth';
import {authApi} from '@/src/core/api/auth';
import {ProgressBar} from "@/app/(auth)/components/ProgressBar";
import {RegisterFormValues, RegisterStep} from "@/app/(auth)/components/RegisterStep";
import {VerificationStep} from "@/app/(auth)/components/VerificationStep";
import {getErrorMessage, logErrorDetails} from "@/src/utils/apiErrors";

const {width} = Dimensions.get('window');

export default function RegisterScreen() {
    const {signIn} = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 2;
    const [registrationError, setRegistrationError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [email, setEmail] = useState('');
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const translateXAnim = useRef(new Animated.Value(0)).current;
    const formPositionY = useRef(new Animated.Value(0)).current;

    const [formData, setFormData] = useState<RegisterFormValues>({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
    });

    useEffect(() => {
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

    const animateToNextStep = (values: Partial<RegisterFormValues>, nextStep: number) => {

        setFormData({...formData, ...values});

        const slideDirection = nextStep > currentStep ? width : -width;

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
            Animated.timing(translateXAnim, {
                toValue: -slideDirection * 0.1,
                duration: 150,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
        ]).start(() => {

            setCurrentStep(nextStep);

            translateXAnim.setValue(slideDirection * 0.2);

            Keyboard.dismiss();

            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.ease),
                }),
                Animated.timing(translateXAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.ease),
                }),
            ]).start();
        });
    };

    const goToNextStep = async (values: RegisterFormValues | { verificationCode: string }): Promise<boolean> => {
        if (currentStep === 1) {
            const registerValues = values as RegisterFormValues;
            const combinedValues = {...formData, ...registerValues};
            const success = await handleRegister(combinedValues);
            if (success) {
                setEmail(combinedValues.email);
                animateToNextStep(registerValues, currentStep + 1);
            }
            return success;
        } else if (currentStep === 2) {
            const verificationValues = values as { verificationCode: string };
            return await handleVerifyEmail(verificationValues.verificationCode);
        }
        return false;
    };

    const goToPreviousStep = () => {
        if (currentStep > 1) {
            animateToNextStep({}, currentStep - 1);
        }
    };

    const handleRegister = async (userData: RegisterFormValues): Promise<boolean> => {
        setRegistrationError('');
        setIsProcessing(true);

        try {
            await authApi.register({
                email: userData.email,
                password: userData.password,
                firstName: userData.firstName,
                lastName: userData.lastName
            });
            return true;
        } catch (error) {
            logErrorDetails(error);
            const errorMessage = getErrorMessage(error);
            setRegistrationError(errorMessage);
            return false;
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVerifyEmail = async (verificationCode: string): Promise<boolean> => {
        setRegistrationError('');
        setIsProcessing(true);
        try {
            await authApi.verifyEmail(verificationCode);
            const loginResult = await authApi.login(
                formData.email,
                formData.password
            );

            if (loginResult) {
                return true;
            }
            return false;
        } catch (error) {
            logErrorDetails(error);
            const errorMessage = getErrorMessage(error);
            setRegistrationError(errorMessage);
            return false;
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVerificationSuccess = () => {
        router.replace('/(auth)/ProfileCompletionScreen');
    };

    const renderStepIndicators = () => {
        return (
            <View style={styles.stepIndicators}>
                {[1, 2].map(step => (
                    <TouchableOpacity
                        key={step}
                        style={[
                            styles.stepDot,
                            currentStep === step ? styles.stepDotActive : null,
                            step < currentStep ? styles.stepDotCompleted : null
                        ]}
                        onPress={() => step < currentStep && animateToNextStep({}, step)}
                    />
                ))}
            </View>
        );
    };
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <RegisterStep
                        initialValues={{
                            email: formData.email,
                            password: formData.password,
                            confirmPassword: formData.confirmPassword,
                            firstName: formData.firstName,
                            lastName: formData.lastName,
                        }}
                        onSubmit={goToNextStep}
                        isProcessing={isProcessing}
                        error={registrationError}
                    />
                );
            case 2:
                return (
                    <VerificationStep
                        email={email}
                        onSubmit={goToNextStep}
                        onBack={goToPreviousStep}
                        isProcessing={isProcessing}
                        error={registrationError}
                        onVerificationSuccess={handleVerificationSuccess}
                    />
                );
            default:
                return null;
        }
    };
    const getStepTitle = () => {
        switch (currentStep) {
            case 1:
                return t('createAccount');
            case 2:
                return t('verifyEmail');
            default:
                return '';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light"/>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <LinearGradient
                    colors={['rgba(15, 15, 15, 0.98)', 'rgba(25, 25, 25, 0.95)']}
                    style={styles.gradient}
                >
                    <Animated.View
                        style={[
                            styles.content,
                            {
                                transform: [
                                    {translateY: formPositionY},
                                ],
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={['rgba(30,30,30,0.9)', 'rgba(22,22,22,0.85)']}
                            style={styles.cardGradient}
                        >
                            <View style={styles.header}>
                                <ProgressBar currentStep={currentStep} totalSteps={totalSteps}/>

                                <View style={styles.titleContainer}>
                                    <Text style={styles.title}>{getStepTitle()}</Text>
                                    {renderStepIndicators()}
                                </View>
                            </View>
                            <Animated.View
                                style={[
                                    styles.formContainer,
                                    {
                                        opacity: fadeAnim,
                                        transform: [{translateX: translateXAnim}]
                                    }
                                ]}
                            >
                                {renderStepContent()}
                            </Animated.View>
                            <View style={styles.footer}>
                                <Text style={styles.linkText}>
                                    {t('alreadyHaveAccount')}{' '}
                                    <Text
                                        style={styles.linkTextBold}
                                        onPress={() => router.push('/(auth)/login')}
                                    >
                                        {t('signIn')}
                                    </Text>
                                </Text>
                            </View>
                        </LinearGradient>
                    </Animated.View>
                </LinearGradient>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    );
}

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
        width: width * 0.92,
        maxWidth: 400,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    cardGradient: {
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.12)',
    },
    header: {
        marginBottom: 10,
    },
    titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
    },
    stepIndicators: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(70, 70, 70, 0.7)',
        marginLeft: 6,
    },
    stepDotActive: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.primary.accent,
    },
    stepDotCompleted: {
        backgroundColor: 'rgba(255, 184, 0, 0.5)',
    },
    formContainer: {
        marginVertical: 10,
    },
    footer: {
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 184, 0, 0.08)',
    },
    linkText: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
    },
    linkTextBold: {
        color: COLORS.primary.accent,
        fontWeight: 'bold',
    },
});