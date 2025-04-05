import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Platform,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useQueryClient} from '@tanstack/react-query';
import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {t} from '@/src/constants/locales';
import {chatService} from '@/src/core/api/chatService';
import RequestItem from '@/app/(tabs)/explore/components/RequestItem';
import RejectedRequestItem from '@/app/(tabs)/explore/components/RejectedRequestItem';
import {useHostJoinRequests, useMatchDetails, useMatchJoinRequestActions,} from '@/src/core/api/matches/matchesHooks';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import PlayerItem from "@/app/(tabs)/explore/components/PlayerItem";
import TeamsList from "@/app/(modals)/components/teamsList";
import {MatchFeedbackButton} from "@/app/(modals)/components/MatchFeedbackButton";
import {matchesApi} from "@/src/core/api/matches/matches.api";
import Modal from "react-native-modal";

interface LoadingModalProps {
    visible: boolean;
    step: number;
    onContinue?: () => void;
    mode?: 'create' | 'delete';
}

interface SectionHeaderProps {
    icon: string;
    title: string;
    expanded: boolean;
    count?: number;
    onToggle: () => void;
}

interface EmptySectionProps {
    message: string;
}

interface StatusBadgeProps {
    status: string;
}

interface VerificationCodeSectionProps {
    match: any;
    formatTime: (date: string) => string;
    shareMatch: () => void;
}

interface SectionState {
    teams: boolean;
    pendingRequests: boolean;
    acceptedPlayers: boolean;
    rejectedRequests: boolean;
    verificationCode: boolean;
}

const LoadingModal: React.FC<LoadingModalProps> = ({
                                                       visible,
                                                       step,
                                                       onContinue,
                                                       mode = 'create'
                                                   }) => {
    const creationMessages = [
        t('preparingYourMatch'),
        t('creatingYourMatch'),
        t('matchCreatedSuccessfully')
    ];

    const deletionMessages = [
        t('preparingToDeleteMatch'),
        t('deletingMatchData'),
        t('matchDeletedSuccessfully')
    ];

    const loadingMessages = mode === 'create' ? creationMessages : deletionMessages;

    const getProgressPercentage = () => {
        return step === 0 ? '33%' : step === 1 ? '66%' : '100%';
    };

    return (
        <Modal
            isVisible={visible}
            animationIn="fadeIn"
            animationOut="fadeOut"
            backdropOpacity={0.7}
        >
            <View style={modalStyles.overlay}>
                <LinearGradient
                    colors={['rgba(30,30,30,0.98)', 'rgba(25,25,25,0.95)']}
                    style={modalStyles.container}
                >
                    <View style={modalStyles.content}>
                        {step < 2 ? (
                            <ActivityIndicator size="large" color={COLORS.primary.accent}/>
                        ) : (
                            <MaterialCommunityIcons
                                name={mode === 'create' ? "check-circle" : "delete-circle"}
                                size={50}
                                color={mode === 'create' ? COLORS.primary.accent : THEME_COLORS.error}
                            />
                        )}

                        <Text style={[
                            modalStyles.message,
                            mode === 'delete' && step === 2 && {color: THEME_COLORS.error}
                        ]}>
                            {loadingMessages[step]}
                        </Text>

                        <View style={modalStyles.progressBarContainer}>
                            <View
                                style={[
                                    modalStyles.progressBar,
                                    {
                                        width: getProgressPercentage(),
                                        backgroundColor: mode === 'create' ?
                                            COLORS.primary.accent :
                                            step === 2 ? THEME_COLORS.error : COLORS.primary.accent
                                    }
                                ]}
                            />
                        </View>

                        {step === 2 && onContinue && (
                            <TouchableOpacity
                                style={[
                                    modalStyles.continueButton,
                                    mode === 'delete' && {backgroundColor: THEME_COLORS.error}
                                ]}
                                onPress={onContinue}
                            >
                                <Text style={modalStyles.continueButtonText}>
                                    {mode === 'create' ? t('continue') : t('done')}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </LinearGradient>
            </View>
        </Modal>
    );
};

const useSectionStates = () => {
    const [sections, setSections] = useState<SectionState>({
        teams: true,
        pendingRequests: false,
        acceptedPlayers: false,
        rejectedRequests: false,
        verificationCode: true
    });

    const toggleSection = useCallback((sectionName: keyof SectionState) => {
        setSections(prev => ({
            ...prev,
            [sectionName]: !prev[sectionName]
        }));
    }, []);

    return {sections, toggleSection};
};

const useAnimations = () => {
    const scrollY = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [0, 1],
        extrapolate: 'clamp'
    });

    const headerScale = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [1.1, 1],
        extrapolate: 'clamp'
    });

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return {
        scrollY,
        fadeAnim,
        slideAnim,
        headerOpacity,
        headerScale
    };
};

