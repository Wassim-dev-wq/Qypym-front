import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View,} from 'react-native';
import {Formik} from 'formik';
import * as Yup from 'yup';
import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {t} from 'src/constants/locales';

const VerificationSchema = Yup.object().shape({
    verificationCode: Yup.string()
        .min(6, t('invalidVerificationCode'))
        .max(6, t('invalidVerificationCode'))
        .matches(/^[0-9]+$/, t('codeOnlyNumbers'))
        .required(t('verificationCodeRequired')),
});

interface VerificationStepProps {
    email: string;
    onSubmit: (values: { verificationCode: string }) => Promise<boolean>;
    onBack: () => void;
    isProcessing: boolean;
    error: string;
    onVerificationSuccess: () => void;
}

export function VerificationStep({email, onSubmit, onBack, isProcessing, error, onVerificationSuccess}: VerificationStepProps) {
    const [remainingTime, setRemainingTime] = useState(180);
    const [isResending, setIsResending] = useState(false);
    const [verificationComplete, setVerificationComplete] = useState(false);

    useEffect(() => {
        if (remainingTime <= 0) return;

        const timer = setTimeout(() => {
            setRemainingTime(prev => prev - 1);
        }, 2000);

        return () => clearTimeout(timer);
    }, [remainingTime]);

    const handleResendCode = async () => {
        if (remainingTime > 0 || isResending) return;
        setIsResending(true);
        try {
            setRemainingTime(180);
            Alert.alert(
                t('codeSent'),
                t('verificationCodeResent')
            );
        } catch (error) {
            Alert.alert(
                t('error'),
                t('resendCodeFailed')
            );
        } finally {
            setIsResending(false);
        }
    };

    const handleSubmitVerification = async (values:{ verificationCode: string }) => {
        try {
            const success = await onSubmit(values);
            if (success) {
                setVerificationComplete(true);
                setTimeout(() => {
                    if (onVerificationSuccess) {
                        onVerificationSuccess();
                    }
                }, 1500);
            }
        } catch (error) {
            console.error('Verification submission error:', error);
        }
    };

    return (
        <Formik
            initialValues={{verificationCode: ''}}
            validationSchema={VerificationSchema}
            onSubmit={handleSubmitVerification}
        >
            {({handleChange, handleBlur, handleSubmit, values, errors, touched}) => (
                <View style={styles.container}>
                    {verificationComplete ? (
                        <View style={styles.successContainer}>
                            <Text style={styles.successTitle}>{t('verificationSuccess')}</Text>
                            <Text style={styles.successMessage}>{t('accountCreated')}</Text>
                            <ActivityIndicator size="large" color={COLORS.primary.accent}/>
                            <Text style={styles.redirectMessage}>{t('redirectingToProfile')}</Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.infoText}>
                                {t('verificationCodeSent')} {email}
                            </Text>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>{t('verificationCode')}</Text>
                                <TextInput
                                    style={styles.codeInput}
                                    placeholder="000000"
                                    placeholderTextColor={THEME_COLORS.textSecondary}
                                    value={values.verificationCode}
                                    onChangeText={handleChange('verificationCode')}
                                    onBlur={handleBlur('verificationCode')}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    textAlign="center"
                                />
                                {touched.verificationCode && errors.verificationCode && (
                                    <Text style={styles.errorText}>{errors.verificationCode}</Text>
                                )}
                            </View>

                            <TouchableOpacity
                                style={styles.resendContainer}
                                onPress={handleResendCode}
                                disabled={remainingTime > 0 || isResending}
                            >
                                {isResending ? (
                                    <ActivityIndicator size="small" color={COLORS.primary.accent}/>
                                ) : (
                                    <Text style={[
                                        styles.resendText,
                                        remainingTime > 0 ? styles.resendTextDisabled : {}
                                    ]}>
                                        {remainingTime > 0
                                            ? `${t('resendCode')} (${remainingTime}s)`
                                            : t('resendCode')}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {error ? (
                                <Text style={styles.generalError}>{error}</Text>
                            ) : null}

                            <View style={styles.buttonsContainer}>
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={onBack}
                                    disabled={isProcessing}
                                >
                                    <Text style={styles.backButtonText}>{t('back')}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.verifyButton}
                                    onPress={() => handleSubmit()}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? (
                                        <ActivityIndicator color={THEME_COLORS.textPrimary}/>
                                    ) : (
                                        <Text style={styles.verifyButtonText}>{t('verify')}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            )}
        </Formik>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 10,
    },
    infoText: {
        color: THEME_COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        fontSize: 14,
    },
    inputContainer: {
        marginBottom: 16,
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginBottom: 8,
    },
    codeInput: {
        backgroundColor: 'rgba(30, 30, 30, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.2)',
        borderRadius: 8,
        height: 56,
        width: '50%',
        padding: 12,
        color: THEME_COLORS.textPrimary,
        fontSize: 24,
        letterSpacing: 4,
        fontWeight: 'bold',
    },
    resendContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    resendText: {
        color: COLORS.primary.accent,
        fontSize: 14,
    },
    resendTextDisabled: {
        color: THEME_COLORS.textSecondary,
    },
    errorText: {
        color: '#ff6b6b',
        fontSize: 12,
        marginTop: 4,
    },
    generalError: {
        color: '#ff6b6b',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    backButton: {
        flex: 1,
        backgroundColor: 'rgba(50, 50, 50, 0.8)',
        borderRadius: 8,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    backButtonText: {
        color: THEME_COLORS.textPrimary,
        fontSize: 16,
    },
    verifyButton: {
        flex: 2,
        backgroundColor: COLORS.primary.accent,
        borderRadius: 8,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    verifyButtonText: {
        color: THEME_COLORS.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    successContainer: {
        alignItems: 'center',
        padding: 20,
    },
    successTitle: {
        color: COLORS.primary.accent,
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    successMessage: {
        color: THEME_COLORS.textPrimary,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    redirectMessage: {
        color: THEME_COLORS.textSecondary,
        fontSize: 14,
        marginTop: 16,
    }
});