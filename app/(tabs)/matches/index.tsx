import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native'
import {useAuth} from '@/src/core/api/auth/useAuth'
import {COLORS, THEME_COLORS} from '@/src/constants/Colors'
import {useQuery, useQueryClient} from '@tanstack/react-query'
import {matchService} from '@/src/core/api/matches/matchesService'
import {MaterialCommunityIcons} from '@expo/vector-icons'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {LinearGradient} from 'expo-linear-gradient'
import MatchCard from '@/app/(tabs)/explore/components/MatchCard'
import {useUserJoinRequests} from "@/src/core/api/matches/matchesHooks"
import {t} from "src/constants/locales"
import {router} from 'expo-router'
import RequestItem from "@/app/(tabs)/matches/components/RequestItem";
import {Match} from '@/src/types/match/match'
import {userApi} from "@/src/core/hooks/useUserFetch";

type NavType = {
    navigate: (screen: string, params?: any) => void
}

type TabName = 'upcoming' | 'myMatches' | 'requests'
type ReqStatus = 'pending' | 'accepted' | 'declined' | 'left' | null

interface JoinReq {
    id: string
    matchId: string
    status: string
    createdAt: string
}

interface ExtendedMatch extends Match {
    joinedCount: number
    requestStatus?: ReqStatus
    joinDate?: string
}

