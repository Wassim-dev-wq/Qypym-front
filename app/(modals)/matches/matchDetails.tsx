import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Keyboard,
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import {debounce} from 'lodash';
import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {t} from 'src/constants/locales';
import {useRouter} from 'expo-router';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import * as Yup from 'yup';
import {Formik, FormikProps} from 'formik';
import {matchesApi} from '@/src/core/api/matches/matches.api';
import {LinearGradient} from 'expo-linear-gradient';
import {useBottomSheetState} from "@/src/features/matches/components/bottomSheetContext";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {SuggestionItem} from "@/src/types/match/suggestionItem";
import {initialMatchDetails, MatchFormData} from "@/src/types/match/matchFormData";
import {MATCH_FORMATS, SKILL_LEVELS} from "@/src/types/match/options";

const {width} = Dimensions.get('window');

const matchValidationSchema = Yup.object().shape({
    title: Yup.string()
        .trim()
        .required(t('titleRequired')),
    date: Yup.date()
        .transform((value, originalValue) => {
            if (originalValue instanceof Date) {
                return originalValue;
            }
            const parts = originalValue.split('.');
            if (parts.length >= 2) {
                const day = parts[0];
                const month = parts[1];
                const currentYear = new Date().getFullYear();
                const dateString = `${month}/${day}/${currentYear}`;
                return new Date(dateString);
            }
            return null;
        })
        .typeError(t('invalidDate'))
        .required(t('dateRequired'))
        .min(new Date(), t('dateTooEarly'))
        .test('is-future', t('datemustbbeinfuture'), function (value) {
            return value > new Date();
        }),
    time: Yup.date()
        .transform((value, originalValue) => {
            if (originalValue instanceof Date) {
                return originalValue;
            }
            const [hours, minutes] = originalValue.split(':');
            if (hours && minutes) {
                const now = new Date();
                const timeDate = new Date(now);
                timeDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
                return timeDate;
            }
            return null;
        })
        .typeError(t('invalidTime'))
        .required(t('timeRequired'))
        .test('is-valid-time', t('invalidTime'), function (value) {
            return !isNaN(value.getTime());
        }),
    location: Yup.string()
        .trim()
        .min(2, t('invalidLocation'))
        .required(t('locationRequired')),
    latitude: Yup.number()
        .required(t('invalidLocationSelection')),
    longitude: Yup.number()
        .required(t('invalidLocationSelection')),
    format: Yup.string()
        .trim()
        .min(2, t('invalidFormat'))
        .required(t('formatRequired')),
    duration: Yup.number()
        .min(30, t('invalidDuration'))
        .max(180, t('invalidDuration'))
        .required(t('durationRequired')),
    skillLevel: Yup.string()
        .oneOf(SKILL_LEVELS.map(level => level.id), t('invalidSkillLevel'))
        .required(t('skillLevelRequired')),
});

interface LoadingModalProps {
    visible: boolean;
    step: number;
    onContinue?: () => void;
}

const LoadingModal: React.FC<LoadingModalProps> = ({visible, step, onContinue}) => {
    const loadingMessages = [
        t('preparingYourMatch'),
        t('creatingYourMatch'),
        t('matchCreatedSuccessfully')
    ];

    const getProgressPercentage = () => {
        return step === 0 ? '33%' : step === 1 ? '66%' : '100%';
    };

    return (
        <Modal
            transparent
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
                            <MaterialCommunityIcons name="check-circle" size={50} color={COLORS.primary.accent}/>
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

const AnimatedStepContainer = ({
                                   isActive,
                                   children,
                                   style
                               }: {
    isActive: boolean;
    children: React.ReactNode;
    style?: any;
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        if (isActive) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.95);
        }
    }, [isActive]);

    if (!isActive) return null;

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: fadeAnim,
                    transform: [{scale: scaleAnim}],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
};

