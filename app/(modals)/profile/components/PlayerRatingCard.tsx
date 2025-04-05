import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, THEME_COLORS } from '@/src/constants/Colors';
import { useFeedback } from '@/src/shared/hooks/useFeedback';
import {PlayerRatingResponse} from "@/src/types/feedback/feedback";

interface RatingBarProps {
    label: string;
    value: number;
    max?: number;
}

const RatingBar: React.FC<RatingBarProps> = ({ label, value, max = 5 }) => {
    const percentage = (value / max) * 100;
    const safeValue = value ?? 0;

    return (
        <View style={styles.ratingBarContainer}>
            <Text style={styles.ratingBarLabel}>{label}</Text>
            <View style={styles.ratingBarOuter}>
                <LinearGradient
                    colors={[COLORS.primary.accent, 'rgba(255, 184, 0, 0.5)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.ratingBarInner, { width: `${percentage}%` }]}
                />
            </View>
            <Text style={styles.ratingBarValue}>{safeValue.toFixed(1)}</Text>
        </View>
    );
};

interface PlayerRatingCardProps {
    playerId: string;
}

export const PlayerRatingCard: React.FC<PlayerRatingCardProps> = ({ playerId }) => {
    const { getPlayerRating, loading, error } = useFeedback();
    const [playerRating, setPlayerRating] = useState<PlayerRatingResponse | null>(null);

    useEffect(() => {
        const fetchRating = async () => {
            const data = await getPlayerRating(playerId);
            if (data) {
                setPlayerRating(data);
            }
        };

        fetchRating();
    }, [playerId, getPlayerRating]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator color={COLORS.primary.accent} size="small" />
                <Text style={styles.loadingText}>Chargement des notes détaillées...</Text>
            </View>
        );
    }

    if (error || !playerRating) {
        return null;
    }

    if (playerRating.totalRatings === 0) {
        return (
            <LinearGradient
                colors={['rgba(26,26,26,0.9)', 'rgba(17,17,17,0.8)']}
                style={styles.container}
            >
                <View style={styles.header}>
                    <MaterialCommunityIcons name="star-outline" size={20} color={COLORS.primary.accent} />
                    <Text style={styles.title}>Évaluations détaillées</Text>
                </View>
                <Text style={styles.noRatingText}>
                    Ce joueur n'a pas encore reçu d'évaluations
                </Text>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient
            colors={['rgba(26,26,26,0.9)', 'rgba(17,17,17,0.8)']}
            style={styles.container}
        >
            <View style={styles.header}>
                <MaterialCommunityIcons name="star" size={20} color={COLORS.primary.accent} />
                <Text style={styles.title}>Évaluations détaillées</Text>
                <View style={styles.updatedBadge}>
                    <Text style={styles.updatedText}>
                        Mis à jour {formatLastUpdated(playerRating.lastUpdatedAt)}
                    </Text>
                </View>
            </View>

            <View style={styles.ratingBarsContainer}>
                <RatingBar label="Compétence" value={playerRating.skillRating} />
                <RatingBar label="Esprit sportif" value={playerRating.sportsmanshipRating} />
                <RatingBar label="Travail d'équipe" value={playerRating.teamworkRating} />
                <RatingBar label="Ponctualité" value={playerRating.reliabilityRating} />
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    Basé sur {playerRating.totalRatings} évaluations de joueurs
                </Text>
            </View>
        </LinearGradient>
    );
};

const formatLastUpdated = (dateString: string): string => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "aujourd'hui";
    if (diffInDays === 1) return "hier";
    if (diffInDays < 7) return `il y a ${diffInDays} jours`;

    const months = [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];

    return `le ${date.getDate()} ${months[date.getMonth()]}`;
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginLeft: 8,
        flex: 1
    },
    updatedBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12
    },
    updatedText: {
        fontSize: 12,
        color: THEME_COLORS.textSecondary,
        fontWeight: '500'
    },
    ratingBarsContainer: {
        gap: 12,
        marginBottom: 16
    },
    ratingBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    ratingBarLabel: {
        width: 100,
        fontSize: 14,
        color: THEME_COLORS.textSecondary
    },
    ratingBarOuter: {
        flex: 1,
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 4,
        overflow: 'hidden'
    },
    ratingBarInner: {
        height: '100%',
        borderRadius: 4
    },
    ratingBarValue: {
        width: 30,
        fontSize: 14,
        color: THEME_COLORS.textPrimary,
        textAlign: 'right'
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        paddingTop: 12,
        alignItems: 'center'
    },
    footerText: {
        fontSize: 13,
        color: THEME_COLORS.textSecondary,
        fontStyle: 'italic'
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center'
    },
    loadingText: {
        marginTop: 8,
        color: THEME_COLORS.textSecondary,
        fontSize: 14
    },
    noRatingText: {
        color: THEME_COLORS.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        padding: 10
    }
});