const useDateFormatter = () => {
    const formatDate = useCallback((dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'});
    }, []);

    const formatTime = useCallback((dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});
    }, []);

    return {formatDate, formatTime};
};

const SectionHeader: React.FC<SectionHeaderProps> = ({icon, title, expanded, count, onToggle}) => (
    <TouchableOpacity
        style={[styles.collapsibleHeader, {marginBottom: expanded ? 12 : 0}]}
        onPress={onToggle}
        activeOpacity={0.7}
    >
        <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
                name={icon as any}
                size={24}
                color={COLORS.primary.accent}
            />
            <Text style={styles.sectionTitle}>
                {count !== undefined ? `${title} (${count})` : title}
            </Text>
        </View>
        <View style={styles.chevronContainer}>
            <MaterialCommunityIcons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={24}
                color={THEME_COLORS.textSecondary}
            />
        </View>
    </TouchableOpacity>
);

const EmptySection: React.FC<EmptySectionProps> = ({message}) => (
    <View style={styles.emptySection}>
        <Text style={styles.emptySectionText}>{message}</Text>
    </View>
);

const StatusBadge: React.FC<StatusBadgeProps> = ({status}) => {
    const getStatusColor = () => {
        switch (status) {
            case 'SCHEDULED':
                return 'rgba(255, 184, 0, 0.15)';
            case 'IN_PROGRESS':
                return 'rgba(59, 130, 246, 0.15)';
            case 'FINISHED':
                return 'rgba(74, 222, 128, 0.15)';
            case 'CANCELLED':
                return 'rgba(239, 68, 68, 0.15)';
            default:
                return 'rgba(0, 0, 0, 0.15)';
        }
    };

    const getTextColor = () => {
        switch (status) {
            case 'SCHEDULED':
                return COLORS.primary.accent;
            case 'IN_PROGRESS':
                return '#3b82f6';
            case 'FINISHED':
                return '#4ade80';
            case 'CANCELLED':
                return '#ef4444';
            default:
                return THEME_COLORS.textPrimary;
        }
    };

    return (
        <View style={[styles.statusBadge, {backgroundColor: getStatusColor()}]}>
            <Text style={[styles.statusBadgeText, {color: getTextColor()}]}>
                {status}
            </Text>
        </View>
    );
};

const VerificationCodeSection: React.FC<VerificationCodeSectionProps> = ({match, formatTime, shareMatch}) => (
    <LinearGradient
        colors={['rgba(26,26,26,0.95)', 'rgba(17,17,17,0.85)']}
        style={styles.verificationGradient}
    >
        {match.codeExpiryTime && match.verificationCode !== "null" ? (
            <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>{t('matchVerificationCode')}</Text>
                <View style={styles.codeDisplay}>
                    <Text style={styles.codeText}>{match.verificationCode}</Text>
                </View>
                <Text style={styles.codeDescription}>
                    {t('codeValidUntil', {time: formatTime(match.codeExpiryTime)})}
                </Text>
                <TouchableOpacity
                    onPress={shareMatch}
                    style={styles.shareCodeButton}
                    activeOpacity={0.8}
                >
                    <MaterialCommunityIcons name="share-variant" size={18} color="#000"/>
                    <Text style={styles.shareCodeText}>{t('shareCode')}</Text>
                </TouchableOpacity>
            </View>
        ) : (
            <View style={styles.codeUnavailable}>
                <MaterialCommunityIcons
                    name="timer-sand"
                    size={32}
                    color={THEME_COLORS.textSecondary}
                />
                <Text style={styles.codeUnavailableTitle}>{t('codeNotAvailable')}</Text>
                <Text style={styles.codeUnavailableText}>
                    {t('codeAvailableTwoHours')}
                </Text>
            </View>
        )}
    </LinearGradient>
);

