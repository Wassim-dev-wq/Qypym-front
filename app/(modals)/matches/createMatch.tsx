import React, {useEffect, useRef, useState} from 'react';
import {Animated, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {LinearGradient} from 'expo-linear-gradient';
import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {t} from 'src/constants/locales';
import {useSafeAreaInsets} from "react-native-safe-area-context";

type AppRoute = string;

interface EventTypeItem {
    id: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    title: string;
    description: string;
    nextScreen: AppRoute;
    comingSoon?: boolean;
}

const steps: EventTypeItem[] = [
    {
        id: 'friendly-match',
        icon: 'soccer',
        title: t('friendlyMatch'),
        description: t('friendlyMatchDescription'),
        nextScreen: './matchDetails'
    },
    {
        id: 'tournament',
        icon: 'trophy',
        title: t('tournament'),
        description: t('tournamentDescription'),
        nextScreen: '/tournament',
        comingSoon: true
    }
];

export default function EventTypeSelectionScreen() {
    const [chosenId, setChosenId] = useState<string | null>(null);
    const router = useRouter();
    const progressAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const zoomAnim = useRef(new Animated.Value(0.95)).current;
    const edgeInsets = useSafeAreaInsets();
    useEffect(() => {
        Animated.parallel([
            Animated.timing(progressAnim, {
                toValue: 25,
                duration: 800,
                useNativeDriver: false
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true
            }),
            Animated.spring(zoomAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true
            })
        ]).start();
    }, []);

    const chooseEvent = (id: string) => {
        setChosenId(id);
        const bounceVal = new Animated.Value(1);
        Animated.sequence([
            Animated.timing(bounceVal, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true
            }),
            Animated.spring(bounceVal, {
                toValue: 1,
                friction: 4,
                tension: 40,
                useNativeDriver: true
            })
        ]).start();
    };
    const goNext = () => {
        if (chosenId) {
            const picked = steps.find(x => x.id === chosenId);
            if (picked && !picked.comingSoon) {
                router.push(picked.nextScreen as any);
            }
        }
    };

    const headBoxStyle = {
        ...styles.headBox,
        paddingTop: Platform.OS === 'ios' ? 20 : edgeInsets.top,
        paddingBottom: Platform.OS === 'ios' ? 20 : 20
    }
    return (
        <SafeAreaView style={styles.mainBox}>
            <StatusBar style="light"/>
            <Animated.View
                style={[
                    styles.innerWrap,
                    {
                        opacity: fadeAnim,
                        transform: [{scale: zoomAnim}]
                    }
                ]}
            >
                <View style={headBoxStyle}>
                    <View style={styles.progressArea}>
                        <View style={styles.progressLine}>
                            <Animated.View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: progressAnim.interpolate({
                                            inputRange: [0, 100],
                                            outputRange: ['0%', '100%']
                                        })
                                    }
                                ]}
                            />
                        </View>
                        <Text style={styles.stepCount}>{t('step1of4')}</Text>
                    </View>
                    <Text style={styles.screenTitle}>{t('chooseEventType')}</Text>
                </View>
                <View style={styles.eventArea}>
                    {steps.map(evt => (
                        <TouchableOpacity
                            key={evt.id}
                            style={[
                                styles.eventCard,
                                chosenId === evt.id && styles.eventChosen,
                                evt.comingSoon && styles.eventSoon
                            ]}
                            onPress={() => !evt.comingSoon && chooseEvent(evt.id)}
                            activeOpacity={evt.comingSoon ? 0.9 : 0.7}
                            disabled={evt.comingSoon}
                        >
                            <LinearGradient
                                colors={
                                    chosenId === evt.id
                                        ? ['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)']
                                        : ['rgba(26,26,26,0.9)', 'rgba(17,17,17,0.8)']
                                }
                                style={styles.cardGrad}
                            >
                                <View style={styles.cardBody}>
                                    <View
                                        style={[
                                            styles.iconWrap,
                                            chosenId === evt.id && styles.iconHighlight
                                        ]}
                                    >
                                        <MaterialCommunityIcons
                                            name={evt.icon}
                                            size={28}
                                            color={COLORS.primary.accent}
                                        />
                                    </View>
                                    <View style={styles.textWrap}>
                                        <Text
                                            style={[
                                                styles.eventTitle,
                                                chosenId === evt.id && styles.eventTitleActive
                                            ]}
                                        >
                                            {evt.title}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.eventDesc,
                                                chosenId === evt.id && styles.eventDescActive
                                            ]}
                                        >
                                            {evt.description}
                                        </Text>
                                    </View>
                                </View>
                                {evt.comingSoon && (
                                    <View style={styles.soonFlag}>
                                        <LinearGradient
                                            colors={[
                                                'rgba(255, 215, 0, 0.2)',
                                                'rgba(255, 215, 0, 0.05)'
                                            ]}
                                            start={{x: 0, y: 0}}
                                            end={{x: 1, y: 0}}
                                            style={styles.soonGrad}
                                        >
                                            <Text style={styles.soonTxt}>Bientôt disponible</Text>
                                        </LinearGradient>
                                    </View>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.footerBox}>
                    <TouchableOpacity
                        style={[
                            styles.nextBtn,
                            !chosenId && styles.btnOff
                        ]}
                        onPress={goNext}
                        disabled={!chosenId}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 1}}
                            style={styles.nextGrad}
                        >
                            <Text style={styles.nextTxt}>{t('next')}</Text>
                            <MaterialCommunityIcons
                                name="arrow-right"
                                size={24}
                                color={COLORS.primary.dark}
                            />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mainBox: {
        flex: 1,
        backgroundColor: THEME_COLORS.background || COLORS.primary.main
    },
    innerWrap: {
        flex: 1
    },
    headBox: {
        padding: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: THEME_COLORS.divider
    },
    progressArea: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    progressLine: {
        flex: 1,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        marginRight: 12,
        overflow: 'hidden'
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.primary.accent,
        borderRadius: 2
    },
    stepCount: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
        fontWeight: '400'
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: THEME_COLORS.textPrimary
    },
    eventArea: {
        flex: 1,
        padding: 20,
        gap: 16
    },
    eventCard: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4
    },
    cardGrad: {
        padding: 20
    },
    eventChosen: {
        borderColor: COLORS.primary.accent
    },
    eventSoon: {
        opacity: 0.8
    },
    cardBody: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16
    },
    iconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    iconHighlight: {
        backgroundColor: 'rgba(255, 215, 0, 0.2)'
    },
    textWrap: {
        flex: 1
    },
    eventTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: THEME_COLORS.textPrimary,
        marginBottom: 4
    },
    eventTitleActive: {
        color: COLORS.primary.accent
    },
    eventDesc: {
        fontSize: 14,
        fontWeight: '400',
        color: THEME_COLORS.textSecondary,
        lineHeight: 20
    },
    eventDescActive: {
        color: THEME_COLORS.textPrimary
    },
    soonFlag: {
        position: 'absolute',
        top: 16,
        right: 16,
        overflow: 'hidden',
        borderRadius: 12
    },
    soonGrad: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 12
    },
    soonTxt: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary.accent
    },
    footerBox: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 32 : 20,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: THEME_COLORS.divider
    },
    nextBtn: {
        borderRadius: 16,
        overflow: 'hidden',
        height: 56
    },
    btnOff: {
        opacity: 0.5
    },
    nextGrad: {
        height: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
    },
    nextTxt: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.primary.dark
    }
});
