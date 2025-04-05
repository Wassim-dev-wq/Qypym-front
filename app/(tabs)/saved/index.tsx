import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { matchesApi } from '@/src/core/api/matches/matches.api';
import { t } from 'src/constants/locales';
import { COLORS, THEME_COLORS } from '@/src/constants/Colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSavedMatches } from '@/src/core/api/matches/matchesHooks';
import SavedMatchCard from '@/app/(tabs)/explore/components/SavedMatchCard';
import { Match } from '@/src/types/match/match';

const SavedScreen = () => {
    const myRouter = useRouter();
    const screenEdges = useSafeAreaInsets();
    const { savedMatchIds, toggleSaveMatch, refetch: refreshSavedSet } = useSavedMatches();

    const scrollAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

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

    const headerHeight = scrollAnim.interpolate({
        inputRange: [0, 100],
        outputRange: [Platform.OS === 'ios' ? 130 : 110, Platform.OS === 'ios' ? 90 : 70],
        extrapolate: 'clamp'
    });

    const titleFontSize = scrollAnim.interpolate({
        inputRange: [0, 100],
        outputRange: [28, 20],
        extrapolate: 'clamp'
    });

    const subtitleOpacity = scrollAnim.interpolate({
        inputRange: [0, 60],
        outputRange: [1, 0],
        extrapolate: 'clamp'
    });

    const {
        data: myMatches = [],
        isLoading,
        isError,
        refetch,
        isRefetching
    } = useQuery({
        queryKey: ['saved-matches', Array.from(savedMatchIds)],
        queryFn: async () => {
            if (savedMatchIds.size === 0) return [];
            const results = await Promise.all(
                Array.from(savedMatchIds).map(id =>
                    matchesApi
                        .getMatchById(id)
                        .catch(err => {
                            console.error(`Error fetching match ${id}:`, err);
                            return null;
                        })
                )
            );
            return results.filter(x => x !== null);
        },
        enabled: true
    });

    const openMatch = useCallback(
        (id: string) => {
            myRouter.push({ pathname: '/(modals)/[matchId]', params: { matchId: id } });
        },
        [myRouter]
    );

    const doToggleSave = useCallback(
        async (matchId: string) => {
            try {
                await toggleSaveMatch(matchId);
            } catch (e) {
                console.error('Error toggling save status:', e);
                refetch();
            }
        },
        [toggleSaveMatch, refetch]
    );

    const renderMatchCard = useCallback(
        ({ item, index }: { item: Match; index: number }) => {

            const inputRange = [-1, 0, index * 160, (index + 1) * 160];
            const cardScale = scrollAnim.interpolate({
                inputRange,
                outputRange: [1, 1, 1, 0.97],
                extrapolate: 'clamp'
            });

            const cardOpacity = scrollAnim.interpolate({
                inputRange,
                outputRange: [1, 1, 1, 0.8],
                extrapolate: 'clamp'
            });

            return (
                <Animated.View
                    style={{
                        transform: [{ scale: cardScale }],
                        opacity: cardOpacity,
                        marginBottom: 16
                    }}
                >
                    <SavedMatchCard
                        match={item}
                        toggleSave={() => doToggleSave(item.id)}
                        openMatch={() => openMatch(item.id)}
                    />
                </Animated.View>
            );
        },
        [openMatch, doToggleSave, scrollAnim]
    );

    const handleRefresh = useCallback(async () => {
        try {
            await refreshSavedSet();
            await refetch();
        } catch (e) {
            console.error('Error refreshing saved matches:', e);
        }
    }, [refetch, refreshSavedSet]);

    const EmptyStateContent = useMemo(() => {
        if (isLoading) {
            return (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={COLORS.primary.accent} />
                    <Text style={styles.loadingText}>{t('loading')}</Text>
                </View>
            );
        }

        if (isError) {
            return (
                <Animated.View
                    style={[
                        styles.centerContent,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }]
                        }
                    ]}
                >
                    <View style={styles.errorIconContainer}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={60} color={THEME_COLORS.error} />
                    </View>
                    <Text style={styles.errorTitle}>{t('error_occurred')}</Text>
                    <Text style={styles.errorMessage}>{t('error_saved_matches')}</Text>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => refetch()}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.buttonGradient}
                        >
                            <Text style={styles.buttonText}>{t('try_again')}</Text>
                            <MaterialCommunityIcons name="refresh" size={18} color="#000" />
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            );
        }

        return (
            <Animated.View
                style={[
                    styles.centerContent,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }]
                    }
                ]}
            >
                <View style={styles.emptyIconContainer}>
                    <MaterialCommunityIcons name="bookmark-outline" size={60} color={COLORS.primary.accent} />
                </View>
                <Text style={styles.emptyTitle}>{t('no_saved_matches')}</Text>
                <Text style={styles.emptyDescription}>{t('discover_and_save_matches')}</Text>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => myRouter.push('/(tabs)/explore')}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.buttonGradient}
                    >
                        <Text style={styles.buttonText}>{t('explore_matches')}</Text>
                        <MaterialCommunityIcons name="arrow-right" size={18} color="#000" />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        );
    }, [isLoading, isError, refetch, myRouter, fadeAnim, scaleAnim]);

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollAnim } } }],
        { useNativeDriver: false }
    );

    const AnimatedHeader = () => (
        <Animated.View style={[styles.header, { height: headerHeight }]}>
            <LinearGradient
                colors={['rgba(10, 10, 10, 0.98)', 'rgba(10, 10, 10, 0.95)']}
                style={[styles.headerContent, { paddingTop: screenEdges.top }]}
            >
                <Animated.Text style={[styles.headerTitle, { fontSize: titleFontSize }]}>
                    {t('bookmarked')}
                </Animated.Text>
                <Animated.Text style={[styles.headerSubtitle, { opacity: subtitleOpacity }]}>
                    {myMatches.length} {myMatches.length === 1 ? t('match') : t('matches')}
                </Animated.Text>
            </LinearGradient>
        </Animated.View>
    );

    if (myMatches.length === 0) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
                <View style={[styles.staticHeader, { paddingTop: screenEdges.top }]}>
                    <LinearGradient
                        colors={['rgba(10, 10, 10, 0.98)', 'rgba(10, 10, 10, 0.95)']}
                        style={styles.staticHeaderContent}
                    >
                        <Text style={styles.staticHeaderTitle}>{t('bookmarked')}</Text>
                    </LinearGradient>
                </View>
                {EmptyStateContent}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <AnimatedHeader />
            <Animated.FlatList
                data={myMatches}
                renderItem={renderMatchCard}
                keyExtractor={item => item.id}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingTop: Platform.OS === 'ios' ? 140 : 120 }
                ]}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching}
                        onRefresh={handleRefresh}
                        colors={[COLORS.primary.accent]}
                        tintColor={COLORS.primary.accent}
                        progressViewOffset={Platform.OS === 'ios' ? 140 : 120}
                    />
                }
            />
        </View>
    );
};

