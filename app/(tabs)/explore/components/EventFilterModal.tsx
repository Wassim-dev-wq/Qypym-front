import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Keyboard,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Modal from 'react-native-modal';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    FadeOut,
    FadeOutUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import {LinearGradient} from 'expo-linear-gradient';
import {debounce} from 'lodash';
import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {t} from 'src/constants/locales';
import {LocationObject} from 'expo-location';
import {Filters, Place} from '@/src/types/match/filters';

interface ModalProps {
    isVisible: boolean;
    onClose: () => void;
    currentFilters: Filters;
    updateFilters: (filters: Filters) => void;
    applyFilters: () => void;
    userLocation: LocationObject | null;
    resetFilters?: () => void;
}

const DEFAULT_FILTERS: Filters = {
    searchQuery: '',
    skillLevels: [],
    formats: [],
    statuses: [],
    distance: 10,
    location: null,
    timeOfDay: [],
    ageRange: [18, 60],
    minPlayers: 1,
    sortBy: null
};

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const AnimatedPress = Animated.createAnimatedComponent(Pressable);

const getCountryFromCoords = (location: LocationObject): string => {


    return '';
};

const normalizeFilters = (filters: Partial<Filters>): Filters => {
    return {
        searchQuery: filters.searchQuery || '',
        skillLevels: filters.skillLevels || [],
        formats: filters.formats || [],
        statuses: filters.statuses || [],
        distance: filters.distance || 10,
        location: filters.location || null,
        timeOfDay: filters.timeOfDay || [],
        ageRange: filters.ageRange || [18, 60],
        minPlayers: filters.minPlayers || 1,
        sortBy: filters.sortBy || null
    };
};

const Chip = memo(
    ({
         label,
         isSelected,
         onPress,
         multiSelect = true,
     }: {
        label: string;
        isSelected: boolean;
        onPress: () => void;
        multiSelect?: boolean;
    }) => {
        const scaleVal = useSharedValue(1);
        const chipStyle = useAnimatedStyle(() => ({
            transform: [{scale: scaleVal.value}],
        }));

        const handlePress = useCallback(() => {
            scaleVal.value = withSpring(
                0.95,
                {mass: 0.5, damping: 20, stiffness: 200},
                () => {
                    scaleVal.value = withSpring(1, {
                        mass: 0.5,
                        damping: 20,
                        stiffness: 200,
                    });
                }
            );
            onPress();
        }, [onPress, scaleVal]);

        return (
            <AnimatedPress
                style={[styles.chip, isSelected && styles.chipSelected, chipStyle]}
                onPress={handlePress}
            >
                {multiSelect && isSelected && (
                    <MaterialCommunityIcons name="check" size={16} color="#000" style={styles.checkIcon}/>
                )}
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{label}</Text>
            </AnimatedPress>
        );
    }
);

const SectionComponent = memo(
    ({title, children}: { title: string; children: React.ReactNode }) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    )
);

