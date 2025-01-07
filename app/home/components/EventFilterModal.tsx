import React, { useCallback, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Modal from 'react-native-modal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS } from '../../../constants/Colors';

interface Filters {
    priceRange: [number, number];
    skillLevel: string;
    timeOfDay: string[];
    matchType: string;
    distance: number;
    facilities: string[];
    availability: string[];
    ageRange: [number, number];
    location: string;
}

interface FilterModalProps {
    isVisible: boolean;
    onClose: () => void;
    filters: Filters;
    setFilters: React.Dispatch<React.SetStateAction<Filters>>;
    applyFilters: () => void;
}

const EventFilterModal: React.FC<FilterModalProps> = ({
                                                          isVisible,
                                                          onClose,
                                                          filters,
                                                          setFilters,
                                                          applyFilters,
                                                      }) => {
    const [tempFilters, setTempFilters] = useState<Filters>({
        ...filters,
        timeOfDay: filters.timeOfDay || [],
        facilities: filters.facilities || [],
        availability: filters.availability || [],
    });

    const resetFilters = useCallback(() => {
        setTempFilters({
            priceRange: [0, 100],
            skillLevel: '',
            timeOfDay: [],
            matchType: '',
            distance: 10,
            facilities: [],
            availability: [],
            ageRange: [18, 60],
            location: '',
        });
    }, []);

    const handleClose = useCallback(() => {
        setTempFilters(filters);
        onClose();
    }, [filters, onClose]);

    const handleApply = useCallback(() => {
        setFilters(tempFilters);
        applyFilters();
        onClose();
    }, [tempFilters, setFilters, applyFilters, onClose]);

    const toggleArrayFilter = (array: string[], item: string) => {
        if (array.includes(item)) {
            return array.filter((i) => i !== item);
        }
        return [...array, item];
    };

    const FilterPill: React.FC<{
        label: string;
        isSelected: boolean;
        onPress: () => void;
    }> = ({ label, isSelected, onPress }) => (
        <Pressable
            style={[styles.pill, isSelected && styles.pillSelected]}
            onPress={onPress}
        >
            <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                {label}
            </Text>
        </Pressable>
    );

    const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
                                                                                 title,
                                                                                 children,
                                                                             }) => (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </Animated.View>
    );

    const getActiveCount = useCallback(() => {
        let count = 0;
        if (tempFilters.matchType) count++;
        if (tempFilters.skillLevel) count++;
        if (tempFilters.timeOfDay.length > 0) count++;
        if (tempFilters.facilities.length > 0) count++;
        if (tempFilters.distance !== 10) count++;
        if (tempFilters.priceRange[0] !== 0 || tempFilters.priceRange[1] !== 100)
            count++;
        if (tempFilters.availability.length > 0) count++;
        if (tempFilters.ageRange[0] !== 18 || tempFilters.ageRange[1] !== 60)
            count++;
        return count;
    }, [tempFilters]);

    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={handleClose}
            swipeDirection={['down']}
            onSwipeComplete={handleClose}
            propagateSwipe
            style={styles.modal}
            backdropOpacity={0.4}
            useNativeDriver
            statusBarTranslucent
        >
            <Animated.View entering={FadeInDown.duration(250)} style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <MaterialCommunityIcons name="close" size={24} color={COLORS.neutral[50]} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Filters</Text>
                    <TouchableOpacity onPress={resetFilters} style={styles.resetButton}>
                        <Text style={styles.resetText}>Reset</Text>
                    </TouchableOpacity>
                </View>

                {/* Scrollable sections */}
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <Section title="Match Type">
                        <View style={styles.pillContainer}>
                            <FilterPill
                                label="Competitive"
                                isSelected={tempFilters.matchType === 'Competitive'}
                                onPress={() =>
                                    setTempFilters((prev) => ({
                                        ...prev,
                                        matchType:
                                            prev.matchType === 'Competitive' ? '' : 'Competitive',
                                    }))
                                }
                            />
                            <FilterPill
                                label="Friendly"
                                isSelected={tempFilters.matchType === 'Friendly'}
                                onPress={() =>
                                    setTempFilters((prev) => ({
                                        ...prev,
                                        matchType: prev.matchType === 'Friendly' ? '' : 'Friendly',
                                    }))
                                }
                            />
                        </View>
                    </Section>

                    <Section title="Skill Level">
                        <View style={styles.pillContainer}>
                            {['Beginner', 'Intermediate', 'Advanced', 'Professional'].map(
                                (level) => (
                                    <FilterPill
                                        key={level}
                                        label={level}
                                        isSelected={tempFilters.skillLevel === level}
                                        onPress={() =>
                                            setTempFilters((prev) => ({
                                                ...prev,
                                                skillLevel: prev.skillLevel === level ? '' : level,
                                            }))
                                        }
                                    />
                                )
                            )}
                        </View>
                    </Section>

                    <Section title="Price Range">
                        <View style={styles.priceContainer}>
                            <Text style={styles.priceLabel}>
                                ${tempFilters.priceRange[0]} - ${tempFilters.priceRange[1]}
                            </Text>
                            <Slider
                                style={styles.slider}
                                minimumValue={0}
                                maximumValue={1000}
                                step={5}
                                value={tempFilters.priceRange[0]}
                                onValueChange={(value) =>
                                    setTempFilters((prev) => ({
                                        ...prev,
                                        priceRange: [value, prev.priceRange[1]],
                                    }))
                                }
                                minimumTrackTintColor={COLORS.primary.accent}
                                maximumTrackTintColor={COLORS.neutral[600]}
                                thumbTintColor={COLORS.primary.accent}
                            />
                            <Slider
                                style={[styles.slider, { marginTop: 16 }]}
                                minimumValue={0}
                                maximumValue={1000}
                                step={5}
                                value={tempFilters.priceRange[1]}
                                onValueChange={(value) =>
                                    setTempFilters((prev) => ({
                                        ...prev,
                                        priceRange: [prev.priceRange[0], value],
                                    }))
                                }
                                minimumTrackTintColor={COLORS.primary.accent}
                                maximumTrackTintColor={COLORS.neutral[600]}
                                thumbTintColor={COLORS.primary.accent}
                            />
                        </View>
                    </Section>

                    <Section title="Time of Day">
                        <View style={styles.pillContainer}>
                            {['Morning', 'Afternoon', 'Evening', 'Night'].map((time) => (
                                <FilterPill
                                    key={time}
                                    label={time}
                                    isSelected={tempFilters.timeOfDay.includes(time)}
                                    onPress={() =>
                                        setTempFilters((prev) => ({
                                            ...prev,
                                            timeOfDay: toggleArrayFilter(prev.timeOfDay, time),
                                        }))
                                    }
                                />
                            ))}
                        </View>
                    </Section>

                    <Section title="Facilities">
                        <View style={styles.pillContainer}>
                            {['Showers', 'Parking', 'Equipment', 'Cafe', 'Lockers'].map(
                                (facility) => (
                                    <FilterPill
                                        key={facility}
                                        label={facility}
                                        isSelected={tempFilters.facilities.includes(facility)}
                                        onPress={() =>
                                            setTempFilters((prev) => ({
                                                ...prev,
                                                facilities: toggleArrayFilter(
                                                    prev.facilities,
                                                    facility
                                                ),
                                            }))
                                        }
                                    />
                                )
                            )}
                        </View>
                    </Section>

                    <Section title="Days of the Week">
                        <View style={styles.pillContainer}>
                            {[
                                'Monday',
                                'Tuesday',
                                'Wednesday',
                                'Thursday',
                                'Friday',
                                'Saturday',
                                'Sunday',
                            ].map((day) => (
                                <FilterPill
                                    key={day}
                                    label={day}
                                    isSelected={tempFilters.availability.includes(day)}
                                    onPress={() =>
                                        setTempFilters((prev) => ({
                                            ...prev,
                                            availability: toggleArrayFilter(prev.availability, day),
                                        }))
                                    }
                                />
                            ))}
                        </View>
                    </Section>

                    <Section title="Distance">
                        <View style={styles.distanceContainer}>
                            <Text style={styles.distanceLabel}>
                                Within {tempFilters.distance} km
                            </Text>
                            <Slider
                                style={styles.slider}
                                minimumValue={1}
                                maximumValue={50}
                                step={1}
                                value={tempFilters.distance}
                                onValueChange={(value) =>
                                    setTempFilters((prev) => ({
                                        ...prev,
                                        distance: value,
                                    }))
                                }
                                minimumTrackTintColor={COLORS.primary.accent}
                                maximumTrackTintColor={COLORS.neutral[600]}
                                thumbTintColor={COLORS.primary.accent}
                            />
                        </View>
                    </Section>

                    <Section title="Age Range">
                        <View style={styles.ageContainer}>
                            <Text style={styles.ageLabel}>
                                {tempFilters.ageRange[0]} - {tempFilters.ageRange[1]} years
                            </Text>
                            <Slider
                                style={styles.slider}
                                minimumValue={18}
                                maximumValue={100}
                                step={1}
                                value={tempFilters.ageRange[0]}
                                onValueChange={(value) =>
                                    setTempFilters((prev) => ({
                                        ...prev,
                                        ageRange: [value, prev.ageRange[1]],
                                    }))
                                }
                                minimumTrackTintColor={COLORS.primary.accent}
                                maximumTrackTintColor={COLORS.neutral[600]}
                                thumbTintColor={COLORS.primary.accent}
                            />
                            <Slider
                                style={[styles.slider, { marginTop: 16 }]}
                                minimumValue={18}
                                maximumValue={100}
                                step={1}
                                value={tempFilters.ageRange[1]}
                                onValueChange={(value) =>
                                    setTempFilters((prev) => ({
                                        ...prev,
                                        ageRange: [prev.ageRange[0], value],
                                    }))
                                }
                                minimumTrackTintColor={COLORS.primary.accent}
                                maximumTrackTintColor={COLORS.neutral[600]}
                                thumbTintColor={COLORS.primary.accent}
                            />
                        </View>
                    </Section>

                    <Section title="Location">
                        <View style={styles.locationContainer}>
                            <TextInput
                                style={styles.locationInput}
                                placeholder="Enter location"
                                placeholderTextColor={COLORS.neutral[300]}
                                value={tempFilters.location}
                                onChangeText={(text) =>
                                    setTempFilters((prev) => ({
                                        ...prev,
                                        location: text,
                                    }))
                                }
                            />
                            <MaterialCommunityIcons
                                name="map-marker"
                                size={24}
                                color={COLORS.neutral[300]}
                                style={styles.locationIcon}
                            />
                        </View>
                    </Section>
                </ScrollView>

                {/* Footer */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.showResultsButton} onPress={handleApply}>
                        <Text style={styles.showResultsText}>
                            Show Results {getActiveCount() > 0 ? `(${getActiveCount()})` : ''}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </Modal>
    );
};

