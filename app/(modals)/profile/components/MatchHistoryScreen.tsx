import React, {useCallback, useState} from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useRouter} from 'expo-router';
import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {useMatchHistory} from '@/src/core/api/matches/matchesHooks';
import {t} from 'src/constants/locales';
import {useQueryClient} from '@tanstack/react-query';
import {matchService} from '@/src/core/api/matches/matchesService';

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {day: 'numeric', month: 'short', year: 'numeric'});
};

const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});
};

const getStatusColor = (status) => {
    switch (status) {
        case 'COMPLETED':
        case 'FINISHED':
            return THEME_COLORS.success;
        case 'CANCELLED':
            return THEME_COLORS.error;
        case 'IN_PROGRESS':
            return COLORS.primary.accent;
        default:
            return THEME_COLORS.textSecondary;
    }
};

const MatchHistoryCard = ({match, onPress}) => {
    const statusColor = getStatusColor(match.status);
    const isWinner = match.result?.winningTeamId === match.playerTeamId;

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
            <LinearGradient
                colors={['rgba(26,26,26,0.95)', 'rgba(17,17,17,0.85)']}
                style={styles.matchCard}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.matchTitle} numberOfLines={1}>
                            {match.title}
                        </Text>
                        <Text style={styles.matchDate}>
                            {formatDate(match.startDate)} • {formatTime(match.startDate)}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, {borderColor: statusColor}]}>
                        <Text style={[styles.statusText, {color: statusColor}]}>
                            {match.status}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider}/>

                <View style={styles.resultSection}>
                    <View style={styles.teamResult}>
                        <Text
                            style={[styles.teamName, match.playerTeamId === match.teams[0]?.teamId && styles.userTeam]}>
                            {match.teams[0]?.teamName || 'Team 1'}
                        </Text>
                        <Text style={styles.teamScore}>
                            {match.result?.team1Score || '0'}
                        </Text>
                    </View>

                    <View style={styles.versusContainer}>
                        <Text style={styles.versusText}>VS</Text>
                    </View>

                    <View style={styles.teamResult}>
                        <Text
                            style={[styles.teamName, match.playerTeamId === match.teams[1]?.teamId && styles.userTeam]}>
                            {match.teams[1]?.teamName || 'Team 2'}
                        </Text>
                        <Text style={styles.teamScore}>
                            {match.result?.team2Score || '0'}
                        </Text>
                    </View>
                </View>

                {match.result && (
                    <View style={styles.matchOutcome}>
                        {isWinner ? (
                            <LinearGradient
                                colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                                style={styles.outcomeBadge}
                            >
                                <MaterialCommunityIcons name="trophy" size={14} color="#000"/>
                                <Text style={styles.winText}>{t('victory')}</Text>
                            </LinearGradient>
                        ) : match.result.winningTeamId ? (
                            <View style={styles.lostBadge}>
                                <MaterialCommunityIcons name="emoticon-sad-outline" size={14}
                                                        color={THEME_COLORS.textSecondary}/>
                                <Text style={styles.loseText}>{t('defeat')}</Text>
                            </View>
                        ) : (
                            <View style={styles.drawBadge}>
                                <MaterialCommunityIcons name="handshake" size={14} color={THEME_COLORS.textSecondary}/>
                                <Text style={styles.drawText}>{t('draw')}</Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={styles.cardFooter}>
                    <View style={styles.footerItem}>
                        <MaterialCommunityIcons name="account-group" size={16} color={THEME_COLORS.textSecondary}/>
                        <Text style={styles.footerText}>
                            {match.teams.reduce((acc, team) => acc + (team.players?.length || 0), 0)} {t('players')}
                        </Text>
                    </View>

                    {match.feedback && (
                        <View style={styles.footerItem}>
                            <MaterialCommunityIcons
                                name="star"
                                size={16}
                                color={match.feedback.userSubmittedFeedback ? COLORS.primary.accent : THEME_COLORS.textSecondary}
                            />
                            <Text
                                style={[
                                    styles.footerText,
                                    match.feedback.userSubmittedFeedback && {color: COLORS.primary.accent}
                                ]}
                            >
                                {match.feedback.userSubmittedFeedback ? t('ratedMatch') : t('notRated')}
                            </Text>
                        </View>
                    )}

                    <MaterialCommunityIcons name="chevron-right" size={20} color={THEME_COLORS.textSecondary}/>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
};

interface MatchHistoryScreenProps {
    userId?: string;
}

export default function MatchHistoryScreen({userId}: MatchHistoryScreenProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);
    const [isPrefetching, setIsPrefetching] = useState(false);
    const {data: matchHistory, isLoading, isError, refetch} = useMatchHistory();

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const navigateToMatchDetail = async (matchId: string) => {
        try {
            setIsPrefetching(true);
            await queryClient.prefetchQuery({
                queryKey: ['match-history-detail', matchId],
                queryFn: () => matchService.getMatchHistoryDetail(matchId),
                staleTime: 5 * 60 * 1000,
            });
            router.push({
                pathname: '../../../history/[matchId]',
                params: {matchId}
            });
        } catch (error) {
            console.error('Failed to prefetch match detail:', error);
            router.push({
                pathname: '../../../history/[matchId]',
                params: {matchId}
            });
        } finally {
            setIsPrefetching(false);
        }
    };

    if ((isLoading && !refreshing) || isPrefetching) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.primary.accent}/>
                <Text style={styles.loadingText}>
                    {isPrefetching ? t('loadingMatchDetails') : t('loadingHistory')}
                </Text>
            </View>
        );
    }

    if (isError) {
        return (
            <View style={styles.centered}>
                <MaterialCommunityIcons name="alert-circle-outline" size={60} color={THEME_COLORS.error}/>
                <Text style={styles.errorTitle}>{t('errorOccurred')}</Text>
                <Text style={styles.errorText}>{t('loadErrorMatchHistory')}</Text>
                <TouchableOpacity onPress={refetch} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>{t('retry')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const matches = matchHistory?.content || [];

    if (matches.length === 0) {
        return (
            <View style={styles.emptyState}>
                <MaterialCommunityIcons
                    name="calendar-blank"
                    size={60}
                    color={THEME_COLORS.textPlaceholder}
                />
                <Text style={styles.emptyStateTitle}>{t('noMatchHistory')}</Text>
                <Text style={styles.emptyStateText}>{t('startPlayingToSeeHistory')}</Text>
                <TouchableOpacity
                    onPress={() => router.push('/(tabs)/explore')}
                    style={styles.exploreButton}
                >
                    <LinearGradient
                        colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                        style={styles.exploreGradient}
                    >
                        <Text style={styles.exploreButtonText}>{t('exploreMatches')}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={matches}
                keyExtractor={(item) => item.matchId}
                renderItem={({item}) => (
                    <MatchHistoryCard
                        match={item}
                        onPress={() => navigateToMatchDetail(item.matchId)}
                    />
                )}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[COLORS.primary.accent]}
                        tintColor={COLORS.primary.accent}
                    />
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME_COLORS.background,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        color: THEME_COLORS.textSecondary,
        fontSize: 16,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
        marginTop: 16,
        marginBottom: 8,
    },
    errorText: {
        color: THEME_COLORS.textSecondary,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        maxWidth: '80%',
    },
    retryButton: {
        backgroundColor: THEME_COLORS.cardAccent,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    retryButtonText: {
        color: THEME_COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
    list: {
        padding: 16,
        paddingBottom: 100,
    },
    matchCard: {
        borderRadius: 16,
        marginBottom: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerLeft: {
        flex: 1,
        marginRight: 10,
    },
    matchTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginBottom: 4,
    },
    matchDate: {
        fontSize: 13,
        color: THEME_COLORS.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 12,
    },
    resultSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    teamResult: {
        flex: 1,
        alignItems: 'center',
    },
    teamName: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
        marginBottom: 8,
        textAlign: 'center',
    },
    userTeam: {
        color: COLORS.primary.accent,
        fontWeight: '600',
    },
    teamScore: {
        fontSize: 24,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
    },
    versusContainer: {
        paddingHorizontal: 10,
    },
    versusText: {
        fontSize: 12,
        color: THEME_COLORS.textSecondary,
    },
    matchOutcome: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 16,
    },
    outcomeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    winText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#000',
    },
    lostBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 72, 66, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 72, 66, 0.3)',
    },
    loseText: {
        fontSize: 13,
        fontWeight: '600',
        color: THEME_COLORS.error,
    },
    drawBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    drawText: {
        fontSize: 13,
        fontWeight: '600',
        color: THEME_COLORS.textSecondary,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    footerText: {
        fontSize: 13,
        color: THEME_COLORS.textSecondary,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 16,
        color: THEME_COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        maxWidth: '80%',
    },
    exploreButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    exploreGradient: {
        paddingVertical: 14,
        paddingHorizontal: 32,
    },
    exploreButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600',
    },
});