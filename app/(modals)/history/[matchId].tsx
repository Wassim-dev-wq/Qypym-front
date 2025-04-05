import React, {useCallback, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Platform,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useMatchHistoryDetail} from '@/src/core/api/matches/matchesHooks';
import {useAuth} from '@/src/core/api/auth/useAuth';
import {t} from 'src/constants/locales';
import TeamsList from '@/app/(modals)/components/teamsList';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
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

const FeedbackRatingsView = ({ratings, averages, isCurrentUser}) => {
    if (!ratings || ratings.length === 0) {
        return (
            <View style={styles.emptyRatings}>
                <Text style={styles.emptyRatingsText}>
                    {isCurrentUser ? t('noRatingsReceived') : t('playerHasNoRatings')}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.ratingsList}>
            <View style={styles.averagesCard}>
                <LinearGradient
                    colors={['rgba(26,26,26,0.95)', 'rgba(17,17,17,0.85)']}
                    style={styles.averagesGradient}
                >
                    <Text style={styles.averagesTitle}>
                        {isCurrentUser ? t('yourAverageRatings') : t('playerAverageRatings')}
                    </Text>

                    <View style={styles.averagesGrid}>
                        <View style={styles.averageItem}>
                            <Text style={styles.averageValue}>{averages.avgSkillRating.toFixed(1)}</Text>
                            <Text style={styles.averageLabel}>{t('skill')}</Text>
                        </View>

                        <View style={styles.averageItem}>
                            <Text style={styles.averageValue}>{averages.avgSportsmanshipRating.toFixed(1)}</Text>
                            <Text style={styles.averageLabel}>{t('sportsmanship')}</Text>
                        </View>

                        <View style={styles.averageItem}>
                            <Text style={styles.averageValue}>{averages.avgTeamworkRating.toFixed(1)}</Text>
                            <Text style={styles.averageLabel}>{t('teamwork')}</Text>
                        </View>

                        <View style={styles.averageItem}>
                            <Text style={styles.averageValue}>{averages.avgReliabilityRating.toFixed(1)}</Text>
                            <Text style={styles.averageLabel}>{t('reliability')}</Text>
                        </View>
                    </View>

                    <View style={styles.overallContainer}>
                        <Text style={styles.overallLabel}>{t('overallRating')}</Text>
                        <View style={styles.overallValue}>
                            <LinearGradient
                                colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                                style={styles.overallBadge}
                            >
                                <Text style={styles.overallScore}>{averages.avgOverallRating.toFixed(1)}</Text>
                            </LinearGradient>
                        </View>
                    </View>
                </LinearGradient>
            </View>
            {isCurrentUser && (
                <>
                    <Text style={styles.individualRatingsTitle}>{t('individualRatings')}</Text>

                    {ratings.map((rating, index) => (
                        <View key={index} style={styles.ratingItem}>
                            <LinearGradient
                                colors={['rgba(26,26,26,0.95)', 'rgba(17,17,17,0.85)']}
                                style={styles.ratingGradient}
                            >
                                <View style={styles.ratingHeader}>
                                    <MaterialCommunityIcons name="account" size={20} color={COLORS.primary.accent}/>
                                    <Text style={styles.ratingTitle}>{t('playerRating')}</Text>
                                </View>

                                <View style={styles.ratingGrid}>
                                    <View style={styles.ratingRow}>
                                        <Text style={styles.ratingLabel}>{t('skill')}</Text>
                                        <View style={styles.starsContainer}>
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <MaterialCommunityIcons
                                                    key={star}
                                                    name={star <= rating.skillRating ? "star" : "star-outline"}
                                                    size={16}
                                                    color={COLORS.primary.accent}
                                                />
                                            ))}
                                        </View>
                                    </View>

                                    <View style={styles.ratingRow}>
                                        <Text style={styles.ratingLabel}>{t('sportsmanship')}</Text>
                                        <View style={styles.starsContainer}>
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <MaterialCommunityIcons
                                                    key={star}
                                                    name={star <= rating.sportsmanshipRating ? "star" : "star-outline"}
                                                    size={16}
                                                    color={COLORS.primary.accent}
                                                />
                                            ))}
                                        </View>
                                    </View>

                                    <View style={styles.ratingRow}>
                                        <Text style={styles.ratingLabel}>{t('teamwork')}</Text>
                                        <View style={styles.starsContainer}>
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <MaterialCommunityIcons
                                                    key={star}
                                                    name={star <= rating.teamworkRating ? "star" : "star-outline"}
                                                    size={16}
                                                    color={COLORS.primary.accent}
                                                />
                                            ))}
                                        </View>
                                    </View>

                                    <View style={styles.ratingRow}>
                                        <Text style={styles.ratingLabel}>{t('reliability')}</Text>
                                        <View style={styles.starsContainer}>
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <MaterialCommunityIcons
                                                    key={star}
                                                    name={star <= rating.reliabilityRating ? "star" : "star-outline"}
                                                    size={16}
                                                    color={COLORS.primary.accent}
                                                />
                                            ))}
                                        </View>
                                    </View>
                                </View>

                                {rating.comments && (
                                    <View style={styles.commentContainer}>
                                        <Text style={styles.commentLabel}>{t('comments')}:</Text>
                                        <Text style={styles.commentText}>{rating.comments}</Text>
                                    </View>
                                )}
                            </LinearGradient>
                        </View>
                    ))}
                </>
            )}
        </View>
    );
};

