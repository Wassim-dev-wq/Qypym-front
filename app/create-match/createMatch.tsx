import React, {useState} from 'react';
import {Animated, SafeAreaView, StyleSheet, Text, TouchableOpacity, View,} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {COLORS} from '@/constants/Colors';
import {t} from '@/constants/locales';

type AppRoute =
    | '/matchDetails'
    | '/tournament'
    | '/league';

interface EventType {
    id: string;
    icon: string;
    title: string;
    description: string;
    nextScreen: AppRoute;
}

const eventTypes: EventType[] = [
    {
        id: 'friendly-match',
        icon: 'soccer',
        title: t('friendlyMatch'),
        description: t('friendlyMatchDescription'),
        nextScreen: '/matchDetails',
    },
    {
        id: 'tournament',
        icon: 'trophy',
        title: t('tournament'),
        description: t('tournamentDescription'),
        nextScreen: '/tournament',
    },
    {
        id: 'season',
        icon: 'clipboard-list',
        title: t('season'),
        description: t('seasonDescription'),
        nextScreen: '/league',
    }
];

export default function EventTypeSelectionScreen() {
    const [chosenEventType, setChosenEventType] = useState<string | null>(null);

    const goToNextScreen = () => {
        if (chosenEventType) {
            const selectedEvent = eventTypes.find(event => event.id === chosenEventType);
            if (selectedEvent) {
                router.push(selectedEvent.nextScreen as any);
            }
        }
    };

    return (
        <SafeAreaView style={styles.mainContainer}>
            <StatusBar style="light"/>

            <View style={styles.header}>
                <View style={styles.progressSection}>
                    <View style={styles.progressTrack}>
                        <Animated.View style={[styles.progressIndicator, {width: '25%'}]}/>
                    </View>
                    <Text style={styles.stepCounter}>{t('step1of4')}</Text>
                </View>
                <Text style={styles.screenTitle}>{t('chooseEventType')}</Text>
            </View>

            <View style={styles.eventOptions}>
                {eventTypes.map((event) => (
                    <TouchableOpacity
                        key={event.id}
                        style={[
                            styles.eventCard,
                            chosenEventType === event.id && styles.selectedEventCard
                        ]}
                        onPress={() => setChosenEventType(event.id)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.cardContent}>
                            <View style={[
                                styles.iconBox,
                                chosenEventType === event.id && styles.selectedIconBox
                            ]}>
                                <MaterialCommunityIcons
                                    name={event.icon as any}
                                    size={28}
                                    color={COLORS.primary.accent}
                                />
                            </View>
                            <View style={styles.textContent}>
                                <Text style={[
                                    styles.eventName,
                                    chosenEventType === event.id && styles.selectedEventName
                                ]}>
                                    {event.title}
                                </Text>
                                <Text style={[
                                    styles.eventInfo,
                                    chosenEventType === event.id && styles.selectedEventInfo
                                ]}>
                                    {event.description}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.nextButton,
                        !chosenEventType && styles.disabledButton
                    ]}
                    onPress={goToNextScreen}
                    disabled={!chosenEventType}
                    activeOpacity={0.8}
                >
                    <Text style={styles.buttonText}>
                        {t('next')}
                    </Text>
                    <MaterialCommunityIcons
                        name="arrow-right"
                        size={24}
                        color={COLORS.primary.dark}
                    />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: COLORS.primary.main,
    },
    header: {
        padding: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.divider,
    },
    progressSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    progressTrack: {
        flex: 1,
        height: 4,
        backgroundColor: COLORS.primary.light,
        borderRadius: 2,
        marginRight: 12,
    },
    progressIndicator: {
        height: '100%',
        backgroundColor: COLORS.primary.accent,
        borderRadius: 2,
    },
    stepCounter: {
        fontSize: 14,
        color: COLORS.neutral[300],
        fontFamily: 'Inter_Regular',
    },
    screenTitle: {
        fontSize: 24,
        fontFamily: 'Inter_Bold',
        color: COLORS.neutral[50],
    },
    eventOptions: {
        flex: 1,
        padding: 20,
        gap: 16,
    },
    eventCard: {
        backgroundColor: COLORS.primary.light,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.divider,
    },
    selectedEventCard: {
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        borderColor: COLORS.primary.accent,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.cardAccent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedIconBox: {
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
    },
    textContent: {
        flex: 1,
    },
    eventName: {
        fontSize: 18,
        fontFamily: 'Inter_Bold',
        color: COLORS.neutral[50],
        marginBottom: 4,
    },
    selectedEventName: {
        color: COLORS.primary.accent,
    },
    eventInfo: {
        fontSize: 14,
        fontFamily: 'Inter_Regular',
        color: COLORS.neutral[300],
        lineHeight: 20,
    },
    selectedEventInfo: {
        color: COLORS.neutral[50],
    },
    footer: {
        padding: 20,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.divider,
    },
    nextButton: {
        backgroundColor: COLORS.primary.accent,
        borderRadius: 16,
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    disabledButton: {
        opacity: 0.5,
    },
    buttonText: {
        fontSize: 18,
        fontFamily: 'Inter_SemiBold',
        color: COLORS.primary.dark,
    },
});