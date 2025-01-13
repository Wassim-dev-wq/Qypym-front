import React, {useCallback, useEffect, useMemo, useRef, useState,} from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, {Marker, PROVIDER_DEFAULT, Region} from 'react-native-maps';
import MapViewClustering from 'react-native-map-clustering';
import * as Location from 'expo-location';
import {StatusBar} from 'expo-status-bar';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {debounce} from 'lodash';
import {useRouter} from 'expo-router';

import EventFilterModal from './components/EventFilterModal';
import FocusedMatchCallout from './components/FocusedMatchCallout';
import FocusedMatchMarker from './components/FocusedMatchMarker';
import {COLORS} from '@/constants/Colors';
import {useFetchMatches} from './hooks/useFetchMatches';
import {fetchMatchesFromAPI} from './services/matchService';

import {useQueryClient} from "@tanstack/react-query";
import {matchesApi} from "@/app/create-match/services/api/matches.api";
import {Match} from "@/app/utils/types/match/match";
import {Filters} from "@/app/utils/types/match/filters";
import {storage} from "@/app/utils/storage";
import MatchCard from "@/app/home/components/MatchCard";

const {width, height} = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const CONTENT_HEIGHT = height - (Platform.OS === 'ios' ? 118 : 100);
const BOTTOM_NAV_HEIGHT = 80;
const MINIMIZED_LIST_HEIGHT = 80;

const OFFSCREEN_POSITION = height;
const darkMapStyle: any[] = [];

// Zoom thresholds
const ZOOM_LEVEL_THRESHOLDS = {
    SHOW_ALL: 12,
    CLUSTER_ONLY: 10,
    HIDE_ALL: 8,
};