const WeatherInfoCard = ({weather}) => {
    if (!weather) return null;

    return (
        <LinearGradient
            colors={['rgba(26,26,26,0.95)', 'rgba(17,17,17,0.85)']}
            style={styles.weatherCard}
        >
            <View style={styles.weatherHeader}>
                <MaterialCommunityIcons
                    name="weather-partly-cloudy"
                    size={24}
                    color={COLORS.primary.accent}
                />
                <Text style={styles.weatherTitle}>{t('matchWeather')}</Text>
            </View>

            <View style={styles.weatherGrid}>
                <View style={styles.weatherItem}>
                    <MaterialCommunityIcons name="thermometer" size={20} color={THEME_COLORS.textSecondary}/>
                    <Text style={styles.weatherValue}>{weather.temperature}°C</Text>
                    <Text style={styles.weatherLabel}>{t('temperature')}</Text>
                </View>

                <View style={styles.weatherItem}>
                    <MaterialCommunityIcons name="weather-cloudy" size={20} color={THEME_COLORS.textSecondary}/>
                    <Text style={styles.weatherValue}>{weather.condition}</Text>
                    <Text style={styles.weatherLabel}>{t('condition')}</Text>
                </View>

                <View style={styles.weatherItem}>
                    <MaterialCommunityIcons name="water-percent" size={20} color={THEME_COLORS.textSecondary}/>
                    <Text style={styles.weatherValue}>{weather.humidity}%</Text>
                    <Text style={styles.weatherLabel}>{t('humidity')}</Text>
                </View>

                <View style={styles.weatherItem}>
                    <MaterialCommunityIcons name="weather-windy" size={20} color={THEME_COLORS.textSecondary}/>
                    <Text style={styles.weatherValue}>{weather.windSpeed} km/h</Text>
                    <Text style={styles.weatherLabel}>{t('wind')}</Text>
                </View>
            </View>
        </LinearGradient>
    );
};