export default SavedScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME_COLORS.background
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: 'transparent',
    },
    headerContent: {
        flex: 1,
        paddingHorizontal: 20,
        justifyContent: 'flex-end',
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 184, 0, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 10,
    },
    headerTitle: {
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary
    },
    headerSubtitle: {
        fontSize: 16,
        color: THEME_COLORS.textSecondary,
        marginTop: 4
    },
    staticHeader: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 184, 0, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 10
    },
    staticHeaderContent: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    staticHeaderTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 32
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32
    },
    loadingText: {
        marginTop: 16,
        color: THEME_COLORS.textPrimary,
        fontSize: 16
    },
    errorIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)'
    },
    errorTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: THEME_COLORS.textPrimary,
        marginTop: 16,
        marginBottom: 8
    },
    errorMessage: {
        fontSize: 16,
        color: THEME_COLORS.textSecondary,
        marginBottom: 24,
        textAlign: 'center'
    },
    emptyIconContainer: {
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
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: THEME_COLORS.textPrimary,
        marginBottom: 8,
        textAlign: 'center'
    },
    emptyDescription: {
        fontSize: 16,
        color: THEME_COLORS.textSecondary,
        marginBottom: 32,
        textAlign: 'center',
        lineHeight: 22
    },
    actionButton: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8
    },
    buttonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600'
    }
});