const PlaceSearch = memo(
    ({
         onSelectPlace,
         initialPlace,
         userLocation,
     }: {
        onSelectPlace: (place: Place | null) => void;
        initialPlace: Place | null;
        userLocation: LocationObject | null;
    }) => {
        const [query, setQuery] = useState(initialPlace?.name || '');
        const [places, setPlaces] = useState<Place[]>([]);
        const [loading, setLoading] = useState(false);
        const [noResults, setNoResults] = useState(false);

        useEffect(() => {

            if (initialPlace) {
                setQuery(initialPlace.name);
                setPlaces([]);
            } else {
                setQuery('');
            }
        }, [initialPlace]);

        const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
            const R = 6371;
            const dLat = (lat2 - lat1) * (Math.PI / 180);
            const dLon = (lon2 - lon1) * (Math.PI / 180);
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * (Math.PI / 180)) *
                Math.cos(lat2 * (Math.PI / 180)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return Math.round(R * c);
        };

        const getNearbyPlaces = useCallback(async () => {
            if (!userLocation) return;

            setLoading(true);
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.coords.latitude}&lon=${userLocation.coords.longitude}`
                );

                if (!response.ok) {
                    throw new Error(`Reverse geocoding failed: ${response.status}`);
                }

                const data = await response.json();

                if (data) {
                    const currentLocation: Place = {
                        id: 'current-location',
                        name: t('current_location'),
                        address: data.display_name || t('your_location'),
                        coordinates: {
                            latitude: userLocation.coords.latitude,
                            longitude: userLocation.coords.longitude,
                        },
                        distance: 0,
                        isValidated: true
                    };

                    setPlaces([currentLocation]);
                    setNoResults(false);
                }
            } catch (error) {
                console.error('Error getting current location details', error);
                setPlaces([]);
            } finally {
                setLoading(false);
            }
        }, [userLocation]);

        const searchPlaces = useCallback(
            debounce(async (q: string) => {
                if (!q.trim()) {
                    setPlaces([]);
                    setNoResults(false);
                    getNearbyPlaces();
                    return;
                }

                setLoading(true);
                setNoResults(false);

                try {

                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=${userLocation ? getCountryFromCoords(userLocation) : ''}`
                    );

                    if (!response.ok) {
                        throw new Error(`Search failed: ${response.status}`);
                    }

                    const data = await response.json();

                    if (data.length === 0) {
                        setNoResults(true);
                        setPlaces([]);
                        return;
                    }

                    const results: Place[] = data.map((item: any) => ({
                        id: item.place_id,
                        name: item.display_name.split(',')[0],
                        address: item.display_name,
                        coordinates: {
                            latitude: parseFloat(item.lat),
                            longitude: parseFloat(item.lon),
                        },
                        isValidated: true
                    }));

                    if (userLocation) {
                        results.forEach((p) => {
                            if (p.coordinates) {
                                p.distance = calculateDistance(
                                    userLocation.coords.latitude,
                                    userLocation.coords.longitude,
                                    p.coordinates.latitude,
                                    p.coordinates.longitude
                                );
                            }
                        });

                        results.sort((a, b) => (a.distance || 999) - (b.distance || 999));
                    }

                    setPlaces(results);
                    setNoResults(false);
                } catch (error) {
                    console.error(t('error_fetching_places'), error);
                    setPlaces([]);
                    setNoResults(true);
                } finally {
                    setLoading(false);
                }
            }, 500),
            [userLocation, getNearbyPlaces]
        );

        useEffect(() => {
            if (!query && !initialPlace) {
                getNearbyPlaces();
            } else if (query && !initialPlace) {
                searchPlaces(query);
            }

            return () => {
                searchPlaces.cancel();
            };
        }, []);

        const handleQueryChange = (text: string) => {
            setQuery(text);
            searchPlaces(text);
        };

        const clearQuery = useCallback(() => {
            setQuery('');
            if (initialPlace) {
                onSelectPlace(null);
            }
            setPlaces([]);
            setNoResults(false);
            getNearbyPlaces();
        }, [initialPlace, onSelectPlace, getNearbyPlaces]);

        return (
            <View style={styles.placeSearchContainer}>
                <View style={[
                    styles.placeInputWrapper,
                    initialPlace && styles.placeInputWrapperActive
                ]}>
                    <MaterialCommunityIcons
                        name="map-marker"
                        size={24}
                        color={initialPlace ? COLORS.primary.accent : THEME_COLORS.textSecondary}
                    />
                    <TextInput
                        style={styles.placeInput}
                        placeholder={t('search_place_placeholder')}
                        placeholderTextColor={THEME_COLORS.textPlaceholder}
                        value={query}
                        onChangeText={handleQueryChange}
                    />
                    {loading && (
                        <ActivityIndicator
                            size="small"
                            color={COLORS.primary.accent}
                            style={styles.loadingIndicator}
                        />
                    )}
                    {query ? (
                        <TouchableOpacity
                            onPress={clearQuery}
                            style={styles.clearButton}
                            hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}
                        >
                            <MaterialCommunityIcons
                                name="close-circle"
                                size={20}
                                color={THEME_COLORS.textSecondary}
                            />
                        </TouchableOpacity>
                    ) : initialPlace && (
                        <TouchableOpacity
                            onPress={clearQuery}
                            style={styles.clearButton}
                            hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}
                        >
                            <MaterialCommunityIcons
                                name="close-circle-outline"
                                size={20}
                                color={COLORS.primary.accent}
                            />
                        </TouchableOpacity>
                    )}
                </View>
                {initialPlace && (
                    <Animated.View
                        entering={FadeIn.duration(300)}
                        exiting={FadeOut.duration(200)}
                        style={styles.selectedLocationContainer}
                    >
                        <LinearGradient
                            colors={['rgba(255, 184, 0, 0.1)', 'rgba(255, 184, 0, 0.05)']}
                            style={styles.selectedLocationGradient}
                        >
                            <MaterialCommunityIcons
                                name="map-marker-check"
                                size={18}
                                color={COLORS.primary.accent}
                            />
                            <View style={styles.selectedLocationTextContainer}>
                                <Text style={styles.selectedLocationTitle} numberOfLines={1}>
                                    {initialPlace.name}
                                </Text>
                                <Text style={styles.selectedLocationAddress} numberOfLines={1}>
                                    {initialPlace.address}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={clearQuery}
                                style={styles.editLocationButton}
                                hitSlop={{top: 8, right: 8, bottom: 8, left: 8}}
                            >
                                <Text style={styles.editLocationText}>{t('change')}</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </Animated.View>
                )}

                {places.length > 0 && !initialPlace && (
                    <Animated.View
                        entering={FadeInDown.duration(300).springify()}
                        exiting={FadeOutUp.duration(200)}
                        style={styles.suggestionsContainer}
                    >
                        {places.map((p) => (
                            <TouchableOpacity
                                key={p.id}
                                style={[
                                    styles.suggestionItem,
                                    p.isValidated && styles.validatedSuggestion
                                ]}
                                onPress={() => {
                                    onSelectPlace(p);
                                    setQuery(p.name);
                                    setPlaces([]);
                                    Keyboard.dismiss();
                                }}
                            >
                                <View style={styles.suggestionContent}>
                                    <Text style={styles.suggestionTitle} numberOfLines={1} ellipsizeMode="tail">
                                        {p.name}
                                    </Text>
                                    <Text style={styles.suggestionAddress} numberOfLines={2} ellipsizeMode="tail">
                                        {p.address}
                                    </Text>
                                </View>
                                <View style={styles.suggestionMeta}>
                                    {p.distance !== undefined && (
                                        <Text style={styles.suggestionDistance}>
                                            {p.distance === 0 ? t('here') : `${p.distance} km`}
                                        </Text>
                                    )}
                                    <MaterialCommunityIcons
                                        name="chevron-right"
                                        size={20}
                                        color={THEME_COLORS.textSecondary}
                                    />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </Animated.View>
                )}
                {noResults && query.length > 0 && !loading && (
                    <Animated.View
                        entering={FadeInDown.duration(200)}
                        style={styles.noResultsContainer}
                    >
                        <Text style={styles.noResultsText}>{t('no_places_found')}</Text>
                        <TouchableOpacity
                            style={styles.tryAgainButton}
                            onPress={clearQuery}
                        >
                            <Text style={styles.tryAgainText}>{t('try_different_search')}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>
        );
    }
);

const EventFilterModal = memo(
    ({
         isVisible,
         onClose,
         currentFilters,
         updateFilters,
         applyFilters,
         userLocation,
         resetFilters
     }: ModalProps) => {
        const initialFilters = useMemo(() => normalizeFilters(currentFilters || DEFAULT_FILTERS),
            [currentFilters]);
        const [tempFilters, setTempFilters] = useState<Filters>(initialFilters);
        const hasChangesRef = useRef(false);
        const scrollY = useSharedValue(0);
        const didInitialLoad = useRef(false);
        const isFirstRenderRef = useRef(true);
        const hasPendingChanges = useRef(false);
        const activeModalRef = useRef(false);

        const [isModalMounted, setIsModalMounted] = useState(false);

        useEffect(() => {
            if (isVisible) {
                setTempFilters(normalizeFilters(currentFilters || DEFAULT_FILTERS));
            }
        }, [isVisible, currentFilters]);

        useEffect(() => {
            if (isVisible) {
                if (activeModalRef.current) {
                    setIsModalMounted(false);
                    hasPendingChanges.current = false;
                }
                activeModalRef.current = true;
                setIsModalMounted(true);
                if (isFirstRenderRef.current || !isModalMounted) {
                    setTempFilters(normalizeFilters(currentFilters || DEFAULT_FILTERS));
                }

                if (isFirstRenderRef.current) {
                    isFirstRenderRef.current = false;
                }
                if (!didInitialLoad.current && userLocation) {
                    didInitialLoad.current = true;
                }
            } else {

                if (isModalMounted) {
                    const cleanupTimer = setTimeout(() => {
                        setIsModalMounted(false);
                        hasPendingChanges.current = false;
                        activeModalRef.current = false;
                    }, 300);

                    return () => clearTimeout(cleanupTimer);
                }
            }
        }, [isVisible, currentFilters, userLocation, isModalMounted]);

        const handleFiltersUpdate = useCallback(
            (updates: Partial<Filters>) => {
                setTempFilters(prev => {
                    const newFilters = {...prev, ...updates};
                    return newFilters;
                });
            },
            []
        );

        const applyChangesAndSearch = useCallback(() => {
            console.log('Event applying changes and searching... Temp filters:', tempFilters);
            updateFilters(tempFilters);
            applyFilters();
            onClose();
        }, [tempFilters, updateFilters, applyFilters, onClose]);

        const handleResetFilters = useCallback(() => {
            setTempFilters(DEFAULT_FILTERS);
            if (resetFilters) {
                resetFilters();
            }
        }, [resetFilters, onClose]);

        const handleCloseModal = useCallback(() => {
            onClose();
        }, [onClose]);

        const activeFilterCount = useMemo(() => {
            let count = 0;
            if (tempFilters.searchQuery) count++;
            if (tempFilters.skillLevels?.length > 0) count++;
            if (tempFilters.formats?.length > 0) count++;
            if (tempFilters.statuses?.length > 0) count++;
            if (tempFilters.location) count++;
            if (tempFilters.distance !== 10) count++;
            if (tempFilters.timeOfDay?.length > 0) count++;
            return count;
        }, [tempFilters]);

        if (!isVisible && !isModalMounted) return null;

        return (
            <Modal
                isVisible={isVisible}
                onBackdropPress={handleCloseModal}
                onSwipeComplete={undefined}
                propagateSwipe={false}
                style={styles.modal}
                backdropOpacity={0.5}
                useNativeDriver={true}
                statusBarTranslucent={true}
                animationIn="slideInUp"
                panResponderThreshold={10}
                avoidKeyboard={true}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.handle}/>
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={handleCloseModal}
                            style={styles.headerButton}
                            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                        >
                            <MaterialCommunityIcons name="close" size={24} color={THEME_COLORS.textPrimary}/>
                        </TouchableOpacity>

                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>{t('filters')}</Text>
                        </View>

                        <TouchableOpacity
                            onPress={handleResetFilters}
                            style={styles.headerButton}
                            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                        >
                            <Text style={styles.resetText}>{t('reset')}</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        bounces={true}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        onTouchStart={() => {
                        }}
                        onScroll={(event) => {
                            scrollY.value = event.nativeEvent.contentOffset.y;
                        }}
                    >
                        <SectionComponent title={t('search_query')}>
                            <View style={styles.searchInputWrapper}>
                                <MaterialCommunityIcons
                                    name="magnify"
                                    size={22}
                                    color={THEME_COLORS.textSecondary}
                                />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder={t('search_by_title_placeholder')}
                                    placeholderTextColor={THEME_COLORS.textPlaceholder}
                                    value={tempFilters.searchQuery}
                                    onChangeText={(txt) =>
                                        handleFiltersUpdate({searchQuery: txt})
                                    }
                                />
                                {tempFilters.searchQuery ? (
                                    <TouchableOpacity
                                        onPress={() => handleFiltersUpdate({searchQuery: ''})}
                                        style={styles.clearButton}
                                    >
                                        <MaterialCommunityIcons
                                            name="close-circle"
                                            size={20}
                                            color={THEME_COLORS.textSecondary}
                                        />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </SectionComponent>
                        <SectionComponent title={t('place')}>
                            <PlaceSearch
                                onSelectPlace={(place) => handleFiltersUpdate({location: place})}
                                initialPlace={tempFilters.location}
                                userLocation={userLocation}
                            />
                        </SectionComponent>
                        <SectionComponent title={t('distance')}>
                            <View style={styles.sliderContainer}>
                                <View style={styles.sliderHeader}>
                                    <Text style={styles.sliderValue}>{tempFilters.distance} km</Text>
                                </View>
                                <Slider
                                    style={styles.slider}
                                    minimumValue={1}
                                    maximumValue={50}
                                    step={1}
                                    value={tempFilters.distance}
                                    onValueChange={(value) => handleFiltersUpdate({distance: value})}
                                    minimumTrackTintColor={COLORS.primary.accent}
                                    maximumTrackTintColor={THEME_COLORS.cardAccent}
                                    thumbTintColor={COLORS.primary.accent}
                                />
                                <View style={styles.sliderMarks}>
                                    <Text style={styles.sliderMarkText}>1 km</Text>
                                    <Text style={styles.sliderMarkText}>25 km</Text>
                                    <Text style={styles.sliderMarkText}>50 km</Text>
                                </View>
                            </View>
                        </SectionComponent>
                        <SectionComponent title={t('match_format')}>
                            <View style={styles.chipsContainer}>
                                {[
                                    {key: '5v5', label: '5v5'},
                                    {key: '7v7', label: '7v7'},
                                    {key: '11v11', label: '11v11'},
                                    {key: 'Other', label: t('other')},
                                ].map(({key, label}) => (
                                    <Chip
                                        key={key}
                                        label={label}
                                        isSelected={tempFilters.formats?.includes(key) || false}
                                        onPress={() => {
                                            const formats = tempFilters.formats || [];
                                            const alreadySelected = formats.includes(key);
                                            const newFormats = alreadySelected
                                                ? formats.filter((f) => f !== key)
                                                : [...formats, key];

                                            handleFiltersUpdate({
                                                formats: newFormats,
                                            });
                                        }}
                                    />
                                ))}
                            </View>
                        </SectionComponent>

                        <SectionComponent title={t('skill_level')}>
                            <View style={styles.chipsContainer}>
                                {[
                                    {key: 'BEGINNER', label: t('beginner')},
                                    {key: 'INTERMEDIATE', label: t('intermediate')},
                                    {key: 'ADVANCED', label: t('advanced')},
                                    {key: 'ALL', label: t('all')},
                                ].map(({key, label}) => (
                                    <Chip
                                        key={key}
                                        label={label}
                                        isSelected={tempFilters.skillLevels?.includes(key) || false}
                                        onPress={() => {
                                            const skillLevels = tempFilters.skillLevels || [];
                                            const found = skillLevels.includes(key);
                                            const newLevels = found
                                                ? skillLevels.filter((l) => l !== key)
                                                : [...skillLevels, key];
                                            handleFiltersUpdate({skillLevels: newLevels});
                                        }}
                                    />
                                ))}
                            </View>
                        </SectionComponent>
                        <View style={{height: 80}}/>
                    </ScrollView>

                    <LinearGradient
                        colors={['transparent', 'rgba(10,10,10,0.95)']}
                        style={styles.footerGradient}
                        pointerEvents="none"
                    />
                    <Animated.View entering={FadeInUp.duration(300)} style={styles.footer}>
                        <LinearGradient
                            colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                            style={styles.applyButton}
                        >
                            <TouchableOpacity
                                style={styles.applyButtonTouchable}
                                onPress={applyChangesAndSearch}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.applyButtonText}>
                                    {t('show_results')} {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
                                </Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </Animated.View>
                </View>
            </Modal>
        );
    }
);

const styles = StyleSheet.create({
    modal: {
        margin: 0,
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: THEME_COLORS.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '90%',
        width: '100%',
        overflow: 'hidden',
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: THEME_COLORS.divider,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: THEME_COLORS.divider,
    },
    headerButton: {
        padding: 8,
        borderRadius: 20,
        zIndex: 1,
    },
    headerTitleContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        top: 0,
        bottom: 0,
        zIndex: 0,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: THEME_COLORS.textPrimary,
    },
    resetText: {
        color: COLORS.primary.accent,
        fontSize: 16,
        fontWeight: '500',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginBottom: 16,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(26,26,26,0.9)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    searchInput: {
        flex: 1,
        color: THEME_COLORS.textPrimary,
        fontSize: 16,
        height: Platform.OS === 'ios' ? 24 : undefined,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
        backgroundColor: 'rgba(26,26,26,0.9)',
    },
    chipSelected: {
        backgroundColor: COLORS.primary.accent,
        borderColor: COLORS.primary.accent,
    },
    chipText: {
        color: THEME_COLORS.textSecondary,
        fontSize: 14,
        fontWeight: '500',
    },
    chipTextSelected: {
        color: '#000',
    },
    checkIcon: {
        marginRight: 6,
    },
    placeSearchContainer: {
        gap: 8,
    },
    placeInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(26,26,26,0.9)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    placeInputWrapperActive: {
        borderColor: COLORS.primary.accent,
        borderWidth: 1.5,
    },
    placeInput: {
        flex: 1,
        color: THEME_COLORS.textPrimary,
        fontSize: 16,
        height: Platform.OS === 'ios' ? 24 : undefined,
    },
    loadingIndicator: {
        marginLeft: 4,
    },
    clearButton: {
        padding: 4,
    },
    suggestionsContainer: {
        backgroundColor: 'rgba(26,26,26,0.95)',
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.25,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    suggestionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: THEME_COLORS.divider,
    },
    validatedSuggestion: {
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary.accent,
    },
    suggestionContent: {
        flex: 1,
        marginRight: 8,
    },
    suggestionMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    suggestionTitle: {
        color: THEME_COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    suggestionAddress: {
        color: THEME_COLORS.textSecondary,
        fontSize: 13,
    },
    suggestionDistance: {
        color: COLORS.primary.accent,
        fontSize: 14,
        fontWeight: '500',
    },
    noResultsContainer: {
        backgroundColor: 'rgba(26,26,26,0.7)',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginTop: 8,
    },
    noResultsText: {
        color: THEME_COLORS.textSecondary,
        fontSize: 14,
        marginBottom: 8,
    },
    tryAgainButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255, 184, 0, 0.1)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.2)',
    },
    tryAgainText: {
        color: COLORS.primary.accent,
        fontSize: 13,
        fontWeight: '500',
    },
    selectedLocationContainer: {
        marginVertical: 8,
    },
    selectedLocationGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        padding: 12,
        gap: 8,
    },
    selectedLocationTextContainer: {
        flex: 1,
    },
    selectedLocationTitle: {
        color: COLORS.primary.accent,
        fontSize: 14,
        fontWeight: '600',
    },
    selectedLocationAddress: {
        color: THEME_COLORS.textSecondary,
        fontSize: 12,
    },
    editLocationButton: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 184, 0, 0.2)',
    },
    editLocationText: {
        color: COLORS.primary.accent,
        fontSize: 12,
        fontWeight: '600',
    },
    sliderContainer: {
        gap: 12,
    },
    sliderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sliderValue: {
        color: THEME_COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    slider: {
        width: '100%',
        height: 40,
    },
    sliderMarks: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    sliderMarkText: {
        color: THEME_COLORS.textSecondary,
        fontSize: 12,
    },
    footerGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        zIndex: 1,
    },
    footer: {
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        backgroundColor: 'transparent',
        position: 'relative',
        zIndex: 2,
    },
    applyButton: {
        borderRadius: 12,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: COLORS.primary.accent,
                shadowOffset: {width: 0, height: 4},
                shadowOpacity: 0.3,
                shadowRadius: 4,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    applyButtonTouchable: {
        paddingVertical: 16,
        alignItems: 'center',
        width: '100%',
    },
    applyButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default memo(EventFilterModal);