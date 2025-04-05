import React, {useCallback, useEffect, useRef} from 'react';
import {Animated, Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {format, isToday, isTomorrow} from 'date-fns';
import {fr} from 'date-fns/locale';
import {LinearGradient} from 'expo-linear-gradient';
import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {t} from "src/constants/locales";
import {Match} from '@/src/types/match/match';

const STATUS_INFO: {
    DRAFT: { icon: 'pencil-outline'; label: string };
    OPEN: { icon: 'check-circle-outline'; label: string };
    IN_PROGRESS: { icon: 'whistle'; label: string };
    COMPLETED: { icon: 'flag-checkered'; label: string };
    CANCELLED: { icon: 'close-circle-outline'; label: string };
} = {
    DRAFT: {
        icon: 'pencil-outline',
        label: t('draft'),
    },
    OPEN: {
        icon: 'check-circle-outline',
        label: t('open'),
    },
    IN_PROGRESS: {
        icon: 'whistle',
        label: t('in_progress'),
    },
    COMPLETED: {
        icon: 'flag-checkered',
        label: t('completed'),
    },
    CANCELLED: {
        icon: 'close-circle-outline',
        label: t('cancelled'),
    },
};

const getStatusColorKey = (status: string): keyof typeof THEME_COLORS.statusColors => {
    switch (status) {
        case 'DRAFT':
            return 'draft';
        case 'OPEN':
            return 'open';
        case 'IN_PROGRESS':
            return 'inProgress';
        case 'COMPLETED':
            return 'completed';
        case 'CANCELLED':
            return 'cancelled';
        default:
            return 'open';
    }
};

interface MatchCardProps {
    match: Match & { isSaved?: boolean };
    onPress: (match: Match) => void;
    onLike?: (match: Match) => void;
    style?: any;
}

const MatchCard: React.FC<MatchCardProps> = ({match, onPress, onLike, style}) => {
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const isSaved = match.isSaved || false;
    const status = STATUS_INFO[match.status] || STATUS_INFO.OPEN;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 40,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const onPressIn = useCallback(() => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            tension: 40,
            friction: 7,
            useNativeDriver: true,
        }).start();
    }, []);

    const onPressOut = useCallback(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 40,
            friction: 7,
            useNativeDriver: true,
        }).start();
    }, []);

    const simpleDate = useCallback((date: Date) => {
        if (isToday(date)) return t('today');
        if (isTomorrow(date)) return t('tomorrow');
        return format(date, 'EEEE d MMMM', {locale: fr});
    }, []);

    const matchDate = new Date(match.startDate);
    const timeString = format(matchDate, 'HH:mm');

    const handleLike = () => {
        try {
            if (onLike) {
                onLike(match);
            }
        } catch (error) {
            console.error('Failed to update like status:', error);
        }
    };

    return (
        <Animated.View
            style={[
                styles.containerCard,
                {opacity: fadeAnim, transform: [{scale: scaleAnim}]},
                style,
            ]}
        >
            <Pressable
                onPress={() => onPress(match)}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                style={({pressed}) => [styles.pressableCard, pressed && styles.pressedCard]}
                android_ripple={{color: 'rgba(255, 184, 0, 0.1)', borderless: false}}
            >
                <LinearGradient
                    colors={
                        match.owner
                            ? (['rgba(11, 17, 17, 1)', 'rgba(190, 165, 8, 0.04)'] as [string, string])
                            : (['rgba(26,26,26,0.05)', 'rgba(17,17,17,0.02)'] as [string, string])
                    }
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.cardInner}
                >
                    <View style={styles.statusRow}>
                        <LinearGradient
                            colors={THEME_COLORS.statusColors[getStatusColorKey(match.status)] as [string, string]}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 1}}
                            style={styles.statusBadge}
                        >
                            <MaterialCommunityIcons name={status.icon} size={14} color={THEME_COLORS.textPrimary}/>
                            <Text style={styles.statusText}>{status.label}</Text>
                        </LinearGradient>
                        {!match.owner && (
                            <Pressable
                                onPress={handleLike}
                                style={({pressed}) => [styles.bookmarkBtn, pressed && {opacity: 0.7}]}
                                hitSlop={8}
                            >
                                <MaterialCommunityIcons
                                    name={isSaved ? 'bookmark' : 'bookmark-outline'}
                                    size={22}
                                    color={isSaved ? COLORS.primary.accent : COLORS.neutral[300]}
                                />
                            </Pressable>
                        )}
                    </View>
                    <View style={styles.mainArea}>
                        <View style={styles.timeArea}>
                            <LinearGradient
                                colors={THEME_COLORS.timeContainerGradient as [string, string]}
                                start={{x: 0, y: 0}}
                                end={{x: 1, y: 1}}
                                style={styles.timeContainer}
                            >
                                <MaterialCommunityIcons
                                    name="clock-outline"
                                    size={16}
                                    color={COLORS.neutral[50]}
                                    style={styles.clockIcon}
                                />
                                <Text style={styles.timeDisplay}>{timeString}</Text>
                            </LinearGradient>
                            <Text style={styles.dateDisplay}>{simpleDate(matchDate)}</Text>
                        </View>
                        <Text style={styles.titleText} numberOfLines={2}>
                            {match.title}
                        </Text>
                        <View style={styles.locationRow}>
                            <MaterialCommunityIcons name="map-marker" size={16} color={THEME_COLORS.textSecondary}/>
                            <Text style={styles.locationDisplay} numberOfLines={1}>
                                {match.location.address}
                            </Text>
                        </View>
                        <View style={styles.detailsBox}>
                            <View style={styles.detailItem}>
                                <MaterialCommunityIcons name="account-group" size={18} color={COLORS.primary.accent}/>
                                <View>
                                    <Text style={styles.detailLabel}>{t('format')}</Text>
                                    <Text style={styles.detailValue}>{match.format}</Text>
                                </View>
                            </View>
                            <View style={styles.detailItem}>
                                <MaterialCommunityIcons name="clock-outline" size={18} color={COLORS.primary.accent}/>
                                <View>
                                    <Text style={styles.detailLabel}>{t('duration')}</Text>
                                    <Text style={styles.detailValue}>{`${match.duration} min`}</Text>
                                </View>
                            </View>
                            <View style={styles.detailItem}>
                                <MaterialCommunityIcons name="trophy-outline" size={18} color={COLORS.primary.accent}/>
                                <View>
                                    <Text style={styles.detailLabel}>{t('level')}</Text>
                                    <Text style={styles.detailValue}>{match.skillLevel}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                    {match.owner && (
                        <View style={styles.hostBadge}>
                            <MaterialCommunityIcons name="shield-crown" size={14} color={COLORS.primary.accent}/>
                            <Text style={styles.hostText}>{t('host')}</Text>
                        </View>
                    )}
                    {match.joinRequestCount > 0 && (
                        <LinearGradient
                            colors={THEME_COLORS.requestsBarGradient as [string, string]}
                            style={styles.requestSection}
                        >
                            <View style={styles.requestRow}>
                                <MaterialCommunityIcons name="account-clock" size={16} color={THEME_COLORS.primary}/>
                                <Text style={styles.requestText}>
                                    {match.joinRequestCount}{' '}
                                    {match.joinRequestCount > 1 ? t('requests_plural') : t('request')}{' '}
                                    {t('pending')}
                                </Text>
                            </View>
                        </LinearGradient>
                    )}
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    containerCard: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 4},
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {elevation: 6},
        }),
    },
    pressableCard: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    pressedCard: {
        opacity: 0.9,
    },
    cardInner: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: COLORS.background.card,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    bookmarkBtn: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 18,
    },
    mainArea: {
        padding: 16,
    },
    timeArea: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        marginRight: 10,
    },
    clockIcon: {
        marginRight: 4,
    },
    timeDisplay: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.neutral[50],
    },
    dateDisplay: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
    },
    titleText: {
        fontSize: 18,
        fontWeight: '700',
        color: THEME_COLORS.textPrimary,
        marginBottom: 10,
        lineHeight: 24,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    locationDisplay: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
        marginLeft: 6,
        flex: 1,
    },
    detailsBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: COLORS.background.cardHover,
        borderRadius: 12,
        padding: 12,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailLabel: {
        fontSize: 12,
        color: THEME_COLORS.textPlaceholder,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '500',
        color: THEME_COLORS.textPrimary,
    },
    hostBadge: {
        position: 'absolute',
        top: 12,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 184, 0, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    hostText: {
        color: COLORS.primary.accent,
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    requestSection: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 184, 0, 0.1)',
    },
    requestRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    requestText: {
        fontSize: 14,
        fontWeight: '500',
        color: THEME_COLORS.primary,
        marginLeft: 8,
    },
});

export default React.memo(MatchCard);