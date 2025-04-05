import React, {useCallback, useState} from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {Formik, FormikProps} from 'formik';
import * as Yup from 'yup';
import DateTimePicker from '@react-native-community/datetimepicker';
import {router} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {Ionicons} from "@expo/vector-icons";

import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {t} from '@/src/constants/locales';
import {storage} from '@/src/core/storage/storage';
import {GenderIdentity, PlayerLevel, User} from '@/src/types/user/user';
import {useAuth} from "@/src/core/api/auth/useAuth";
import {ProfilePhotoUpload} from '@/app/(auth)/components/ProfilePhotoUpload';
import {userApi} from "@/src/core/hooks/useUserFetch";

const GENDER_OPTIONS: GenderIdentity[] = [
    GenderIdentity.MALE,
    GenderIdentity.FEMALE,
    GenderIdentity.NON_BINARY,
    GenderIdentity.OTHER,
    GenderIdentity.UNKNOWN
];

const PLAYER_LEVEL_OPTIONS: PlayerLevel[] = [
    PlayerLevel.BEGINNER,
    PlayerLevel.INTERMEDIATE,
    PlayerLevel.ADVANCED
];

interface ProfileFormValues {
    dateOfBirth: Date;
    gender: GenderIdentity;
    playerLevel: PlayerLevel;
    bio: string;
}

interface LoadingModalProps {
    visible: boolean;
    step: number;
    onContinue?: () => void;
}

const ProfileCompletionSchema = Yup.object().shape({
    dateOfBirth: Yup.date()
        .required(t('dateOfBirthRequired'))
        .max(new Date(new Date().setFullYear(new Date().getFullYear() - 13)), t('mustBeAtLeast13'))
        .min(new Date(new Date().setFullYear(new Date().getFullYear() - 100)), t('invalidDateOfBirth')),
    gender: Yup.string()
        .required(t('genderRequired'))
        .oneOf(GENDER_OPTIONS, t('invalidGender')),
    playerLevel: Yup.string()
        .required(t('playerLevelRequired'))
        .oneOf(PLAYER_LEVEL_OPTIONS, t('invalidPlayerLevel')),
    bio: Yup.string()
        .max(500, t('bioTooLong'))
});

const initialFormValues: ProfileFormValues = {
    dateOfBirth: new Date(new Date().setFullYear(new Date().getFullYear() - 20)),
    gender: GenderIdentity.UNKNOWN,
    playerLevel: PlayerLevel.BEGINNER,
    bio: ''
};