const DateTimeItem = ({
                          icon,
                          value,
                          onPress,
                          error
                      }: {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    value: string;
    onPress: () => void;
    error?: string;
}) => (
    <View>
        <TouchableOpacity
            style={[styles.dateTimeBox, error ? styles.inputError : null]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <MaterialCommunityIcons name={icon} size={24} color={COLORS.primary.accent}/>
            <Text style={styles.dateTimeText}>{value}</Text>
        </TouchableOpacity>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
);

const OptionButton = ({
                          selected,
                          onPress,
                          icon,
                          label
                      }: {
    selected: boolean;
    onPress: () => void;
    icon?: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
}) => (
    <TouchableOpacity
        style={[styles.optionButton, selected && styles.optionSelected]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <LinearGradient
            colors={
                selected
                    ? [COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']
                    : ['rgba(26,26,26,0.9)', 'rgba(17,17,17,0.8)']
            }
            style={styles.optionGradient}
        >
            {icon && (
                <MaterialCommunityIcons
                    name={icon}
                    size={24}
                    color={selected ? COLORS.primary.dark : COLORS.primary.accent}
                    style={{marginBottom: 8}}
                />
            )}
            <Text
                style={[
                    styles.optionText,
                    selected && styles.optionTextSelected,
                ]}
            >
                {label}
            </Text>
        </LinearGradient>
    </TouchableOpacity>
);

const SummaryRow = ({
                        icon,
                        label,
                        value
                    }: {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
    value: string;
}) => (
    <View style={styles.summaryRow}>
        <View style={styles.summaryIconContainer}>
            <MaterialCommunityIcons
                name={icon}
                size={24}
                color={COLORS.primary.accent}
            />
        </View>
        <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>{label}</Text>
            <Text style={styles.summaryValue}>{value}</Text>
        </View>
    </View>
);

const MatchCreationScreen: React.FC = () => {
    const steps = useMemo(() => ['General Info', 'Format & Duration', 'Skill Level', 'Confirmation'], []);
    const [currentStep, setCurrentStep] = useState<number>(0);
    const edgeInsets = useSafeAreaInsets();
    const progressAnimation = useRef(new Animated.Value(0)).current;

    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
    const [query, setQuery] = useState<string>('');
    const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [showCreationModal, setShowCreationModal] = useState<boolean>(false);
    const [creationStep, setCreationStep] = useState<number>(0);
    const {setTabBarHeight} = useBottomSheetState();

    const totalSteps: number = steps.length;
    const isLastStep: boolean = currentStep === totalSteps - 1;

    const inputRef = useRef<TextInput>(null);
    const router = useRouter();

    const fetchSuggestions = async (text: string): Promise<void> => {
        if (text.length < 3) {
            setSuggestions([]);
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=fr&q=${encodeURIComponent(
                    text
                )}`,
                {
                    headers: {
                        'User-Agent': 'QYPYM/1.0 (contact@qypym.fr)',
                        'Accept': 'application/json'
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status}`);
            }

            const data: SuggestionItem[] = await response.json();
            const filtered = data
                .filter(item => item && item.address && item.address.country_code === 'fr')
                .slice(0, 5);
            setSuggestions(filtered);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            if (error instanceof Error) {
                console.error('Error message:', error.message);
            }
            console.error(t('messages.failedToFetchSuggestions'));
        } finally {
            setLoading(false);
        }
    };

    const debouncedFetch = useRef(debounce(fetchSuggestions, 500)).current;
    useEffect(() => {
        return () => {
            debouncedFetch.cancel();
        };
    }, [debouncedFetch]);

    const navigateToMatches = useCallback(() => {
        if (setTabBarHeight) {
            setTabBarHeight(90);
        }
        router.replace({
            pathname: '/(tabs)/explore/ExploreScreen',
        });
    }, [router]);
    const handleLocationChange = useCallback((text: string, setFieldValue: FormikProps<MatchFormData>['setFieldValue']) => {
        setQuery(text);
        setFieldValue('location', text);
        debouncedFetch(text);
    }, [debouncedFetch]);

    const selectSuggestion = useCallback((item: SuggestionItem, setFieldValue: FormikProps<MatchFormData>['setFieldValue']) => {
        const {house_number, road, suburb, city, town, village, state, postcode, country} = item.address;
        const address = [
            house_number,
            road,
            suburb,
            city || town || village,
            state,
            postcode,
            country,
        ]
            .filter(Boolean)
            .join(', ');

        setQuery(address);
        setFieldValue('location', address);
        setFieldValue('latitude', parseFloat(item.lat));
        setFieldValue('longitude', parseFloat(item.lon));
        setSuggestions([]);
        Keyboard.dismiss();
    }, []);

    const handleNext = useCallback((formikProps: FormikProps<MatchFormData>) => {
        formikProps
            .validateForm()
            .then(errors => {
                const stepFields = getFieldsForStep(currentStep);
                const stepErrors = stepFields.filter(field => errors[field]);

                if (stepErrors.length > 0) {
                    const errorMessages = stepErrors
                        .map(field => (formikProps.errors[field] ? formikProps.errors[field] : ''))
                        .filter(msg => msg !== '')
                        .join('\n');
                    console.error(t('messages.validationError'), errorMessages);
                    setLoading(false);
                } else {
                    if (isLastStep) {
                        setLoading(true);
                        setCreationStep(0);
                        setShowCreationModal(true);
                        setTimeout(() => {
                            setCreationStep(1);
                            formikProps.handleSubmit();
                        }, 800);
                    } else {
                        setCurrentStep(step => step + 1);
                    }
                }
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [currentStep, isLastStep]);

    const handleBack = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(step => step - 1);
        }
    }, [currentStep]);
    useEffect(() => {
        const progress = ((currentStep + 1) / totalSteps) * 100;
        Animated.timing(progressAnimation, {
            toValue: progress,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [currentStep, totalSteps, progressAnimation]);

    const progressWidth = progressAnimation.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    const getFieldsForStep = (step: number): Array<keyof MatchFormData> => {
        switch (step) {
            case 0:
                return ['title', 'date', 'time', 'location', 'latitude', 'longitude'];
            case 1:
                return ['format', 'duration'];
            case 2:
                return ['skillLevel'];
            default:
                return [];
        }
    };
    const handleOpenDatePicker = useCallback(() => {
        setShowDatePicker(true);
        setShowTimePicker(false);
        setSuggestions([]);
    }, []);

    const handleOpenTimePicker = useCallback(() => {
        setShowTimePicker(true);
        setShowDatePicker(false);
        setSuggestions([]);
    }, []);

    const handleCloseDatePicker = useCallback(() => {
        setShowDatePicker(false);
    }, []);

    const handleCloseTimePicker = useCallback(() => {
        setShowTimePicker(false);
    }, []);

    const renderGeneralInfo = useCallback((formikProps: FormikProps<MatchFormData>) => (
        <AnimatedStepContainer isActive={currentStep === 0} style={styles.stepContainer}>
            <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                    name="format-title"
                    size={24}
                    color={COLORS.primary.accent}
                    style={styles.inputIcon}
                />
                <TextInput
                    style={[styles.input, formikProps.touched.title && formikProps.errors.title ? styles.inputError : null]}
                    value={formikProps.values.title}
                    onChangeText={(val) => formikProps.setFieldValue('title', val)}
                    onBlur={formikProps.handleBlur('title')}
                    placeholder={t('placeholders.matchTitlePlaceholder')}
                    placeholderTextColor={COLORS.neutral[400]}
                    returnKeyType="next"
                />
            </View>
            {formikProps.touched.title && formikProps.errors.title && (
                <Text style={styles.errorText}>{formikProps.errors.title}</Text>
            )}

            <DateTimeItem
                icon="calendar"
                value={formikProps.values.date.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                })}
                onPress={handleOpenDatePicker}
                error={formikProps.touched.date && formikProps.errors.date ? formikProps.errors.date as string : undefined}
            />

            <DateTimeItem
                icon="clock"
                value={formikProps.values.time.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                })}
                onPress={handleOpenTimePicker}
                error={formikProps.touched.time && formikProps.errors.time ? formikProps.errors.time as string : undefined}
            />

            <View style={styles.locationContainer}>
                <View style={styles.inputContainer}>
                    <MaterialCommunityIcons
                        name="map-marker"
                        size={24}
                        color={COLORS.primary.accent}
                        style={styles.inputIcon}
                    />
                    <TextInput
                        style={[
                            styles.input,
                            formikProps.touched.location && formikProps.errors.location ? styles.inputError : null
                        ]}
                        value={query}
                        onChangeText={(text) => handleLocationChange(text, formikProps.setFieldValue)}
                        placeholder={t('placeholders.locationPlaceholder')}
                        placeholderTextColor={COLORS.neutral[400]}
                        autoCorrect={false}
                        autoCapitalize="none"
                        returnKeyType="done"
                    />
                    {loading && (
                        <ActivityIndicator
                            style={styles.loadingIndicator}
                            size="small"
                            color={COLORS.primary.accent}
                        />
                    )}
                </View>
                {formikProps.touched.location && formikProps.errors.location && (
                    <Text style={styles.errorText}>{formikProps.errors.location}</Text>
                )}

                {suggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                        <FlatList
                            data={suggestions}
                            keyExtractor={(item) => item.place_id.toString()}
                            renderItem={({item}) => {
                                const {
                                    house_number,
                                    road,
                                    suburb,
                                    city,
                                    town,
                                    village,
                                    state,
                                    postcode,
                                    country,
                                } = item.address;
                                const address = [
                                    house_number,
                                    road,
                                    suburb,
                                    city || town || village,
                                    state,
                                    postcode,
                                    country,
                                ]
                                    .filter(Boolean)
                                    .join(', ');

                                return (
                                    <TouchableOpacity
                                        style={styles.suggestionItem}
                                        onPress={() => selectSuggestion(item, formikProps.setFieldValue)}
                                        activeOpacity={0.7}
                                    >
                                        <MaterialCommunityIcons name="map-marker" size={18}
                                                                color={COLORS.primary.accent}/>
                                        <Text style={styles.suggestionText}>{address}</Text>
                                    </TouchableOpacity>
                                );
                            }}
                            style={styles.suggestionsList}
                            keyboardShouldPersistTaps="handled"
                        />
                    </View>
                )}
            </View>
        </AnimatedStepContainer>
    ), [currentStep, handleLocationChange, query, loading, suggestions, selectSuggestion, handleOpenDatePicker, handleOpenTimePicker]);

    const renderFormatAndDuration = useCallback((formikProps: FormikProps<MatchFormData>) => (
        <AnimatedStepContainer isActive={currentStep === 1} style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>{t('fields.format')}</Text>
            <View style={styles.optionContainer}>
                {MATCH_FORMATS.map((fmt) => (
                    <OptionButton
                        key={fmt.format}
                        selected={formikProps.values.format === fmt.format}
                        onPress={() => {
                            if (fmt.format === 'Other') {
                                if (Platform.OS === 'ios') {
                                    console.log(t('messages.customFormat'), t('messages.enterCustomFormat'));
                                } else {
                                    console.log(t('messages.customFormat'), t('messages.customFormatNotImplemented'));
                                }
                            } else {
                                formikProps.setFieldValue('format', fmt.format);
                            }
                        }}
                        label={t(fmt.labelKey)}
                    />
                ))}
            </View>
            {formikProps.touched.format && formikProps.errors.format && (
                <Text style={styles.errorText}>{formikProps.errors.format}</Text>
            )}

            <View style={styles.durationContainer}>
                <Text style={styles.sectionTitle}>
                    {t('fields.duration')}: {formikProps.values.duration} {t('minutes')}
                </Text>

                <View style={styles.sliderContainer}>
                    <Text style={styles.sliderLabel}>10</Text>
                    <Slider
                        style={styles.slider}
                        minimumValue={10}
                        maximumValue={180}
                        step={5}
                        value={formikProps.values.duration}
                        onValueChange={(val: number) => formikProps.setFieldValue('duration', val)}
                        minimumTrackTintColor={COLORS.primary.accent}
                        maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
                        thumbTintColor={COLORS.primary.accent}
                    />
                    <Text style={styles.sliderLabel}>180</Text>
                </View>
            </View>
            {formikProps.touched.duration && formikProps.errors.duration && (
                <Text style={styles.errorText}>{formikProps.errors.duration}</Text>
            )}
        </AnimatedStepContainer>
    ), [currentStep]);

    const renderSkillLevel = useCallback((formikProps: FormikProps<MatchFormData>) => (
        <AnimatedStepContainer isActive={currentStep === 2} style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>{t('fields.skillLevel')}</Text>
            <View style={styles.skillLevelContainer}>
                {SKILL_LEVELS.map(level => (
                    <OptionButton
                        key={level.id}
                        selected={formikProps.values.skillLevel === level.id}
                        onPress={() => formikProps.setFieldValue('skillLevel', level.id)}
                        icon={level.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                        label={t(level.labelKey)}
                    />
                ))}
            </View>
            {formikProps.touched.skillLevel && formikProps.errors.skillLevel && (
                <Text style={styles.errorText}>{formikProps.errors.skillLevel}</Text>
            )}
        </AnimatedStepContainer>
    ), [currentStep]);

    const renderConfirmation = useCallback((formikProps: FormikProps<MatchFormData>) => {
        const skillLevel = SKILL_LEVELS.find(
            level => level.id === formikProps.values.skillLevel
        );
        const skillLevelLabel = skillLevel ? t(skillLevel.labelKey) : formikProps.values.skillLevel;

        return (
            <AnimatedStepContainer isActive={currentStep === 3} style={styles.stepContainer}>
                <Text style={styles.confirmationTitle}>{t('messages.reviewDetails')}</Text>

                <LinearGradient
                    colors={['rgba(26,26,26,0.9)', 'rgba(17,17,17,0.8)']}
                    style={styles.summaryCard}
                >
                    <SummaryRow
                        icon="format-title"
                        label={t('fields.title')}
                        value={formikProps.values.title}
                    />

                    <SummaryRow
                        icon="calendar-clock"
                        label={`${t('fields.date')} & ${t('fields.time')}`}
                        value={`${formikProps.values.date.toLocaleDateString('fr-FR')} - ${formikProps.values.time.toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}`}
                    />

                    <SummaryRow
                        icon="map-marker"
                        label={t('fields.location')}
                        value={formikProps.values.location}
                    />

                    <SummaryRow
                        icon="soccer-field"
                        label={t('fields.format')}
                        value={formikProps.values.format}
                    />

                    <SummaryRow
                        icon="clock-outline"
                        label={t('fields.duration')}
                        value={`${formikProps.values.duration} ${t('minutes')}`}
                    />

                    <SummaryRow
                        icon="star-outline"
                        label={t('fields.skillLevel')}
                        value={skillLevelLabel}
                    />
                </LinearGradient>
            </AnimatedStepContainer>
        );
    }, [currentStep]);

    const renderStepContent = (formikProps: FormikProps<MatchFormData>) => {
        switch (currentStep) {
            case 0:
                return renderGeneralInfo(formikProps);
            case 1:
                return renderFormatAndDuration(formikProps);
            case 2:
                return renderSkillLevel(formikProps);
            case 3:
                return renderConfirmation(formikProps);
            default:
                return null;
        }
    };

    const headerStyle = {
        ...styles.header,
        paddingTop: Platform.OS === 'ios' ? 20 : edgeInsets.top,
        paddingBottom: Platform.OS === 'ios' ? 20 : 20
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <Formik
                initialValues={initialMatchDetails}
                validationSchema={matchValidationSchema}
                onSubmit={async (values, {resetForm}) => {
                    try {
                        await matchesApi.create(values);
                        setCreationStep(2);
                    } catch (error) {
                        console.error(t('messages.failedToCreateMatch'));
                        setShowCreationModal(false);
                        setLoading(false);
                    }
                }}
            >
                {(formikProps: FormikProps<MatchFormData>) => (
                    <KeyboardAwareScrollView
                        style={styles.container}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        enableOnAndroid
                        extraScrollHeight={Platform.OS === 'ios' ? 20 : 0}
                    >
                        <View style={headerStyle}>
                            <View style={styles.stepsHeader}>
                                <Text style={styles.stepIndicator}>
                                    {t('messages.step')} {currentStep + 1} {t('messages.of')} {totalSteps}
                                </Text>
                                <Text style={styles.stepTitle}>{steps[currentStep]}</Text>
                            </View>

                            <View style={styles.progressContainer}>
                                <Animated.View style={[styles.progressBar, {width: progressWidth}]}/>
                            </View>
                        </View>

                        <View style={styles.body}>
                            {renderStepContent(formikProps)}
                        </View>

                        {showDatePicker && Platform.OS === 'android' && (
                            <DateTimePicker
                                value={formikProps.values.date}
                                mode="date"
                                display="default"
                                minimumDate={new Date()}
                                onChange={(event: DateTimePickerEvent, selected?: Date) => {
                                    handleCloseDatePicker();
                                    if (event.type === 'set' && selected) {
                                        formikProps.setFieldValue('date', selected);
                                    }
                                }}
                            />
                        )}
                        {showTimePicker && Platform.OS === 'android' && (
                            <DateTimePicker
                                value={formikProps.values.time}
                                mode="time"
                                is24Hour
                                display="default"
                                onChange={(event: DateTimePickerEvent, selected?: Date) => {
                                    handleCloseTimePicker();
                                    if (event.type === 'set' && selected) {
                                        formikProps.setFieldValue('time', selected);
                                    }
                                }}
                            />
                        )}
                        {Platform.OS === 'ios' && (
                            <Modal
                                transparent
                                animationType="slide"
                                visible={showDatePicker}
                                onRequestClose={handleCloseDatePicker}
                            >
                                <TouchableOpacity
                                    style={styles.modalOverlay}
                                    activeOpacity={1}
                                    onPress={handleCloseDatePicker}
                                >
                                    <View style={styles.pickerContainer}>
                                        <Text style={styles.pickerTitle}>{t('fields.selectDate')}</Text>
                                        <DateTimePicker
                                            value={formikProps.values.date}
                                            mode="date"
                                            display="spinner"
                                            minimumDate={new Date()}
                                            onChange={(event: DateTimePickerEvent, selected?: Date) => {
                                                if (selected) {
                                                    formikProps.setFieldValue('date', selected);
                                                }
                                            }}
                                        />
                                        <TouchableOpacity
                                            style={styles.doneButton}
                                            onPress={handleCloseDatePicker}
                                        >
                                            <Text style={styles.doneButtonText}>{t('buttons.done')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            </Modal>
                        )}
                        {Platform.OS === 'ios' && (
                            <Modal
                                transparent
                                animationType="slide"
                                visible={showTimePicker}
                                onRequestClose={handleCloseTimePicker}
                            >
                                <TouchableOpacity
                                    style={styles.modalOverlay}
                                    activeOpacity={1}
                                    onPress={handleCloseTimePicker}
                                >
                                    <View style={styles.pickerContainer}>
                                        <Text style={styles.pickerTitle}>{t('fields.selectTime')}</Text>
                                        <DateTimePicker
                                            value={formikProps.values.time}
                                            mode="time"
                                            is24Hour
                                            display="spinner"
                                            onChange={(event: DateTimePickerEvent, selected?: Date) => {
                                                if (selected) {
                                                    formikProps.setFieldValue('time', selected);
                                                }
                                            }}
                                        />
                                        <TouchableOpacity
                                            style={styles.doneButton}
                                            onPress={handleCloseTimePicker}
                                        >
                                            <Text style={styles.doneButtonText}>{t('buttons.done')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            </Modal>
                        )}

                        <View style={styles.footer}>
                            {currentStep > 0 ? (
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={handleBack}
                                    activeOpacity={0.7}
                                >
                                    <LinearGradient
                                        colors={['rgba(50,50,50,0.8)', 'rgba(30,30,30,0.8)']}
                                        style={styles.backButtonGradient}
                                    >
                                        <MaterialCommunityIcons name="chevron-left" size={24}
                                                                color={COLORS.neutral[50]}/>
                                        <Text style={styles.buttonText}>{t('buttons.back')}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.backButtonPlaceholder}/>
                            )}

                            <TouchableOpacity
                                style={styles.nextButton}
                                onPress={() => handleNext(formikProps)}
                                activeOpacity={0.7}
                                disabled={loading}
                            >
                                <LinearGradient
                                    colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                                    style={styles.nextButtonGradient}
                                >
                                    {loading && isLastStep ? (
                                        <>
                                            <ActivityIndicator size="small" color={COLORS.primary.dark}/>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.nextButtonText}>
                                                {isLastStep ? t('buttons.submit') : t('buttons.next')}
                                            </Text>
                                            {!isLastStep && (
                                                <MaterialCommunityIcons name="chevron-right" size={24}
                                                                        color={COLORS.primary.dark}/>
                                            )}
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAwareScrollView>
                )}
            </Formik>

            <LoadingModal
                visible={showCreationModal}
                step={creationStep}
                onContinue={() => {
                    setShowCreationModal(false);
                    setLoading(false);
                    navigateToMatches();
                    router.replace({
                        pathname: '/(tabs)/explore/ExploreScreen',
                    });
                }}
            />
        </SafeAreaView>
    );
};

export default MatchCreationScreen;

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: THEME_COLORS.background || COLORS.primary.main,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    stepsHeader: {
        marginBottom: 10,
    },
    stepIndicator: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary || COLORS.neutral[300],
        marginBottom: 4,
    },
    stepTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: THEME_COLORS.textPrimary || COLORS.neutral[50],
    },
    progressContainer: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary.accent,
        borderRadius: 2,
    },
    body: {
        flex: 1,
        padding: 20,
    },
    stepContainer: {
        flex: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(26,26,26,0.9)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 16,
        overflow: 'hidden',
    },
    inputIcon: {
        padding: 12,
    },
    input: {
        flex: 1,
        height: 50,
        color: THEME_COLORS.textPrimary || COLORS.neutral[50],
        fontSize: 16,
        paddingVertical: 8,
        paddingRight: 16,
    },
    inputError: {
        borderColor: 'rgba(255, 50, 50, 0.5)',
    },
    dateTimeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(26,26,26,0.9)',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 16,
        gap: 10,
    },
    dateTimeText: {
        fontSize: 16,
        color: THEME_COLORS.textPrimary || COLORS.neutral[50],
    },
    locationContainer: {
        marginTop: 8,
        zIndex: 10,
    },
    suggestionsContainer: {
        zIndex: 20,
    },
    suggestionsList: {
        maxHeight: 200,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        backgroundColor: 'rgba(26,26,26,0.9)',
        marginTop: -8,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    suggestionText: {
        flex: 1,
        fontSize: 14,
        color: THEME_COLORS.textPrimary || COLORS.neutral[50],
    },
    loadingIndicator: {
        position: 'absolute',
        right: 16,
    },
    errorText: {
        color: '#ff5050',
        fontSize: 12,
        marginTop: -12,
        marginBottom: 8,
        marginLeft: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary || COLORS.neutral[50],
        marginBottom: 16,
    },
    optionContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    optionButton: {
        minWidth: (width - 60) / 2,
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    optionGradient: {
        padding: 16,
        alignItems: 'center',
        borderRadius: 12,
    },
    optionSelected: {
        borderWidth: 1,
        borderColor: COLORS.primary.accent,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary || COLORS.neutral[50],
    },
    optionTextSelected: {
        color: COLORS.primary.dark,
    },
    durationContainer: {
        marginTop: 16,
    },
    sliderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 8,
    },
    slider: {
        flex: 1,
        height: 40,
    },
    sliderLabel: {
        fontSize: 12,
        color: THEME_COLORS.textSecondary || COLORS.neutral[300],
    },
    skillLevelContainer: {
        flexDirection: 'column',
        gap: 12,
    },
    confirmationTitle: {
        fontSize: 16,
        color: THEME_COLORS.textSecondary || COLORS.neutral[300],
        marginBottom: 20,
        textAlign: 'center',
    },
    summaryCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
        padding: 16,
        gap: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    summaryIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 184, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryContent: {
        flex: 1,
    },
    summaryLabel: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary || COLORS.neutral[300],
        marginBottom: 2,
    },
    summaryValue: {
        fontSize: 16,
        color: THEME_COLORS.textPrimary || COLORS.neutral[50],
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    backButtonPlaceholder: {
        width: '45%',
    },
    backButton: {
        width: '45%',
        borderRadius: 12,
        overflow: 'hidden',
    },
    backButtonGradient: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    nextButton: {
        width: '45%',
        borderRadius: 12,
        overflow: 'hidden',
    },
    nextButtonGradient: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    buttonText: {
        color: THEME_COLORS.textPrimary || COLORS.neutral[50],
        fontSize: 16,
        fontWeight: '600',
    },
    nextButtonText: {
        color: COLORS.primary.dark,
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    pickerContainer: {
        padding: 20,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        backgroundColor: THEME_COLORS.background || COLORS.primary.main,
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary || COLORS.neutral[50],
        marginBottom: 16,
        textAlign: 'center',
    },
    doneButton: {
        alignSelf: 'flex-end',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 184, 0, 0.1)',
    },
    doneButtonText: {
        color: COLORS.primary.accent,
        fontSize: 16,
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
        color: THEME_COLORS.textPrimary || COLORS.neutral[50],
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
        color: COLORS.primary.dark || '#000000',
        fontSize: 16,
        fontWeight: 'bold',
    }
});