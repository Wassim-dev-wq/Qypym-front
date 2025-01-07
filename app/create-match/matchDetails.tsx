import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    TextInput,
    FlatList,
    Keyboard,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { Event } from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { debounce } from 'lodash';
import { COLORS } from '@/constants/Colors';
import { t } from '@/constants/locales';
import { createMatch } from '@/app/create-match/services/api/matches';
import { useRouter } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {MatchDetails, SuggestionItem} from "@/app/create-match/types/matches";
import { SkillLevel } from './types/matches';

const MATCH_FORMATS = ['5v5', '7v7', '11v11', t('custom')];
const SKILL_LEVELS: SkillLevel[] = [
    { id: 'beginner', icon: 'star-outline', label: t('beginner') },
    { id: 'intermediate', icon: 'star-half', label: t('intermediate') },
    { id: 'advanced', icon: 'star', label: t('advanced') },
    { id: 'all', icon: 'star-circle', label: t('allLevels') },
];

const { width } = Dimensions.get('window');

const MatchCreationScreen: React.FC = () => {
    const steps = ['General Info', 'Format & Duration', 'Skill Level', 'Confirmation'];
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [matchDetails, setMatchDetails] = useState<MatchDetails>({
        title: '',
        date: new Date(),
        time: new Date(),
        location: '',
        latitude: undefined,
        longitude: undefined,
        format: '5v5',
        duration: 60,
        skillLevel: 'intermediate',
    });

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

    // Update field with proper typing
    const updateField = useCallback(
        (field: keyof MatchDetails, value: string | number | Date) => {
            setMatchDetails(prev => ({ ...prev, [field]: value }));
        },
        []
    );

    // Fetch suggestions with proper typing
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
                        'User-Agent': 'YourAppName/1.0 (your.email@example.com)',
                    },
                }
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

    // Handle location change
    const handleLocationChange = (text: string): void => {
        setQuery(text);
        updateField('location', text);
        debouncedFetch(text);
    };

    // Select suggestion
    const selectSuggestion = (item: SuggestionItem): void => {
        const { house_number, road, suburb, city, town, village, state, postcode, country } =
            item.address;
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
        updateField('location', address);
        updateField('latitude', parseFloat(item.lat));
        updateField('longitude', parseFloat(item.lon));
        setSuggestions([]);
        Keyboard.dismiss();
    };

    useEffect(() => {
        return () => {
            debouncedFetch.cancel();
        };
    }, [debouncedFetch]);

    // Validate each step
    const validateStep = useCallback((): boolean => {
        switch (currentStep) {
            case 0: {
                if (!matchDetails.title.trim()) {
                    Alert.alert(t('messages.validationError'), t('messages.pleaseEnterTitle'));
                    return false;
                }
                const today = new Date();
                const selectedDate = new Date(matchDetails.date);
                today.setHours(0, 0, 0, 0);
                selectedDate.setHours(0, 0, 0, 0);
                if (selectedDate < today) {
                    Alert.alert(t('messages.validationError'), t('messages.invalidDate'));
                    return false;
                }
                if (matchDetails.location.trim().length < 2) {
                    Alert.alert(t('messages.validationError'), t('messages.invalidLocation'));
                    return false;
                }
                if (matchDetails.latitude === undefined || matchDetails.longitude === undefined) {
                    Alert.alert(t('messages.validationError'), t('messages.invalidLocationSelection'));
                    return false;
                }
                return true;
            }
            case 1: {
                if (
                    !MATCH_FORMATS.includes(matchDetails.format) &&
                    (typeof matchDetails.format !== 'string' || matchDetails.format.trim().length < 2)
                ) {
                    Alert.alert(t('messages.validationError'), t('messages.invalidFormat'));
                    return false;
                }
                if (matchDetails.duration < 30 || matchDetails.duration > 180) {
                    Alert.alert(t('messages.validationError'), t('messages.invalidDuration'));
                    return false;
                }
                return true;
            }
            case 2: {
                if (!SKILL_LEVELS.find(s => s.id === matchDetails.skillLevel)) {
                    Alert.alert(t('messages.validationError'), t('messages.invalidSkillLevel'));
                    return false;
                }
                return true;
            }
            default:
                return true;
        }
    }, [currentStep, matchDetails]);

    // Handle next button
    const handleNext = useCallback(async () => {
        if (!validateStep()) return;
        if (isLastStep) {
            try {
                await createMatch(matchDetails, 'f8c3de3d-1fea-4d7c-a8b0-29f63c4c3454');
                Alert.alert(t('messages.success'), t('messages.matchCreatedSuccessfully'));
                router.push('../home/HomeScreen');
            } catch (error) {
                Alert.alert(t('messages.error'), t('messages.failedToCreateMatch'));
            }
        } else {
            setCurrentStep(step => step + 1);
        }
    }, [validateStep, matchDetails, isLastStep, router]);

    // Handle back button
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

    // Render steps
    const renderGeneralInfo = () => (
        <View style={styles.stepContainer}>
            <TextInput
                style={styles.input}
                value={matchDetails.title}
                onChangeText={val => updateField('title', val)}
                placeholder={t('placeholders.matchTitlePlaceholder')}
                placeholderTextColor={COLORS.neutral[400]}
                returnKeyType="next"
                onSubmitEditing={() => {
                    // Focus on the next input if needed
                }}
                blurOnSubmit={false}
            />

            <TouchableOpacity style={styles.dateTimeBox} onPress={() => setShowDatePicker(true)}>
                <MaterialCommunityIcons name="calendar" size={24} color={COLORS.primary.accent} />
                <Text style={styles.dateTimeText}>
                    {matchDetails.date.toLocaleDateString('fr-FR')}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dateTimeBox} onPress={() => setShowTimePicker(true)}>
                <MaterialCommunityIcons name="clock" size={24} color={COLORS.primary.accent} />
                <Text style={styles.dateTimeText}>
                    {matchDetails.time.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </Text>
            </TouchableOpacity>

            {showDatePicker &&
                (Platform.OS === 'android' ? (
                    <DateTimePicker
                        value={matchDetails.date}
                        mode="date"
                        display="default"
                        minimumDate={new Date()}
                         onChange={(event: Event, selected?: Date) => {
                            setShowDatePicker(false);
                            if (selected) {
                                updateField('date', selected);
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
                                    value={matchDetails.date}
                                    mode="date"
                                    display="spinner"
                                    minimumDate={new Date()}
                                    onChange={(event: Event, selected?: Date) => {
                                        if (selected) {
                                            updateField('date', selected);
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
                ))}

            {showTimePicker &&
                (Platform.OS === 'android' ? (
                    <DateTimePicker
                        value={matchDetails.time}
                        mode="time"
                        is24Hour
                        display="default"
                        onChange={(event: Event, selected?: Date) => {
                            setShowTimePicker(false);
                            if (selected) {
                                updateField('time', selected);
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
                                    value={matchDetails.time}
                                    mode="time"
                                    is24Hour
                                    display="spinner"
                                    onChange={(event: Event, selected?: Date) => {
                                        if (selected) {
                                            updateField('time', selected);
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
                ))}

            <View style={styles.autocompleteContainer}>
                <TextInput
                    style={styles.input}
                    value={query}
                    onChangeText={handleLocationChange}
                    placeholder={t('placeholders.locationPlaceholder')}
                    placeholderTextColor={COLORS.neutral[400]}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onFocus={() => {
                        // Optionally handle focus
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
                        renderItem={({ item }) => {
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
                                    onPress={() => selectSuggestion(item)}
                                >
                                    <Text style={styles.suggestionText}>{address}</Text>
                                </TouchableOpacity>
                            );
                        }}
                        style={styles.suggestionsList}
                        keyboardShouldPersistTaps="handled"
                    />
                )}
            </View>
        </View>
    );

    const renderFormatAndDuration = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.label}>{t('fields.format')}</Text>
            <View style={styles.optionContainer}>
                {MATCH_FORMATS.map(fmt => (
                    <TouchableOpacity
                        key={fmt}
                        style={[
                            styles.optionButton,
                            matchDetails.format === fmt && styles.optionSelected,
                        ]}
                        onPress={() => {
                            if (fmt === t('custom')) {
                                if (Platform.OS === 'ios') {
                                    Alert.prompt(
                                        t('messages.customFormat'),
                                        t('messages.enterCustomFormat'),
                                        (input: string | null) => {
                                            if (input?.trim()) {
                                                updateField('format', input.trim());
                                            }
                                        }
                                    );
                                } else {
                                    Alert.alert(
                                        t('messages.customFormat'),
                                        t('messages.enterCustomFormat'),
                                        [
                                            { text: t('buttons.cancel'), style: 'cancel' },
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
                                updateField('format', fmt);
                            }
                        }}
                    >
                        <Text
                            style={[
                                styles.optionText,
                                matchDetails.format === fmt && styles.optionTextSelected,
                            ]}
                        >
                            {fmt}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>
                {t('fields.duration')}: {matchDetails.duration} {t('minutes')}
            </Text>
            <Slider
                style={{ marginHorizontal: -10 }}
                minimumValue={30}
                maximumValue={180}
                step={15}
                value={matchDetails.duration}
                onValueChange={(val: number) => updateField('duration', val)}
                minimumTrackTintColor={COLORS.primary.accent}
                maximumTrackTintColor={COLORS.primary.light}
                thumbTintColor={COLORS.primary.accent}
            />
        </View>
    );

    const renderSkillLevel = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.label}>{t('fields.skillLevel')}</Text>
            <View style={styles.optionContainer}>
                {SKILL_LEVELS.map(level => (
                    <TouchableOpacity
                        key={level.id}
                        style={[
                            styles.optionButton,
                            matchDetails.skillLevel === level.id && styles.optionSelected,
                        ]}
                        onPress={() => updateField('skillLevel', level.id)}
                    >
                        <MaterialCommunityIcons
                            name={level.icon as any}
                            size={24}
                            color={
                                matchDetails.skillLevel === level.id
                                    ? COLORS.primary.dark
                                    : COLORS.primary.accent
                            }
                        />
                        <Text
                            style={[
                                styles.optionText,
                                matchDetails.skillLevel === level.id && styles.optionTextSelected,
                            ]}
                        >
                            {level.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderConfirmation = () => (
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
                        <Text style={styles.summaryValue}>{matchDetails.title}</Text>
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
                            {matchDetails.date.toLocaleDateString('fr-FR')} -{' '}
                            {matchDetails.time.toLocaleTimeString('fr-FR', {
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
                        <Text style={styles.summaryValue}>{matchDetails.location}</Text>
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
                        <Text style={styles.summaryValue}>{matchDetails.format}</Text>
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
                            {matchDetails.duration} {t('minutes')}
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
                        <Text style={styles.summaryValue}>{matchDetails.skillLevel}</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 0:
                return renderGeneralInfo();
            case 1:
                return renderFormatAndDuration();
            case 2:
                return renderSkillLevel();
            case 3:
            default:
                return renderConfirmation();
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAwareScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid
                extraScrollHeight={Platform.OS === 'ios' ? 20 : 0}
            >
                <View style={styles.header}>
                    <Text style={styles.stepIndicator}>
                        {t('messages.step')} {currentStep + 1} {t('messages.of')} {totalSteps}
                    </Text>
                    <View style={styles.progressContainer}>
                        <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
                    </View>
                </View>

                <View style={styles.body}>{renderCurrentStep()}</View>

                <View style={styles.footer}>
                    {currentStep > 0 && (
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <MaterialCommunityIcons name="chevron-left" size={24} color="#fff" />
                            <Text style={styles.buttonText}>{t('buttons.back')}</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                        <Text style={styles.buttonText}>
                            {isLastStep ? t('buttons.submit') : t('buttons.next')}
                        </Text>
                        {!isLastStep && (
                            <MaterialCommunityIcons name="chevron-right" size={24} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAwareScrollView>
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
                shadowOffset: { width: 0, height: 2 },
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
});