const LoadingModal: React.FC<LoadingModalProps> = ({visible, step, onContinue}) => {
    const loadingMessages: string[] = [
        t('preparingYourProfile'),
        t('creatingYourProfile'),
        t('profileCreatedSuccessfully')
    ];

    const getProgressPercentage = () => {
        return step === 0 ? '33%' : step === 1 ? '66%' : '100%';
    };

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
        >
            <View style={modalStyles.overlay}>
                <LinearGradient
                    colors={['rgba(30,30,30,0.98)', 'rgba(25,25,25,0.95)']}
                    style={modalStyles.container}
                >
                    <View style={modalStyles.content}>
                        {step < 2 ? (
                            <ActivityIndicator size="large" color={COLORS.primary.accent}/>
                        ) : (
                            <Ionicons name="checkmark-circle" size={50} color={COLORS.primary.accent}/>
                        )}

                        <Text style={modalStyles.message}>{loadingMessages[step]}</Text>

                        <View style={modalStyles.progressBarContainer}>
                            <View
                                style={[
                                    modalStyles.progressBar,
                                    {width: getProgressPercentage()}
                                ]}
                            />
                        </View>

                        {step === 2 && onContinue && (
                            <TouchableOpacity
                                style={modalStyles.continueButton}
                                onPress={onContinue}
                            >
                                <Text style={modalStyles.continueButtonText}>{t('continue')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </LinearGradient>
            </View>
        </Modal>
    );
};

const ProfileCompletionScreen: React.FC = () => {
    const {signIn} = useAuth();
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [photoUploaded, setPhotoUploaded] = useState<boolean>(false);
    const [loadingStep, setLoadingStep] = useState<number>(0);
    const [showLoadingModal, setShowLoadingModal] = useState<boolean>(false);

    const formatDateDisplay = (date: Date | null): string => {
        if (!date) return '';
        return date.toISOString().split('T')[0];
    };

    const handlePhotoUploaded = useCallback((success: boolean): void => {
        setPhotoUploaded(success);
    }, []);

    const navigateToExplore = useCallback(async (): Promise<void> => {
        setIsSubmitting(true);
        try {
            const token = await storage.getToken();
            if (token) {
                console.log('Signing in with token');
                await signIn(token);
                setTimeout(() => {
                    router.replace('/(tabs)/explore');
                }, 100);
            }
        } catch (error) {
            console.error('Navigation error:', error);
        } finally {
            setIsSubmitting(false);
        }
    }, [signIn]);

    const handleSkip = useCallback(async (): Promise<void> => {
        try {
            const token = await storage.getToken();
            if (token) {
                await signIn(token);
                router.replace('/(tabs)/explore');
            } else {
                router.replace('/(auth)');
            }
        } catch (error) {
            console.error('Skip navigation error:', error);
        }
    }, [signIn]);

    const handleSubmitProfile = async (values: ProfileFormValues): Promise<void> => {
        setIsSubmitting(true);
        setError('');
        setLoadingStep(0);

        try {
            setShowLoadingModal(true);

            const profileData: Partial<User> = {
                dateOfBirth: values.dateOfBirth.toISOString().split('T')[0],
                genderIdentity: values.gender,
                playerLevel: values.playerLevel,
                bio: values.bio
            };

            await new Promise(resolve => setTimeout(resolve, 1800));
            setLoadingStep(1);

            await Promise.all([
                userApi.updateCurrentUser(profileData),
                new Promise(resolve => setTimeout(resolve, 1700))
            ]);

            setLoadingStep(2);
            await new Promise(resolve => setTimeout(resolve, 1500));

        } catch (error: any) {
            setError(error.message || t('profileCompletionFailed'));
            setShowLoadingModal(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderDateField = (formikProps: FormikProps<ProfileFormValues>): React.ReactElement => {
        const {values, errors, touched, setFieldValue} = formikProps;

        return (
            <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('dateOfBirth')}</Text>
                <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Text style={styles.dateText}>
                        {formatDateDisplay(values.dateOfBirth)}
                    </Text>
                </TouchableOpacity>
                {showDatePicker && (
                    <DateTimePicker
                        testID="dateTimePicker"
                        value={values.dateOfBirth}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                            setShowDatePicker(false);
                            if (selectedDate) {
                                setFieldValue('dateOfBirth', selectedDate);
                            }
                        }}
                        maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 13))}
                        minimumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 100))}
                    />
                )}
                {touched.dateOfBirth && errors.dateOfBirth && (
                    <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
                )}
            </View>
        );
    };

    const renderGenderField = (formikProps: FormikProps<ProfileFormValues>): React.ReactElement => {
        const {values, errors, touched, setFieldValue} = formikProps;

        return (
            <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('gender')}</Text>
                <View style={styles.optionsContainer}>
                    {GENDER_OPTIONS.map((option) => (
                        <TouchableOpacity
                            key={option}
                            style={[
                                styles.optionButton,
                                values.gender === option && styles.optionButtonSelected
                            ]}
                            onPress={() => setFieldValue('gender', option)}
                        >
                            <Text style={[
                                styles.optionText,
                                values.gender === option && styles.optionTextSelected
                            ]}>
                                {t(option.toLowerCase())}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {touched.gender && errors.gender && (
                    <Text style={styles.errorText}>{errors.gender}</Text>
                )}
            </View>
        );
    };

    const renderPlayerLevelField = (formikProps: FormikProps<ProfileFormValues>): React.ReactElement => {
        const {values, errors, touched, setFieldValue} = formikProps;

        return (
            <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('playerLevel')}</Text>
                <View style={styles.optionsContainer}>
                    {PLAYER_LEVEL_OPTIONS.map((option) => (
                        <TouchableOpacity
                            key={option}
                            style={[
                                styles.optionButton,
                                values.playerLevel === option && styles.optionButtonSelected
                            ]}
                            onPress={() => setFieldValue('playerLevel', option)}
                        >
                            <Text style={[
                                styles.optionText,
                                values.playerLevel === option && styles.optionTextSelected
                            ]}>
                                {t(option.toLowerCase())}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {touched.playerLevel && errors.playerLevel && (
                    <Text style={styles.errorText}>{errors.playerLevel}</Text>
                )}
            </View>
        );
    };

    const renderBioField = (formikProps: FormikProps<ProfileFormValues>): React.ReactElement => {
        const {values, errors, touched, handleChange, handleBlur} = formikProps;

        return (
            <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('bio')}</Text>
                <TextInput
                    style={styles.bioInput}
                    placeholder={t('bioPlaceholder')}
                    placeholderTextColor={THEME_COLORS.textSecondary}
                    value={values.bio}
                    onChangeText={handleChange('bio')}
                    onBlur={handleBlur('bio')}
                    multiline={true}
                    numberOfLines={4}
                    maxLength={500}
                />
                <Text style={styles.characterCount}>
                    {values.bio.length}/500
                </Text>
                {touched.bio && errors.bio && (
                    <Text style={styles.errorText}>{errors.bio}</Text>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light"/>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidView}
            >
                <LinearGradient
                    colors={['rgba(15, 15, 15, 0.98)', 'rgba(25, 25, 25, 0.95)']}
                    style={styles.gradient}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <LinearGradient
                            colors={['rgba(30,30,30,0.9)', 'rgba(22,22,22,0.85)']}
                            style={styles.cardGradient}
                        >
                            <View style={styles.header}>
                                <Text style={styles.title}>{t('completeYourProfile')}</Text>
                                <Text style={styles.subtitle}>
                                    {t('profileInfoNeeded')} {t('photoIsOptional')}
                                </Text>
                            </View>

                            <ProfilePhotoUpload
                                onPhotoUploaded={handlePhotoUploaded}
                                deferPermissions={true}
                            />

                            <Formik
                                initialValues={initialFormValues}
                                validationSchema={ProfileCompletionSchema}
                                onSubmit={handleSubmitProfile}
                                validateOnMount={false}
                            >
                                {(formikProps) => (
                                    <View style={styles.formContainer}>
                                        {renderDateField(formikProps)}
                                        {renderGenderField(formikProps)}
                                        {renderPlayerLevelField(formikProps)}
                                        {renderBioField(formikProps)}

                                        {error ? (
                                            <Text style={styles.generalError}>{error}</Text>
                                        ) : null}

                                        <TouchableOpacity
                                            style={[
                                                styles.submitButton,
                                                isSubmitting && styles.submitButtonDisabled
                                            ]}
                                            onPress={() => formikProps.handleSubmit()}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <ActivityIndicator color={THEME_COLORS.textPrimary}/>
                                            ) : (
                                                <Text style={styles.submitButtonText}>
                                                    {t('completeProfile')}
                                                </Text>
                                            )}
                                        </TouchableOpacity>

                                        <Text style={styles.skipText}>
                                            {t('canCompleteProfileLater')}
                                        </Text>

                                        <TouchableOpacity
                                            style={styles.skipButton}
                                            onPress={handleSkip}
                                            disabled={isSubmitting}
                                        >
                                            <Text style={styles.skipButtonText}>{t('skipForNow')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </Formik>
                        </LinearGradient>
                    </ScrollView>
                </LinearGradient>
            </KeyboardAvoidingView>
            <LoadingModal
                visible={showLoadingModal}
                step={loadingStep}
                onContinue={navigateToExplore}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME_COLORS.background,
    },
    keyboardAvoidView: {
        flex: 1,
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 30,
    },
    cardGradient: {
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.12)',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    header: {
        marginBottom: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 10,
    },
    formContainer: {
        marginVertical: 10,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginBottom: 8,
    },
    datePickerButton: {
        backgroundColor: 'rgba(30, 30, 30, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.2)',
        borderRadius: 8,
        height: 50,
        paddingHorizontal: 15,
        justifyContent: 'center',
    },
    dateText: {
        color: THEME_COLORS.textPrimary,
        fontSize: 16,
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginVertical: 5,
    },
    optionButton: {
        backgroundColor: 'rgba(30, 30, 30, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.2)',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginRight: 10,
        marginBottom: 10,
    },
    optionButtonSelected: {
        backgroundColor: COLORS.primary.accent,
        borderColor: COLORS.primary.accent,
    },
    optionText: {
        color: THEME_COLORS.textSecondary,
        fontSize: 14,
    },
    optionTextSelected: {
        color: '#000000',
        fontWeight: '600',
    },
    bioInput: {
        backgroundColor: 'rgba(30, 30, 30, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.2)',
        borderRadius: 8,
        height: 120,
        padding: 12,
        color: THEME_COLORS.textPrimary,
        fontSize: 16,
        textAlignVertical: 'top',
    },
    characterCount: {
        color: THEME_COLORS.textSecondary,
        fontSize: 12,
        textAlign: 'right',
        marginTop: 4,
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
    submitButton: {
        backgroundColor: COLORS.primary.accent,
        borderRadius: 8,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    skipText: {
        color: THEME_COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 20,
        fontSize: 14,
    },
    skipButton: {
        alignItems: 'center',
        marginTop: 10,
    },
    skipButtonText: {
        color: COLORS.primary.accent,
        fontSize: 14,
        fontWeight: '600',
    },
});

const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '80%',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.15)',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    content: {
        alignItems: 'center',
    },
    message: {
        color: THEME_COLORS.textPrimary,
        fontSize: 18,
        fontWeight: '600',
        marginTop: 20,
        marginBottom: 16,
        textAlign: 'center',
    },
    progressBarContainer: {
        width: '100%',
        height: 8,
        backgroundColor: 'rgba(30, 30, 30, 0.8)',
        borderRadius: 4,
        overflow: 'hidden',
        marginTop: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary.accent,
        borderRadius: 4,
    },
    continueButton: {
        backgroundColor: COLORS.primary.accent,
        borderRadius: 8,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        width: '100%',
    },
    continueButtonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: 'bold',
    }
});

export default ProfileCompletionScreen;