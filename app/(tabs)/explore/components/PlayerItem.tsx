import React, {useEffect, useRef} from 'react';
import {ActivityIndicator, Animated, Pressable, StyleSheet, Text, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {t} from "src/constants/locales";
import {useAuth} from "@/src/core/api/auth/useAuth";
import {useUser} from "@/src/core/hooks/useUserFetch";
import {MatchPlayerResponse} from "@/src/types/match/matchDetails";

interface PlayerCardProps {
    player: MatchPlayerResponse;
    onPress: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({player, onPress}) => {
    const fadeEffect = useRef(new Animated.Value(0)).current;
    const scaleEffect = useRef(new Animated.Value(0.95)).current;
    const {userId} = useAuth();
    const {data: user, isLoading: loadingUser} = useUser(player.playerId);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeEffect, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(scaleEffect, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    if (loadingUser) {
        return (
            <Animated.View
                style={[
                    styles.cardContainer,
                    {
                        opacity: fadeEffect,
                        transform: [{scale: scaleEffect}]
                    }
                ]}
            >
                <LinearGradient
                    colors={['rgba(26,26,26,0.5)', 'rgba(17,17,17,0.2)']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.cardGradient}
                >
                    <View style={styles.loadingArea}>
                        <ActivityIndicator size="small" color={COLORS.primary.accent}/>
                        <Text style={styles.loadingLabel}>Loading player...</Text>
                    </View>
                </LinearGradient>
            </Animated.View>
        );
    }

    const makeInitials = () => {
        if (!user) return '?';
        const firstLetter = user.firstName ? user.firstName.charAt(0) : '';
        const lastLetter = user.lastName ? user.lastName.charAt(0) : '';
        return (firstLetter + lastLetter).toUpperCase();
    };

    return (
        <Animated.View
            style={[
                styles.cardContainer,
                {
                    opacity: fadeEffect,
                    transform: [{scale: scaleEffect}]
                }
            ]}
        >
            <Pressable
                onPress={onPress}
                style={({pressed}) => [
                    styles.cardPressable,
                    pressed && styles.cardPressed
                ]}
                android_ripple={{color: 'rgba(255, 184, 0, 0.1)', borderless: false}}
            >
                <LinearGradient
                    colors={['rgba(26,26,26,0.5)', 'rgba(17,17,17,0.2)']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.cardGradient}
                >
                    <View style={styles.cardContent}>
                        <View style={styles.leftSide}>
                            <LinearGradient
                                colors={['rgba(255, 184, 0, 0.2)', 'rgba(255, 184, 0, 0.05)']}
                                style={styles.avatarWrapper}
                            >
                                <Text style={styles.avatarLetter}>{makeInitials()}</Text>
                            </LinearGradient>
                            <View style={styles.infoArea}>
                                <View style={styles.nameContainer}>
                                    <Text style={styles.playerName}>
                                        {user ? `${user.firstName} ${user.lastName}` : 'Unknown Player'}
                                    </Text>
                                    {userId === player.playerId && (
                                        <Text style={styles.currentUserBadge}>{t('you')}</Text>
                                    )}
                                </View>
                                {user?.playerLevel && (
                                    <View style={styles.levelArea}>
                                        <MaterialCommunityIcons
                                            name="medal-outline"
                                            size={14}
                                            color={COLORS.primary.accent}
                                            style={styles.levelIcon}
                                        />
                                        <Text style={styles.playerLevelText}>
                                            Level {user.playerLevel}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        <View style={styles.arrowWrapper}>
                            <MaterialCommunityIcons
                                name="chevron-right"
                                size={24}
                                color={THEME_COLORS.textSecondary}
                            />
                        </View>
                    </View>
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
};

export default PlayerCard;

const styles = StyleSheet.create({
    cardContainer: {
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardPressable: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    cardPressed: {
        opacity: 0.9,
    },
    cardGradient: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
    },
    leftSide: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarWrapper: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    avatarLetter: {
        color: THEME_COLORS.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    infoArea: {
        marginLeft: 12,
        flex: 1,
    },
    playerName: {
        color: THEME_COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
    levelArea: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    levelIcon: {
        marginRight: 4,
    },
    playerLevelText: {
        color: THEME_COLORS.textSecondary,
        fontSize: 14,
    },
    arrowWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(26,26,26,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    loadingArea: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 12,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    currentUserBadge: {
        fontSize: 14,
        color: COLORS.primary.accent,
        fontWeight: '500',
        marginLeft: 6,
        fontStyle: 'italic',
    },
    loadingLabel: {
        color: THEME_COLORS.textSecondary,
        fontSize: 14,
    },
});