const MatchDetailScreen: React.FC = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const {matchId} = useLocalSearchParams<{ matchId: string }>();
    const safeMatchId = matchId || '';
    const {formatDate, formatTime} = useDateFormatter();
    const {sections, toggleSection} = useSectionStates();
    const [showDeletionModal, setShowDeletionModal] = useState(false);
    const [deletionStep, setDeletionStep] = useState(0);
    const {
        scrollY,
        fadeAnim,
        slideAnim,
        headerOpacity,
        headerScale
    } = useAnimations();

    const {match, isLoading: loadMatch, isError: errorMatch} = useMatchDetails(safeMatchId);
    const {pendingRequests, acceptedRequests, rejectedRequests, isLoading: loadReq} = useHostJoinRequests(safeMatchId);
    const {acceptRequest, rejectRequest, isPending} = useMatchJoinRequestActions(safeMatchId);
    const mutating = isPending.accept || isPending.reject;

    const headerStyle = {paddingTop: insets.top > 0 ? insets.top : Platform.OS === 'android' ? 32 : 10};

    const handleScroll = Animated.event(
        [{nativeEvent: {contentOffset: {y: scrollY}}}],
        {useNativeDriver: false}
    );

    const shareMatch = useCallback(async () => {
        if (!match) return;
        try {
            const universalLink = `https://qypym.fr/matches/${match.id}`;
            const shareMessage = t('shareMessage', {
                title: match.title,
                date: formatDate(match.startDate),
                time: formatTime(match.startDate),
                address: match.location?.address || ''
            });

            if (Platform.OS === 'android') {
                await Share.share({
                    message: `${shareMessage}\n\n${universalLink}`,
                }, {
                    dialogTitle: t('shareMatch')
                });
            } else {
                await Share.share({
                    message: shareMessage,
                    url: universalLink
                }, {
                    dialogTitle: t('shareMatch')
                });
            }
        } catch (err) {
            console.error(t('shareError'), err);
            Alert.alert(t('error'), t('shareError'));
        }
    }, [match, formatDate, formatTime]);

    const cancelMatch = useCallback(() => {
        Alert.alert(
            t('cancelMatchTitle'),
            t('cancelMatchMessage'),
            [
                {text: t('no'), style: 'cancel'},
                {
                    text: t('yes'),
                    style: 'destructive',
                    onPress: async () => {
                        setShowDeletionModal(true);
                        setDeletionStep(0);

                        setTimeout(() => {
                            setDeletionStep(1);
                            setTimeout(async () => {
                                try {
                                    await matchesApi.deleteMatch(safeMatchId);
                                    setDeletionStep(2);
                                } catch (error) {
                                    console.error('Error deleting match:', error);
                                    Alert.alert(
                                        t('error'),
                                        t('deleteMatchError') || 'An error occurred while deleting the match'
                                    );
                                    setShowDeletionModal(false);
                                }
                            }, 1500);
                        }, 1500);
                    }
                },
            ]
        );
    }, [safeMatchId]);

    const handleDeletionComplete = useCallback(() => {
        setShowDeletionModal(false);
        router.back();
    }, [router]);

    const onAccept = useCallback(
        async (req: { id: string; userId: string }) => {
            acceptRequest(req.id, {
                onSuccess: async () => {
                    await queryClient.invalidateQueries({queryKey: ['match-join-requests', safeMatchId]});
                    Alert.alert(t('success'), t('requestAccepted'));
                    try {
                        const chatRoom = await chatService.getMatchChatRoom(safeMatchId);
                        if (chatRoom) {
                            await chatService.addParticipantToChatRoom(chatRoom.id, req.userId);
                            console.log(t('participant_added'), chatRoom.id);
                        } else if (match) {
                            const newChatId = await chatService.createMatchChatRoom(
                                safeMatchId,
                                [match.creatorId, req.userId],
                                match.title,
                                t('football'),
                                new Date(match.startDate)
                            );
                            console.log(t('new_chat_created'), newChatId);
                        }
                    } catch (error) {
                        console.error(t('error_updating_chat'), error);
                    }
                },
                onError: () => {
                    Alert.alert(t('error'), t('acceptRequestError'));
                },
            });
        },
        [acceptRequest, queryClient, safeMatchId, match]
    );

    const onReject = useCallback(
        (reqId: string) => {
            rejectRequest(reqId, {
                onSuccess: () => {
                    queryClient.invalidateQueries({queryKey: ['match-join-requests', safeMatchId]});
                    Alert.alert(t('success'), t('requestRejected'));
                },
                onError: () => {
                    Alert.alert(t('error'), t('rejectRequestError'));
                },
            });
        },
        [rejectRequest, queryClient, safeMatchId]
    );

    const onOpenProfile = useCallback(
        (userId: string) => {
            router.push({pathname: '/(modals)/profile/[userId]', params: {userId}});
        },
        [router]
    );

    if (loadMatch || loadReq) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.primary.accent}/>
                <Text style={styles.loadingText}>{t('loadingMatchDetails')}</Text>
            </View>
        );
    }

    if (errorMatch || !match) {
        return (
            <View style={styles.centered}>
                <MaterialCommunityIcons name="alert-circle-outline" size={60} color={THEME_COLORS.error}/>
                <Text style={styles.errorTitle}>{t('errorOccurred')}</Text>
                <Text style={styles.errorText}>{t('loadErrorMatch')}</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.errorButton}>
                    <Text style={styles.errorButtonText}>{t('back')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isMatchActive = match.status !== 'FINISHED' && match.status !== 'CANCELLED';

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View
                style={[
                    styles.header,
                    headerStyle,
                    {
                        opacity: headerOpacity,
                        transform: [{scale: headerScale}]
                    }
                ]}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons name="chevron-left" size={26} color={THEME_COLORS.textPrimary}/>
                </TouchableOpacity>
                <View style={styles.titleWrapper}>
                    <Text style={styles.titleText} numberOfLines={1}>
                        {match.title}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={shareMatch}
                    style={styles.actionButton}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons name="share-variant" size={22} color={THEME_COLORS.textPrimary}/>
                </TouchableOpacity>
            </Animated.View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
            >
                <Animated.View style={{
                    opacity: fadeAnim,
                    transform: [{translateY: slideAnim}]
                }}>
                    <View style={styles.heroSection}>
                        <View style={styles.badgeContainer}>
                            <LinearGradient
                                colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                                style={styles.hostBadge}
                            >
                                <MaterialCommunityIcons name="shield-crown" size={16} color="#000"/>
                                <Text style={styles.hostBadgeText}>{t('hostBadge')}</Text>
                            </LinearGradient>
                        </View>
                        <Text style={styles.mainTitle}>{match.title}</Text>
                    </View>

                    <View style={styles.statusContainer}>
                        <LinearGradient
                            colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                            style={styles.statusGradient}
                        >
                            <View style={styles.statusLeft}>
                                <MaterialCommunityIcons name="calendar-clock" size={20} color="#000"/>
                                <View style={{marginLeft: 8}}>
                                    <Text style={styles.dateText}>{formatDate(match.startDate)}</Text>
                                    <Text style={styles.timeText}>
                                        {formatTime(match.startDate)} • {match.duration} <Text>min</Text>
                                    </Text>
                                </View>
                            </View>
                            <StatusBadge status={match.status}/>
                        </LinearGradient>
                    </View>

                    <View style={styles.sectionContainer}>
                        <SectionHeader
                            icon="account-group"
                            title={t('teams')}
                            expanded={sections.teams}
                            onToggle={() => toggleSection('teams')}
                        />

                        {sections.teams && (
                            match.teams && match.teams.length > 0 ? (
                                <TeamsList
                                    teams={match.teams}
                                    joinRequest={null}
                                    isCreator={true}
                                    userId={match.creatorId}
                                    router={router}
                                    t={t}
                                />
                            ) : (
                                <EmptySection message={t('noTeams')}/>
                            )
                        )}
                    </View>

                    {isMatchActive && (
                        <View style={styles.sectionContainer}>
                            <SectionHeader
                                icon="account-clock"
                                title={t('pendingRequests')}
                                expanded={sections.pendingRequests}
                                count={pendingRequests.length}
                                onToggle={() => toggleSection('pendingRequests')}
                            />

                            {sections.pendingRequests && (
                                pendingRequests.length > 0 ? (
                                    <View style={styles.requestsContainer}>
                                        {pendingRequests.map((req) => (
                                            <View key={req.id} style={styles.requestCard}>
                                                <LinearGradient
                                                    colors={['rgba(26,26,26,0.95)', 'rgba(17,17,17,0.85)']}
                                                    style={styles.requestGradient}
                                                >
                                                    <RequestItem
                                                        acceptRequest={() => onAccept({id: req.id, userId: req.userId})}
                                                        request={req}
                                                        gameId={safeMatchId}
                                                        isLoading={mutating}
                                                        ownerID={match.creatorId}
                                                        rejectRequest={() => onReject(req.id)}
                                                        viewProfile={() => onOpenProfile(req.userId)}
                                                    />
                                                </LinearGradient>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <EmptySection message={t('noPendingRequests')}/>
                                )
                            )}
                        </View>
                    )}

                    {isMatchActive && (
                        <View style={styles.sectionContainer}>
                            <SectionHeader
                                icon="account-check"
                                title={t('acceptedPlayers')}
                                expanded={sections.acceptedPlayers}
                                count={acceptedRequests.length}
                                onToggle={() => toggleSection('acceptedPlayers')}
                            />

                            {sections.acceptedPlayers && (
                                acceptedRequests.length > 0 ? (
                                    <View style={styles.playersContainer}>
                                        <LinearGradient
                                            colors={['rgba(26,26,26,0.95)', 'rgba(17,17,17,0.85)']}
                                            style={styles.playersGradient}
                                        >
                                            {match.players
                                                .filter(player => player.playerId !== match.creatorId)
                                                .map((player) => (
                                                    <PlayerItem
                                                        key={player.playerId}
                                                        player={player}
                                                        onPress={() => onOpenProfile(player.playerId)}
                                                    />
                                                ))}
                                        </LinearGradient>
                                    </View>
                                ) : (
                                    <EmptySection message={t('noAcceptedPlayers')}/>
                                )
                            )}
                        </View>
                    )}

                    {isMatchActive && (
                        <View style={styles.sectionContainer}>
                            <SectionHeader
                                icon="account-cancel"
                                title={t('rejectedRequests')}
                                expanded={sections.rejectedRequests}
                                count={rejectedRequests.length}
                                onToggle={() => toggleSection('rejectedRequests')}
                            />

                            {sections.rejectedRequests && (
                                rejectedRequests.length > 0 ? (
                                    <View style={styles.rejectedContainer}>
                                        <LinearGradient
                                            colors={['rgba(26,26,26,0.95)', 'rgba(17,17,17,0.85)']}
                                            style={styles.rejectedGradient}
                                        >
                                            {rejectedRequests.map((req) => (
                                                <RejectedRequestItem key={req.id} request={req}/>
                                            ))}
                                        </LinearGradient>
                                    </View>
                                ) : (
                                    <EmptySection message={t('noRejectedRequests')}/>
                                )
                            )}
                        </View>
                    )}

                    <View style={styles.sectionContainer}>
                        <SectionHeader
                            icon="qrcode"
                            title={t('verificationCode')}
                            expanded={sections.verificationCode}
                            onToggle={() => toggleSection('verificationCode')}
                        />

                        {sections.verificationCode && (
                            <VerificationCodeSection
                                match={match}
                                formatTime={formatTime}
                                shareMatch={shareMatch}
                            />
                        )}
                    </View>

                    {isMatchActive && pendingRequests.length + rejectedRequests.length === 0 && (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons
                                name="account-group-outline"
                                size={60}
                                color={THEME_COLORS.textPlaceholder}
                            />
                            <Text style={styles.emptyStateTitle}>{t('noRequests')}</Text>
                            <Text style={styles.emptyStateText}>{t('shareForRequests')}</Text>
                            <TouchableOpacity
                                onPress={shareMatch}
                                style={styles.shareButton}
                                activeOpacity={0.8}
                            >
                                <MaterialCommunityIcons name="share-variant" size={20} color="#000"/>
                                <Text style={styles.shareButtonText}>{t('shareMatch')}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={{height: 100}}/>
                </Animated.View>
            </ScrollView>

            {isMatchActive ? (
                <Animated.View style={[
                    styles.footer,
                    {
                        paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
                        opacity: fadeAnim,
                        transform: [{translateY: Animated.multiply(slideAnim, -1)}]
                    }
                ]}>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={cancelMatch}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="close-circle" size={20} color={THEME_COLORS.error}/>
                        <Text style={styles.cancelButtonText}>{t('cancelMatch')}</Text>
                    </TouchableOpacity>
                </Animated.View>
            ) : (
                <MatchFeedbackButton
                    matchId={match.id}
                    isFinished={match.status === 'FINISHED'}
                />
            )}

            <LoadingModal
                visible={showDeletionModal}
                step={deletionStep}
                onContinue={handleDeletionComplete}
                mode="delete"
            />
        </SafeAreaView>
    );
};

const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '80%',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.15)',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    content: {
        alignItems: 'center',
    },
    message: {
        color: THEME_COLORS.textPrimary,
        fontSize: 18,
        fontWeight: '600',
        marginTop: 20,
        marginBottom: 16,
        textAlign: 'center',
    },
    progressBarContainer: {
        width: '100%',
        height: 8,
        backgroundColor: 'rgba(30, 30, 30, 0.8)',
        borderRadius: 4,
        overflow: 'hidden',
        marginTop: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary.accent,
        borderRadius: 4,
    },
    continueButton: {
        backgroundColor: COLORS.primary.accent,
        borderRadius: 8,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        width: '100%',
    },
    continueButtonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: 'bold',
    }
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME_COLORS.background
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
    errorButton: {
        backgroundColor: THEME_COLORS.cardAccent,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12
    },
    errorButtonText: {
        color: THEME_COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '600'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(10, 10, 10, 0.98)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 184, 0, 0.1)',
        paddingHorizontal: 16,
        paddingBottom: 8,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(26,26,26,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    titleWrapper: {
        flex: 1,
        marginHorizontal: 12
    },
    titleText: {
        fontSize: 18,
        fontWeight: '700',
        color: THEME_COLORS.textPrimary
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(26,26,26,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    scrollView: {
        flex: 1
    },
    scrollContent: {
        paddingTop: Platform.OS === 'ios' ? 60 : 80
    },
    heroSection: {
        padding: 20
    },
    badgeContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16
    },
    hostBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6
    },
    hostBadgeText: {
        color: '#000',
        fontSize: 13,
        fontWeight: '600'
    },
    mainTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
        marginBottom: 16
    },
    statusContainer: {
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    statusGradient: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    statusLeft: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    dateText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600',
        textTransform: 'capitalize'
    },
    timeText: {
        color: '#000',
        fontSize: 14,
        marginTop: 2,
        opacity: 0.8
    },
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        overflow: 'hidden',
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    sectionContainer: {
        marginHorizontal: 20,
        marginBottom: 24
    },
    chevronContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(26,26,26,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginLeft: 10
    },
    collapsibleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    requestsContainer: {
        gap: 12
    },
    requestCard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    requestGradient: {
        borderRadius: 16
    },
    emptySection: {
        backgroundColor: 'rgba(26,26,26,0.9)',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    emptySectionText: {
        color: THEME_COLORS.textSecondary,
        fontSize: 14,
        fontStyle: 'italic',
    },
    playersContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    playersGradient: {
        padding: 12,
        borderRadius: 16
    },
    rejectedContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    rejectedGradient: {
        padding: 12,
        borderRadius: 16
    },
    verificationGradient: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    codeContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    codeLabel: {
        fontSize: 16,
        color: THEME_COLORS.textSecondary,
        marginBottom: 10,
    },
    codeDisplay: {
        backgroundColor: 'rgba(255, 184, 0, 0.15)',
        borderWidth: 1,
        borderColor: COLORS.primary.accent || '#FFB800',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 40,
        marginBottom: 14,
        marginTop: 6,
    },
    codeText: {
        fontSize: 36,
        fontWeight: 'bold',
        letterSpacing: 2,
        color: COLORS.primary.accent || '#FFB800',
    },
    codeDescription: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
        marginBottom: 20,
    },
    shareCodeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary.accent || '#FFB800',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
    },
    shareCodeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        marginLeft: 6,
    },
    codeUnavailable: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    codeUnavailableTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginTop: 10,
        marginBottom: 6,
    },
    codeUnavailableText: {
        fontSize: 14,
        textAlign: 'center',
        color: THEME_COLORS.textSecondary,
        maxWidth: '80%',
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
        marginTop: 20
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginTop: 12,
        marginBottom: 8
    },
    emptyStateText: {
        fontSize: 14,
        textAlign: 'center',
        color: THEME_COLORS.textSecondary,
        marginBottom: 20,
        maxWidth: '80%'
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary.accent || '#FFB800',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    shareButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginLeft: 8
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(10, 10, 10, 0.98)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 184, 0, 0.1)',
        paddingHorizontal: 20,
        paddingTop: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: -3},
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 10,
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(26,26,26,0.9)',
        borderWidth: 1,
        borderColor: THEME_COLORS.error,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 30,
        width: '100%',
    },
    cancelButtonText: {
        color: THEME_COLORS.error,
        fontWeight: '600',
        fontSize: 16,
        marginLeft: 8
    },
});

export default MatchDetailScreen;