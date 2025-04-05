import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

import { useFeedback } from '@/src/shared/hooks/useFeedback';
import { COLORS, THEME_COLORS } from '@/src/constants/Colors';
import {StatCard} from "@/app/(tabs)/profile/components";
import {PlayerRatingResponse} from "@/src/types/feedback/feedback";


interface RenderStatRowProps {
    playerId: string;
}

export const RenderStatRow: React.FC<RenderStatRowProps> = ({ playerId }) => {
    const { getPlayerRating, loading, error } = useFeedback();
    const [ratingData, setRatingData] = useState<PlayerRatingResponse | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const data = await getPlayerRating(playerId);
            if (data) {
                setRatingData(data);
            }
        };
        fetchData();
    }, [playerId, getPlayerRating]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator color={COLORS.primary.accent} size="small" />
                <Text style={styles.loadingText}>Chargement des statistiques...</Text>
            </View>
        );
    }

    if (error || !ratingData) {
        return null;
    }

    if (ratingData.totalRatings === 0) {
        return (
            <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>Aucune évaluation pour le moment</Text>
            </View>
        );
    }

    return (
        <View style={styles.statRow}>
            <StatCard
                icon="star"
                value={`${ratingData.overallRating.toFixed(1)}/5`}
                label="Note"
            />
            <StatCard
                icon="soccer"
                value={ratingData.totalMatches}
                label="Matchs joués"
            />
            <StatCard
                icon="account"
                value={ratingData.totalRatings}
                label="Avis"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    statRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%'
    },
    loadingContainer: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 8,
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
    },
    noDataContainer: {
        padding: 16,
        alignItems: 'center',
    },
    noDataText: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
    },
});