export default React.memo(EventFilterModal);

const styles = StyleSheet.create({
    modal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    content: {
        backgroundColor: COLORS.primary.main,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.primary.light,
    },
    closeButton: {
        padding: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.neutral[50],
    },
    resetButton: {
        padding: 8,
    },
    resetText: {
        color: COLORS.primary.accent,
        fontSize: 16,
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.neutral[50],
        marginBottom: 16,
    },
    pillContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.neutral[600],
        backgroundColor: 'transparent',
    },
    pillSelected: {
        backgroundColor: COLORS.primary.accent,
        borderColor: COLORS.primary.accent,
    },
    pillText: {
        color: COLORS.neutral[300],
        fontSize: 14,
        fontWeight: '500',
    },
    pillTextSelected: {
        color: COLORS.primary.main,
    },
    priceContainer: {
        marginTop: 8,
    },
    priceLabel: {
        color: COLORS.neutral[50],
        fontSize: 16,
        marginBottom: 8,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    distanceContainer: {
        marginTop: 8,
    },
    distanceLabel: {
        color: COLORS.neutral[50],
        fontSize: 16,
        marginBottom: 8,
    },
    ageContainer: {
        marginTop: 8,
    },
    ageLabel: {
        color: COLORS.neutral[50],
        fontSize: 16,
        marginBottom: 8,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background.input,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.primary.light,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    locationInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.neutral[50],
    },
    locationIcon: {
        marginLeft: 8,
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.primary.light,
    },
    showResultsButton: {
        backgroundColor: COLORS.primary.accent,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    showResultsText: {
        color: COLORS.primary.main,
        fontSize: 16,
        fontWeight: '600',
    },
});
