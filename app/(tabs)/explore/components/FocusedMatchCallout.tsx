import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, THEME_COLORS } from '@/src/constants/Colors';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Match } from '@/src/types/match/match';

interface CalloutProps {
    match: Match & { isSaved?: boolean };
    onClose: () => void;
    setSelectedMarkerId: (id: string | null) => void;
    setShowCallout: (show: boolean) => void;
    onPress: (match: Match) => void;
    currentUserId?: string;
    onLike: (match: Match) => Promise<void>;
}

const MatchCallout: React.FC<CalloutProps> = ({
                                                  match,
                                                  onClose,
                                                  setSelectedMarkerId,
                                                  setShowCallout,
                                                  onPress,
                                                  onLike,
                                              }) => {
    const likeScale = useRef(new Animated.Value(1)).current;
    const popupAnim = useRef(new Animated.Value(0)).current;
    const isOwner = match.owner;
    const [isLiked, setIsLiked] = useState(match.isSaved || false);
    const [isUpdating, setIsUpdating] = useState(false);
    useEffect(() => {
        setIsLiked(match.isSaved || false);
    }, [match.isSaved]);
    useEffect(() => {
        Animated.spring(popupAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 7,
            tension: 40,
            velocity: 3,
        }).start();
    }, [popupAnim]);
    const onLikePress = async () => {
        if (isUpdating) return;
        setIsUpdating(true);
        Animated.sequence([
            Animated.timing(likeScale, { toValue: 1.4, duration: 150, useNativeDriver: true }),
            Animated.spring(likeScale, { toValue: 1, friction: 3, useNativeDriver: true }),
        ]).start();

        try {
            setIsLiked(!isLiked);
            await onLike(match);
        } catch (error) {
            console.error('Failed to update like status:', error);
            setIsLiked(prev => !prev);
        } finally {
            setIsUpdating(false);
        }
    };

    const onClosePress = () => {
        Animated.timing(popupAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setSelectedMarkerId(null);
            setShowCallout(false);
            onClose();
        });
    };

    const getFormattedDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const timeStr = format(d, 'HH:mm');

        if (d.toDateString() === today.toDateString()) {
            return `Aujourd'hui · ${timeStr}`;
        } else if (d.toDateString() === tomorrow.toDateString()) {
            return `Demain · ${timeStr}`;
        }
        return `${format(d, 'dd MMM yyyy', { locale: fr })} · ${timeStr}`;
    };

    const animationStyle = {
        opacity: popupAnim,
        transform: [
            { scale: popupAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
            { translateY: popupAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
        ],
    };

    return (
        <Animated.View style={[styles.container, animationStyle]}>
            <LinearGradient
                colors={
                    isOwner
                        ? (['rgba(26,26,26,0.95)', 'rgba(17,17,17,0.9)'] as [string, string])
                        : (['rgba(26,26,26,0.9)', 'rgba(17,17,17,0.85)'] as [string, string])
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.gradientBox, isOwner && styles.ownerGradient]}
            >
                <TouchableOpacity
                    activeOpacity={0.95}
                    onPress={() => onPress(match)}
                    style={styles.cardBox}
                >
                    <View style={styles.headerRow}>
                        <View style={styles.titleContainer}>
                            <Text style={styles.titleText} numberOfLines={1}>
                                {match.title}
                            </Text>
                            {isOwner && (
                                <LinearGradient
                                    colors={['rgba(255, 184, 0, 0.3)', 'rgba(255, 184, 0, 0.1)'] as [string, string]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.ownerBadge}
                                >
                                    <MaterialCommunityIcons
                                        name={'shield-crown' as keyof typeof MaterialCommunityIcons.glyphMap}
                                        size={14}
                                        color={COLORS.primary.accent}
                                    />
                                    <Text style={styles.ownerText}>Hôte</Text>
                                </LinearGradient>
                            )}
                        </View>
                        <View style={styles.actionRow}>
                            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                                <TouchableOpacity
                                    onPress={onLikePress}
                                    style={[styles.iconButton, isLiked && styles.likedButton]}
                                >
                                    <MaterialCommunityIcons
                                        name={
                                            isLiked
                                                ? ('bookmark' as keyof typeof MaterialCommunityIcons.glyphMap)
                                                : ('bookmark-outline' as keyof typeof MaterialCommunityIcons.glyphMap)
                                        }
                                        size={22}
                                        color={isLiked ? COLORS.primary.accent : THEME_COLORS.textSecondary}
                                    />
                                </TouchableOpacity>
                            </Animated.View>
                            <TouchableOpacity onPress={onClosePress} style={styles.iconButton}>
                                <MaterialCommunityIcons
                                    name={'close' as keyof typeof MaterialCommunityIcons.glyphMap}
                                    size={22}
                                    color={THEME_COLORS.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.locationRow}>
                        <MaterialCommunityIcons
                            name={'map-marker' as keyof typeof MaterialCommunityIcons.glyphMap}
                            size={16}
                            color={THEME_COLORS.textSecondary}
                        />
                        <Text style={styles.locationText} numberOfLines={1}>
                            {match.location?.address}
                        </Text>
                    </View>

                    <View style={styles.detailsBox}>
                        <View style={styles.detailItem}>
                            <MaterialCommunityIcons
                                name={'calendar-clock' as keyof typeof MaterialCommunityIcons.glyphMap}
                                size={16}
                                color={COLORS.primary.accent}
                            />
                            <Text style={styles.detailText}>{getFormattedDate(match.startDate)}</Text>
                        </View>

                        <View style={styles.detailsRow}>
                            <View style={styles.detailItem}>
                                <MaterialCommunityIcons
                                    name={'clock-outline' as keyof typeof MaterialCommunityIcons.glyphMap}
                                    size={16}
                                    color={COLORS.primary.accent}
                                />
                                <Text style={styles.detailText}>{match.duration}min</Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.detailItem}>
                                <MaterialCommunityIcons
                                    name={'trophy-outline' as keyof typeof MaterialCommunityIcons.glyphMap}
                                    size={16}
                                    color={COLORS.primary.accent}
                                />
                                <Text style={styles.detailText}>
                                    {match.format} · {match.skillLevel}
                                </Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </LinearGradient>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 40,
        left: 16,
        right: 16,
        borderRadius: 20,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: { elevation: 6 },
        }),
        zIndex: 999,
    },
    gradientBox: {
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    ownerGradient: {
        borderColor: 'rgba(255, 184, 0, 0.4)',
        borderWidth: 1.5,
    },
    cardBox: {
        padding: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
        gap: 12,
    },
    titleContainer: {
        flex: 1,
        gap: 8,
    },
    titleText: {
        fontSize: 20,
        fontWeight: '700',
        color: THEME_COLORS.textPrimary,
    },
    ownerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignSelf: 'flex-start',
        gap: 4,
    },
    ownerText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary.accent,
        letterSpacing: 0.5,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(26,26,26,0.8)',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    likedButton: {
        backgroundColor: 'rgba(255, 184, 0, 0.1)',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
    },
    locationText: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
        flex: 1,
    },
    detailsBox: {
        gap: 12,
        backgroundColor: 'rgba(26,26,26,0.5)',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    divider: {
        width: 1,
        height: 16,
        backgroundColor: 'rgba(255, 184, 0, 0.2)',
        marginHorizontal: 12,
    },
    detailText: {
        fontSize: 14,
        color: THEME_COLORS.textPrimary,
        fontWeight: '500',
    },
});

export default MatchCallout;