const MainHomeScreen: React.FC = () => {
    const router = useRouter();

    const [isMapMode, setIsMapMode] = useState<boolean>(false);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [isFilterModalVisible, setFilterModalVisible] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [currentZoom, setCurrentZoom] = useState<number>(10);
    const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
    const [showCallout, setShowCallout] = useState<boolean>(false);
    const [isMapReady, setIsMapReady] = useState<boolean>(false);
    const [visibleMatches, setVisibleMatches] = useState<Match[]>([]);
    const queryClient = useQueryClient();
    const [selectedTab, setSelectedTab] = useState<
        'Explore' | 'Saved' | 'Matches' | 'Messages' | 'Profile'
    >('Explore');

    // Map region
    const [mapRegion, setMapRegion] = useState<Region>({
        latitude: 48.7878,
        longitude: 2.3642,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
    });
    const mapRef = useRef<MapView>(null);

    const navigateToMatchDetails = (match: Match) => {
        queryClient.prefetchQuery({
            queryKey: ['match', match.id],
            queryFn: () => matchesApi.getById(match.id),
            staleTime: 5 * 60 * 1000,
        });
        router.push(`/home/MatchDetailsScreen?matchId=${match.id}`);
    };

    const [filters, setFilters] = useState<Filters>({
        priceRange: [0, 100],
        skillLevel: '',
        timeOfDay: [],
        matchType: '',
        distance: 10,
        facilities: [],
        availability: [],
        ageRange: [18, 60],
        location: '',
    });

    const {matches, isLoading} = useFetchMatches({location, filters});

    useEffect(() => {
        if (matches) {
            setVisibleMatches(matches);
        }
    }, [matches]);

    useEffect(() => {
        (async () => {
            const {status} = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                setLocation(loc);
                setMapRegion({
                    ...mapRegion,
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                });
            } else {
                Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
            }
        })();
    }, []);

    const updateVisibleMatches = useCallback(
        debounce(async (region: Region, zoom: number) => {
            if (zoom <= ZOOM_LEVEL_THRESHOLDS.HIDE_ALL) {
                setVisibleMatches([]);
                return;
            }

            try {
                const nearbyMatches = await fetchMatchesFromAPI(
                    {
                        coords: {
                            latitude: region.latitude,
                            longitude: region.longitude,
                            accuracy: 1,
                            altitude: null,
                            altitudeAccuracy: null,
                            heading: null,
                            speed: null,
                        },
                        timestamp: Date.now(),
                    },
                    {
                        skillLevel: filters.skillLevel,
                        distance: filters.distance,
                    },
                    0
                );

                if (nearbyMatches.data.content.length > 0) {
                    const filtered =
                        zoom >= ZOOM_LEVEL_THRESHOLDS.SHOW_ALL
                            ? nearbyMatches.data.content
                            : nearbyMatches.data.content.filter((_, idx) => idx % 3 === 0);
                    setVisibleMatches(filtered);
                } else {
                    setVisibleMatches([]);
                }
            } catch (error) {
                console.error('Error fetching matches:', error);
                Alert.alert('Error', 'Failed to fetch matches. Please try again later.');
            }
        }, 200),
        [filters]
    );

    const onRegionChangeComplete = useCallback(
        (region: Region) => {
            setMapRegion(region);
            const newZoom = Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2);
            setCurrentZoom(newZoom);
            updateVisibleMatches(region, newZoom);
        },
        [updateVisibleMatches]
    );

    // Bottom sheet logic
    // --------------------------------------------------
    const translateY = useRef(new Animated.Value(0)).current;
    const lastTranslateY = useRef(0);
    const SNAP_BOTTOM = CONTENT_HEIGHT - MINIMIZED_LIST_HEIGHT;
    const [isAtTop, setIsAtTop] = useState<boolean>(true);
    const [showMinimizedText, setShowMinimizedText] = useState<boolean>(false);
    const bottomNavAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const id = translateY.addListener(({value}) => {
            setShowMinimizedText(value > SNAP_BOTTOM * 0.25);
        });
        return () => {
            translateY.removeListener(id);
        };
    }, [SNAP_BOTTOM, translateY]);

    const sheetStyle = useMemo(() => ({transform: [{translateY}]}), [translateY]);

    const hideBottomSheet = () => {
        Animated.timing(translateY, {
            toValue: CONTENT_HEIGHT + 100,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
        }).start();
    };

    const showBottomSheet = () => {
        Animated.timing(translateY, {
            toValue: isMapMode ? SNAP_BOTTOM : 0,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
        }).start(() => {
            lastTranslateY.current = isMapMode ? SNAP_BOTTOM : 0;
        });
    };

    const onMinimizedTap = useCallback(() => {
        setShowCallout(false);
        Animated.timing(translateY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            lastTranslateY.current = 0;
            setIsMapMode(false);
        });
    }, []);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => isAtTop,
            onMoveShouldSetPanResponder: () => isAtTop,
            onPanResponderGrant: () => {
                translateY.stopAnimation((val) => {
                    lastTranslateY.current = val;
                });
            },
            onPanResponderMove: (_, gestureState) => {
                if (!isAtTop) return;
                let newY = lastTranslateY.current + gestureState.dy;
                newY = Math.max(0, Math.min(newY, SNAP_BOTTOM));
                translateY.setValue(newY);
            },
            onPanResponderRelease: (_, gestureState) => {
                if (!isAtTop) return;
                const finalPos = lastTranslateY.current + gestureState.dy;
                const clamped = Math.max(0, Math.min(finalPos, SNAP_BOTTOM));
                const half = SNAP_BOTTOM / 2;

                if (clamped < half) {
                    Animated.timing(translateY, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => {
                        lastTranslateY.current = 0;
                        setIsMapMode(false);
                    });
                } else {
                    Animated.timing(translateY, {
                        toValue: SNAP_BOTTOM,
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => {
                        lastTranslateY.current = SNAP_BOTTOM;
                        setIsMapMode(true);
                    });
                }
            },
        })
    ).current;

    // Handling marker press
    const onMarkerPress = useCallback(
        (m: Match) => {
            if (selectedMarkerId === m.id && showCallout) {
                showBottomSheet();
                setSelectedMarkerId(null);
                setShowCallout(false);
            } else {
                hideBottomSheet();
                setSelectedMarkerId(m.id);
                setShowCallout(true);
            }
        },
        [selectedMarkerId, showCallout]
    );

    // Toggle map mode
    const toggleMapMode = useCallback(() => {
        const nextMode = !isMapMode;
        Animated.timing(translateY, {
            toValue: nextMode ? SNAP_BOTTOM : 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            lastTranslateY.current = nextMode ? SNAP_BOTTOM : 0;
            setIsMapMode(nextMode);
        });
    }, [isMapMode, SNAP_BOTTOM]);

    // Render cluster
    const renderCluster = useCallback(
        (cluster: any) => {
            const {pointCount, coordinate, clusterId} = cluster;
            const isLarge = pointCount > 10;
            return (
                <Marker
                    key={`cluster-${clusterId}`}
                    coordinate={coordinate}
                    tracksViewChanges={false}
                    onPress={() => {
                        const newCamera = {
                            center: coordinate,
                            zoom: Math.min(currentZoom + (isLarge ? 2 : 3), 20),
                            pitch: 0,
                            heading: 0,
                        };
                        mapRef.current?.animateCamera(newCamera, {duration: 500});
                    }}
                >
                    <View
                        style={[
                            styles.clusterContainer,
                            isLarge && styles.largeClusterContainer,
                        ]}
                    >
                        <Text style={styles.clusterText}>{pointCount}</Text>
                    </View>
                </Marker>
            );
        },
        [currentZoom]
    );

    // List rendering
    const renderItem = useCallback(
        ({ item }: { item: Match }) => (
            <MatchCard
                match={item}
                onPress={(match) => {
                    navigateToMatchDetails(match);
                    setShowCallout(false);
                }}
            />
        ),
        [navigateToMatchDetails]
    );

    // To re-enable bottom sheet drag only if top
    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = e.nativeEvent.contentOffset.y;
        setIsAtTop(offsetY <= 0);
    };

    // Focused Match Callout: Find the selected match
    const selectedMatch = useMemo(
        () => visibleMatches.find((m) => m.id === selectedMarkerId),
        [visibleMatches, selectedMarkerId]
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light"/>

            {/* Header with search/filter */}
            <View style={styles.header}>
                <View style={styles.searchRow}>
                    <TouchableOpacity style={styles.searchBar} activeOpacity={1}>
                        <View style={styles.searchContent}>
                            <MaterialCommunityIcons
                                name="magnify"
                                size={24}
                                color={COLORS.neutral[400]}
                            />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search matches..."
                                placeholderTextColor={COLORS.neutral[400]}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                returnKeyType="search"
                            />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.filterButton}
                        onPress={() => setFilterModalVisible(true)}
                    >
                        <MaterialCommunityIcons
                            name="tune-variant"
                            size={24}
                            color={COLORS.neutral[400]}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Map + Bottom Sheet */}
            <View style={styles.contentContainer}>
                <View style={[styles.mapContainer, {height: CONTENT_HEIGHT}]}>
                    <MapViewClustering
                        ref={mapRef}
                        style={styles.map}
                        provider={PROVIDER_DEFAULT}
                        region={mapRegion}
                        showsUserLocation
                        customMapStyle={darkMapStyle}
                        clusteringEnabled
                        clusterColor={COLORS.primary.accent}
                        clusterTextColor="#fff"
                        renderCluster={renderCluster}
                        animationEnabled
                        radius={50}
                        maxZoom={20}
                        minZoom={8}
                        extent={512}
                        nodeSize={64}
                        onMapReady={() => setIsMapReady(true)}
                        onRegionChangeComplete={onRegionChangeComplete}
                        preserveClusterPressBehavior
                        loadingEnabled
                        moveOnMarkerPress={false}
                        onPress={() => {
                            if (showCallout) {
                                showBottomSheet();
                                setSelectedMarkerId(null);
                                setShowCallout(false);
                            }
                        }}
                    >
                        {isMapReady &&
                            visibleMatches.map((m) => (
                                <FocusedMatchMarker
                                    key={m.id}
                                    match={m}
                                    isSelected={selectedMarkerId === m.id}
                                    onPress={() => onMarkerPress(m)}
                                />
                            ))}
                    </MapViewClustering>
                </View>

                {/* Animated bottom sheet */}
                <Animated.View style={[styles.sheetContainer, sheetStyle]}>
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={showMinimizedText ? onMinimizedTap : undefined}
                        style={styles.sheetHeader}
                        {...panResponder.panHandlers}
                    >
                        <View style={styles.sheetHandle}/>
                        {showMinimizedText && (
                            <View style={styles.sheetMinimizedText}>
                                <Text style={styles.sheetMinimizedTitle}>
                                    {visibleMatches.length} matches in this area
                                </Text>
                                <Text style={styles.sheetMinimizedHint}>
                                    {isMapMode
                                        ? 'Tap or swipe up to expand'
                                        : 'Swipe down to see map'}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <FlatList
                        data={visibleMatches}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                        style={{flex: 1}}
                        contentContainerStyle={{paddingBottom: 100}}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>
                                    No matches found in this area.
                                </Text>
                            </View>
                        }
                    />
                </Animated.View>

                {/* Focused Match Callout (on top of map) */}
                {showCallout && selectedMatch && (
                    <FocusedMatchCallout
                        match={selectedMatch}
                        onPress={(selectedMatch) => {
                            router.push({
                                pathname: '/home/MatchDetailsScreen',
                                params: {
                                    matchId: selectedMatch.id,
                                },
                            });
                        }}
                        onClose={() => {
                            showBottomSheet();
                            setSelectedMarkerId(null);
                            setShowCallout(false);
                        }}
                        onLike={(likedMatch) => console.log('Liked match:', likedMatch.id)}
                        setSelectedMarkerId={setSelectedMarkerId}
                        setShowCallout={setShowCallout}
                    />
                )}
            </View>

            {/* Bottom Nav */}
            {!isMapMode && (
                <Animated.View
                    style={[
                        styles.bottomNav,
                        {
                            transform: [{translateY: bottomNavAnim}],
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={styles.navItem}
                        onPress={() => setSelectedTab('Explore')}
                    >
                        <MaterialCommunityIcons
                            name="map-outline"
                            size={26}
                            color={
                                selectedTab === 'Explore'
                                    ? COLORS.primary.accent
                                    : COLORS.neutral[300]
                            }
                        />
                        <Text
                            style={[
                                styles.navText,
                                selectedTab === 'Explore' && styles.activeNavText,
                            ]}
                        >
                            Explore
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.navItem}
                        onPress={() => setSelectedTab('Saved')}
                    >
                        <MaterialCommunityIcons
                            name="heart-outline"
                            size={26}
                            color={
                                selectedTab === 'Saved'
                                    ? COLORS.primary.accent
                                    : COLORS.neutral[300]
                            }
                        />
                        <Text
                            style={[
                                styles.navText,
                                selectedTab === 'Saved' && styles.activeNavText,
                            ]}
                        >
                            Saved
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.navItem}
                        onPress={() => setSelectedTab('Matches')}
                    >
                        <MaterialCommunityIcons
                            name="calendar-text"
                            size={26}
                            color={
                                selectedTab === 'Matches'
                                    ? COLORS.primary.accent
                                    : COLORS.neutral[300]
                            }
                        />
                        <Text
                            style={[
                                styles.navText,
                                selectedTab === 'Matches' && styles.activeNavText,
                            ]}
                        >
                            Matches
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.navItem}
                        onPress={() => setSelectedTab('Messages')}
                    >
                        <MaterialCommunityIcons
                            name="message-outline"
                            size={26}
                            color={
                                selectedTab === 'Messages'
                                    ? COLORS.primary.accent
                                    : COLORS.neutral[300]
                            }
                        />
                        <Text
                            style={[
                                styles.navText,
                                selectedTab === 'Messages' && styles.activeNavText,
                            ]}
                        >
                            Messages
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.navItem}
                        onPress={() => setSelectedTab('Profile')}
                    >
                        <MaterialCommunityIcons
                            name="account-circle-outline"
                            size={26}
                            color={
                                selectedTab === 'Profile'
                                    ? COLORS.primary.accent
                                    : COLORS.neutral[300]
                            }
                        />
                        <Text
                            style={[
                                styles.navText,
                                selectedTab === 'Profile' && styles.activeNavText,
                            ]}
                        >
                            Profile
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Map Button to switch mode */}
            {!isMapMode && selectedTab === 'Explore' && (
                <Animated.View
                    style={[
                        styles.mapButton,
                        {
                            backgroundColor: COLORS.primary.accent,
                            transform: [{translateY: bottomNavAnim}],
                        },
                    ]}
                >
                    <TouchableOpacity onPress={toggleMapMode} style={styles.mapButtonContent}>
                        <MaterialCommunityIcons name="map-outline" size={22} color="#fff"/>
                        <Text style={styles.mapButtonText}>Map</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Create Match FAB */}
            <Animated.View
                style={[
                    styles.createMatchButton,
                    {
                        transform: [{translateY: bottomNavAnim}],
                    },
                ]}
            >
                <TouchableOpacity
                    onPress={() => router.push('/create-match/createMatch')}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons name="plus" size={24} color="#fff"/>
                </TouchableOpacity>
            </Animated.View>

            {/* Filter Modal */}
            <EventFilterModal
                isVisible={isFilterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                filters={filters}
                setFilters={setFilters}
                applyFilters={() => setFilterModalVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.primary.main,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 48 : 40,
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: COLORS.primary.main,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.primary.light,
        zIndex: 10,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    searchBar: {
        flex: 1,
        backgroundColor: COLORS.background.input,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.primary.light,
    },
    searchContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: COLORS.neutral[400],
    },
    filterButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.background.input,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.primary.light,
    },
    contentContainer: {
        flex: 1,
        position: 'relative',
    },
    mapContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        zIndex: 1,
    },
    map: {
        flex: 1,
    },
    sheetContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: CONTENT_HEIGHT,
        backgroundColor: COLORS.primary.main,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.primary.light,
        zIndex: 2,
    },
    sheetHeader: {
        paddingVertical: 8,
        alignItems: 'center',
    },
    sheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.neutral[600],
    },
    sheetMinimizedText: {
        alignItems: 'center',
        paddingVertical: 6,
    },
    sheetMinimizedTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    sheetMinimizedHint: {
        marginTop: 2,
        fontSize: 12,
        color: COLORS.neutral[400],
    },
    emptyContainer: {
        padding: 24,
    },
    emptyText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 16,
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: COLORS.primary.main,
        height: BOTTOM_NAV_HEIGHT,
        paddingBottom: Platform.OS === 'ios' ? 24 : 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.primary.light,
        zIndex: 10,
    },
    navItem: {
        alignItems: 'center',
    },
    navText: {
        fontSize: 12,
        marginTop: 4,
        color: COLORS.neutral[300],
        fontWeight: '500',
    },
    activeNavText: {
        color: COLORS.primary.accent,
    },
    clusterContainer: {
        width: 40,
        height: 40,
        padding: 6,
        borderWidth: 1,
        borderColor: COLORS.primary.light,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary.accent,
    },
    largeClusterContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.primary.dark,
    },
    clusterText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    mapButton: {
        position: 'absolute',
        bottom: BOTTOM_NAV_HEIGHT + 30,
        alignSelf: 'center',
        zIndex: 11,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        width: 90,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    mapButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mapButtonText: {
        color: '#fff',
        marginLeft: 6,
        fontSize: 15,
        fontWeight: '600',
    },
    cardContainer: {
        backgroundColor: COLORS.background.input,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.primary.light,
        marginHorizontal: 16,
        marginVertical: 8,
        padding: 16,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 4,
        color: COLORS.neutral[50],
    },
    cardSubtitle: {
        fontSize: 14,
        color: COLORS.neutral[200],
        marginBottom: 6,
    },
    cardMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cardMetaText: {
        fontSize: 13,
        color: COLORS.neutral[300],
    },
    createMatchButton: {
        position: 'absolute',
        bottom: BOTTOM_NAV_HEIGHT + 30,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary.accent,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 11,
    },
});

export default React.memo(MainHomeScreen);
