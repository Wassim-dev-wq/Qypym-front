import React, {useEffect, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
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
import {COLORS} from '@/constants/Colors';
import {t} from '@/constants/locales';
import {useRouter} from 'expo-router';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import * as Yup from 'yup';
import {Formik, FormikProps} from 'formik';
import {matchesApi} from "@/app/create-match/services/api/matches.api";
import {MATCH_FORMATS, SKILL_LEVELS} from "@/app/utils/types/match/options";
import {SuggestionItem} from "@/app/utils/types/match/suggestionItem";
import {initialMatchDetails, MatchFormData} from "@/app/utils/types/match/matchFormData";


const {width} = Dimensions.get('window');

const matchValidationSchema = Yup.object().shape({
    title: Yup.string()
        .trim()
        .required('Title is required'),
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
        .typeError("Please enter a valid date")
        .required("Date is required")
        .min(new Date(), "Date is too early")
        .test("is-future", "Date must be in the future", function (value) {
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
        .typeError("Please enter a valid time")
        .required("Time is required")
        .test("is-valid-time", "Please enter a valid time", function (value) {
            return !isNaN(value);
        }),
    location: Yup.string()
        .trim()
        .min(2, 'Invalid location')
        .required('Please enter a location'),
    latitude: Yup.number()
        .required('Invalid location selection'),
    longitude: Yup.number()
        .required('Invalid location selection'),
    format: Yup.string()
        .trim()
        .min(2, 'Invalid format')
        .required('Please select a format'),
    duration: Yup.number()
        .min(30, 'Invalid duration')
        .max(180, 'Invalid duration')
        .required('Please enter a duration'),
    skillLevel: Yup.string()
        .oneOf(SKILL_LEVELS.map(level => level.id), 'Invalid skill level')
        .required('Please select a skill level'),
});

const MatchCreationScreen: React.FC = () => {
    const steps = ['General Info', 'Format & Duration', 'Skill Level', 'Confirmation'];
    const [currentStep, setCurrentStep] = useState<number>(0);

    const progressAnimation = useRef(new Animated.Value(0)).current;
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
    const [query, setQuery] = useState<string>('');
    const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

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
            );
            const data: SuggestionItem[] = await response.json();
            const filtered = data
                .filter(item => item.address?.country_code === 'fr')
                .slice(0, 5);
            setSuggestions(filtered);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            Alert.alert(t('messages.error'), t('messages.failedToFetchSuggestions'));
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

    const handleLocationChange = (text: string, setFieldValue: FormikProps<MatchFormData>['setFieldValue']) => {
        setQuery(text);
        setFieldValue('location', text);
        debouncedFetch(text);
    };

    const selectSuggestion = (item: SuggestionItem, setFieldValue: FormikProps<MatchFormData>['setFieldValue']) => {
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
    };

    const handleNext = (formikProps: FormikProps<MatchFormData>) => {
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
                    Alert.alert(t('messages.validationError'), errorMessages);
                } else {
                    if (isLastStep) {
                        formikProps.handleSubmit();
                    } else {
                        setCurrentStep(step => step + 1);
                    }
                }
            })
            .catch(err => {
                console.error(err);
            });
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(step => step - 1);
        }
    };

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

    const renderGeneralInfo = (formikProps: FormikProps<MatchFormData>) => (
        <View style={styles.stepContainer}>
            <TextInput
                style={styles.input}
                value={formikProps.values.title}
                onChangeText={(val) => formikProps.setFieldValue('title', val)}
                onBlur={formikProps.handleBlur('title')}
                placeholder={t('placeholders.matchTitlePlaceholder')}
                placeholderTextColor={COLORS.neutral[400]}
                returnKeyType="next"
            />
            {formikProps.touched.title && formikProps.errors.title && (
                <Text style={styles.errorText}>{formikProps.errors.title}</Text>
            )}

            <TouchableOpacity style={styles.dateTimeBox} onPress={() => setShowDatePicker(true)}>
                <MaterialCommunityIcons name="calendar" size={24} color={COLORS.primary.accent}/>
                <Text style={styles.dateTimeText}>
                    {formikProps.values.date.toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                    })}
                </Text>
            </TouchableOpacity>
            {formikProps.touched.date && formikProps.errors.date && (
                <Text style={styles.errorText}>{formikProps.errors.date as string}</Text>
            )}

            <TouchableOpacity style={styles.dateTimeBox} onPress={() => setShowTimePicker(true)}>
                <MaterialCommunityIcons name="clock" size={24} color={COLORS.primary.accent}/>
                <Text style={styles.dateTimeText}>
                    {formikProps.values.time.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </Text>
            </TouchableOpacity>
            {formikProps.touched.time && formikProps.errors.time && (
                <Text style={styles.errorText}>{formikProps.errors.time as string}</Text>
            )}

            {/* Date Picker */}
            {showDatePicker && (
                Platform.OS === 'android' ? (
                    <DateTimePicker
                        value={formikProps.values.date}
                        mode="date"
                        display="default"
                        minimumDate={new Date()}
                        onChange={(event: DateTimePickerEvent, selected?: Date) => {
                            setShowDatePicker(false);
                            if (selected) {
                                formikProps.setFieldValue('date', selected);
                            }
                        }}
                    />
                ) : (
                    <Modal
                        transparent
                        animationType="slide"
                        visible={showDatePicker}
                        onRequestClose={() => setShowDatePicker(false)}
                    >
                        <View style={styles.modalContainer}>
                            <View style={styles.pickerContainer}>
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
                                    onPress={() => setShowDatePicker(false)}
                                >
                                    <Text style={styles.doneButtonText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>
                )
            )}

            {/* Time Picker */}
            {showTimePicker && (
                Platform.OS === 'android' ? (
                    <DateTimePicker
                        value={formikProps.values.time}
                        mode="time"
                        is24Hour
                        display="default"
                        onChange={(event: DateTimePickerEvent, selected?: Date) => {
                            setShowTimePicker(false);
                            if (selected) {
                                formikProps.setFieldValue('time', selected);
                            }
                        }}
                    />
                ) : (
                    <Modal
                        transparent
                        animationType="slide"
                        visible={showTimePicker}
                        onRequestClose={() => setShowTimePicker(false)}
                    >
                        <View style={styles.modalContainer}>
                            <View style={styles.pickerContainer}>
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
                                    onPress={() => setShowTimePicker(false)}
                                >
                                    <Text style={styles.doneButtonText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>
                )
            )}

            <View style={styles.autocompleteContainer}>
                <TextInput
                    style={styles.input}
                    value={query}
                    onChangeText={(text) => handleLocationChange(text, formikProps.setFieldValue)}
                    placeholder={t('placeholders.locationPlaceholder')}
                    placeholderTextColor={COLORS.neutral[400]}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onFocus={() => {
                    }}
                />
                {loading && (
                    <ActivityIndicator
                        style={styles.loadingIndicator}
                        size="small"
                        color={COLORS.primary.accent}
                    />
                )}
                {suggestions.length > 0 && (
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
                                >
                                    <Text style={styles.suggestionText}>{address}</Text>
                                </TouchableOpacity>
                            );
                        }}
                        style={styles.suggestionsList}
                        keyboardShouldPersistTaps="handled"
                    />
                )}
                {formikProps.touched.location && formikProps.errors.location && (
                    <Text style={styles.errorText}>{formikProps.errors.location}</Text>
                )}
            </View>
        </View>
    );

    const renderFormatAndDuration = (formikProps: FormikProps<MatchFormData>) => (
        <View style={styles.stepContainer}>
            <Text style={styles.label}>{t('fields.format')}</Text>
            <View style={styles.optionContainer}>
                {MATCH_FORMATS.map((fmt) => (
                    <TouchableOpacity
                        key={fmt.format}
                        style={[
                            styles.optionButton,
                            formikProps.values.format === fmt.format && styles.optionSelected,
                        ]}
                        onPress={() => {
                            if (fmt.format === 'Other') {
                                if (Platform.OS === 'ios') {
                                    Alert.prompt(
                                        t('messages.customFormat'),
                                        t('messages.enterCustomFormat'),
                                        (input: string | null) => {
                                            if (input?.trim()) {
                                                formikProps.setFieldValue('format', input.trim());
                                            }
                                        }
                                    );
                                } else {
                                    Alert.alert(
                                        t('messages.customFormat'),
                                        t('messages.enterCustomFormat'),
                                        [
                                            {text: t('buttons.cancel'), style: 'cancel'},
                                            {
                                                text: t('buttons.ok'),
                                                onPress: () =>
                                                    Alert.alert(
                                                        t('messages.info'),
                                                        t('messages.customFormatNotImplemented')
                                                    ),
                                            },
                                        ]
                                    );
                                }
                            } else {
                                formikProps.setFieldValue('format', fmt.format);
                            }
                        }}
                    >
                        <Text
                            style={[
                                styles.optionText,
                                formikProps.values.format === fmt.format && styles.optionTextSelected,
                            ]}
                        >
                            {t(fmt.labelKey)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            {formikProps.touched.format && formikProps.errors.format && (
                <Text style={styles.errorText}>{formikProps.errors.format}</Text>
            )}

            <Text style={[styles.label, {marginTop: 20}]}>
                {t('fields.duration')}: {formikProps.values.duration} {t('minutes')}
            </Text>
            <Slider
                style={{marginHorizontal: -10}}
                minimumValue={10}
                maximumValue={180}
                step={5}
                value={formikProps.values.duration}
                onValueChange={(val: number) => formikProps.setFieldValue('duration', val)}
                minimumTrackTintColor={COLORS.primary.accent}
                maximumTrackTintColor={COLORS.primary.light}
                thumbTintColor={COLORS.primary.accent}
            />
            {formikProps.touched.duration && formikProps.errors.duration && (
                <Text style={styles.errorText}>{formikProps.errors.duration}</Text>
            )}
        </View>
    );

    const renderSkillLevel = (formikProps: FormikProps<MatchFormData>) => (
        <View style={styles.stepContainer}>
            <Text style={styles.label}>{t('fields.skillLevel')}</Text>
            <View style={styles.optionContainer}>
                {SKILL_LEVELS.map(level => (
                    <TouchableOpacity
                        key={level.id}
                        style={[
                            styles.optionButton,
                            formikProps.values.skillLevel === level.id && styles.optionSelected,
                        ]}
                        onPress={() => formikProps.setFieldValue('skillLevel', level.id)}
                    >
                        <MaterialCommunityIcons
                            name={level.icon as any}
                            size={24}
                            color={
                                formikProps.values.skillLevel === level.id
                                    ? COLORS.primary.dark
                                    : COLORS.primary.accent
                            }
                        />
                        <Text
                            style={[
                                styles.optionText,
                                formikProps.values.skillLevel === level.id && styles.optionTextSelected,
                            ]}
                        >
                            {t(level.labelKey)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            {formikProps.touched.skillLevel && formikProps.errors.skillLevel && (
                <Text style={styles.errorText}>{formikProps.errors.skillLevel}</Text>
            )}
        </View>
    );

    const renderConfirmation = (formikProps: FormikProps<MatchFormData>) => (
        <View style={styles.stepContainer}>
            <Text style={styles.reviewText}>{t('messages.reviewDetails')}</Text>
            <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                    <MaterialCommunityIcons
                        name="format-title"
                        size={24}
                        color={COLORS.primary.accent}
                    />
                    <View style={styles.summaryContent}>
                        <Text style={styles.summaryLabel}>{t('fields.title')}</Text>
                        <Text style={styles.summaryValue}>{formikProps.values.title}</Text>
                    </View>
                </View>

                <View style={styles.summaryRow}>
                    <MaterialCommunityIcons
                        name="calendar-clock"
                        size={24}
                        color={COLORS.primary.accent}
                    />
                    <View style={styles.summaryContent}>
                        <Text style={styles.summaryLabel}>
                            {t('fields.date')} &amp; {t('fields.time')}
                        </Text>
                        <Text style={styles.summaryValue}>
                            {formikProps.values.date.toLocaleDateString('fr-FR')} -{' '}
                            {formikProps.values.time.toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </Text>
                    </View>
                </View>

                <View style={styles.summaryRow}>
                    <MaterialCommunityIcons
                        name="map-marker"
                        size={24}
                        color={COLORS.primary.accent}
                    />
                    <View style={styles.summaryContent}>
                        <Text style={styles.summaryLabel}>{t('fields.location')}</Text>
                        <Text style={styles.summaryValue}>{formikProps.values.location}</Text>
                    </View>
                </View>

                <View style={styles.summaryRow}>
                    <MaterialCommunityIcons
                        name="soccer-field"
                        size={24}
                        color={COLORS.primary.accent}
                    />
                    <View style={styles.summaryContent}>
                        <Text style={styles.summaryLabel}>{t('fields.format')}</Text>
                        <Text style={styles.summaryValue}>{formikProps.values.format}</Text>
                    </View>
                </View>

                <View style={styles.summaryRow}>
                    <MaterialCommunityIcons
                        name="clock-outline"
                        size={24}
                        color={COLORS.primary.accent}
                    />
                    <View style={styles.summaryContent}>
                        <Text style={styles.summaryLabel}>{t('fields.duration')}</Text>
                        <Text style={styles.summaryValue}>
                            {formikProps.values.duration} {t('minutes')}
                        </Text>
                    </View>
                </View>

                <View style={styles.summaryRow}>
                    <MaterialCommunityIcons
                        name="star-outline"
                        size={24}
                        color={COLORS.primary.accent}
                    />
                    <View style={styles.summaryContent}>
                        <Text style={styles.summaryLabel}>{t('fields.skillLevel')}</Text>
                        <Text style={styles.summaryValue}>{formikProps.values.skillLevel}</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderCurrentStep = (formikProps: FormikProps<MatchFormData>) => {
        switch (currentStep) {
            case 0:
                return renderGeneralInfo(formikProps);
            case 1:
                return renderFormatAndDuration(formikProps);
            case 2:
                return renderSkillLevel(formikProps);
            case 3:
            default:
                return renderConfirmation(formikProps);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <Formik
                initialValues={initialMatchDetails}
                validationSchema={matchValidationSchema}
                onSubmit={async (values, {resetForm}) => {
                    try {
                        console.log("Creating match with values:", values);
                        await matchesApi.create(values);
                        Alert.alert(t('messages.success'), t('messages.matchCreatedSuccessfully'));
                        resetForm();
                        router.push('../home/MainHomeScreen');
                    } catch (error) {
                        Alert.alert(t('messages.error'), t('messages.failedToCreateMatch'));
                    }
                }}
            >
                {(formikProps: FormikProps<MatchFormData>) => (
                    <KeyboardAwareScrollView
                        style={{flex: 1}}
                        contentContainerStyle={{flexGrow: 1}}
                        keyboardShouldPersistTaps="handled"
                        enableOnAndroid
                        extraScrollHeight={Platform.OS === 'ios' ? 20 : 0}
                    >
                        <View style={styles.header}>
                            <Text style={styles.stepIndicator}>
                                {t('messages.step')} {currentStep + 1} {t('messages.of')} {totalSteps}
                            </Text>
                            <View style={styles.progressContainer}>
                                <Animated.View style={[styles.progressBar, {width: progressWidth}]}/>
                            </View>
                        </View>

                        <View style={styles.body}>{renderCurrentStep(formikProps)}</View>

                        <View style={styles.footer}>
                            {currentStep > 0 && (
                                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                                    <MaterialCommunityIcons name="chevron-left" size={24} color="#fff"/>
                                    <Text style={styles.buttonText}>{t('buttons.back')}</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.nextButton}
                                onPress={() => handleNext(formikProps)}
                            >
                                <Text style={styles.buttonText}>
                                    {isLastStep ? t('buttons.submit') : t('buttons.next')}
                                </Text>
                                {!isLastStep && (
                                    <MaterialCommunityIcons name="chevron-right" size={24} color="#fff"/>
                                )}
                            </TouchableOpacity>
                        </View>
                    </KeyboardAwareScrollView>
                )}
            </Formik>
        </SafeAreaView>
    );
};

export default MatchCreationScreen;

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.primary.main,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
    },
    stepIndicator: {
        fontSize: 16,
        color: COLORS.neutral[200],
        marginBottom: 8,
        textAlign: 'center',
    },
    progressContainer: {
        height: 4,
        backgroundColor: COLORS.primary.light,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary.accent,
    },
    body: {
        flex: 1,
        padding: 20,
    },
    stepContainer: {
        flex: 1,
    },
    input: {
        height: 50,
        borderColor: COLORS.divider,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        backgroundColor: COLORS.cardAccent,
        color: COLORS.neutral[50],
        fontSize: 16,
        marginTop: 16,
    },
    dateTimeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardAccent,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.divider,
        marginTop: 16,
        gap: 10,
    },
    dateTimeText: {
        fontSize: 16,
        color: COLORS.neutral[50],
    },
    label: {
        fontSize: 16,
        color: COLORS.neutral[300],
        marginBottom: 8,
    },
    optionContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    optionButton: {
        padding: 16,
        minWidth: (width - 80) / 2,
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.divider,
        backgroundColor: COLORS.cardAccent,
    },
    optionSelected: {
        backgroundColor: COLORS.primary.accent,
        borderColor: COLORS.primary.accent,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.neutral[50],
    },
    optionTextSelected: {
        color: COLORS.primary.dark,
    },
    reviewText: {
        fontSize: 16,
        color: COLORS.neutral[300],
        marginBottom: 20,
        textAlign: 'center',
    },
    summaryCard: {
        backgroundColor: COLORS.cardAccent,
        borderRadius: 16,
        padding: 16,
        marginTop: 8,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    summaryContent: {
        flex: 1,
    },
    summaryLabel: {
        fontSize: 14,
        color: COLORS.neutral[400],
        marginBottom: 2,
    },
    summaryValue: {
        fontSize: 16,
        color: COLORS.neutral[50],
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 10,
    },
    backButton: {
        backgroundColor: COLORS.primary.accent,
        borderRadius: 16,
        height: 50,
        width: width * 0.4,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    nextButton: {
        backgroundColor: COLORS.primary.accent,
        borderRadius: 16,
        height: 50,
        width: width * 0.4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    pickerContainer: {
        padding: 16,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        backgroundColor: COLORS.primary.main,
    },
    doneButton: {
        marginTop: 10,
        alignSelf: 'flex-end',
        padding: 10,
    },
    doneButtonText: {
        color: COLORS.primary.accent,
        fontSize: 16,
        fontWeight: '600',
    },
    autocompleteContainer: {
        flex: 1,
        marginTop: 16,
        zIndex: 1,
    },
    suggestionsList: {
        maxHeight: 200,
        borderWidth: 1,
        borderColor: COLORS.divider,
        borderRadius: 12,
        backgroundColor: COLORS.cardAccent,
        position: 'absolute',
        width: '100%',
        top: 60,
        left: 0,
        right: 0,
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
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    suggestionText: {
        fontSize: 16,
        color: COLORS.neutral[50],
    },
    loadingIndicator: {
        position: 'absolute',
        right: 10,
        top: 15,
    },
    errorText: {
        color: 'red',
        fontSize: 12,
        marginTop: 4,
    },
});
