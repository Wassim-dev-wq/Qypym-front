import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    AppState, AppStateStatus,
    Dimensions,
    FlatList,
    Linking,
    NativeScrollEvent,
    NativeSyntheticEvent,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, {MapStyleElement, Marker, PROVIDER_DEFAULT, Region} from 'react-native-maps';
import MapViewClustering from 'react-native-map-clustering';
import * as Location from 'expo-location';
import {StatusBar} from 'expo-status-bar';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {debounce} from 'lodash';
import {useFocusEffect, useRouter} from 'expo-router';
import * as Notifications from 'expo-notifications';
import {LinearGradient} from 'expo-linear-gradient';
import FocusedMatchCallout from './components/FocusedMatchCallout';
import FocusedMatchMarker from './components/FocusedMatchMarker';
import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/src/core/api/auth/useAuth';
import {matchesApi} from '@/src/core/api/matches/matches.api';
import MatchCard from '@/app/(tabs)/explore/components/MatchCard';
import {useBottomSheetState} from '@/src/features/matches/components/bottomSheetContext';
import {t} from 'src/constants/locales';
import {usePushNotifications} from '@/src/core/hooks/usePushNotifications';
import {matchService} from '@/src/core/api/matches/matchesService';
import {useSavedMatches} from '@/src/core/api/matches/matchesHooks';
import EventFilterModal from "@/app/(tabs)/explore/components/EventFilterModal";
import {useNotifications} from '@/src/core/hooks/useNotifications';
import MapErrorBoundary from "@/src/utils/MapErrorBoundary";
import {updateUserStatus} from "@/src/core/api/chatService";
import { Filters } from '@/src/types/match/filters';
import { Match } from '@/src/types/match/match';

const {width, height} = Dimensions.get('window');
const blackMapStyle: MapStyleElement[] = [];
const headerH = Platform.OS === 'ios' ? 91 : 56;
const aspectRatio = width / height;
const deltaLat = 0.02;
const deltaLong = deltaLat * aspectRatio;
const bodyH = height - (Platform.OS === 'ios' ? 118 : 100);
const miniListH = 150;
const bodySnap = bodyH - miniListH;
const panelGap = 80;
const panelHeaderH = 100;

const PanelPos = {
    HIDDEN: 'hidden',
    MINI: 'mini',
    FULL: 'full'
};

const zoomBreaks = {
    SHOW_ALL: 12,
    CLUSTER_ONLY: 10,
    HIDE_ALL: 8
};

const DEFAULT_FILTERS: Filters = {
    searchQuery: '',
    skillLevels: [],
    timeOfDay: [],
    formats: [],
    statuses: [],
    distance: 10,
    ageRange: [18, 60],
    location: null,
    minPlayers: 1,
    sortBy: null
};