const MatchResultCard = ({result, teamName, isCurrentUser}) => {
    if (!result) return null;

    return (
        <LinearGradient
            colors={['rgba(26,26,26,0.95)', 'rgba(17,17,17,0.85)']}
            style={styles.resultCard}
        >
            <View style={styles.resultHeader}>
                <MaterialCommunityIcons
                    name="scoreboard"
                    size={24}
                    color={COLORS.primary.accent}
                />
                <Text style={styles.resultTitle}>{t('matchResult')}</Text>
            </View>

            <View style={styles.scoreContainer}>
                <View style={styles.scoreTeam}>
                    <Text style={styles.scoreValue}>{result.team1Score}</Text>
                    <Text style={styles.scoreTeamName}>
                        {result.winningTeamNumber === 1 ? (
                            <MaterialCommunityIcons name="trophy" size={16} color={COLORS.primary.accent}/>
                        ) : null} Team 1
                    </Text>
                </View>

                <Text style={styles.scoreVs}>vs</Text>

                <View style={styles.scoreTeam}>
                    <Text style={styles.scoreValue}>{result.team2Score}</Text>
                    <Text style={styles.scoreTeamName}>
                        {result.winningTeamNumber === 2 ? (
                            <MaterialCommunityIcons name="trophy" size={16} color={COLORS.primary.accent}/>
                        ) : null} Team 2
                    </Text>
                </View>
            </View>

            <View style={styles.resultStatus}>
                {result.winningTeamId ? (
                    <Text style={styles.resultStatusText}>
                        {isCurrentUser ? (
                            teamName === result.winningTeamName ? (
                                <Text style={{color: THEME_COLORS.success}}>{t('youWon')}</Text>
                            ) : (
                                <Text style={{color: THEME_COLORS.error}}>{t('youLost')}</Text>
                            )
                        ) : (
                            teamName === result.winningTeamName ? (
                                <Text style={{color: THEME_COLORS.success}}>{t('playerWon')}</Text>
                            ) : (
                                <Text style={{color: THEME_COLORS.error}}>{t('playerLost')}</Text>
                            )
                        )}
                    </Text>
                ) : (
                    <Text style={styles.resultStatusText}>{t('matchDraw')}</Text>
                )}
            </View>
            {isCurrentUser && result.userSubmittedScore && (
                <View style={styles.userScoreSubmission}>
                    <Text style={styles.userScoreLabel}>{t('yourSubmittedScore')}</Text>
                    <View style={styles.userScoreValues}>
                        <Text
                            style={styles.userScoreText}>{result.userSubmittedTeam1Score} - {result.userSubmittedTeam2Score}</Text>
                        <View style={[
                            styles.userScoreStatus,
                            {
                                backgroundColor: result.userScoreSubmissionStatus === 'ACCEPTED' ?
                                    'rgba(34, 197, 94, 0.2)' :
                                    'rgba(255, 184, 0, 0.2)',
                                borderColor: result.userScoreSubmissionStatus === 'ACCEPTED' ?
                                    'rgba(34, 197, 94, 0.4)' :
                                    'rgba(255, 184, 0, 0.4)'
                            }
                        ]}>
                            <Text style={[
                                styles.userScoreStatusText,
                                {
                                    color: result.userScoreSubmissionStatus === 'ACCEPTED' ?
                                        THEME_COLORS.success :
                                        COLORS.primary.accent
                                }
                            ]}>
                                {result.userScoreSubmissionStatus}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </LinearGradient>
    );
};

const UserFeedbackCard = ({feedback, isCurrentUser}) => {
    if (!feedback || !feedback.userSubmittedFeedback || !isCurrentUser) return null;

    return (
        <LinearGradient
            colors={['rgba(26,26,26,0.95)', 'rgba(17,17,17,0.85)']}
            style={styles.feedbackCard}
        >
            <View style={styles.feedbackHeader}>
                <MaterialCommunityIcons
                    name="comment-text-outline"
                    size={24}
                    color={COLORS.primary.accent}
                />
                <Text style={styles.feedbackTitle}>{t('yourFeedback')}</Text>
            </View>

            <View style={styles.ratingContainer}>
                <Text style={styles.ratingTitle}>{t('matchRating')}</Text>
                <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map(star => (
                        <MaterialCommunityIcons
                            key={star}
                            name={star <= feedback.userMatchRating ? "star" : "star-outline"}
                            size={22}
                            color={COLORS.primary.accent}
                        />
                    ))}
                </View>
            </View>

            {feedback.userMatchComments && (
                <View style={styles.commentsContainer}>
                    <Text style={styles.commentsLabel}>{t('yourComments')}:</Text>
                    <Text style={styles.commentsText}>{feedback.userMatchComments}</Text>
                </View>
            )}

            <Text style={styles.submittedAt}>
                {t('submittedOn')} {formatDate(feedback.userFeedbackSubmittedAt)} {t('at')} {formatTime(feedback.userFeedbackSubmittedAt)}
            </Text>
        </LinearGradient>
    );
};

export default function MatchId() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const {matchId} = useLocalSearchParams();
    const {user} = useAuth();

    const {match, isLoading, isError} = useMatchHistoryDetail(matchId, {
        staleTime: 5 * 60 * 1000
    });

    const [teamsExpanded, setTeamsExpanded] = useState(false);
    const [feedbackExpanded, setFeedbackExpanded] = useState(true);
    const scrollAnime = useRef(new Animated.Value(0)).current;

    const isCurrentUser = user && match && user.id === match.playerId;

    const headerStyle = {
        paddingTop: insets.top > 0 ? insets.top : Platform.OS === 'android' ? 32 : 10
    };

    const shareMatch = useCallback(async () => {
        if (!match) return;
        try {
            await Share.share({
                message: t('shareMatchHistoryMessage', {
                    title: match.title,
                    date: formatDate(match.startDate),
                    score: `${match.result?.team1Score || 0} - ${match.result?.team2Score || 0}`,
                }),
            });
        } catch (error) {
            console.error(t('shareError'), error);
        }
    }, [match]);

    const topFade = scrollAnime.interpolate({
        inputRange: [0, 100, 200],
        outputRange: [0, 0.7, 1],
        extrapolate: 'clamp'
    });

    const scrollEvent = (e) => {
        scrollAnime.setValue(e.nativeEvent.contentOffset.y);
    };

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.primary.accent}/>
                <Text style={styles.loadingText}>{t('loadingMatchDetails')}</Text>
            </View>
        );
    }

    if (isError || !match) {
        return (
            <View style={styles.centered}>
                <MaterialCommunityIcons name="alert-circle-outline" size={60} color={THEME_COLORS.error}/>
                <Text style={styles.errorTitle}>{t('errorOccurred')}</Text>
                <Text style={styles.errorText}>{t('loadErrorMatchDetail')}</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>{t('back')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const statusColor = getStatusColor(match.status);

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
            <View style={[styles.header, headerStyle]}>
                <Animated.View style={[styles.headerFade, {opacity: topFade}]}>
                    <LinearGradient
                        colors={['rgba(10, 10, 10, 0.98)', 'rgba(10, 10, 10, 0.95)']}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialCommunityIcons name="chevron-left" size={26} color={THEME_COLORS.textPrimary}/>
                    </TouchableOpacity>
                </View>
                <Animated.View style={[styles.headTitleSpot, {opacity: topFade}]}>
                    <Text style={styles.headTitle} numberOfLines={1}>{match.title}</Text>
                </Animated.View>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={shareMatch} style={styles.actionButton}>
                        <MaterialCommunityIcons name="share-variant" size={22} color={THEME_COLORS.textPrimary}/>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                onScroll={scrollEvent}
                scrollEventThrottle={16}
            >
                <View style={styles.heroSection}>
                    <View style={styles.statusBadge}>
                        <LinearGradient
                            colors={[statusColor, statusColor === THEME_COLORS.textSecondary ? 'rgba(255, 255, 255, 0.1)' : statusColor]}
                            style={styles.statusGradient}
                        >
                            <Text style={styles.statusText}>{match.status}</Text>
                        </LinearGradient>
                    </View>

                    <Text style={styles.matchTitle}>{match.title}</Text>

                    <View style={styles.matchDateTime}>
                        <MaterialCommunityIcons name="calendar-clock" size={18} color={THEME_COLORS.textSecondary}/>
                        <Text style={styles.matchDate}>
                            {formatDate(match.startDate)} • {formatTime(match.startDate)}
                        </Text>
                    </View>

                    <View style={styles.matchLocation}>
                        <MaterialCommunityIcons name="map-marker" size={18} color={THEME_COLORS.textSecondary}/>
                        <Text style={styles.locationText}>{match.address}</Text>
                    </View>

                    <View style={styles.matchDetails}>
                        <View style={styles.detailItem}>
                            <MaterialCommunityIcons name="soccer-field" size={16} color={COLORS.primary.accent}/>
                            <Text style={styles.detailLabel}>{t('format')}</Text>
                            <Text style={styles.detailValue}>{match.format}</Text>
                        </View>

                        <View style={styles.detailItem}>
                            <MaterialCommunityIcons name="gauge" size={16} color={COLORS.primary.accent}/>
                            <Text style={styles.detailLabel}>{t('level')}</Text>
                            <Text style={styles.detailValue}>{match.skillLevel}</Text>
                        </View>

                        <View style={styles.detailItem}>
                            <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.primary.accent}/>
                            <Text style={styles.detailLabel}>{t('duration')}</Text>
                            <Text style={styles.detailValue}>{match.duration} min</Text>
                        </View>

                        <View style={styles.detailItem}>
                            <MaterialCommunityIcons name="account-group" size={16} color={COLORS.primary.accent}/>
                            <Text style={styles.detailLabel}>{t('role')}</Text>
                            <Text style={styles.detailValue}>{match.playerRole}</Text>
                        </View>
                    </View>
                </View>

                {match.result && (
                    <View style={styles.section}>
                        <MatchResultCard
                            result={match.result}
                            teamName={match.playerTeamName}
                            isCurrentUser={isCurrentUser}
                        />
                    </View>
                )}

                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.sectionHeader}
                        onPress={() => setTeamsExpanded(!teamsExpanded)}
                    >
                        <View style={styles.sectionHeaderLeft}>
                            <MaterialCommunityIcons
                                name="account-group"
                                size={24}
                                color={COLORS.primary.accent}
                            />
                            <Text style={styles.sectionTitle}>{t('teams')}</Text>
                        </View>
                        <MaterialCommunityIcons
                            name={teamsExpanded ? "chevron-up" : "chevron-down"}
                            size={24}
                            color={THEME_COLORS.textSecondary}
                        />
                    </TouchableOpacity>

                    {teamsExpanded && match.teams && match.teams.length > 0 && (
                        <TeamsList
                            teams={match.teams}
                            joinRequest={null}
                            isCreator={match.isCreator}
                            userId={match.creatorId}
                            router={router}
                            t={t}
                        />
                    )}
                </View>
                {isCurrentUser && match.feedback && match.feedback.userSubmittedFeedback && (
                    <View style={styles.section}>
                        <UserFeedbackCard
                            feedback={match.feedback}
                            isCurrentUser={isCurrentUser}
                        />
                    </View>
                )}

                {match.feedback && match.feedback.ratingsReceived && (
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={styles.sectionHeader}
                            onPress={() => setFeedbackExpanded(!feedbackExpanded)}
                        >
                            <View style={styles.sectionHeaderLeft}>
                                <MaterialCommunityIcons
                                    name="star"
                                    size={24}
                                    color={COLORS.primary.accent}
                                />
                                <Text style={styles.sectionTitle}>
                                    {isCurrentUser ? t('ratingsReceived') : t('playerRatings')}
                                </Text>
                            </View>
                            <MaterialCommunityIcons
                                name={feedbackExpanded ? "chevron-up" : "chevron-down"}
                                size={24}
                                color={THEME_COLORS.textSecondary}
                            />
                        </TouchableOpacity>

                        {feedbackExpanded && (
                            <View style={styles.centeredSection}>
                                <View style={styles.ratingsContainer}>
                                    <FeedbackRatingsView
                                        ratings={match.feedback.ratingsReceived}
                                        averages={{
                                            avgSkillRating: match.feedback.avgSkillRating,
                                            avgSportsmanshipRating: match.feedback.avgSportsmanshipRating,
                                            avgTeamworkRating: match.feedback.avgTeamworkRating,
                                            avgReliabilityRating: match.feedback.avgReliabilityRating,
                                            avgOverallRating: match.feedback.avgOverallRating
                                        }}
                                        isCurrentUser={isCurrentUser}
                                    />
                                </View>
                            </View>
                        )}
                    </View>
                )}

                <View style={{height: 100}}/>
            </ScrollView>
        </SafeAreaView>
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
    centeredSection: {
        alignItems: 'center',
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    weatherCardContainer: {
        width: '100%',
        maxWidth: 500,
    },
    ratingsContainer: {
        width: '100%',
        maxWidth: 500,
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
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        zIndex: 10,
    },
    headerFade: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
    },
    headerLeft: {
        zIndex: 3,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: THEME_COLORS.cardAccent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headTitleSpot: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    headTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: THEME_COLORS.textPrimary,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 8,
        zIndex: 3,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: THEME_COLORS.cardAccent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
        paddingTop: 100,
    },
    heroSection: {
        padding: 20,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
    },
    statusGradient: {
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#000',
    },
    matchTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: THEME_COLORS.textPrimary,
        marginBottom: 12,
    },
    matchDateTime: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    matchDate: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
    },
    matchLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 8,
    },
    locationText: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
        flexShrink: 1,
    },
    matchDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
        justifyContent: 'center',
    },
    detailItem: {
        backgroundColor: 'rgba(26,26,26,0.9)',
        padding: 10,
        borderRadius: 12,
        alignItems: 'center',
        width: (SCREEN_WIDTH - 56) / 2,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    detailLabel: {
        fontSize: 12,
        color: THEME_COLORS.textSecondary,
        marginTop: 4,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginTop: 2,
    },
    section: {
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
    },

    resultCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
    },
    scoreContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    scoreTeam: {
        flex: 1,
        alignItems: 'center',
    },
    scoreValue: {
        fontSize: 36,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
        marginBottom: 4,
    },
    scoreTeamName: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
    },
    scoreVs: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
        marginHorizontal: 10,
    },
    resultStatus: {
        alignItems: 'center',
        marginBottom: 16,
    },
    resultStatusText: {
        fontSize: 16,
        fontWeight: '600',
    },
    userScoreSubmission: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        paddingTop: 12,
    },
    userScoreLabel: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
        marginBottom: 8,
    },
    userScoreValues: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userScoreText: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
    },
    userScoreStatus: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    userScoreStatusText: {
        fontSize: 12,
        fontWeight: '600',
    },

    weatherCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
        width: '100%',
    },
    weatherHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    weatherTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
    },
    weatherGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
    },
    weatherItem: {
        width: (SCREEN_WIDTH - 120) / 2,
        alignItems: 'center',
        gap: 4,
    },
    weatherValue: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginTop: 4,
    },
    weatherLabel: {
        fontSize: 12,
        color: THEME_COLORS.textSecondary,
    },

    feedbackCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    feedbackHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    feedbackTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
    },
    ratingContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    ratingTitle: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
        marginBottom: 8,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 4,
    },
    commentsContainer: {
        marginBottom: 16,
    },
    commentsLabel: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
        marginBottom: 4,
    },
    commentsText: {
        fontSize: 14,
        color: THEME_COLORS.textPrimary,
        lineHeight: 20,
    },
    submittedAt: {
        fontSize: 12,
        color: THEME_COLORS.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
    },

    ratingsList: {
        gap: 16,
        width: '100%',
    },
    averagesCard: {
        marginBottom: 16,
        width: '100%',
    },
    averagesGradient: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    averagesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginBottom: 16,
        textAlign: 'center',
    },
    averagesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 16,
        justifyContent: 'center',
    },
    averageItem: {
        width: (SCREEN_WIDTH - 120) / 2,
        alignItems: 'center',
    },
    averageValue: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.primary.accent,
    },
    averageLabel: {
        fontSize: 12,
        color: THEME_COLORS.textSecondary,
        marginTop: 4,
    },
    overallContainer: {
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        paddingTop: 16,
    },
    overallLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginBottom: 8,
    },
    overallBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    overallScore: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    individualRatingsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginBottom: 12,
        textAlign: 'center',
    },
    ratingItem: {
        marginBottom: 12,
        width: '100%',
    },
    ratingGradient: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    ratingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    ratingTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
    },
    ratingGrid: {
        gap: 8,
        marginBottom: 12,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    ratingLabel: {
        fontSize: 13,
        color: THEME_COLORS.textSecondary,
    },
    starsContainer: {
        flexDirection: 'row',
        gap: 2,
    },
    commentContainer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        paddingTop: 12,
    },
    commentLabel: {
        fontSize: 13,
        color: THEME_COLORS.textSecondary,
        marginBottom: 4,
    },
    commentText: {
        fontSize: 13,
        color: THEME_COLORS.textPrimary,
        lineHeight: 18,
    },
    emptyRatings: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 100,
    },
    emptyRatingsText: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
        fontStyle: 'italic',
    },
});