export default function MatchesScreen() {
    const {user} = useAuth()
    const insets = useSafeAreaInsets()
    const queryClient = useQueryClient()

    const [activeTab, setActiveTab] = useState<TabName>('upcoming')
    const [pulling, setPulling] = useState(false)
    const scrollValue = useRef(new Animated.Value(0)).current
    const fadeValue = useRef(new Animated.Value(0)).current
    const scaleValue = useRef(new Animated.Value(0.95)).current
    const {width: screenWidth} = Dimensions.get('window')

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeValue, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true
            }),
            Animated.spring(scaleValue, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true
            })
        ]).start()
    }, [])

    const topShift = scrollValue.interpolate({
        inputRange: [0, 200],
        outputRange: [0, -60],
        extrapolate: 'clamp'
    })

    const topOpacity = scrollValue.interpolate({
        inputRange: [0, 100, 200],
        outputRange: [1, 0.95, 0.9],
        extrapolate: 'clamp'
    })

    const topScale = scrollValue.interpolate({
        inputRange: [-100, 0],
        outputRange: [1.05, 1],
        extrapolate: 'clamp'
    })

    const {
        data: allMatches,
        isLoading: matchesLoad,
        error: matchesError,
        refetch: getMatches
    } = useQuery({
        queryKey: ['matches'],
        queryFn: async () => {
            const mockLoc = {
                coords: {
                    latitude: 0,
                    longitude: 0,
                    altitude: null,
                    accuracy: null,
                    altitudeAccuracy: null,
                    heading: null,
                    speed: null
                },
                timestamp: Date.now()
            }
            try {
                const result = await matchService.fetchByLocation(mockLoc, {}, 0)
                return result.data?.content || []
            } catch {
                return []
            }
        },
        staleTime: 60000
    })

    const {
        data: joinReqs,
        isLoading: reqLoad,
        refetch: getReqs
    } = useQuery<JoinReq[]>({
        queryKey: ['joinRequests'],
        queryFn: async () => {
            try {
                return []
            } catch {
                return []
            }
        },
        enabled: !!user,
        staleTime: 60000
    })

    const {
        data: joinRequests = [],
        isLoading: joinRequestsLoading,
        refetch: refetchJoinRequests
    } = useUserJoinRequests(user?.id || '', {
        enabled: activeTab === 'requests' && !!user?.id
    })

    const {
        data: currentUser,
        isLoading: userLoad,
        refetch: getMe
    } = useQuery({
        queryKey: ['currentUser'],
        queryFn: async () => {
            try {
                return await userApi.getCurrentUser()
            } catch {
                return null
            }
        },
        enabled: !!user,
        staleTime: 60000
    })

    useEffect(() => {
        if (activeTab === 'requests' && user?.id) {
            refetchJoinRequests();
        } else if (activeTab !== 'requests') {
            getMatches();
            getReqs();
            getMe();
        }
    }, [activeTab, user?.id]);

    const mainLoading = matchesLoad || reqLoad || userLoad || (activeTab === 'requests' && joinRequestsLoading)

    const extendedMatches = useMemo<ExtendedMatch[]>(() => {
        if (!allMatches) return []
        return allMatches.map(m => {
            let theStatus: ReqStatus = null
            let dateJoined: string | undefined
            if (Array.isArray(joinReqs)) {
                const foundReq = joinReqs.find(r => r.matchId === m.id)
                if (foundReq) {
                    theStatus = foundReq.status.toLowerCase() as ReqStatus
                    dateJoined = foundReq.createdAt
                }
            }
            return {
                ...m,
                requestStatus: theStatus,
                joinDate: dateJoined,
                joinedCount: m.joinedCount || 0
            }
        })
    }, [allMatches, joinReqs])

    const shownMatches = useMemo(() => {
        if (!extendedMatches || extendedMatches.length === 0) return []
        const now = new Date()
        switch (activeTab) {
            case 'upcoming':
                return extendedMatches
                    .filter(item => item.requestStatus === 'accepted' && new Date(item.startDate) > now)
                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            case 'myMatches':
                return extendedMatches.filter(item => item.owner)
            default:
                return extendedMatches
        }
    }, [extendedMatches, activeTab])

    const requestMatchDetails = useMemo(() => {
        if (!allMatches || !joinRequests) return {}
        const detailsMap = {}
        joinRequests.forEach(request => {
            const matchDetails = allMatches.find(match => match.id === request.matchId)
            if (matchDetails) {
                detailsMap[request.matchId] = matchDetails
            }
        })

        return detailsMap
    }, [allMatches, joinRequests])

    const doRefresh = async () => {
        setPulling(true)
        try {
            if (activeTab === 'requests' && user?.id) {
                await refetchJoinRequests()
                await getMatches()
            } else {
                await Promise.all([getMatches(), getReqs(), getMe()])
            }
        } finally {
            setPulling(false)
        }
    }

    const goDetails = useCallback(
        async (matchId: string) => {
            try {
                await queryClient.prefetchQuery({
                    queryKey: ['match', matchId],
                    queryFn: () => matchService.getMatchById(matchId)
                });
                router.push({
                    pathname: "/(modals)/[matchId]/manage",
                    params: {matchId}
                });
            } catch (e) {
                Alert.alert(t('error'), t('matchDetailsError'));
            }
        },
        [queryClient]
    )

    const goMatchRequestDetails = useCallback(
        async (matchId: string) => {
            try {
                await queryClient.prefetchQuery({
                    queryKey: ['match', matchId],
                    queryFn: () => matchService.getMatchById(matchId)
                });
                router.push({
                    pathname: "/(modals)/[matchId]",
                    params: {matchId}
                });
            } catch (e) {
                Alert.alert(t('error'), t('matchDetailsError'));
            }
        },
        [queryClient]
    )

    const getStatusStyle = (status: ReqStatus) => {
        switch (status) {
            case 'accepted':
                return styles.tagAccepted;
            case 'pending':
                return styles.tagPending;
            case 'left':
                return styles.tagLeft;
            case 'declined':
                return styles.tagDeclined;
            default:
                return {};
        }
    }

    const getStatusIcon = (status: ReqStatus) => {
        switch (status) {
            case 'accepted':
                return 'check-circle';
            case 'pending':
                return 'clock-outline';
            case 'left':
                return 'exit-to-app';
            case 'declined':
                return 'close-circle';
            default:
                return 'help-circle';
        }
    }

    const getStatusText = (status: ReqStatus) => {
        switch (status) {
            case 'accepted':
                return 'Confirmé';
            case 'pending':
                return 'En attente';
            case 'left':
                return 'Parti';
            case 'declined':
                return 'Refusé';
            default:
                return '';
        }
    }

    const getMatchItem = useCallback(
        ({item, index}: { item: ExtendedMatch; index: number }) => {
            const scaleRow = scrollValue.interpolate({
                inputRange: [-100, 0, 100 * (index + 1), 100 * (index + 2)],
                outputRange: [1, 1, 1, 0.95],
                extrapolate: 'clamp'
            })

            const fadeRow = scrollValue.interpolate({
                inputRange: [100 * (index - 1), 100 * index, 100 * (index + 3)],
                outputRange: [0.7, 1, 0.7],
                extrapolate: 'clamp'
            })

            return (
                <Animated.View
                    style={{
                        transform: [{scale: scaleRow}],
                        opacity: fadeRow,
                        marginBottom: 16
                    }}
                >
                    <MatchCard match={item} onPress={() => goDetails(item.id)}/>
                    {item.requestStatus && (
                        <View
                            style={[
                                styles.statusTag,
                                getStatusStyle(item.requestStatus)
                            ]}
                        >
                            <MaterialCommunityIcons
                                name={getStatusIcon(item.requestStatus)}
                                size={14}
                                color="#FFF"
                            />
                            <Text style={styles.statusTagText}>
                                {getStatusText(item.requestStatus)}
                            </Text>
                        </View>
                    )}
                </Animated.View>
            )
        },
        [scrollValue, goDetails]
    )

    const renderRequestItem = useCallback(({item, index}) => {
        return (
            <RequestItem
                request={item}
                onPress={goMatchRequestDetails}
                matchDetails={requestMatchDetails[item.matchId]}
            />
        );
    }, [goMatchRequestDetails, requestMatchDetails]);

    const getEmptyView = useCallback(() => {
        if (mainLoading) {
            return (
                <View style={styles.emptyWrap}>
                    <ActivityIndicator size="large" color={COLORS.primary.accent}/>
                    <Text style={styles.waitText}>
                        {activeTab === 'requests' ? 'Chargement des demandes...' : 'Chargement des matches...'}
                    </Text>
                </View>
            )
        }
        let headText = ''
        let bodyText = ''
        let icon: keyof typeof MaterialCommunityIcons.glyphMap = 'calendar-blank'
        if (activeTab === 'upcoming') {
            headText = "Aucun match à venir"
            bodyText = "Vous n'avez pas encore de match confirmé à venir."
            icon = 'calendar-blank'
        } else if (activeTab === 'myMatches') {
            headText = "Vous n'avez pas créé de match"
            bodyText = "Créez votre premier match en appuyant sur le bouton '+'."
            icon = 'plus-circle-outline'
        } else if (activeTab === 'requests') {
            headText = 'Aucune demande de match'
            bodyText = "Vous n'avez pas encore fait de demande pour rejoindre un match."
            icon = 'bell-outline'
        }
        return (
            <Animated.View
                style={[
                    styles.emptyWrap,
                    {
                        opacity: fadeValue,
                        transform: [{scale: scaleValue}]
                    }
                ]}
            >
                <View style={styles.emptyIconBox}>
                    <MaterialCommunityIcons name={icon} size={60} color={COLORS.primary.accent}/>
                </View>
                <Text style={styles.emptyMainText}>{headText}</Text>
                <Text style={styles.emptySubText}>{bodyText}</Text>
            </Animated.View>
        )
    }, [mainLoading, activeTab, fadeValue, scaleValue])

    const getErrorView = useCallback(() => {
        return (
            <Animated.View
                style={[
                    styles.failWrap,
                    {
                        opacity: fadeValue,
                        transform: [{scale: scaleValue}]
                    }
                ]}
            >
                <MaterialCommunityIcons name="alert-circle-outline" size={60} color={THEME_COLORS.error}/>
                <Text style={styles.failTitle}>Oups !</Text>
                <Text style={styles.failText}>Une erreur s'est produite lors du chargement des matches.</Text>
                <TouchableOpacity style={styles.reloadBtn} onPress={doRefresh} activeOpacity={0.8}>
                    <LinearGradient
                        colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                        style={styles.reloadOverlay}
                    >
                        <Text style={styles.reloadText}>Réessayer</Text>
                        <MaterialCommunityIcons name="refresh" size={16} color="#000"/>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        )
    }, [doRefresh, fadeValue, scaleValue])

    const onScroll = Animated.event([{nativeEvent: {contentOffset: {y: scrollValue}}}], {
        useNativeDriver: true
    })

    if (matchesError && activeTab !== 'requests') {
        return getErrorView()
    }

    const renderContent = () => {
        if (activeTab === 'requests') {
            return (
                <Animated.FlatList
                    data={joinRequests}
                    keyExtractor={item => item.id}
                    renderItem={renderRequestItem}
                    contentContainerStyle={[
                        styles.listBox,
                        joinRequests.length === 0 && styles.listEmpty,
                        {paddingTop: 120 + insets.top}
                    ]}
                    showsVerticalScrollIndicator={false}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    ListEmptyComponent={getEmptyView}
                    refreshControl={
                        <RefreshControl
                            refreshing={pulling}
                            onRefresh={doRefresh}
                            colors={[COLORS.primary.accent]}
                            tintColor={COLORS.primary.accent}
                            progressViewOffset={120 + insets.top}
                        />
                    }
                    style={{opacity: fadeValue}}
                />
            );
        } else {
            return (
                <Animated.FlatList
                    data={shownMatches}
                    keyExtractor={item => item.id}
                    renderItem={getMatchItem}
                    contentContainerStyle={[
                        styles.listBox,
                        shownMatches.length === 0 && styles.listEmpty,
                        {paddingTop: 120 + insets.top}
                    ]}
                    showsVerticalScrollIndicator={false}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    ListEmptyComponent={getEmptyView}
                    refreshControl={
                        <RefreshControl
                            refreshing={pulling}
                            onRefresh={doRefresh}
                            colors={[COLORS.primary.accent]}
                            tintColor={COLORS.primary.accent}
                            progressViewOffset={120 + insets.top}
                        />
                    }
                    style={{opacity: fadeValue}}
                />
            );
        }
    };

    return (
        <SafeAreaView style={styles.screenBox} edges={['left', 'right']}>
            <Animated.View
                style={[
                    styles.topBar,
                    {
                        paddingTop: insets.top,
                        opacity: topOpacity,
                        transform: [{scale: topScale}]
                    }
                ]}
            >
                <LinearGradient
                    colors={['rgba(10, 10, 10, 0.98)', 'rgba(10, 10, 10, 0.95)']}
                    style={styles.topOverlay}
                >
                    <Text style={styles.brandText}>Matches</Text>
                    <View style={styles.tabRow}>
                        <TabButton
                            label="À venir"
                            active={activeTab === 'upcoming'}
                            onPress={() => setActiveTab('upcoming')}
                        />
                        <TabButton
                            label="Mes Matches"
                            active={activeTab === 'myMatches'}
                            onPress={() => setActiveTab('myMatches')}
                        />
                        <TabButton
                            label="Demandes"
                            active={activeTab === 'requests'}
                            onPress={() => setActiveTab('requests')}
                            notice={joinReqs && joinReqs.some(r => r.status === 'PENDING')}
                        />
                    </View>
                </LinearGradient>
            </Animated.View>

            {renderContent()}

            <TouchableOpacity
                style={styles.newMatchBtn}
                onPress={() => router.push("/(modals)/matches/createMatch")}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.newMatchOverlay}
                >
                    <MaterialCommunityIcons name="plus" size={28} color="#000"/>
                </LinearGradient>
            </TouchableOpacity>
        </SafeAreaView>
    )
}

