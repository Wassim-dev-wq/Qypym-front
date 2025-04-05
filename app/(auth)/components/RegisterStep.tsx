import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { COLORS, THEME_COLORS } from '@/src/constants/Colors';
import { t } from 'src/constants/locales';

export interface RegisterFormValues {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
}

interface RegisterStepProps {
    initialValues: RegisterFormValues;
    onSubmit: (values: RegisterFormValues) => Promise<boolean>;
    isProcessing: boolean;
    error: string;
}

const RegisterValidationSchema = Yup.object().shape({
    email: Yup.string()
        .email(t('invalidEmail'))
        .required(t('emailRequired')),
    password: Yup.string()
        .min(8, t('passwordMinLength'))
        .matches(
            /^(?=.*[A-Z])(?=.*\d)/,
            t('passwordComplexity')
        )
        .required(t('passwordRequired')),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], t('passwordsMatch'))
        .required(t('confirmPasswordRequired')),
    firstName: Yup.string()
        .matches(/^[A-Za-z]+$/, t('onlyLettersAllowed'))
        .required(t('firstNameRequired')),
    lastName: Yup.string()
        .matches(/^[A-Za-z]+$/, t('onlyLettersAllowed'))
        .required(t('lastNameRequired')),
});

export function RegisterStep({ initialValues, onSubmit, isProcessing, error }: RegisterStepProps) {
    return (
        <Formik
            initialValues={initialValues}
            validationSchema={RegisterValidationSchema}
            onSubmit={onSubmit}
            validateOnMount={false}
            validateOnChange={true}
            validateOnBlur={true}
        >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isValid }) => (
                <View style={styles.container}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('email')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('enterEmail')}
                            placeholderTextColor={THEME_COLORS.textSecondary}
                            value={values.email}
                            onChangeText={handleChange('email')}
                            onBlur={handleBlur('email')}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {touched.email && errors.email && (
                            <Text style={styles.errorText}>{errors.email}</Text>
                        )}
                    </View>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('firstName')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('enterFirstName')}
                            placeholderTextColor={THEME_COLORS.textSecondary}
                            value={values.firstName}
                            onChangeText={handleChange('firstName')}
                            onBlur={handleBlur('firstName')}
                            autoCorrect={false}
                        />
                        {touched.firstName && errors.firstName && (
                            <Text style={styles.errorText}>{errors.firstName}</Text>
                        )}
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('lastName')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('enterLastName')}
                            placeholderTextColor={THEME_COLORS.textSecondary}
                            value={values.lastName}
                            onChangeText={handleChange('lastName')}
                            onBlur={handleBlur('lastName')}
                            autoCorrect={false}
                        />
                        {touched.lastName && errors.lastName && (
                            <Text style={styles.errorText}>{errors.lastName}</Text>
                        )}
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('password')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('enterPassword')}
                            placeholderTextColor={THEME_COLORS.textSecondary}
                            secureTextEntry
                            value={values.password}
                            onChangeText={handleChange('password')}
                            onBlur={handleBlur('password')}
                        />
                        {touched.password && errors.password && (
                            <Text style={styles.errorText}>{errors.password}</Text>
                        )}
                    </View>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('confirmPassword')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('enterConfirmPassword')}
                            placeholderTextColor={THEME_COLORS.textSecondary}
                            secureTextEntry
                            value={values.confirmPassword}
                            onChangeText={handleChange('confirmPassword')}
                            onBlur={handleBlur('confirmPassword')}
                        />
                        {touched.confirmPassword && errors.confirmPassword && (
                            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                        )}
                    </View>

                    {error ? (
                        <Text style={styles.generalError}>{error}</Text>
                    ) : null}

                    <TouchableOpacity
                        style={[
                            styles.button,
                            (!isValid && Object.keys(touched).length > 0) && styles.buttonDisabled
                        ]}
                        onPress={() => handleSubmit()}
                        disabled={isProcessing || (!isValid && Object.keys(touched).length > 0)}
                    >
                        {isProcessing ? (
                            <ActivityIndicator color={THEME_COLORS.textPrimary} />
                        ) : (
                            <Text style={styles.buttonText}>{t('register')}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </Formik>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 10,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginBottom: 8,
    },
    input: {
        backgroundColor: 'rgba(30, 30, 30, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.2)',
        borderRadius: 8,
        height: 48,
        padding: 12,
        color: THEME_COLORS.textPrimary,
        fontSize: 16,
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
    button: {
        backgroundColor: COLORS.primary.accent,
        borderRadius: 8,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: 'rgba(255, 184, 0, 0.4)',
    },
    buttonText: {
        color: THEME_COLORS.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
});