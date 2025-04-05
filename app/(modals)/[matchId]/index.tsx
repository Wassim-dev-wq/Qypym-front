import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Linking,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {t} from "@/src/constants/locales";
import {useMatchDetails} from "@/src/core/api/matches/matchesHooks";
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MapView, {Marker} from 'react-native-maps';
import TeamsList from "@/app/(modals)/components/teamsList";
import {MatchFeedbackButton} from "@/app/(modals)/components/MatchFeedbackButton";
import {chatService} from "@/src/core/api/chatService";
import {useAuth} from "@/src/core/api/auth/useAuth";
import {MatchTeamResponse} from '@/src/types/match/matchDetails';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

interface Coordinates {
    latitude: number;
    longitude: number;
}

interface Location {
    address: string;
    coordinates: Coordinates;
}

interface Weather {
    condition: string;
    temperature: number;
    humidity: number;
    windSpeed: number;
    cloudCoverage?: number;
}

interface JoinRequest {
    id: string;
    userId: string;
    preferredTeamId: string;
    requestStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELED' | 'LEFT' | 'NOT_REQUESTED';
}

interface Match {
    id: string;
    title: string;
    startDate: string;
    duration: number;
    status: string;
    creatorId: string;
    saved: boolean;
    teams?: MatchTeamResponse[];
    location?: Location;
    weather?: Weather;
    codeExpiryTime?: string;
}

interface FloatingChatButtonProps {
    match: Match;
    joinRequest: JoinRequest | null;
    source?: string;
}

interface SectionHeaderProps {
    icon: string;
    title: string;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

interface WeatherDetailProps {
    match: Match;
}

interface LocationMapProps {
    match: Match;
}

interface VerificationCodeSectionProps {
    verificationCode: string;
    setVerificationCode: (code: string) => void;
    isSubmittingCode: boolean;
    codeError: string;
    handleVerifyPresence: () => void;
}

interface MatchStatusBadgeProps {
    status: string;
}

interface TeamModalProps {
    isVisible: boolean;
    onClose: () => void;
    teams: MatchTeamResponse[];
    selectedTeam: MatchTeamResponse | null;
    onSelectTeam: (team: MatchTeamResponse) => void;
    onSubmit: (data: JoinRequestFormData) => void;
    isLoading?: boolean;
}

interface JoinRequestFormData {
    teamId: string;
    position: string;
    experience: string;
    personalNote: string;
    isAvailable: boolean;
}

interface SectionState {
    teams: boolean;
    weather: boolean;
    location: boolean;
}

const useAnimations = () => {
    const scrollY = useRef(new Animated.Value(0)).current;
    const likeScale = useRef(new Animated.Value(1)).current;
    const fadeIn = useRef(new Animated.Value(0)).current;
    const slideUp = useRef(new Animated.Value(50)).current;

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
            Animated.timing(fadeIn, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true
            }),
            Animated.timing(slideUp, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true
            })
        ]).start();
    }, [fadeIn, slideUp]);

    const animateLike = useCallback(() => {
        Animated.sequence([
            Animated.timing(likeScale, {
                toValue: 1.4,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.spring(likeScale, {
                toValue: 1,
                friction: 3,
                useNativeDriver: true,
            }),
        ]).start();
    }, [likeScale]);

    return {
        scrollY,
        likeScale,
        fadeIn,
        slideUp,
        headerOpacity,
        headerScale,
        animateLike,
    };
};

const useVerificationCode = (matchId: string) => {
    const [verificationCode, setVerificationCode] = useState('');
    const [isSubmittingCode, setIsSubmittingCode] = useState(false);
    const [codeError, setCodeError] = useState('');
    const [codeSuccess, setCodeSuccess] = useState(false);

    const handleVerifyPresence = useCallback(() => {
        if (!verificationCode.trim()) {
            setCodeError(t('pleaseEnterCode'));
            return;
        }
        setIsSubmittingCode(true);
        setCodeError('');
        setTimeout(() => {
            if (verificationCode === "123456") {
                setCodeSuccess(true);
                setVerificationCode('');
            } else {
                setCodeError(t('invalidVerificationCode'));
            }
            setIsSubmittingCode(false);
        }, 1500);
    }, [verificationCode]);

    return {
        verificationCode,
        setVerificationCode,
        isSubmittingCode,
        codeError,
        codeSuccess,
        setCodeSuccess,
        handleVerifyPresence
    };
};

const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({match, joinRequest, source}) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    if (joinRequest?.requestStatus !== 'ACCEPTED') {
        return null;
    }

    const navigateToMatchChat = useCallback(async () => {
        try {
            setIsLoading(true);
            const chatRoom = await chatService.getMatchChatRoom(match.id);
            if (source !== 'chat') {
                router.navigate({
                    pathname: "/(modals)/chat/[id]",
                    params: {
                        id: chatRoom.id,
                        participants: JSON.stringify(chatRoom.participants)
                    }
                });
            } else {
                router.back();
            }
        } catch (error) {
            console.error('Error navigating to chat:', error);
            Alert.alert(t('error'), t('unableToNavigateToChat'));
        } finally {
            setIsLoading(false);
        }
    }, [match, router, source]);

    return (
        <Animated.View
            style={styles.floatingChatButton}
            entering={Animated.spring({
                velocity: 3,
                bounciness: 6
            })}
        >
            <TouchableOpacity
                onPress={navigateToMatchChat}
                activeOpacity={0.8}
                disabled={isLoading}
            >
                <LinearGradient
                    colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                    style={styles.floatingChatGradient}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#000"/>
                    ) : (
                        <MaterialCommunityIcons name="chat" size={24} color="#000"/>
                    )}
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