function TabButton({
                       label,
                       active,
                       onPress,
                       notice = false
                   }: {
    label: string
    active: boolean
    onPress: () => void
    notice?: boolean
}) {
    const pulse = useRef(new Animated.Value(1)).current

    const doPress = () => {
        Animated.sequence([
            Animated.timing(pulse, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true
            }),
            Animated.spring(pulse, {
                toValue: 1,
                friction: 4,
                tension: 40,
                useNativeDriver: true
            })
        ]).start()
        onPress()
    }

    return (
        <Animated.View style={{transform: [{scale: pulse}]}}>
            <TouchableOpacity
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={doPress}
                activeOpacity={0.7}
            >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
                {active && (
                    <LinearGradient
                        colors={[COLORS.primary.accent, 'rgba(255, 184, 0, 0.5)']}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 0}}
                        style={styles.tabIndicator}
                    />
                )}
                {notice && <View style={styles.noticeDot}/>}
            </TouchableOpacity>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    screenBox: {
        flex: 1,
        backgroundColor: THEME_COLORS.background
    },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
        zIndex: 1000
    },
    topOverlay: {
        paddingHorizontal: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 184, 0, 0.1)',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 10
    },
    brandText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
        marginVertical: 12
    },
    tabRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8
    },
    tabBtn: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        position: 'relative',
        alignItems: 'center'
    },
    tabBtnActive: {
        backgroundColor: 'rgba(255, 184, 0, 0.08)',
        borderRadius: 12
    },
    tabText: {
        color: THEME_COLORS.textSecondary,
        fontSize: 14,
        fontWeight: '500'
    },
    tabTextActive: {
        color: COLORS.primary.accent,
        fontWeight: 'bold'
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        width: '80%',
        height: 3,
        borderRadius: 1.5
    },
    noticeDot: {
        position: 'absolute',
        top: 6,
        right: 4,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: THEME_COLORS.error
    },
    listBox: {
        paddingHorizontal: 16,
        paddingBottom: 100
    },
    listEmpty: {
        flexGrow: 1
    },

    statusTag: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 10
    },
    tagAccepted: {
        backgroundColor: 'rgba(34, 197, 94, 0.9)'
    },
    tagPending: {
        backgroundColor: 'rgba(255, 184, 0, 0.9)'
    },
    tagDeclined: {
        backgroundColor: 'rgba(239, 68, 68, 0.9)'
    },
    tagLeft: {
        backgroundColor: 'rgba(59, 130, 246, 0.9)'
    },
    statusTagText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 4
    },

    emptyWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingTop: 60
    },
    waitText: {
        marginTop: 16,
        color: THEME_COLORS.textSecondary,
        fontSize: 16
    },
    emptyIconBox: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 184, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)'
    },
    emptyMainText: {
        color: THEME_COLORS.textPrimary,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center'
    },
    emptySubText: {
        color: THEME_COLORS.textSecondary,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 25
    },
    failWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
        backgroundColor: THEME_COLORS.background
    },
    failTitle: {
        color: THEME_COLORS.textPrimary,
        fontSize: 24,
        fontWeight: 'bold',
        marginVertical: 12
    },
    failText: {
        color: THEME_COLORS.textSecondary,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 25
    },
    reloadBtn: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    reloadOverlay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8
    },
    reloadText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600'
    },
    newMatchBtn: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        shadowColor: 'rgba(0, 0, 0, 0.5)',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 100,
        overflow: 'hidden'
    },
    newMatchOverlay: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center'
    }
})