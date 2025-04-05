import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    RefreshControl,
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
import {useRouter} from 'expo-router';
import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAuth} from '@/src/core/api/auth/useAuth';
import {IconButton} from '@/app/(tabs)/profile/components/ProfileUIComponents';
import {ProfileSettingsModal} from '@/app/(tabs)/profile/components/ProfileSettingsModal';
import {PlayerRatingCard} from '@/app/(modals)/profile/components/PlayerRatingCard';
import {RenderStatRow} from '@/app/(modals)/profile/components/RenderStatRow';
import {t} from 'src/constants/locales';
import {useMatchHistory} from '@/src/core/api/matches/matchesHooks';
import {useQueryClient} from '@tanstack/react-query';
import {matchService} from '@/src/core/api/matches/matchesService';
import {ProfilePhoto} from "@/app/(modals)/profile/components/ProfilePhoto";
import {OnlineStatusBadge} from "@/app/(modals)/profile/components/OnlineStatusBadge";
import {useUser} from "@/src/core/hooks/useUserFetch";

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const simpleDate = (val: string | number | Date) => {
    if (!val) return 'Récent';
    const months = [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    const dateObj = new Date(val);
    return `${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
};

const getAge = (dob?: string | number | Date) => {
    if (!dob) return 0;
    const born = new Date(dob);
    const diff = Date.now() - born.getTime();
    const calc = new Date(diff);
    return Math.abs(calc.getUTCFullYear() - 1970);
};

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {day: 'numeric', month: 'short', year: 'numeric'});
};

const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});
};

const getStatusColor = (status: string) => {
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

const MatchHistoryCard = ({
                              match,
                              onPress
                          }: {
    match: any;
    onPress: () => void;
}) => {
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
                            style={[
                                styles.teamName,
                                match.playerTeamId === match.teams[0]?.teamId && styles.userTeam
                            ]}
                        >
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
                            style={[
                                styles.teamName,
                                match.playerTeamId === match.teams[1]?.teamId && styles.userTeam
                            ]}
                        >
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
                                <MaterialCommunityIcons
                                    name="emoticon-sad-outline"
                                    size={14}
                                    color={THEME_COLORS.textSecondary}
                                />
                                <Text style={styles.loseText}>{t('defeat')}</Text>
                            </View>
                        ) : (
                            <View style={styles.drawBadge}>
                                <MaterialCommunityIcons
                                    name="handshake"
                                    size={14}
                                    color={THEME_COLORS.textSecondary}
                                />
                                <Text style={styles.drawText}>{t('draw')}</Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={styles.cardFooter}>
                    <View style={styles.footerItem}>
                        <MaterialCommunityIcons
                            name="account-group"
                            size={16}
                            color={THEME_COLORS.textSecondary}
                        />
                        <Text style={styles.footerText}>
                            {match.teams.reduce(
                                (acc: number, team: any) => acc + (team.players?.length || 0),
                                0
                            )}{' '}
                            {t('players')}
                        </Text>
                    </View>

                    {match.feedback && (
                        <View style={styles.footerItem}>
                            <MaterialCommunityIcons
                                name="star"
                                size={16}
                                color={
                                    match.feedback.userSubmittedFeedback
                                        ? COLORS.primary.accent
                                        : THEME_COLORS.textSecondary
                                }
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

                    <MaterialCommunityIcons
                        name="chevron-right"
                        size={20}
                        color={THEME_COLORS.textSecondary}
                    />
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
};

const HistoryScreen = ({userId}: { userId: string }) => {
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
                pathname: '/history/[matchId]',
                params: {matchId}
            });
        } catch (error) {
            console.error('Failed to prefetch match detail:', error);

            router.push({
                pathname: '/history/[matchId]',
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
        <View style={styles.matchHistoryContainer}>
            <FlatList
                data={matches}
                keyExtractor={(item) => item.matchId}
                renderItem={({item}) => (
                    <MatchHistoryCard
                        match={item}
                        onPress={() => navigateToMatchDetail(item.matchId)}
                    />
                )}
                contentContainerStyle={styles.matchHistoryList}
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
};

interface PlayerProfileProps {
    userId: string;
}

export const PlayerProfile = ({userId}: PlayerProfileProps) => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const {signOut} = useAuth();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
    const [showModal, setShowModal] = useState(false);
    const [hasRendered, setHasRendered] = useState(false);

    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const tabLineAnim = useRef(new Animated.Value(0)).current;

    const scrollAnim = useRef(new Animated.Value(0)).current;

    const {
        data: player,
        isLoading: isUserLoading,
        isError: isUserError,
        refetch: refetchUser
    } = useUser(userId);

    useEffect(() => {
        const timer = setTimeout(() => {
            setHasRendered(true);
        }, 100);
        return () => clearTimeout(timer);
    }, []);


    useEffect(() => {
        fadeAnim.setValue(1);
        scaleAnim.setValue(1);
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true
            })
        ]).start();
    }, [activeTab]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true
            })
        ]).start();
    }, []);

    useEffect(() => {
        Animated.spring(tabLineAnim, {
            toValue: activeTab === 'overview' ? 0 : 1,
            friction: 8,
            tension: 60,
            useNativeDriver: true
        }).start();
    }, [activeTab]);

    const topFade = scrollAnim.interpolate({
        inputRange: [0, 100, 200],
        outputRange: [0, 0.7, 1],
        extrapolate: 'clamp'
    });
    const picScale = scrollAnim.interpolate({
        inputRange: [0, 150],
        outputRange: [1, 0.5],
        extrapolate: 'clamp'
    });
    const picMove = scrollAnim.interpolate({
        inputRange: [0, 150],
        outputRange: [0, -60],
        extrapolate: 'clamp'
    });
    const cogFade = scrollAnim.interpolate({
        inputRange: [0, 100, 150],
        outputRange: [1, 0.3, 0],
        extrapolate: 'clamp'
    });

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollAnim.setValue(e.nativeEvent.contentOffset.y);
    };

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await Promise.all([refetchUser()]);
        setIsRefreshing(false);
    }, [refetchUser]);

    const handleShareProfile = async () => {
        if (!player) return;
        try {
            const universalLink = `https://qypym.fr/profiles/${userId}`;
            const shareMessage = t('shareProfileMessage', {
                firstName: player.firstName,
                lastName: player.lastName,
                username: player.username,
            });
            await Share.share({
                message: shareMessage,
                url: universalLink
            }, {
                dialogTitle: t('shareProfile')
            });
        } catch (err) {
            console.error(t('shareError'), err);
            Alert.alert(t('error'), t('shareError'));
        }
    };

    const handleOpenSettings = () => setShowModal(true);
    const handleCloseSettings = useCallback(() => {
        setShowModal(false);
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true
                })
            ]).start();
        }, 100);
    }, [fadeAnim, scaleAnim]);
    const handleSignOut = async () => {
        try {
            await signOut();
            router.replace('/(auth)/login');
        } catch (e) {
            Alert.alert('Erreur', 'Impossible de vous déconnecter. Veuillez réessayer.');
        }
    };

    const handleRemoveAccount = async () => {
        try {
            Alert.alert('Compte supprimé', 'Votre compte a été supprimé avec succès.', [
                {
                    text: 'OK',
                    onPress: () => {
                        signOut();
                        router.replace('/(auth)/login');
                    }
                }
            ]);
        } catch (e) {
            Alert.alert('Erreur', 'Impossible de supprimer votre compte. Veuillez réessayer.');
        }
    };

    const handleInviteToPlay = () => {
        if (!player) return;
        Alert.alert(
            'Inviter à jouer',
            `Voulez-vous inviter ${player.firstName} à jouer un match ?`,
            [
                {text: 'Annuler', style: 'cancel'},
                {
                    text: 'Inviter', style: 'default', onPress: () => {
                    }
                }
            ]
        );
    };

    if (!player) {
        return (
            <Animated.View style={[styles.failWrap, {opacity: fadeAnim, transform: [{scale: scaleAnim}]}]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={60} color={THEME_COLORS.error}/>
                <Text style={styles.failTitle}>Oups !</Text>
                <Text style={styles.failDesc}>Impossible de charger le profil du joueur.</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.failBtn} activeOpacity={0.8}>
                    <LinearGradient
                        colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                        style={styles.failGrad}
                    >
                        <Text style={styles.failBtnTxt}>Retour</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        );
    }

    const renderOverviewTab = () => (
        <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            refreshControl={
                <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    colors={[COLORS.primary.accent]}
                    tintColor={COLORS.primary.accent}
                />
            }
        >
            <Animated.View style={[styles.topSection, {opacity: fadeAnim, transform: [{scale: scaleAnim}]}]}>
                <Animated.View
                    style={[
                        styles.picWrap,
                        {
                            transform: [{scale: picScale}, {translateY: picMove}]
                        }
                    ]}
                >
                    <ProfilePhoto
                        userId={userId}
                        letter={player.firstName?.charAt(0) || '?'}
                        showOnlineStatus={true}
                        usePresence={true}
                    />
                </Animated.View>

                <Text style={styles.bigName}>
                    {player.firstName} {player.lastName}
                </Text>
                <Text style={styles.handle}>@{player.username}</Text>

                <View style={styles.badgeRow}>
                    {player.isProfileVerified && (
                        <LinearGradient
                            colors={['rgba(255, 184, 0, 0.2)', 'rgba(255, 184, 0, 0.05)']}
                            style={styles.verifBadge}
                        >
                            <MaterialCommunityIcons name="shield-check" size={14} color={COLORS.primary.accent}/>
                            <Text style={styles.verifTxt}>Profil vérifié</Text>
                        </LinearGradient>
                    )}

                    <OnlineStatusBadge userId={userId} />

                    <View style={styles.joinBadge}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color={THEME_COLORS.textSecondary}/>
                        <Text style={styles.joinTxt}>Membre depuis {simpleDate(player.createdAt)}</Text>
                    </View>
                </View>

                <RenderStatRow playerId={userId}/>
            </Animated.View>

            {player.bio && (
                <Animated.View style={[styles.bioBox, {opacity: fadeAnim, transform: [{scale: scaleAnim}]}]}>
                    <LinearGradient
                        colors={['rgba(26,26,26,0.9)', 'rgba(17,17,17,0.8)']}
                        style={styles.bioInner}
                    >
                        <View style={styles.bioHead}>
                            <MaterialCommunityIcons
                                name="card-account-details-outline"
                                size={18}
                                color={COLORS.primary.accent}
                            />
                            <Text style={styles.bioTitle}>Bio</Text>
                        </View>
                        <Text style={styles.bioDesc}>{player.bio}</Text>
                    </LinearGradient>
                </Animated.View>
            )}

            <View style={styles.section}>
                <Text style={styles.secTitle}>Évaluations</Text>
                <PlayerRatingCard playerId={userId}/>
            </View>

            {player.dateOfBirth && (
                <View style={styles.section}>
                    <Text style={styles.secTitle}>Informations</Text>
                    <View style={styles.infoRow}>
                        <LinearGradient
                            colors={['rgba(26,26,26,0.9)', 'rgba(17,17,17,0.8)']}
                            style={styles.infoBox}
                        >
                            <MaterialCommunityIcons name="cake-variant" size={20} color={COLORS.primary.accent}/>
                            <Text style={styles.infoLab}>Âge</Text>
                            <Text style={styles.infoVal}>{getAge(player.dateOfBirth)} ans</Text>
                        </LinearGradient>

                        <LinearGradient
                            colors={['rgba(26,26,26,0.9)', 'rgba(17,17,17,0.8)']}
                            style={styles.infoBox}
                        >
                            <MaterialCommunityIcons name="star-outline" size={20} color={COLORS.primary.accent}/>
                            <Text style={styles.infoLab}>Niveau</Text>
                            <Text style={styles.infoVal}>{player.playerLevel}</Text>
                        </LinearGradient>
                    </View>
                </View>
            )}

            <View style={{height: 100}}/>
        </ScrollView>
    );

    const renderHistoryTab = () => (
        <Animated.View style={[styles.historyContainer, {opacity: fadeAnim, transform: [{scale: scaleAnim}]}]}>
            <View style={styles.historyHeader}>
                <Text style={styles.secTitle}>{t('matchHistory')}</Text>
            </View>
            <HistoryScreen userId={userId}/>
        </Animated.View>
    );

    return (
        <SafeAreaView style={styles.pageWrap}>
            <View style={[styles.fixedHeader, {paddingTop: insets.top + 20}]}>
                <Animated.View pointerEvents="none" style={[styles.headerFade, {opacity: topFade}]}>
                    <LinearGradient
                        colors={['rgba(10, 10, 10, 0.98)', 'rgba(10, 10, 10, 0.95)']}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>

                <View style={styles.headerLeft}>
                    <IconButton icon="chevron-left" size={26} onPress={() => router.back()}/>
                </View>

                <Animated.View style={[styles.headTitleSpot, {opacity: topFade}]}>
                    <Text style={styles.headTitle}>
                        {player.firstName} {player.lastName}
                    </Text>
                </Animated.View>

                <View style={styles.headerRight}>
                    <IconButton icon="share-variant" onPress={handleShareProfile}/>
                    <Animated.View style={{opacity: cogFade}}>
                        <IconButton icon="cog" onPress={handleOpenSettings}/>
                    </Animated.View>
                </View>
            </View>
            <View style={styles.tabArea}>
                <View style={styles.tabWrap}>
                    {['overview', 'history'].map(tabKey => (
                        <TouchableOpacity
                            key={tabKey}
                            style={[styles.tabBtn, activeTab === tabKey && styles.tabBtnOn]}
                            onPress={() => setActiveTab(tabKey as 'overview' | 'history')}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tabTxt, activeTab === tabKey && styles.tabTxtOn]}>
                                {tabKey === 'overview' ? 'Aperçu' : 'Activité'}
                            </Text>
                        </TouchableOpacity>
                    ))}


                    <Animated.View
                        style={[
                            styles.tabLine,
                            {
                                transform: [
                                    {
                                        translateX: tabLineAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [65, 190]
                                        })
                                    }
                                ]
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={[COLORS.primary.accent, 'rgba(255, 184, 0, 0.5)']}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 0}}
                            style={styles.tabLineGrad}
                        />
                    </Animated.View>
                </View>
            </View>
            <View style={{ flex: 1 }}>
                {activeTab === 'overview' ? (
                    <Animated.View
                        style={[
                            { flex: 1 },
                            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
                        ]}
                    >
                        {renderOverviewTab()}
                    </Animated.View>
                ) : (
                    <Animated.View
                        style={[
                            { flex: 1 },
                            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
                        ]}
                    >
                        {renderHistoryTab()}
                    </Animated.View>
                )}
            </View>
            <ProfileSettingsModal
                visible={showModal}
                onClose={handleCloseSettings}
                user={player}
                onSignOut={handleSignOut}
                onDeleteAccount={handleRemoveAccount}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    pageWrap: {
        flex: 1,
        backgroundColor: THEME_COLORS.background
    },
    fixedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        zIndex: 10
    },
    tabContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: THEME_COLORS.background,
    },
    headerFade: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1
    },
    headerLeft: {
        zIndex: 3
    },
    headTitleSpot: {
        paddingTop: 60,
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2
    },
    headTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: THEME_COLORS.textPrimary
    },
    headerRight: {
        flexDirection: 'row',
        gap: 8,
        zIndex: 3
    },
    tabArea: {
        paddingHorizontal: 20,
        marginBottom: 20,
        marginTop: 80,
        zIndex: 20
    },
    tabWrap: {
        flexDirection: 'row',
        position: 'relative',
        justifyContent: 'center'
    },
    tabBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 20,
        minWidth: 120
    },
    tabBtnOn: {
        backgroundColor: 'rgba(255, 184, 0, 0.08)'
    },
    tabTxt: {
        fontSize: 15,
        fontWeight: '600',
        color: THEME_COLORS.textSecondary
    },
    tabTxtOn: {
        color: COLORS.primary.accent
    },
    tabLine: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 120,
        height: 3
    },
    tabLineGrad: {
        width: '100%',
        height: '100%',
        borderRadius: 1.5
    },
    scrollArea: {
        flex: 1
    },
    scrollContent: {
        paddingBottom: 100,
        paddingTop: 10
    },
    topSection: {
        padding: 20,
        alignItems: 'center'
    },
    picWrap: {
        position: 'relative',
        marginBottom: 16
    },
    picFrame: {
        width: 120,
        height: 120,
        borderRadius: 60,
        padding: 3,
        justifyContent: 'center',
        alignItems: 'center'
    },
    picInner: {
        width: '100%',
        height: '100%',
        borderRadius: 58,
        backgroundColor: 'rgba(26,26,26,0.9)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    picLetter: {
        fontSize: 48,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary
    },
    isOnline: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: THEME_COLORS.success,
        borderWidth: 2,
        borderColor: THEME_COLORS.background
    },
    bigName: {
        fontSize: 24,
        fontWeight: '700',
        color: THEME_COLORS.textPrimary,
        marginBottom: 4
    },
    handle: {
        fontSize: 15,
        color: THEME_COLORS.textSecondary,
        marginBottom: 12
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24
    },
    verifBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 6
    },
    verifTxt: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.primary.accent
    },
    joinBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(26,26,26,0.5)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)'
    },
    joinTxt: {
        fontSize: 13,
        color: THEME_COLORS.textSecondary
    },
    bioBox: {
        paddingHorizontal: 20,
        marginBottom: 24
    },
    bioInner: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)'
    },
    bioHead: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12
    },
    bioTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary
    },
    bioDesc: {
        fontSize: 15,
        lineHeight: 24,
        color: THEME_COLORS.textSecondary
    },
    section: {
        marginBottom: 24,
        paddingHorizontal: 20
    },
    secTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginBottom: 16
    },
    infoRow: {
        flexDirection: 'row',
        gap: 12
    },
    infoBox: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)'
    },
    infoLab: {
        fontSize: 13,
        color: THEME_COLORS.textSecondary
    },
    infoVal: {
        fontSize: 15,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary
    },
    failWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: THEME_COLORS.background,
        padding: 20
    },
    failTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
        marginTop: 16,
        marginBottom: 8
    },
    failDesc: {
        fontSize: 16,
        color: THEME_COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        maxWidth: '80%'
    },
    failBtn: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    failGrad: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12
    },
    failBtnTxt: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600'
    },

    historyContainer: {
        flex: 1,
        paddingTop: 10
    },
    historyHeader: {
        paddingHorizontal: 20,
        marginBottom: 10
    },
    matchHistoryContainer: {
        flex: 1,
        backgroundColor: THEME_COLORS.background
    },
    matchHistoryList: {
        padding: 16,
        paddingBottom: 100
    },
    matchCard: {
        borderRadius: 16,
        marginBottom: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    headerLeft: {
        flex: 1,
        marginRight: 10
    },
    matchTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginBottom: 4
    },
    matchDate: {
        fontSize: 13,
        color: THEME_COLORS.textSecondary
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.2)'
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600'
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 12
    },
    resultSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    teamResult: {
        flex: 1,
        alignItems: 'center'
    },
    teamName: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
        marginBottom: 8,
        textAlign: 'center'
    },
    userTeam: {
        color: COLORS.primary.accent,
        fontWeight: '600'
    },
    teamScore: {
        fontSize: 24,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary
    },
    versusContainer: {
        paddingHorizontal: 10
    },
    versusText: {
        fontSize: 12,
        color: THEME_COLORS.textSecondary
    },
    matchOutcome: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 16
    },
    outcomeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6
    },
    winText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#000'
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
        borderColor: 'rgba(255, 72, 66, 0.3)'
    },
    loseText: {
        fontSize: 13,
        fontWeight: '600',
        color: THEME_COLORS.error
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
        borderColor: 'rgba(255, 255, 255, 0.1)'
    },
    drawText: {
        fontSize: 13,
        fontWeight: '600',
        color: THEME_COLORS.textSecondary
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    footerText: {
        fontSize: 13,
        color: THEME_COLORS.textSecondary
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    loadingText: {
        marginTop: 16,
        color: THEME_COLORS.textSecondary,
        fontSize: 16
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
        marginTop: 16,
        marginBottom: 8
    },
    errorText: {
        color: THEME_COLORS.textSecondary,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        maxWidth: '80%'
    },
    retryButton: {
        backgroundColor: THEME_COLORS.cardAccent,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12
    },
    retryButtonText: {
        color: THEME_COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '600'
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginTop: 16,
        marginBottom: 8
    },
    emptyStateText: {
        fontSize: 16,
        color: THEME_COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        maxWidth: '80%'
    },
    exploreButton: {
        borderRadius: 12,
        overflow: 'hidden'
    },
    exploreGradient: {
        paddingVertical: 14,
        paddingHorizontal: 32
    },
    exploreButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600'
    }
});