const SectionHeader: React.FC<SectionHeaderProps> = ({
                                                         icon,
                                                         title,
                                                         expanded,
                                                         onToggle,
                                                         children
                                                     }) => {
    return (
        <View style={styles.sectionContainer}>
            <TouchableOpacity
                style={[styles.collapsibleHeader, {marginBottom: expanded ? 12 : 0}]}
                onPress={onToggle}
                activeOpacity={0.7}
            >
                <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons
                        name={icon as string}
                        size={24}
                        color={COLORS.primary.accent}
                    />
                    <Text style={styles.sectionTitle}>{title}</Text>
                </View>
                <MaterialCommunityIcons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={24}
                    color={THEME_COLORS.textSecondary}
                />
            </TouchableOpacity>
            {expanded && children}
        </View>
    );
};

const WeatherDetail: React.FC<WeatherDetailProps> = ({match}) => {
    const getWeatherIcon = (condition: string) => {
        const main = (condition || '').toLowerCase();
        switch (main) {
            case 'thunderstorm':
                return 'weather-lightning';
            case 'drizzle':
            case 'rain':
                return 'weather-rainy';
            case 'snow':
                return 'weather-snowy';
            case 'clear':
                return 'weather-sunny';
            case 'clouds':
                return 'weather-cloudy';
            case 'mist':
            case 'smoke':
            case 'fog':
            case 'haze':
                return 'weather-fog';
            default:
                return 'weather-cloudy';
        }
    };

    if (!match.weather) return null;

    return (
        <View style={styles.weatherCard}>
            <LinearGradient
                colors={['rgba(26,26,26,0.9)', 'rgba(17,17,17,0.8)']}
                style={styles.weatherCardGradient}
            >
                <View style={styles.weatherMainInfo}>
                    <MaterialCommunityIcons
                        name={getWeatherIcon(match.weather.condition)}
                        size={48}
                        color={COLORS.primary.accent}
                    />
                    <View style={styles.weatherMainText}>
                        <Text style={styles.weatherTemperature}>
                            {match.weather.temperature}°C
                        </Text>
                        <Text style={styles.weatherCondition}>
                            {match.weather.condition}
                        </Text>
                    </View>
                </View>

                <View style={styles.weatherDetailsContainer}>
                    <View style={styles.weatherDetailItem}>
                        <MaterialCommunityIcons
                            name="water-percent"
                            size={22}
                            color={THEME_COLORS.textSecondary}
                        />
                        <Text style={styles.weatherDetailValue}>
                            {match.weather.humidity}%
                        </Text>
                        <Text style={styles.weatherDetailLabel}>
                            {t('humidity')}
                        </Text>
                    </View>

                    <View style={styles.weatherDetailItem}>
                        <MaterialCommunityIcons
                            name="weather-windy"
                            size={22}
                            color={THEME_COLORS.textSecondary}
                        />
                        <Text style={styles.weatherDetailValue}>
                            {match.weather.windSpeed} km/h
                        </Text>
                        <Text style={styles.weatherDetailLabel}>
                            {t('wind')}
                        </Text>
                    </View>

                    <View style={styles.weatherDetailItem}>
                        <MaterialCommunityIcons
                            name="cloud"
                            size={22}
                            color={THEME_COLORS.textSecondary}
                        />
                        <Text style={styles.weatherDetailValue}>
                            {match.weather.cloudCoverage ?? 0}%
                        </Text>
                        <Text style={styles.weatherDetailLabel}>
                            {t('clouds')}
                        </Text>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
};

const LocationMap: React.FC<LocationMapProps> = ({match}) => {
    const [mapReady, setMapReady] = useState(false);
    const [mapError, setMapError] = useState(false);

    const openDirections = useCallback(() => {
        if (!match.location) return;

        const {latitude, longitude} = match.location.coordinates;
        const address = encodeURIComponent(match.location.address);
        const url = Platform.select({
            ios: `maps://maps.apple.com/?daddr=${latitude},${longitude}&q=${address}`,
            android: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${address}`,
            default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
        });

        Linking.canOpenURL(url)
            .then(supported => {
                if (supported) {
                    return Linking.openURL(url);
                } else {
                    return Linking.openURL(
                        `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
                    );
                }
            })
            .catch(err => {
                console.error('An error occurred', err);
                Alert.alert(t('error'), t('unableToOpenMaps'));
            });
    }, [match.location]);

    if (!match.location) return null;

    return (
        <View style={styles.mapContainer}>
            {!mapReady && !mapError && (
                <View style={[styles.map, styles.mapLoadingContainer]}>
                    <ActivityIndicator size="large" color={COLORS.primary.accent}/>
                    <Text style={styles.mapLoadingText}>{t('loadingMap')}</Text>
                </View>
            )}

            {mapError && (
                <View style={[styles.map, styles.mapErrorContainer]}>
                    <MaterialCommunityIcons
                        name="map-marker-off"
                        size={32}
                        color={THEME_COLORS.error}
                    />
                    <Text style={styles.mapErrorText}>{t('mapLoadError')}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => setMapError(false)}
                    >
                        <Text style={styles.retryButtonText}>{t('retry')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!mapError && (
                <MapView
                    style={styles.map}
                    region={{
                        latitude: match.location.coordinates.latitude,
                        longitude: match.location.coordinates.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                    onMapReady={() => setMapReady(true)}
                    onError={() => setMapError(true)}
                    zoomEnabled={true}
                    pitchEnabled={false}
                    rotateEnabled={false}
                >
                    <Marker
                        coordinate={{
                            latitude: match.location.coordinates.latitude,
                            longitude: match.location.coordinates.longitude,
                        }}
                        title={match.title}
                        description={match.location.address}
                    >
                        <View style={styles.customMarker}>
                            <MaterialCommunityIcons name="soccer" size={18} color="#000"/>
                        </View>
                    </Marker>
                </MapView>
            )}

            <View style={styles.attributionContainer}>
                <Text style={styles.attributionText}>© OpenStreetMap contributors</Text>
            </View>

            <View style={styles.addressContainer}>
                <MaterialCommunityIcons
                    name="map-marker"
                    size={16}
                    color="#FFFFFF"
                    style={styles.addressIcon}
                />
                <Text style={styles.addressText}>{match.location.address}</Text>
            </View>

            <TouchableOpacity
                style={styles.directionsButton}
                onPress={openDirections}
            >
                <MaterialCommunityIcons
                    name="directions"
                    size={18}
                    color="#000"
                    style={styles.directionsIcon}
                />
                <Text style={styles.directionsText}>{t('getDirections')}</Text>
            </TouchableOpacity>
        </View>
    );
};

const VerificationCodeSection: React.FC<VerificationCodeSectionProps> = ({
                                                                             verificationCode,
                                                                             setVerificationCode,
                                                                             isSubmittingCode,
                                                                             codeError,
                                                                             handleVerifyPresence
                                                                         }) => {
    return (
        <View style={styles.verificationContainer}>
            <View style={styles.verificationHeader}>
                <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={20}
                    color={COLORS.primary.accent}
                />
                <Text style={styles.verificationTitle}>
                    {t('presenceVerification')}
                </Text>
            </View>

            <Text style={styles.verificationInfo}>
                {t('enterVerificationCode')}
            </Text>

            <View style={styles.codeInputContainer}>
                <TextInput
                    style={styles.codeInput}
                    placeholder={t('verificationCodePlaceholder')}
                    placeholderTextColor={THEME_COLORS.textPlaceholder}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    maxLength={6}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <TouchableOpacity
                    style={[
                        styles.verifyButton,
                        (!verificationCode.trim() || isSubmittingCode) && styles.buttonDisabled
                    ]}
                    onPress={handleVerifyPresence}
                    disabled={!verificationCode.trim() || isSubmittingCode}
                >
                    {isSubmittingCode ? (
                        <ActivityIndicator size="small" color="#000"/>
                    ) : (
                        <Text style={styles.verifyButtonText}>{t('verify')}</Text>
                    )}
                </TouchableOpacity>
            </View>

            {codeError ? (
                <Text style={styles.codeErrorText}>{codeError}</Text>
            ) : null}
        </View>
    );
};

const MatchStatusBadge: React.FC<MatchStatusBadgeProps> = ({status}) => {
    const getStatusColor = () => {
        switch (status) {
            case 'FINISHED':
                return {bg: 'rgba(74, 222, 128, 0.2)', color: '#4ade80'};
            case 'CANCELLED':
                return {bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444'};
            case 'IN_PROGRESS':
                return {bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6'};
            default:
                return {bg: 'rgba(0, 0, 0, 0.15)', color: '#000'};
        }
    };

    const statusStyle = getStatusColor();

    return (
        <View style={[styles.statusBadge, {backgroundColor: statusStyle.bg}]}>
            <Text style={[styles.statusBadgeText, {color: statusStyle.color}]}>
                {status}
            </Text>
        </View>
    );
};

const TeamModal: React.FC<TeamModalProps> = ({
                                                 isVisible,
                                                 onClose,
                                                 teams,
                                                 selectedTeam,
                                                 onSelectTeam,
                                                 onSubmit,
                                                 isLoading = false
                                             }) => {
    const [position, setPosition] = useState('');
    const [experience, setExperience] = useState('intermediate');
    const [personalNote, setPersonalNote] = useState('');
    const [isAvailable, setIsAvailable] = useState(false);

    useEffect(() => {
        if (!isVisible) {
            setPosition('');
            setExperience('intermediate');
            setPersonalNote('');
            setIsAvailable(false);
        }
    }, [isVisible]);

    const experienceLabels = {
        beginner: t('beginner'),
        intermediate: t('intermediate'),
        advanced: t('advanced'),
    };

    const getPositionIcon = (pos: string): string => {
        switch (pos) {
            case 'Gardien':
                return 'handball';
            case 'Défenseur':
                return 'shield-account';
            case 'Milieu':
                return 'soccer-field';
            case 'Attaquant':
                return 'run-fast';
            default:
                return 'account-question-outline';
        }
    };

    const handleFormSubmit = useCallback(() => {
        if (!position) {
            Alert.alert(t('positionRequiredTitle'), t('positionRequiredMessage'));
            return;
        }

        if (!isAvailable) {
            Alert.alert(t('availabilityRequiredTitle'), t('availabilityRequiredMessage'));
            return;
        }

        const finalTeamId = selectedTeam
            ? selectedTeam.id
            : teams.length === 1 ? teams[0].id : null;

        if (!finalTeamId) {
            Alert.alert(t('teamMissingTitle'), t('teamMissingMessage'));
            return;
        }

        onSubmit({
            teamId: finalTeamId,
            position,
            experience,
            personalNote,
            isAvailable,
        });
    }, [position, isAvailable, selectedTeam, teams, experience, personalNote, onSubmit]);

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <LinearGradient
                        colors={['rgba(26,26,26,0.99)', 'rgba(17,17,17,0.95)']}
                        style={styles.modalGradient}
                    >
                        <Text style={styles.modalTitle}>{t('joinTeam')}</Text>
                        {teams.length > 1 && !selectedTeam && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>{t('teamSelection')}</Text>
                                {teams.map((team) => (
                                    <TouchableOpacity
                                        key={team.id}
                                        style={[
                                            styles.teamOption,
                                            team.currentPlayers >= team.maxPlayers && styles.teamOptionDisabled,
                                        ]}
                                        onPress={() => onSelectTeam(team)}
                                        disabled={team.currentPlayers >= team.maxPlayers}
                                    >
                                        <View style={styles.teamOptionContent}>
                                            <MaterialCommunityIcons
                                                name="account-group"
                                                size={20}
                                                color={COLORS.primary.accent}
                                                style={styles.teamIcon}
                                            />
                                            <Text style={styles.teamName}>
                                                {t('teamOption', {
                                                    name: team.name,
                                                    current: team.currentPlayers,
                                                    max: team.maxPlayers,
                                                })}
                                            </Text>
                                            {team.currentPlayers >= team.maxPlayers && (
                                                <View style={styles.teamFullBadge}>
                                                    <Text style={styles.teamFullLabel}>{t('teamFull')}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        {(selectedTeam || (teams.length === 1 && !selectedTeam)) && (
                            <ScrollView
                                style={styles.form}
                                contentContainerStyle={{paddingBottom: 100}}
                                showsVerticalScrollIndicator={false}
                            >
                                <View style={styles.selectedTeamContainer}>
                                    <LinearGradient
                                        colors={['rgba(255, 184, 0, 0.2)', 'rgba(255, 184, 0, 0.05)']}
                                        style={styles.selectedTeamBadge}
                                    >
                                        <Text style={styles.selectedTeamText}>
                                            {t('selectedTeam', {name: selectedTeam ? selectedTeam.name : teams[0].name})}
                                        </Text>
                                    </LinearGradient>
                                </View>

                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>{t('preferredPosition')}</Text>
                                    <View style={styles.positionGrid}>
                                        {['Gardien', 'Défenseur', 'Milieu', 'Attaquant'].map((pos) => (
                                            <TouchableOpacity
                                                key={pos}
                                                style={[
                                                    styles.positionButton,
                                                    position === pos && styles.positionButtonSelected,
                                                ]}
                                                onPress={() => setPosition(pos)}
                                            >
                                                <MaterialCommunityIcons
                                                    name={getPositionIcon(pos)}
                                                    size={20}
                                                    color={position === pos ? '#FFF' : THEME_COLORS.textSecondary}
                                                />
                                                <Text style={[
                                                    styles.positionText,
                                                    position === pos && styles.positionTextSelected
                                                ]}>
                                                    {pos}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>{t('experienceLevel')}</Text>
                                    <View style={styles.experienceContainer}>
                                        {Object.entries(experienceLabels).map(([val, label]) => (
                                            <TouchableOpacity
                                                key={val}
                                                style={[
                                                    styles.experienceOption,
                                                    experience === val && styles.experienceOptionSelected
                                                ]}
                                                onPress={() => setExperience(val)}
                                            >
                                                <MaterialCommunityIcons
                                                    name={experience === val ? 'radiobox-marked' : 'radiobox-blank'}
                                                    size={20}
                                                    color={experience === val ? COLORS.primary.accent : THEME_COLORS.textSecondary}
                                                />
                                                <Text style={[
                                                    styles.experienceLabel,
                                                    experience === val && styles.experienceLabelSelected
                                                ]}>
                                                    {label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>{t('personalNote')}</Text>
                                    <View style={styles.noteContainer}>
                                        <TextInput
                                            style={styles.noteInput}
                                            placeholder={t('personalNotePlaceholder')}
                                            placeholderTextColor={THEME_COLORS.textPlaceholder}
                                            multiline
                                            maxLength={200}
                                            value={personalNote}
                                            onChangeText={setPersonalNote}
                                        />
                                        <Text style={styles.noteCount}>{personalNote.length}/200</Text>
                                    </View>
                                </View>

                                <View style={styles.section}>
                                    <TouchableOpacity
                                        style={styles.checkboxRow}
                                        onPress={() => setIsAvailable(!isAvailable)}
                                    >
                                        <MaterialCommunityIcons
                                            name={isAvailable ? 'checkbox-marked' : 'checkbox-blank-outline'}
                                            size={24}
                                            color={COLORS.primary.accent}
                                        />
                                        <Text style={styles.checkboxLabel}>{t('confirmAvailability')}</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity
                                        style={[
                                            styles.submitButton,
                                            (!position || !isAvailable || isLoading) && styles.submitButtonDisabled,
                                        ]}
                                        onPress={handleFormSubmit}
                                        disabled={!position || !isAvailable || isLoading}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator size="small" color="#000"/>
                                        ) : (
                                            <Text style={styles.submitButtonText}>{t('sendRequest')}</Text>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={onClose}
                                        disabled={isLoading}
                                    >
                                        <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </LinearGradient>
                </View>
            </View>
        </Modal>
    );
};

const MatchDetailsScreen: React.FC = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const {matchId} = useLocalSearchParams<{ matchId: string }>();
    const params = useLocalSearchParams();
    const source = params.source as string;
    const matchIdSafe = matchId || '';
    const {user} = useAuth();

    const [sections, setSections] = useState<SectionState>({
        teams: true,
        weather: true,
        location: true
    });

    const {
        scrollY,
        likeScale,
        fadeIn,
        slideUp,
        headerOpacity,
        headerScale,
        animateLike
    } = useAnimations();

    const {
        verificationCode,
        setVerificationCode,
        isSubmittingCode,
        codeError,
        codeSuccess,
        setCodeSuccess,
        handleVerifyPresence
    } = useVerificationCode(matchIdSafe);

    const {
        match,
        joinRequest,
        isLoading,
        isError,
        toggleSave,
        joinMatch,
        cancelJoin,
        isSaving,
        isJoining,
        isCancelling,
        isLeaving,
        leaveMatch
    } = useMatchDetails(matchIdSafe);

    const [isTeamModalVisible, setTeamModalVisible] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<MatchTeamResponse | null>(null);
    useEffect(() => {
        if (!isLoading && match && user && match.creatorId === user.id) {
            router.replace({
                pathname: '/(modals)/[matchId]/manage',
                params: {matchId: match.id}
            });
        }
    }, [isLoading, match, user, router, matchIdSafe]);

    const formatDate = (date: string) => {
        const dateObj = new Date(date);
        return dateObj.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    };

    const formatTime = (date: string) => {
        const dateObj = new Date(date);
        return dateObj.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleScroll = (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        scrollY.setValue(offsetY);
    };

    const handleShare = useCallback(async () => {
        if (!match) return;
        try {
            const universalLink = `https://qypym.fr/matches/${match.id}`;
            const shareMessage = t('shareMessage', {
                title: match.title,
                date: formatDate(match.startDate),
                time: formatTime(match.startDate),
                address: match.location?.address || ''
            });
            await Share.share({
                message: shareMessage,
                url: universalLink
            }, {
                dialogTitle: t('shareMatch')
            });
        } catch (err) {
            console.error(t('shareError'), err);
            Alert.alert(t('error'), t('shareError'));
        }
    }, [match]);

    const handleSave = useCallback(() => {
        if (!match || isSaving) return;
        animateLike();
        toggleSave(match.saved);
    }, [match, isSaving, toggleSave, animateLike]);

    const handleJoinRequest = useCallback(() => {
        if (!match?.teams || match.teams.length === 0) {
            Alert.alert(t('error'), t('noTeamAvailable'));
            return;
        }

        if (match.teams.length === 1) {
            const singleTeam = match.teams[0];
            if (singleTeam.currentPlayers >= singleTeam.maxPlayers) {
                Alert.alert(t('teamFullTitle'), t('teamFullMessage'));
                return;
            }
            setSelectedTeam(singleTeam);
            setTeamModalVisible(true);
            return;
        }

        setSelectedTeam(null);
        setTeamModalVisible(true);
    }, [match]);

    const handleSelectTeam = useCallback((team: MatchTeamResponse) => {
        if (team.currentPlayers >= team.maxPlayers) {
            Alert.alert(t('teamFullTitle'), t('teamFullMessage'));
            return;
        }
        setSelectedTeam(team);
    }, []);

    const handleSubmitJoinRequest = useCallback((payload: JoinRequestFormData) => {
        joinMatch({
            preferredTeamId: payload.teamId,
            position: payload.position,
            experience: payload.experience,
            personalNote: payload.personalNote,
            available: payload.isAvailable,
            message: '',
        }, {
            onSuccess: () => {
                setTeamModalVisible(false);
                Alert.alert(
                    t('joinRequestSentTitle'),
                    t('joinRequestSentMessage', {team: selectedTeam?.name})
                );
            },
            onError: (error) => {
                console.error('Error joining match:', error);
                Alert.alert(t('error'), t('joinRequestError'));
            }
        });
    }, [joinMatch, selectedTeam]);

    const handleCancelRequest = useCallback(() => {
        Alert.alert(
            t('cancelJoinRequestTitle'),
            t('cancelJoinRequestMessage'),
            [
                {text: t('no'), style: 'cancel'},
                {
                    text: t('yes'),
                    style: 'destructive',
                    onPress: () => {
                        if (joinRequest?.id) {
                            cancelJoin(joinRequest.id, {
                                onSuccess: () => {
                                    Alert.alert(t('joinRequestCancelledTitle'), t('joinRequestCancelledMessage'));
                                },
                                onError: (error) => {
                                    console.error('Error cancelling request:', error);
                                    Alert.alert(t('error'), t('cancelRequestError'));
                                }
                            });
                        }
                    }
                },
            ]
        );
    }, [cancelJoin, joinRequest]);

    const handleLeaveMatch = useCallback(() => {
        Alert.alert(
            t('leaveMatchTitle'),
            t('leaveMatchMessage'),
            [
                {text: t('no'), style: 'cancel'},
                {
                    text: t('yes'),
                    style: 'destructive',
                    onPress: () => {
                        if (joinRequest?.id) {
                            leaveMatch(joinRequest.id, {
                                onSuccess: () => {
                                    Alert.alert(t('matchLeftTitle'), t('matchLeftMessage'));
                                },
                                onError: (error) => {
                                    console.error('Error leaving match:', error);
                                    Alert.alert(t('error'), t('leaveMatchError'));
                                }
                            });
                        }
                    }
                },
            ]
        );
    }, [leaveMatch, joinRequest]);

    const toggleSection = (section: keyof SectionState) => {
        setSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
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
                <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={60}
                    color={THEME_COLORS.error}
                />
                <Text style={styles.errorTitle}>{t('errorOccurred')}</Text>
                <Text style={styles.errorText}>{t('loadErrorMatch')}</Text>
                <TouchableOpacity
                    style={styles.errorButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.errorButtonText}>{t('back')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View
                style={[
                    styles.header,
                    {
                        paddingTop: insets.top > 0 ? insets.top : Platform.OS === 'android' ? 32 : 10,
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
                    <MaterialCommunityIcons
                        name="chevron-left"
                        size={26}
                        color={THEME_COLORS.textPrimary}
                    />
                </TouchableOpacity>

                <View style={styles.titleWrapper}>
                    <Text style={styles.titleText} numberOfLines={1}>
                        {match.title}
                    </Text>
                </View>

                <View style={styles.headerActions}>
                    <TouchableOpacity
                        onPress={handleShare}
                        style={styles.actionButton}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons
                            name="share-variant"
                            size={22}
                            color={THEME_COLORS.textPrimary}
                        />
                    </TouchableOpacity>

                    <Animated.View style={{transform: [{scale: likeScale}]}}>
                        <TouchableOpacity
                            onPress={handleSave}
                            style={[
                                styles.actionButton,
                                match.saved && styles.savedButton,
                            ]}
                            disabled={isSaving}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons
                                name={match.saved ? 'bookmark' : 'bookmark-outline'}
                                size={22}
                                color={match.saved ? COLORS.primary.accent : THEME_COLORS.textPrimary}
                            />
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </Animated.View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
            >
                <Animated.View style={{
                    opacity: fadeIn,
                    transform: [{translateY: slideUp}]
                }}>
                    <View style={styles.heroSection}>
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
                                    <Text style={styles.dateText}>
                                        {formatDate(match.startDate)}
                                    </Text>
                                    <Text style={styles.timeText}>
                                        {formatTime(match.startDate)} • {match.duration} min
                                    </Text>
                                </View>
                            </View>

                            <MatchStatusBadge status={match.status}/>
                        </LinearGradient>
                    </View>

                    {match.location?.coordinates && (
                        <SectionHeader
                            icon="map-marker"
                            title={t('location')}
                            expanded={sections.location}
                            onToggle={() => toggleSection('location')}
                        >
                            <LocationMap match={match}/>
                        </SectionHeader>
                    )}

                    {joinRequest?.requestStatus === 'ACCEPTED' && match?.codeExpiryTime && !codeSuccess && (
                        <VerificationCodeSection
                            verificationCode={verificationCode}
                            setVerificationCode={setVerificationCode}
                            isSubmittingCode={isSubmittingCode}
                            codeError={codeError}
                            handleVerifyPresence={handleVerifyPresence}
                        />
                    )}

                    {joinRequest?.requestStatus === 'ACCEPTED' && match?.codeExpiryTime && codeSuccess && (
                        <View style={styles.verificationSuccessContainer}>
                            <MaterialCommunityIcons
                                name="check-circle"
                                size={24}
                                color="#4ade80"
                            />
                            <Text style={styles.verificationSuccessText}>
                                {t('presenceVerified')}
                            </Text>
                        </View>
                    )}

                    {match.teams && match.teams.length > 0 && (
                        <SectionHeader
                            icon="account-group"
                            title={t('teams')}
                            expanded={sections.teams}
                            onToggle={() => toggleSection('teams')}
                        >
                            <TeamsList
                                teams={match.teams}
                                joinRequest={joinRequest}
                                isCreator={false}
                                userId={match.creatorId}
                                router={router}
                                t={t}
                            />
                        </SectionHeader>
                    )}

                    {match.weather && match.status !== 'FINISHED' && (
                        <SectionHeader
                            icon="weather-partly-cloudy"
                            title={t('weatherForecast')}
                            expanded={sections.weather}
                            onToggle={() => toggleSection('weather')}
                        >
                            <WeatherDetail match={match}/>
                        </SectionHeader>
                    )}

                    <View style={{height: 100}}/>
                </Animated.View>
            </ScrollView>

            {match.status === 'FINISHED' ? (
                <MatchFeedbackButton
                    matchId={match.id}
                    isFinished={true}
                />
            ) : (
                <Animated.View
                    style={[
                        styles.footer,
                        {
                            paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
                            opacity: fadeIn,
                            transform: [{translateY: Animated.multiply(slideUp, -0.5)}]
                        }
                    ]}
                >
                    {joinRequest?.requestStatus === 'PENDING' && (
                        <Text style={styles.footerNote}>
                            {t('pendingRequest', {
                                team: match?.teams?.find((t) => t.id === joinRequest.preferredTeamId)?.name,
                            })}
                        </Text>
                    )}
                    {joinRequest?.requestStatus === 'ACCEPTED' && (
                        <Text style={styles.footerNoteSuccess}>
                            {t('acceptedRequest', {
                                team: match?.teams?.find((t) => t.id === joinRequest.preferredTeamId)?.name,
                            })}
                        </Text>
                    )}
                    {joinRequest?.requestStatus === 'DECLINED' && (
                        <Text style={styles.footerNoteError}>
                            {t('declinedRequest')}
                        </Text>
                    )}
                    {joinRequest?.requestStatus === 'CANCELED' && (
                        <Text style={styles.footerNote}>
                            {t('canceledRequest')}
                        </Text>
                    )}
                    {joinRequest?.requestStatus === 'LEFT' && (
                        <Text style={styles.footerNoteError}>
                            {t('matchLeftDesc')}
                        </Text>
                    )}

                    {!joinRequest || joinRequest.requestStatus === 'CANCELED' || joinRequest?.requestStatus === 'NOT_REQUESTED' ? (
                        <TouchableOpacity
                            style={[styles.joinButton, isJoining && styles.buttonDisabled]}
                            onPress={handleJoinRequest}
                            disabled={isJoining}
                            activeOpacity={0.8}
                        >
                            {isJoining ? (
                                <ActivityIndicator size="small" color="#000"/>
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="hand-wave" size={20} color="#000"/>
                                    <Text style={styles.joinButtonText}>
                                        {joinRequest?.requestStatus === 'CANCELED' ? t('requestAgain') : t('joinMatch')}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    ) : joinRequest.requestStatus === 'PENDING' ? (
                        <TouchableOpacity
                            style={[styles.cancelRequestButton, isCancelling && styles.buttonDisabled]}
                            onPress={handleCancelRequest}
                            disabled={isCancelling}
                            activeOpacity={0.8}
                        >
                            {isCancelling ? (
                                <ActivityIndicator size="small" color={THEME_COLORS.error}/>
                            ) : (
                                <Text style={styles.cancelRequestText}>
                                    {t('cancelRequest')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    ) : joinRequest.requestStatus === 'ACCEPTED' ? (
                        <TouchableOpacity
                            style={[styles.leaveMatchButton, isLeaving && styles.buttonDisabled]}
                            onPress={handleLeaveMatch}
                            disabled={isLeaving}
                            activeOpacity={0.8}
                        >
                            {isLeaving ? (
                                <ActivityIndicator size="small" color={THEME_COLORS.error}/>
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="exit-to-app" size={20} color={THEME_COLORS.error}/>
                                    <Text style={styles.cancelRequestText}>
                                        {t('leaveMatch')}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    ) : joinRequest.requestStatus === 'DECLINED' ? (
                        <View style={styles.declinedContainer}>
                            <MaterialCommunityIcons name="close-circle" size={20} color={THEME_COLORS.error}/>
                            <Text style={styles.declinedText}>
                                {t('requestDeclined')}
                            </Text>
                        </View>
                    ) : null}
                </Animated.View>
            )}

            <TeamModal
                isVisible={isTeamModalVisible}
                onClose={() => setTeamModalVisible(false)}
                teams={match.teams || []}
                selectedTeam={selectedTeam}
                onSelectTeam={handleSelectTeam}
                onSubmit={handleSubmitJoinRequest}
                isLoading={isJoining}
            />

            {joinRequest?.requestStatus === 'ACCEPTED' && (
                <FloatingChatButton
                    match={match}
                    joinRequest={joinRequest}
                    source={source}
                />
            )}
        </SafeAreaView>
    );
};

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
    errorButton: {
        backgroundColor: THEME_COLORS.cardAccent,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    errorButtonText: {
        color: THEME_COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(10, 10, 10, 0.95)',
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
    floatingChatButton: {
        position: 'absolute',
        bottom: SCREEN_HEIGHT * 0.16,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.3,
        shadowRadius: 4,
        zIndex: 100,
    },
    floatingChatGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
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
        marginHorizontal: 12,
    },
    titleText: {
        fontSize: 18,
        fontWeight: '700',
        color: THEME_COLORS.textPrimary,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
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
    savedButton: {
        backgroundColor: 'rgba(255, 184, 0, 0.2)',
        borderColor: 'rgba(255, 184, 0, 0.3)',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: Platform.OS === 'ios' ? 60 : 80,
        paddingBottom: 20,
    },
    heroSection: {
        padding: 20,
    },
    mainTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
        marginBottom: 16,
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
        alignItems: 'center',
    },
    statusLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    timeText: {
        color: '#000',
        fontSize: 14,
        marginTop: 2,
        opacity: 0.8,
    },
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    sectionContainer: {
        marginHorizontal: 20,
        marginBottom: 24,
    },
    collapsibleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginLeft: 10,
    },
    mapContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        height: SCREEN_HEIGHT * 0.22,
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    customMarker: {
        backgroundColor: COLORS.primary.accent,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(0, 0, 0, 0.2)',
    },
    addressContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(10, 10, 10, 0.7)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    addressIcon: {
        marginRight: 6,
    },
    addressText: {
        color: '#FFFFFF',
        fontSize: 13,
        flex: 1,
    },
    directionsButton: {
        position: 'absolute',
        bottom: 42,
        right: 10,
        backgroundColor: COLORS.primary.accent,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    directionsIcon: {
        marginRight: 4,
    },
    directionsText: {
        color: '#000',
        fontWeight: '600',
        fontSize: 12,
    },
    mapLoadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(26,26,26,0.9)',
    },
    mapLoadingText: {
        marginTop: 10,
        color: THEME_COLORS.textSecondary,
        fontSize: 14,
    },
    mapErrorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(26,26,26,0.9)',
    },
    mapErrorText: {
        marginTop: 10,
        color: THEME_COLORS.error,
        fontSize: 14,
        marginBottom: 12,
    },
    retryButton: {
        backgroundColor: THEME_COLORS.cardAccent,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    retryButtonText: {
        color: THEME_COLORS.textPrimary,
        fontWeight: '600',
    },
    attributionContainer: {
        position: 'absolute',
        bottom: 30,
        right: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 2,
    },
    attributionText: {
        fontSize: 8,
        color: '#333',
    },
    weatherCard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    weatherCardGradient: {
        padding: 16,
    },
    weatherMainInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    weatherMainText: {
        marginLeft: 16,
    },
    weatherTemperature: {
        fontSize: 28,
        fontWeight: '700',
        color: THEME_COLORS.textPrimary,
    },
    weatherCondition: {
        fontSize: 16,
        color: THEME_COLORS.textSecondary,
    },
    weatherDetailsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 16,
    },
    weatherDetailItem: {
        alignItems: 'center',
        width: '30%',
    },
    weatherDetailValue: {
        marginTop: 6,
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
    },
    weatherDetailLabel: {
        marginTop: 4,
        fontSize: 12,
        color: THEME_COLORS.textSecondary,
    },
    verificationContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'rgba(26,26,26,0.9)',
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 24,
        width: 'auto',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    verificationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    verificationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginLeft: 8,
    },
    verificationInfo: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
        marginBottom: 12,
    },
    codeInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    codeInput: {
        flex: 1,
        backgroundColor: 'rgba(38,38,38,0.9)',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: THEME_COLORS.textPrimary,
        marginRight: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        letterSpacing: 2,
    },
    verifyButton: {
        backgroundColor: COLORS.primary.accent,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    verifyButtonText: {
        color: '#000',
        fontWeight: '600',
        fontSize: 14,
    },
    codeErrorText: {
        color: THEME_COLORS.error,
        fontSize: 14,
        fontStyle: 'italic',
        marginTop: 4,
    },
    verificationSuccessContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(74, 222, 128, 0.2)',
    },
    verificationSuccessText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4ade80',
        marginLeft: 8,
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
        paddingTop: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: -3},
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 10,
    },
    footerNote: {
        marginBottom: 12,
        fontSize: 14,
        fontStyle: 'italic',
        color: THEME_COLORS.textSecondary,
        textAlign: 'center',
    },
    footerNoteSuccess: {
        marginBottom: 12,
        fontSize: 14,
        fontWeight: '500',
        color: '#4ade80',
        textAlign: 'center',
    },
    footerNoteError: {
        marginBottom: 12,
        fontSize: 14,
        fontWeight: '500',
        color: THEME_COLORS.error,
        textAlign: 'center',
    },
    joinButton: {
        backgroundColor: COLORS.primary.accent,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginBottom: 8,
    },
    joinButtonText: {
        color: '#000',
        fontWeight: '600',
        fontSize: 16,
        marginLeft: 8,
    },
    cancelRequestButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: THEME_COLORS.error,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 30,
        width: '100%',
        alignItems: 'center',
        marginBottom: 8,
    },
    cancelRequestText: {
        color: THEME_COLORS.error,
        fontWeight: '600',
        fontSize: 16,
    },
    leaveMatchButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: THEME_COLORS.error,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 30,
        width: '100%',
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 8,
    },
    declinedContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 30,
        width: '100%',
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 8,
    },
    declinedText: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.error,
        marginLeft: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        maxHeight: '90%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    modalGradient: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: THEME_COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: 20,
    },
    section: {
        marginBottom: 20,
    },
    selectedTeamContainer: {
        marginBottom: 16,
    },
    selectedTeamBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    selectedTeamText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary.accent,
    },
    teamOption: {
        backgroundColor: 'rgba(26,26,26,0.9)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    teamOptionDisabled: {
        opacity: 0.5,
    },
    teamOptionContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    teamIcon: {
        marginRight: 10,
    },
    teamName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
    },
    teamFullBadge: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    teamFullLabel: {
        fontSize: 12,
        color: THEME_COLORS.error,
        fontWeight: '600',
    },
    form: {
        marginTop: 8,
    },
    positionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    positionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(26,26,26,0.9)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    positionButtonSelected: {
        backgroundColor: COLORS.primary.accent,
        borderColor: COLORS.primary.accent,
    },
    positionText: {
        marginLeft: 8,
        color: THEME_COLORS.textSecondary,
        fontSize: 14,
    },
    positionTextSelected: {
        color: '#FFF',
    },
    experienceContainer: {
        backgroundColor: 'rgba(26,26,26,0.5)',
        borderRadius: 12,
        padding: 12,
    },
    experienceOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 6,
    },
    experienceOptionSelected: {
        backgroundColor: 'rgba(255, 184, 0, 0.1)',
        borderRadius: 8,
    },
    experienceLabel: {
        marginLeft: 8,
        fontSize: 15,
        color: THEME_COLORS.textSecondary,
    },
    experienceLabelSelected: {
        color: COLORS.primary.accent,
    },
    noteContainer: {
        backgroundColor: 'rgba(26,26,26,0.5)',
        borderRadius: 12,
        padding: 2,
    },
    noteInput: {
        minHeight: 80,
        borderWidth: 0,
        padding: 10,
        fontSize: 15,
        color: THEME_COLORS.textPrimary,
        textAlignVertical: 'top',
    },
    noteCount: {
        padding: 6,
        fontSize: 12,
        alignSelf: 'flex-end',
        color: THEME_COLORS.textSecondary,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(26,26,26,0.5)',
        borderRadius: 12,
        padding: 12,
    },
    checkboxLabel: {
        marginLeft: 12,
        fontSize: 15,
        color: THEME_COLORS.textSecondary,
    },
    buttonContainer: {
        marginTop: 20,
        gap: 12,
    },
    submitButton: {
        backgroundColor: COLORS.primary.accent,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    cancelButton: {
        backgroundColor: 'rgba(26,26,26,0.9)',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    cancelButtonText: {
        fontSize: 15,
        color: THEME_COLORS.textSecondary,
        fontWeight: '600',
    },
});

export default MatchDetailsScreen;