export default function ExploreView() {
    const router = useRouter();
    const {user} = useAuth();
    const queryClient = useQueryClient();
    const myMapRef = useRef<MapView>(null);
    const myListRef = useRef<FlatList>(null);
    const searchInputRef = useRef<TextInput>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [showFilterIndicator, setShowFilterIndicator] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [matchCount, setMatchCount] = useState(0);
    const [myFilters, setMyFilters] = useState<Filters>(DEFAULT_FILTERS);
    const myFiltersRef = useRef<Filters>(DEFAULT_FILTERS);
    const [tempFilters, setTempFilters] = useState<Filters>(DEFAULT_FILTERS);

    const [sportKind, setSportKind] = useState<'foot' | 'padel'>('foot');
    const [chosenTab] = useState<'Explore' | 'Saved' | 'Matches' | 'Messages' | 'Profile'>('Explore');
    const [modeMatch, setModeMatch] = useState<'all' | 'owned' | 'joined'>('all');
    const [askedNotification, setAskedNotification] = useState(false);
    const [badgeCount, setBadgeCount] = useState(0);
    const [myLocation, setMyLocation] = useState<Location.LocationObject | null>(null);
    const [didMapLoad, setDidMapLoad] = useState(false);

    const homeRegion = useMemo(
        () => ({
            latitude: 48.7878,
            longitude: 2.3642,
            latitudeDelta: deltaLat,
            longitudeDelta: deltaLong
        }),
        []
    );
    const [currentRegion, setCurrentRegion] = useState<Region>(homeRegion);
    const [zoomLevel, setZoomLevel] = useState(10);
    const panelY = useRef(new Animated.Value(0)).current;
    const lastPanelY = useRef(0);
    const [panelState, setPanelState] = useState<typeof PanelPos[keyof typeof PanelPos]>(PanelPos.FULL);
    const [showMap, setShowMap] = useState(false);
    const [topOfList, setTopOfList] = useState(true);
    const [showMinLabel, setShowMinLabel] = useState(false);
    const scrollSpot = useRef(0);
    const {setTabBarHeight} = useBottomSheetState();
    const [chosenMarker, setChosenMarker] = useState<string | null>(null);
    const [showPop, setShowPop] = useState(false);
    const fadeInAnim = useRef(new Animated.Value(0)).current;
    const scaleInAnim = useRef(new Animated.Value(0.95)).current;
    const barOpacity = useRef(new Animated.Value(1)).current;
    const barAnim = useRef(new Animated.Value(0)).current;
    const {registerForPushNotifications, notificationPermissionStatus} = usePushNotifications(user?.id || null);
    const {enhanceMatchesWithSavedStatus, toggleSaveMatch} = useSavedMatches();
    const [foundMatches, setFoundMatches] = useState<Match[]>([]);
    const [visibleMatches, setVisibleMatches] = useState<Match[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [initialMatchesLoaded, setInitialMatchesLoaded] = useState(false);
    const refreshingRef = useRef(false);
    const loadMatchesOperationIdRef = useRef(0);
    const lastRefreshTimeRef = useRef(0);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isAdvancedFilterActive, setIsAdvancedFilterActive] = useState(false);
    const [isMapAnimating, setIsMapAnimating] = useState(false);
    const mapAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const {unreadCount: unreadNotificationsCount, onRefresh} = useNotifications(user?.keycloakUserId || '');

    useEffect(() => {
        myFiltersRef.current = myFilters;
    }, [myFilters]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeInAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true
            }),
            Animated.spring(scaleInAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true
            })
        ]).start();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDidMapLoad(true);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (notificationPermissionStatus && notificationPermissionStatus !== 'granted' && !askedNotification) {
            Alert.alert(t('enableNotifications'), t('notificationsPermissionNotEnabled'), [
                {text: t('cancel'), style: 'cancel'},
                {text: t('openSettings'), onPress: () => Linking.openSettings()}
            ]);
            setAskedNotification(true);
        }
    }, [notificationPermissionStatus, askedNotification]);

    useEffect(() => {
        if (user?.id) {
            registerForPushNotifications();
        }
    }, [user?.id, registerForPushNotifications]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                if (user?.keycloakUserId) {
                    onRefresh();
                }

                if (panelState === PanelPos.FULL) {
                    Animated.timing(panelY, {
                        toValue: -2,
                        duration: 300,
                        useNativeDriver: true
                    }).start(() => {
                        lastPanelY.current = -2;
                    });
                } else if (panelState === PanelPos.MINI) {
                    Animated.timing(panelY, {
                        toValue: bodySnap + panelGap,
                        duration: 300,
                        useNativeDriver: true
                    }).start(() => {
                        lastPanelY.current = bodySnap + panelGap;
                    });
                } else if (panelState === PanelPos.HIDDEN) {
                    Animated.timing(panelY, {
                        toValue: bodyH + 100 + panelGap,
                        duration: 300,
                        useNativeDriver: true
                    }).start(() => {
                        lastPanelY.current = bodyH + 100 + panelGap;
                    });
                }

                if (showMap && panelState === PanelPos.MINI) {
                    setTimeout(() => {
                        lowerPanel();
                    }, 100);
                }
            }
        });
        return () => {
            subscription.remove();
        };
    }, [user?.keycloakUserId, onRefresh, panelState, panelY, showMap]);

    useEffect(() => {
        const noteSub = Notifications.addNotificationResponseReceivedListener(msg => {
            const data = msg.notification.request.content.data;
            if (data.type === 'chat_message') {
                router.push({pathname: '/(tabs)/messages', params: {id: data.chatRoomId}});
            }
        });
        return () => Notifications.removeNotificationSubscription(noteSub);
    }, [router]);

    useEffect(() => {
        setBadgeCount(unreadNotificationsCount);
    }, [unreadNotificationsCount]);

    useEffect(() => {
        let mounted = true;
        const askLocation = async () => {
            try {
                const {status} = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({});
                    if (mounted) {
                        setMyLocation(loc);
                        setCurrentRegion(p => ({
                            ...p,
                            latitude: loc.coords.latitude,
                            longitude: loc.coords.longitude
                        }));
                        if (myMapRef.current && didMapLoad) {
                            animateToRegion({
                                latitude: loc.coords.latitude,
                                longitude: loc.coords.longitude,
                                latitudeDelta: deltaLat,
                                longitudeDelta: deltaLong
                            });
                        }
                    }
                } else {
                    Alert.alert(t('permissionDenied'), t('locationPermissionRequired'));
                }
            } catch (err) {
                console.error('Error requesting location', err);
            }
        };
        askLocation();
        return () => {
            mounted = false;
        };
    }, [didMapLoad]);

    useEffect(() => {
        const id = panelY.addListener(({value}) => {
            setShowMinLabel(value > bodySnap * 0.25);
        });
        return () => panelY.removeListener(id);
    }, [panelY]);

    useEffect(() => {
        if (showPop && chosenMarker) {
            vanishPanel();
        }
    }, [showPop, chosenMarker]);

    useFocusEffect(
        useCallback(() => {
            if (user?.keycloakUserId) {
                const now = Date.now();
                if (now - lastRefreshTimeRef.current > 2000) {
                    lastRefreshTimeRef.current = now;
                    onRefresh();
                }
            }
        }, [user?.keycloakUserId, onRefresh])
    );

    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            if (mapAnimationTimeoutRef.current) {
                clearTimeout(mapAnimationTimeoutRef.current);
            }
        };
    }, []);

    const getZoom = useCallback((r: Region) => Math.round(Math.log(360 / r.longitudeDelta) / Math.LN2), []);

    const isLocationInExpandedViewport = useCallback((location, region, expansionFactor = 1.5) => {
        if (!location || !region) return false;

        const latDelta = (region.latitudeDelta * expansionFactor) / 2;
        const lngDelta = (region.longitudeDelta * expansionFactor) / 2;

        const northLat = region.latitude + latDelta;
        const southLat = region.latitude - latDelta;
        const eastLng = region.longitude + lngDelta;
        const westLng = region.longitude - lngDelta;

        return (
            location.latitude <= northLat &&
            location.latitude >= southLat &&
            location.longitude <= eastLng &&
            location.longitude >= westLng
        );
    }, []);

    const checkFilterActive = useCallback((filters: Filters) => {
        return !!(
            filters.searchQuery ||
            (filters.skillLevels && filters.skillLevels.length > 0) ||
            ((filters.formats && filters.formats.length > 0)) ||
            (filters.timeOfDay && filters.timeOfDay.length > 0) ||
            filters.distance !== 10 ||
            filters.minPlayers > 1 ||
            filters.sortBy ||
            filters.location
        );
    }, []);

    const debouncedUpdateVisibleMarkers = useMemo(
        () =>
            debounce((matches, region, zoomLevel, bypassViewportFiltering = false) => {
                if (matches.length > 0) {
                    if (zoomLevel <= zoomBreaks.HIDE_ALL && !bypassViewportFiltering) {
                        setVisibleMatches([]);
                        setMatchCount(0);
                    } else {
                        let matchesInView = bypassViewportFiltering
                            ? matches
                            : matches.filter(match => {
                                const latitude = match.location?.coordinates?.latitude || match.location?.latitude;
                                const longitude = match.location?.coordinates?.longitude || match.location?.longitude;

                                if (!latitude || !longitude) return false;

                                return isLocationInExpandedViewport(
                                    {latitude, longitude},
                                    region
                                );
                            });

                        if (zoomLevel < zoomBreaks.SHOW_ALL && zoomLevel > zoomBreaks.HIDE_ALL && !bypassViewportFiltering) {
                            matchesInView = matchesInView.filter((_, idx) => idx % 3 === 0);
                        }

                        setVisibleMatches(matchesInView);
                        setMatchCount(matchesInView.length);
                    }
                } else {
                    setVisibleMatches([]);
                    setMatchCount(0);
                }
            }, 150),
        [isLocationInExpandedViewport]
    );

    useEffect(() => {
        if ( user?.keycloakUserId) {
            updateUserStatus(user.keycloakUserId, null, true);
        }
    }, [user?.keycloakUserId]);

    const loadMatches = useCallback(
        async (r: Region, z: number, overrideFilters?: Filters, skipFilterIndicator = false) => {
            if (refreshingRef.current) return [];
            const operationId = ++loadMatchesOperationIdRef.current;
            refreshingRef.current = true;
            setIsLoading(true);
            try {
                if (operationId !== loadMatchesOperationIdRef.current) {
                    return [];
                }
                const fakeLoc = {
                    coords: {
                        latitude: r.latitude,
                        longitude: r.longitude,
                        accuracy: 1,
                        altitude: null,
                        altitudeAccuracy: null,
                        heading: null,
                        speed: null
                    },
                    timestamp: Date.now()
                };

                const filtersToUse = overrideFilters || myFiltersRef.current;
                let response;
                const hasBasicFiltersOnly =
                    (!filtersToUse.searchQuery || filtersToUse.searchQuery === '') &&
                    (!filtersToUse.formats || filtersToUse.formats.length === 0) &&
                    (!filtersToUse.timeOfDay || filtersToUse.timeOfDay.length === 0) &&
                    (!filtersToUse.statuses || filtersToUse.statuses.length === 0) &&
                    filtersToUse.minPlayers === 1 &&
                    !filtersToUse.sortBy;
                console.log('hasBasicFiltersOnly', hasBasicFiltersOnly);
                if (hasBasicFiltersOnly) {
                    response = await matchService.fetchByLocation(fakeLoc, {
                        skillLevels: filtersToUse.skillLevels,
                        distance: filtersToUse.distance
                    }, 0);
                } else {
                    const searchRequest = {
                        searchQuery: filtersToUse.searchQuery,
                        latitude: filtersToUse.location?.coordinates?.latitude || r.latitude,
                        longitude: filtersToUse.location?.coordinates?.longitude || r.longitude,
                        distance: filtersToUse.distance,
                        skillLevels: filtersToUse.skillLevels,
                        formats: filtersToUse.formats,
                        statuses: filtersToUse.statuses,
                        minPlayers: filtersToUse.minPlayers,
                        timeOfDay: filtersToUse.timeOfDay,
                    };
                    response = await matchService.searchMatches(searchRequest, 0);
                }
                if (operationId !== loadMatchesOperationIdRef.current) {
                    return [];
                }

                const matches = response.data.content;
                const now = new Date();
                const filteredMatches = matches.filter(match =>
                    !match.owner && new Date(match.startDate) > now
                );
                setFoundMatches(filteredMatches);
                debouncedUpdateVisibleMarkers(filteredMatches, r, z, isAdvancedFilterActive);
                if (!skipFilterIndicator) {
                    setShowFilterIndicator(checkFilterActive(filtersToUse));
                }
                return filteredMatches;
            } catch (e) {
                console.error('Error loading matches:', e);
                if (operationId === loadMatchesOperationIdRef.current) {
                    setFoundMatches([]);
                    setVisibleMatches([]);
                    setMatchCount(0);
                }

                return [];
            } finally {

                if (operationId === loadMatchesOperationIdRef.current) {
                    setIsLoading(false);
                    refreshingRef.current = false;
                }
            }
        },
        [checkFilterActive, debouncedUpdateVisibleMarkers, isAdvancedFilterActive]
    );

    const animateToRegion = useCallback((region: Region) => {
        if (myMapRef.current) {
            setIsMapAnimating(true);
            myMapRef.current.animateToRegion(region, 500);

            if (mapAnimationTimeoutRef.current) {
                clearTimeout(mapAnimationTimeoutRef.current);
            }

            mapAnimationTimeoutRef.current = setTimeout(() => {
                setIsMapAnimating(false);
            }, 600);
        }
    }, []);

    const handleMapDrag = useMemo(
        () =>
            debounce(async (r: Region) => {
                const z = getZoom(r);
                setZoomLevel(z);

                if (z <= zoomBreaks.HIDE_ALL) {
                    setVisibleMatches([]);
                    setMatchCount(0);
                    return;
                }

                if (!isAdvancedFilterActive) {
                    await loadMatches(r, z);
                }
            }, 500),
        [getZoom, loadMatches, isAdvancedFilterActive]
    );

    useEffect(() => {
        const loadInitialMatches = async () => {
            if (myLocation && didMapLoad && !initialMatchesLoaded) {
                const initialRegion = {
                    latitude: myLocation.coords.latitude,
                    longitude: myLocation.coords.longitude,
                    latitudeDelta: deltaLat,
                    longitudeDelta: deltaLong
                };

                const initialZoom = getZoom(initialRegion);
                await loadMatches(initialRegion, initialZoom);
                setInitialMatchesLoaded(true);
            }
        };

        loadInitialMatches();
    }, [myLocation, didMapLoad, initialMatchesLoaded, getZoom, loadMatches]);

    const onMapRegionChange = useCallback(
        (r: Region) => {
            setCurrentRegion(r);
            const z = getZoom(r);
            setZoomLevel(z);

            if (!isMapAnimating && !isAdvancedFilterActive) {
                debouncedUpdateVisibleMarkers(foundMatches, r, z);
                handleMapDrag(r);
            }
        },
        [handleMapDrag, foundMatches, getZoom, debouncedUpdateVisibleMarkers, isMapAnimating, isAdvancedFilterActive]
    );

    const handleSearchInputChange = useCallback((text: string) => {
        setSearchQuery(text);
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(async () => {
            setIsLoading(true);
            try {
                const response = await matchService.searchMatches({
                    searchQuery: text
                }, 0);
                const matches = response.data.content;
                const now = new Date();
                const filteredMatches = matches.filter(match =>
                    !match.owner && new Date(match.startDate) > now
                );                setFoundMatches(filteredMatches);
                setVisibleMatches(filteredMatches);
                setMatchCount(filteredMatches.length);
                setMyFilters({
                    ...DEFAULT_FILTERS,
                    searchQuery: text
                });

                setShowFilterIndicator(!!text);
            } catch (error) {
                console.error('Error searching matches:', error);
                setFoundMatches([]);
                setVisibleMatches([]);
                setMatchCount(0);
            } finally {
                setIsLoading(false);
            }
        }, 500);
    }, []);

    const clearSearch = useCallback(() => {
        setSearchQuery('');

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        setMyFilters(prev => ({
            ...prev,
            searchQuery: ''
        }));

        if (myLocation) {
            loadMatches({
                ...currentRegion,
                latitude: myLocation.coords.latitude,
                longitude: myLocation.coords.longitude
            }, zoomLevel);
        }

        searchInputRef.current?.blur();
    }, [myLocation, currentRegion, zoomLevel, loadMatches]);

    const clearSearchState = useCallback(() => {
        setVisibleMatches([]);
        setFoundMatches([]);
        setMatchCount(0);
    }, []);

    const centerLocation = useCallback(() => {
        if (myLocation) {
            const reg = {
                latitude: myLocation.coords.latitude,
                longitude: myLocation.coords.longitude,
                latitudeDelta: deltaLat,
                longitudeDelta: deltaLong
            };

            animateToRegion(reg);
            setCurrentRegion(reg);
        }
    }, [myLocation, animateToRegion]);

    const handleFilterUpdates = useCallback((filters: Filters) => {
        setTempFilters(filters);
        console.log('Explore handleFilterUpdates', filters);
    }, []);

    const raisePanel = useCallback(() => {
        if (panelState === PanelPos.FULL) return;

        setPanelState(PanelPos.FULL);
        setTabBarHeight(90);
        setShowMap(false);

        Animated.timing(panelY, {
            toValue: -2,
            duration: 300,
            useNativeDriver: true
        }).start(() => {
            lastPanelY.current = -2;
        });
    }, [panelState, setTabBarHeight, panelY]);

    const applyFilters = useCallback(() => {
        clearSearchState();
        setIsFilterOpen(false);
        const currentFilters = tempFilters;
        setMyFilters(currentFilters);
        setIsLoading(true);
        setIsAdvancedFilterActive(true);
        setTimeout(async () => {
            let targetRegion;
            if (currentFilters.location?.coordinates) {
                targetRegion = {
                    latitude: currentFilters.location.coordinates.latitude,
                    longitude: currentFilters.location.coordinates.longitude,
                    latitudeDelta: deltaLat,
                    longitudeDelta: deltaLong
                };
                animateToRegion(targetRegion);
                setCurrentRegion(targetRegion);
            } else {
                targetRegion = {
                    ...currentRegion
                };
            }
            const matches = await loadMatches(targetRegion, zoomLevel, currentFilters);
            if (matches && matches.length > 0) {
                setVisibleMatches(matches);
                setMatchCount(matches.length);
            }
            setIsLoading(false);
            raisePanel();
            if (myListRef.current) {
                myListRef.current.scrollToOffset({offset: 0, animated: true});
            }
        }, 100);
    }, [
        myFilters,
        clearSearchState,
        zoomLevel,
        loadMatches,
        animateToRegion,
        currentRegion,
        raisePanel
    ]);

    const resetAllFilters = useCallback(() => {
        setIsAdvancedFilterActive(false);
        setSearchQuery('');
        setMyFilters(DEFAULT_FILTERS);
        setTempFilters(DEFAULT_FILTERS);
        setShowFilterIndicator(false);
        setTimeout(() => {
            loadMatches(currentRegion, zoomLevel, DEFAULT_FILTERS, true);
            if (isFilterOpen) {
                setIsFilterOpen(false);
            }
        }, 0);
    }, [currentRegion, zoomLevel, loadMatches, isFilterOpen]);


    const lowerPanel = useCallback(() => {
        if (panelState === PanelPos.MINI) return;

        setPanelState(PanelPos.MINI);
        setTabBarHeight(0);
        setShowMap(true);

        Animated.timing(panelY, {
            toValue: bodySnap + panelGap,
            duration: 300,
            useNativeDriver: true
        }).start(() => {
            lastPanelY.current = bodySnap + panelGap;
        });
    }, [panelState, setTabBarHeight, panelY]);

    const vanishPanel = useCallback(() => {
        setPanelState(prev => {
            if (prev === PanelPos.HIDDEN) return prev;

            Animated.timing(panelY, {
                toValue: bodyH + 100 + panelGap,
                duration: 300,
                useNativeDriver: true
            }).start(() => {
                lastPanelY.current = bodyH + 100 + panelGap;
            });

            return PanelPos.HIDDEN;
        });
    }, [panelY]);

    const touchResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => false,
                onMoveShouldSetPanResponder: (_, gs) => {
                    const vertical = Math.abs(gs.dy) > Math.abs(gs.dx);
                    if (!vertical) return false;

                    if (Math.abs(gs.dy) > 5) {
                        if (panelState === PanelPos.MINI && gs.dy < 0) return true;
                        if (topOfList && scrollSpot.current <= 0 && gs.dy > 0) return true;
                        return showMap && gs.dy < 0;
                    }

                    return false;
                },
                onPanResponderGrant: () => {
                    panelY.stopAnimation(val => {
                        lastPanelY.current = val;
                    });
                },
                onPanResponderMove: (_, gs) => {
                    if (panelState === PanelPos.MINI && gs.dy < 0) {
                        let targetY = bodyH + 100 + panelGap + gs.dy;
                        targetY = Math.max(-headerH, Math.min(targetY, bodyH + 100 + panelGap));
                        panelY.setValue(targetY);
                    } else if ((topOfList && scrollSpot.current <= 0) || showMap) {
                        let nextY = lastPanelY.current + gs.dy;
                        nextY = Math.max(-headerH, Math.min(nextY, bodySnap + panelGap));
                        panelY.setValue(nextY);
                    }
                },
                onPanResponderRelease: (_, gs) => {
                    const vel = gs.vy;
                    const pos = lastPanelY.current + gs.dy;
                    const mid = bodySnap / 2;

                    if (Math.abs(vel) > 0.1) {
                        vel > 0 ? lowerPanel() : raisePanel();
                    } else {
                        const dist = Math.abs(gs.dy);
                        if (dist > 20) {
                            pos < mid ? raisePanel() : lowerPanel();
                        } else {
                            const oldPos = lastPanelY.current;
                            const distTop = Math.abs(oldPos);
                            const distBottom = Math.abs(oldPos - (bodySnap + panelGap));
                            distTop < distBottom ? raisePanel() : lowerPanel();
                        }
                    }
                },
                onPanResponderTerminate: () => {
                    const pos = lastPanelY.current;
                    const mid = bodySnap / 2;
                    pos < mid ? raisePanel() : lowerPanel();
                },
            }),
        [panelState, showMap, panelY, lowerPanel, raisePanel, topOfList]
    );

    const pickMarker = useCallback(
        (m: { id: string | null }) => {
            setChosenMarker(p => (p === m.id && showPop ? null : m.id));
            setShowPop(p => !(p && chosenMarker === m.id));
        },
        [showPop, chosenMarker]
    );

    const seeMatch = useCallback(
        async (m: { id: string; owner: any }) => {
            try {
                await queryClient.prefetchQuery({
                    queryKey: ['match', m.id],
                    queryFn: () => matchesApi.getMatchById(m.id)
                });

                if (m.owner) {
                    router.push({pathname: '/(modals)/[matchId]/manage', params: {matchId: m.id}});
                } else {
                    router.push({pathname: '/(modals)/[matchId]', params: {matchId: m.id}});
                }
            } catch (e) {
                Alert.alert(t('error'), t('matchDetailsError'));
            }
        },
        [queryClient, router]
    );

    const likeMatch = useCallback(
        async (m: { id: string }) => {
            try {
                await toggleSaveMatch(m.id);
            } catch (e) {
                Alert.alert(t('error'), t('updateSaveError'));
            }
        },
        [toggleSaveMatch]
    );

    const onListScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollSpot.current = e.nativeEvent.contentOffset.y;
        setTopOfList(scrollSpot.current <= 0);
    }, []);

    const tapPanel = useCallback(() => {
        if (panelState === PanelPos.MINI) {
            raisePanel();
        }
    }, [panelState, raisePanel]);

    const openNotifications = useCallback(() => {
        router.push({pathname: '/(notifications)/notifcationScreen'});
    }, [router]);

    const toggleSearch = useCallback(() => {
        setIsSearching(prev => !prev);

        if (!isSearching) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        } else {
            searchInputRef.current?.blur();
        }
    }, [isSearching]);

    const openFilterModal = useCallback(() => {
        console.log('openFilterModal', myFilters);
        setTempFilters({...myFilters});
        setIsFilterOpen(true);
    }, [myFilters]);

    const showItems = useMemo(() => {
        let items = visibleMatches;

        items = items.filter(match => match.creatorId !== user?.keycloakUserId);

        if (chosenTab === 'Matches') {
            if (modeMatch === 'owned') {
                items = items.filter(x => x.owner);
            } else if (modeMatch === 'joined') {
                items = items.filter(x => x.joined && !x.owner);
            }
        }

        return enhanceMatchesWithSavedStatus(items);
    }, [visibleMatches, chosenTab, modeMatch, enhanceMatchesWithSavedStatus, user?.keycloakUserId]);

    const selectedOne = useMemo(() => {
        if (!chosenMarker) return null;
        return showItems.find(x => x.id === chosenMarker) || null;
    }, [chosenMarker, showItems]);

    const panelAnimatedStyle = useMemo(() => ({transform: [{translateY: panelY}]}), [panelY]);

    return (
        <View style={styles.wrapper}>
            <StatusBar style="light"/>
            <LinearGradient colors={['rgba(10, 10, 10, 0.98)', 'rgba(10, 10, 10, 0.95)']} style={styles.bar}>
                <View style={styles.row}>
                    <TouchableOpacity
                        style={styles.searchBox}
                        activeOpacity={0.7}
                        onPress={toggleSearch}
                    >
                        <View style={styles.searchInner}>
                            <MaterialCommunityIcons name="magnify" size={24} color={THEME_COLORS.textSecondary}/>
                            <TextInput
                                ref={searchInputRef}
                                style={[styles.searchText, {color: THEME_COLORS.textSecondary}]}
                                placeholder={t('searchPlaceholder')}
                                placeholderTextColor={THEME_COLORS.textPlaceholder}
                                value={searchQuery}
                                onChangeText={handleSearchInputChange}
                                editable={isSearching}
                            />
                            {searchQuery ? (
                                <TouchableOpacity onPress={clearSearch}>
                                    <MaterialCommunityIcons name="close-circle" size={20}
                                                            color={THEME_COLORS.textSecondary}/>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.filterWrap}
                        onPress={openFilterModal}
                        activeOpacity={0.4}
                    >
                        <LinearGradient
                            colors={['rgba(26,26,26,0.9)', 'rgba(17,17,17,0.8)']}
                            style={styles.filterInner}
                        >
                            <MaterialCommunityIcons name="filter-variant" size={24} color={THEME_COLORS.textSecondary}/>
                            {showFilterIndicator && (
                                <View style={styles.filterIndicator}/>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.alertWrap} onPress={openNotifications}>
                        <LinearGradient colors={['rgba(26,26,26,0.9)', 'rgba(17,17,17,0.8)']} style={styles.alertInner}>
                            <MaterialCommunityIcons name="bell-outline" size={24} color={THEME_COLORS.textSecondary}/>
                            {badgeCount > 0 && (
                                <View style={styles.alertBadge}>
                                    <Text style={styles.alertBadgeTxt}>{badgeCount}</Text>
                                </View>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <View style={styles.sportSwitch}>
                    <TouchableOpacity
                        style={[styles.sportBtn, sportKind === 'foot' && styles.sportBtnActive]}
                        onPress={() => setSportKind('foot')}
                        activeOpacity={0.8}
                    >
                        {sportKind === 'foot' ? (
                            <LinearGradient colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                                            start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.sportGrad}>
                                <MaterialCommunityIcons name="soccer" size={18} color="#000" style={styles.sportIcon}/>
                                <Text style={styles.sportTextActive}>{t('football')}</Text>
                            </LinearGradient>
                        ) : (
                            <View style={styles.sportBlank}>
                                <MaterialCommunityIcons name="soccer" size={18} color={THEME_COLORS.textSecondary}
                                                        style={styles.sportIcon}/>
                                <Text style={styles.sportText}>{t('football')}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <View style={[styles.sportBtn, styles.disabledSportBtn]}>
                        <View style={styles.sportBlank}>
                            <MaterialCommunityIcons name="tennis" size={18} color="rgba(255, 255, 255, 0.3)"
                                                    style={styles.sportIcon}/>
                            <Text style={styles.disabledText}>{t('padel')}</Text>
                            <View style={styles.comingSoonBadge}>
                                <Text style={styles.comingSoonText}>Bientôt disponible</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {chosenTab === 'Matches' && (
                <Animated.View style={[styles.matchToggles, {opacity: fadeInAnim, transform: [{scale: scaleInAnim}]}]}>
                    <TouchableOpacity
                        style={[styles.segmentBtn, modeMatch === 'all' && styles.segmentBtnActive]}
                        onPress={() => setModeMatch('all')}
                        activeOpacity={0.8}
                    >
                        {modeMatch === 'all' ? (
                            <LinearGradient colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                                            style={styles.segGrad}>
                                <Text style={styles.segTxtActive}>{t('all')}</Text>
                            </LinearGradient>
                        ) : (
                            <Text style={styles.segTxt}>{t('all')}</Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segmentBtn, modeMatch === 'owned' && styles.segmentBtnActive]}
                        onPress={() => setModeMatch('owned')}
                        activeOpacity={0.8}
                    >
                        {modeMatch === 'owned' ? (
                            <LinearGradient colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                                            style={styles.segGrad}>
                                <Text style={styles.segTxtActive}>{t('myMatches')}</Text>
                            </LinearGradient>
                        ) : (
                            <Text style={styles.segTxt}>{t('myMatches')}</Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segmentBtn, modeMatch === 'joined' && styles.segmentBtnActive]}
                        onPress={() => setModeMatch('joined')}
                        activeOpacity={0.8}
                    >
                        {modeMatch === 'joined' ? (
                            <LinearGradient colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                                            style={styles.segGrad}>
                                <Text style={styles.segTxtActive}>{t('joined')}</Text>
                            </LinearGradient>
                        ) : (
                            <Text style={styles.segTxt}>{t('joined')}</Text>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            )}

            <View style={styles.main}>
                <View style={[styles.mapWrap, {height: bodyH}]}>
                    <MapErrorBoundary>
                        {didMapLoad ? (
                            <MapViewClustering
                                ref={myMapRef}
                                style={styles.map}
                                provider={PROVIDER_DEFAULT}
                                region={currentRegion}
                                showsUserLocation
                                customMapStyle={blackMapStyle}
                                clusteringEnabled
                                clusterColor={COLORS.primary.accent}
                                clusterTextColor="#000"
                                animationEnabled
                                radius={50}
                                maxZoom={20}
                                minZoom={8}
                                extent={512}
                                nodeSize={64}
                                onMapReady={() => setDidMapLoad(true)}
                                onRegionChangeComplete={onMapRegionChange}
                                preserveClusterPressBehavior
                                loadingEnabled={false}
                                moveOnMarkerPress={false}
                                onPress={() => {
                                    if (showPop) {
                                        lowerPanel();
                                        setChosenMarker(null);
                                        setShowPop(false);
                                    }
                                }}
                            >
                                {showItems.map(m => (
                                    <FocusedMatchMarker
                                        key={m.id}
                                        match={m}
                                        isSelected={chosenMarker === m.id}
                                        onPress={() => pickMarker(m)}
                                    />
                                ))}

                                {myFilters.location?.coordinates && (
                                    <Marker
                                        coordinate={{
                                            latitude: myFilters.location.coordinates.latitude,
                                            longitude: myFilters.location.coordinates.longitude
                                        }}
                                        pinColor={COLORS.primary.accent}
                                        title={myFilters.location.name}
                                    />
                                )}
                            </MapViewClustering>
                        ) : (
                            <View style={styles.map}/>
                        )}
                    </MapErrorBoundary>
                </View>

                <Animated.View style={[styles.panel, panelAnimatedStyle]} {...touchResponder.panHandlers}>
                    <TouchableOpacity activeOpacity={1} onPress={tapPanel} style={{flex: 1}}>
                        <LinearGradient colors={['rgba(10, 10, 10, 0.98)', 'rgba(10, 10, 10, 0.95)']}
                                        style={styles.panelTop}>
                            <View style={styles.panelHandle}/>
                            {showMinLabel && (
                                <Animated.View style={[styles.panelMini, {
                                    opacity: fadeInAnim,
                                    transform: [{scale: scaleInAnim}]
                                }]}>
                                    <Text style={styles.panelMiniTitle}>
                                        {matchCount} {t('matchesFound')}
                                    </Text>
                                    <Text style={styles.panelMiniText}>{t('tapToViewList')}</Text>
                                </Animated.View>
                            )}
                        </LinearGradient>

                        {isLoading && (
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color={COLORS.primary.accent}/>
                                <Text style={styles.loadingText}>{t('loadingMatches')}</Text>
                            </View>
                        )}

                        <FlatList
                            ref={myListRef}
                            data={showItems}
                            renderItem={({item}) => <MatchCard match={item} onPress={seeMatch} onLike={likeMatch}/>}
                            onScroll={onListScroll}
                            scrollEventThrottle={16}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.listPad}
                            ListEmptyComponent={
                                <View style={styles.emptyWrap}>
                                    <MaterialCommunityIcons name="map-search" size={60} color={COLORS.primary.accent}/>
                                    <Text style={styles.emptyTitle}>{t('noMatchesFound')}</Text>
                                    {showFilterIndicator ? (
                                        <Text style={styles.emptyText}>{t('tryChangingFilters')}</Text>
                                    ) : (
                                        <Text style={styles.emptyText}>{t('exploreOtherAreas')}</Text>
                                    )}
                                    {showFilterIndicator && (
                                        <TouchableOpacity
                                            style={styles.resetFiltersButton}
                                            onPress={resetAllFilters}
                                        >
                                            <Text style={styles.resetFiltersText}>{t('resetFilters')}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            }
                            keyExtractor={i => i.id}
                        />
                    </TouchableOpacity>
                </Animated.View>

                {showPop && selectedOne && (
                    <FocusedMatchCallout
                        match={selectedOne}
                        onPress={() => seeMatch(selectedOne)}
                        onClose={() => {
                            lowerPanel();
                            setChosenMarker(null);
                            setShowPop(false);
                        }}
                        setSelectedMarkerId={setChosenMarker}
                        setShowCallout={setShowPop}
                        currentUserId={user?.id}
                        onLike={likeMatch}
                    />
                )}

                {panelState !== PanelPos.FULL && (
                    <TouchableOpacity style={styles.locBtn} onPress={centerLocation} activeOpacity={0.8}>
                        <LinearGradient colors={['rgba(26,26,26,0.9)', 'rgba(17,17,17,0.8)']} style={styles.locInner}>
                            <MaterialCommunityIcons name="crosshairs-gps" size={22} color={COLORS.primary.accent}/>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>

            {panelState !== PanelPos.HIDDEN && panelState !== PanelPos.MINI && !showMap && (
                <Animated.View style={[styles.mapBtn, {transform: [{translateY: barAnim}], opacity: barOpacity}]}>
                    <TouchableOpacity onPress={lowerPanel} style={styles.mapBtnBox} activeOpacity={0.8}>
                        <LinearGradient colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                                        start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.mapBtnGrad}>
                            <MaterialCommunityIcons name="map-outline" size={22} color="#000"/>
                            <Text style={styles.mapBtnTxt}>{t('map')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            )}

            <Animated.View style={[styles.createBtn, {transform: [{translateY: barAnim}]}]}>
                <TouchableOpacity onPress={() => router.push("/(modals)/matches/createMatch")} activeOpacity={0.7}>
                    <LinearGradient colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                                    start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.createGrad}>
                        <MaterialCommunityIcons name="plus" size={24} color="#000"/>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>

            <EventFilterModal
                isVisible={isFilterOpen}
                onClose={() =>
                    setIsFilterOpen(false)}
                currentFilters={{...tempFilters}}
                updateFilters={handleFilterUpdates}
                applyFilters={applyFilters}
                userLocation={myLocation}
                resetFilters={resetAllFilters}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: THEME_COLORS.background
    },
    bar: {
        paddingTop: Platform.OS === 'ios' ? 48 : 40,
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 184, 0, 0.1)',
        zIndex: 100,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 10
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    searchBox: {
        flex: 1,
        backgroundColor: 'rgba(26,26,26,0.5)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
        overflow: 'hidden'
    },
    searchInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12
    },
    searchText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: THEME_COLORS.textPrimary
    },
    filterWrap: {
        borderRadius: 24,
        overflow: 'hidden'
    },
    filterInner: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)'
    },
    filterIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary.accent
    },
    alertWrap: {
        borderRadius: 24,
        overflow: 'hidden'
    },
    alertInner: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)'
    },
    alertBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: THEME_COLORS.error,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center'
    },
    alertBadgeTxt: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold'
    },
    sportSwitch: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12
    },
    sportBtn: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden'
    },
    sportGrad: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16
    },
    sportBlank: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(26,26,26,0.5)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)'
    },
    sportIcon: {
        marginRight: 8
    },
    sportBtnActive: {
        backgroundColor: COLORS.primary.accent
    },
    sportText: {
        color: THEME_COLORS.textSecondary,
        fontSize: 15,
        fontWeight: '500'
    },
    sportTextActive: {
        color: '#000',
        fontSize: 15,
        fontWeight: '600'
    },
    matchToggles: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: THEME_COLORS.background,
        gap: 12
    },
    segmentBtn: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden'
    },
    segmentBtnActive: {
        backgroundColor: COLORS.primary.accent
    },
    segGrad: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        alignItems: 'center',
        borderRadius: 12
    },
    segTxt: {
        color: THEME_COLORS.textSecondary,
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(26,26,26,0.5)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)'
    },
    segTxtActive: {
        color: '#000',
        fontSize: 14,
        fontWeight: '600'
    },
    main: {
        flex: 1,
        position: 'relative'
    },
    mapWrap: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        zIndex: 1
    },
    map: {
        flex: 1
    },
    panel: {
        position: 'absolute',
        top: -panelGap,
        left: 0,
        right: 0,
        height: bodyH + headerH,
        backgroundColor: THEME_COLORS.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 184, 0, 0.1)',
        zIndex: 2,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: -4},
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 16
    },
    panelTop: {
        paddingVertical: 8,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 184, 0, 0.1)',
        height: panelHeaderH,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20
    },
    panelHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 184, 0, 0.2)',
        marginTop: 8
    },
    panelMini: {
        alignItems: 'center',
        paddingVertical: 12
    },
    panelMiniTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginBottom: 4
    },
    panelMiniText: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary
    },
    listPad: {
        paddingBottom: 220,
        paddingTop: 20,
        paddingHorizontal: 16
    },
    locBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
        borderRadius: 12,
        overflow: 'hidden',
        zIndex: 12,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 5
    },
    locInner: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
        borderRadius: 12
    },
    mapBtn: {
        position: 'absolute',
        bottom: 110,
        alignSelf: 'center',
        zIndex: 11,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3
    },
    mapBtnBox: {
        borderRadius: 24,
        overflow: 'hidden'
    },
    mapBtnGrad: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10
    },
    mapBtnTxt: {
        color: '#000',
        marginLeft: 6,
        fontSize: 15,
        fontWeight: '600'
    },
    createBtn: {
        position: 'absolute',
        zIndex: 12,
        bottom: 102,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5
    },
    createGrad: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center'
    },
    emptyWrap: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40
    },
    emptyTitle: {
        color: THEME_COLORS.textPrimary,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8
    },
    emptyText: {
        color: THEME_COLORS.textSecondary,
        textAlign: 'center',
        fontSize: 16,
        marginBottom: 16
    },
    resetFiltersButton: {
        backgroundColor: 'rgba(255, 184, 0, 0.1)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.2)',
    },
    resetFiltersText: {
        color: COLORS.primary.accent,
        fontWeight: '600',
        fontSize: 14
    },
    loadingOverlay: {
        position: 'absolute',
        top: panelHeaderH,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 20,
        alignItems: 'center',
        zIndex: 100,
        borderRadius: 8
    },
    loadingText: {
        color: THEME_COLORS.textPrimary,
        marginTop: 8,
        fontSize: 14
    },
    comingSoonBadge: {
        position: 'absolute',
        right: 0,
        top: 0,
        backgroundColor: 'rgba(255, 184, 0, 0.2)',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        margin: 8,
    },
    comingSoonText: {
        color: COLORS.primary.accent,
        fontSize: 10,
        fontWeight: '600',
    },
    disabledSportBtn: {
        opacity: 0.7,
    },
    disabledText: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 15,
        fontWeight: '500',
    }
});