import React, {useEffect, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {t} from "src/constants/locales";
import {useFeedback} from '@/src/shared/hooks/useFeedback';
import {useRouter} from 'expo-router';
import {API_CONFIG, ApiService} from "@/src/core/api/core/axios.config";
import {useUser} from "@/src/core/hooks/useUserFetch";
import {FeedbackRequestResponse, MatchTeam, PlayerForRating, PlayerRatingRequest} from "@/src/types/feedback/feedback";

interface RatingStarsProps {
    rating: number;
    setRating: (rating: number) => void;
    label: string;
    disabled?: boolean;
}

const RatingStars: React.FC<RatingStarsProps> = ({rating, setRating, label, disabled = false}) => {
    return (
        <View style={styles.ratingContainer}>
            <Text style={styles.ratingLabel}>{label}</Text>
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity
                        key={star}
                        onPress={() => !disabled && setRating(star)}
                        disabled={disabled}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons
                            name={rating >= star ? "star" : "star-outline"}
                            size={28}
                            color={rating >= star ? COLORS.primary.accent : THEME_COLORS.textSecondary}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

interface ScoreInputProps {
    team: MatchTeam;
    score: number;
    onScoreChange: (score: number) => void;
    disabled?: boolean;
}

const ScoreInput: React.FC<ScoreInputProps> = ({team, score, onScoreChange, disabled = false}) => {
    return (
        <View style={styles.scoreInputContainer}>
            <View style={styles.teamInfoContainer}>
                <View
                    style={[styles.teamColorBadge, {backgroundColor: team.teamNumber === 1 ? '#3498db' : '#e74c3c'}]}/>
                <Text style={styles.teamName}>{team.name}</Text>
            </View>
            <View style={styles.scoreInputWrapper}>
                <TouchableOpacity
                    style={styles.scoreButton}
                    onPress={() => !disabled && score > 0 && onScoreChange(score - 1)}
                    disabled={disabled || score <= 0}
                >
                    <MaterialCommunityIcons
                        name="minus"
                        size={20}
                        color={disabled || score <= 0 ? THEME_COLORS.textDisabled : THEME_COLORS.textSecondary}
                    />
                </TouchableOpacity>
                <View style={styles.scoreDisplay}>
                    <Text style={styles.scoreText}>{score}</Text>
                </View>
                <TouchableOpacity
                    style={styles.scoreButton}
                    onPress={() => !disabled && onScoreChange(score + 1)}
                    disabled={disabled}
                >
                    <MaterialCommunityIcons
                        name="plus"
                        size={20}
                        color={disabled ? THEME_COLORS.textDisabled : THEME_COLORS.textSecondary}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

interface EnhancedPlayerRatingItemProps {
    player: PlayerForRating;
    onChange: (rating: PlayerRatingRequest) => void;
    disabled?: boolean;
}

const EnhancedPlayerRatingItem: React.FC<EnhancedPlayerRatingItemProps> = ({player, onChange, disabled = false}) => {
    const router = useRouter();
    const [skillRating, setSkillRating] = useState<number>(0);
    const [sportsmanshipRating, setSportsmanshipRating] = useState<number>(0);
    const [teamworkRating, setTeamworkRating] = useState<number>(0);
    const [reliabilityRating, setReliabilityRating] = useState<number>(0);

    const {data: userData, isLoading: userLoading} = useUser(player.id);

    useEffect(() => {
        onChange({
            ratedPlayerId: player.id,
            skillRating,
            sportsmanshipRating,
            teamworkRating,
            reliabilityRating
        });
    }, [skillRating, sportsmanshipRating, teamworkRating, reliabilityRating]);

    const navigateToProfile = () => {
        router.push({
            pathname: '/(modals)/profile/[userId]',
            params: {userId: player.id,}
        });
    };

    const getInitials = () => {
        if (userData && userData.firstName) {
            return userData.firstName.charAt(0).toUpperCase();
        }
        return player.name;
    };

    const getPlayerName = () => {
        if (userData) {
            return `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        }
        return `Joueur ${player.id.slice(0, 4)}`;
    };

    return (
        <View style={styles.playerRatingContainer}>
            <TouchableOpacity
                style={styles.playerHeader}
                onPress={navigateToProfile}
                activeOpacity={0.7}
            >
                <View style={styles.playerNameContainer}>
                    <View style={styles.playerIcon}>
                        {userLoading ? (
                            <ActivityIndicator size="small" color="#000"/>
                        ) : (
                            <Text style={styles.playerInitial}>{getInitials()}</Text>
                        )}
                    </View>
                    <View>
                        <Text style={styles.playerName}>{getPlayerName()}</Text>
                        <Text style={styles.viewProfileText}>{t('feedback.viewProfile')}</Text>
                    </View>
                </View>
                <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={THEME_COLORS.textSecondary}
                />
            </TouchableOpacity>

            <RatingStars
                label={t('feedback.skill')}
                rating={skillRating}
                setRating={setSkillRating}
                disabled={disabled}
            />
            <RatingStars
                label={t('feedback.sportsmanship')}
                rating={sportsmanshipRating}
                setRating={setSportsmanshipRating}
                disabled={disabled}
            />
            <RatingStars
                label={t('feedback.teamwork')}
                rating={teamworkRating}
                setRating={setTeamworkRating}
                disabled={disabled}
            />
            <RatingStars
                label={t('feedback.reliability')}
                rating={reliabilityRating}
                setRating={setReliabilityRating}
                disabled={disabled}
            />
        </View>
    );
};

interface MatchFeedbackFormProps {
    matchId: string;
    onClose: () => void;
}

export const MatchFeedbackForm: React.FC<MatchFeedbackFormProps> = ({matchId, onClose}) => {
    const {getMatchFeedbackRequest, submitFeedback, loading, error} = useFeedback();
    const [feedbackRequest, setFeedbackRequest] = useState<FeedbackRequestResponse | null>(null);
    const [matchRating, setMatchRating] = useState<number>(0);
    const [playerRatings, setPlayerRatings] = useState<Record<string, PlayerRatingRequest>>({});
    const [players, setPlayers] = useState<PlayerForRating[]>([]);
    const [loadingPlayers, setLoadingPlayers] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [teams, setTeams] = useState<MatchTeam[]>([]);
    const [team1Score, setTeam1Score] = useState<number>(0);
    const [team2Score, setTeam2Score] = useState<number>(0);
    const [loadingTeams, setLoadingTeams] = useState<boolean>(true);

    useEffect(() => {
        const fetchFeedbackRequest = async () => {
            const data = await getMatchFeedbackRequest(matchId);
            if (data) {
                setFeedbackRequest(data);
                try {
                    const response = await ApiService.getInstance().get(
                        API_CONFIG.ENDPOINTS.MATCH.MATCH_DETAILS(matchId)
                    );
                    if (response.data.data) {
                        if (response.data.data.players) {
                            const playersData = response.data.data.players
                                .filter(p => p.playerId !== feedbackRequest?.userId)
                                .map(p => ({
                                    id: p.playerId,
                                    name: p.playerId.slice(0, 1).toUpperCase()
                                }));
                            setPlayers(playersData);
                        }
                        if (response.data.data.teams) {
                            setTeams(response.data.data.teams);
                        }
                    }
                } catch (err) {
                    console.error('Error fetching match data', err);
                } finally {
                    setLoadingPlayers(false);
                    setLoadingTeams(false);
                }
            }
        };
        fetchFeedbackRequest();
    }, [matchId]);

    const handlePlayerRatingChange = (playerId: string, rating: PlayerRatingRequest) => {
        setPlayerRatings(prev => ({
            ...prev,
            [playerId]: rating
        }));
    };

    const handleSubmit = async () => {
        if (matchRating === 0) {
            Alert.alert('Erreur', 'Veuillez noter le match');
            return;
        }
        const playerRatingsArray = Object.values(playerRatings);
        if (playerRatingsArray.length === 0) {
            Alert.alert('Erreur', 'Veuillez noter au moins un joueur');
            return;
        }
        if (teams.length === 2 && (team1Score === 0 && team2Score === 0)) {
            Alert.alert('Confirmation', 'Le score est 0-0. Est-ce correct?', [
                {
                    text: 'Non',
                    style: 'cancel'
                },
                {
                    text: 'Oui',
                    onPress: () => submitFeedbackWithScores()
                }
            ]);
            return;
        }
        submitFeedbackWithScores();
    };

    const submitFeedbackWithScores = async () => {
        if (!feedbackRequest) {
            return;
        }
        try {
            setSubmitting(true);
            const submitData: SubmitFeedbackRequest = {
                matchRating,
                playerRatings: Object.values(playerRatings)
            };
            if (teams.length === 2) {
                submitData.team1Id = teams[0].id;
                submitData.team2Id = teams[1].id;
                submitData.team1Score = team1Score;
                submitData.team2Score = team2Score;
            }
            const result = await submitFeedback(feedbackRequest.id, submitData);
            if (result) {
                Alert.alert(
                    t('feedback.thankyou'),
                    t('feedback.submitSuccess'),
                    [{text: 'OK', onPress: onClose}]
                );
            }
        } catch (err) {
            Alert.alert('Erreur', 'Une erreur est survenue lors de l\'envoi des évaluations.');
        } finally {
            setSubmitting(false);
        }
    };


    if (loading || loadingPlayers) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color={COLORS.primary.accent} size="large"/>
                    <Text style={styles.loadingText}>Chargement des données...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error || !feedbackRequest) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={50} color={THEME_COLORS.error}/>
                    <Text style={styles.errorTitle}>Une erreur est survenue</Text>
                    <Text style={styles.errorText}>Impossible de charger les données d'évaluation.</Text>
                    <TouchableOpacity style={styles.errorButton} onPress={onClose}>
                        <Text style={styles.errorButtonText}>Fermer</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (feedbackRequest.userHasSubmitted) {
        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient
                    colors={['rgba(26,26,26,0.9)', 'rgba(17,17,17,0.8)']}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <MaterialCommunityIcons name="check-circle" size={28} color={THEME_COLORS.success}/>
                        <Text style={styles.headerText}>Évaluation déjà soumise</Text>
                    </View>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <MaterialCommunityIcons name="close" size={24} color={THEME_COLORS.textSecondary}/>
                    </TouchableOpacity>
                </LinearGradient>
                <View style={styles.alreadySubmittedContainer}>
                    <Text style={styles.alreadySubmittedText}>
                        {t('feedback.alreadySubmitted')}
                    </Text>
                    <Text style={styles.alreadySubmittedText}>
                        {t('feedback.playerCount', {
                            feedbackCount: feedbackRequest.feedbackCount,
                            totalPlayersInMatch: feedbackRequest.totalPlayersInMatch
                        })}
                    </Text>
                    <TouchableOpacity style={styles.closeFullButton} onPress={onClose}>
                        <Text style={styles.closeFullButtonText}>Fermer</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['rgba(26,26,26,0.9)', 'rgba(17,17,17,0.8)']}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <MaterialCommunityIcons name="star-outline" size={28} color={COLORS.primary.accent}/>
                    <Text style={styles.headerText}>
                        Évaluez le match et les joueurs
                    </Text>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <MaterialCommunityIcons name="close" size={24} color={THEME_COLORS.textSecondary}/>
                </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContentContainer}>
                <View style={styles.matchRatingContainer}>
                    <Text style={styles.sectionTitle}>{t('feedback.matchRating')}</Text>
                    <RatingStars
                        label={t('feedback.overallExperience')}
                        rating={matchRating}
                        setRating={setMatchRating}
                    />
                </View>

                <View style={styles.playerRatingsContainer}>
                    <Text style={styles.sectionTitle}>{t('feedback.playerRatings')}</Text>
                    <Text style={styles.sectionSubtitle}>
                        {t('feedback.communityHelp')}
                    </Text>

                    {players.length > 0 ? (
                        players.map(player => (
                            <EnhancedPlayerRatingItem
                                key={player.id}
                                player={player}
                                onChange={(rating) => handlePlayerRatingChange(player.id, rating)
                                }
                            />
                        ))
                    ) : (
                        <View style={styles.noPlayersContainer}>
                            <MaterialCommunityIcons
                                name="account-off-outline"
                                size={48}
                                color={THEME_COLORS.textSecondary}
                            />
                            <Text style={styles.noPlayersText}>
                                Aucun joueur à évaluer
                            </Text>
                        </View>
                    )}
                </View>
                {teams.length === 2 && (
                    <View style={styles.matchScoreContainer}>
                        <Text style={styles.sectionTitle}>{t('feedback.matchScore')}</Text>
                        <Text style={styles.sectionSubtitle}>
                            {t('feedback.enterFinalScore')}
                        </Text>

                        <View style={styles.scoreContainer}>
                            <ScoreInput
                                team={teams[0]}
                                score={team1Score}
                                onScoreChange={setTeam1Score}
                            />
                            <View style={styles.scoreVsContainer}>
                                <Text style={styles.scoreVsText}>VS</Text>
                            </View>
                            <ScoreInput
                                team={teams[1]}
                                score={team2Score}
                                onScoreChange={setTeam2Score}
                            />
                        </View>
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    <LinearGradient
                        colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                        style={styles.gradientButton}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#000" size="small"/>
                        ) : (
                            <Text style={styles.submitButtonText}>{t('feedback.submit')}</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME_COLORS.background
    },
    header: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)'
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    headerText: {
        fontSize: 18,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginLeft: 10
    },
    closeButton: {
        padding: 5
    },
    scrollContainer: {
        flex: 1
    },
    scrollContentContainer: {
        paddingBottom: 20
    },
    matchRatingContainer: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)'
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginBottom: 16
    },
    sectionSubtitle: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
        marginBottom: 20
    },
    ratingContainer: {
        marginBottom: 12
    },
    ratingLabel: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
        marginBottom: 8
    },
    starsContainer: {
        flexDirection: 'row',
        gap: 8
    },
    playerRatingsContainer: {
        padding: 16
    },
    playerRatingContainer: {
        marginBottom: 24,
        padding: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12
    },
    playerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    playerNameContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    playerIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
    },
    playerInitial: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000'
    },
    playerName: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary
    },
    viewProfileText: {
        fontSize: 12,
        color: THEME_COLORS.textSecondary,
        marginTop: 2,
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)'
    },
    submitButton: {
        borderRadius: 12,
        overflow: 'hidden'
    },
    submitButtonDisabled: {
        opacity: 0.7
    },
    gradientButton: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    submitButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600'
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: THEME_COLORS.background
    },
    loadingText: {
        marginTop: 12,
        color: THEME_COLORS.textSecondary,
        fontSize: 14
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: THEME_COLORS.background,
        padding: 20
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginTop: 16,
        marginBottom: 8
    },
    errorText: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 24
    },
    errorButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8
    },
    errorButtonText: {
        color: THEME_COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '500'
    },
    alreadySubmittedContainer: {
        flex: 1,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center'
    },
    alreadySubmittedText: {
        fontSize: 16,
        color: THEME_COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 12
    },
    closeFullButton: {
        marginTop: 24,
        backgroundColor: COLORS.primary.accent,
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 8
    },
    closeFullButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600'
    },
    noPlayersContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12
    },
    noPlayersText: {
        fontSize: 16,
        color: THEME_COLORS.textSecondary,
        marginTop: 12
    },
    matchScoreContainer: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)'
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 16
    },
    scoreInputContainer: {
        flex: 1,
        alignItems: 'center'
    },
    teamInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    teamColorBadge: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8
    },
    teamName: {
        fontSize: 14,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary
    },
    scoreInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    scoreButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    scoreDisplay: {
        width: 50,
        alignItems: 'center',
        justifyContent: 'center'
    },
    scoreText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary
    },
    scoreVsContainer: {
        paddingHorizontal: 16
    },
    scoreVsText: {
        fontSize: 14,
        fontWeight: '600',
        color: THEME_COLORS.textSecondary
    }
});