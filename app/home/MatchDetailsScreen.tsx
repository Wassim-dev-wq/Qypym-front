import React, {useEffect} from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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
import {COLORS} from '@/constants/Colors';
import {LinearGradient} from 'expo-linear-gradient';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useJoinMatch, useMatch, useMatchJoin} from "@/app/create-match/services/hooks/useMatch";

const MatchDetailsScreen: React.FC = () => {
    const router = useRouter();
    const params = useLocalSearchParams<{ matchId: string }>();

    const {data: match, isLoading, isError, error} = useMatch(params.matchId);
    const {
        data: joinRequest,
        isLoading: isJoinLoading,
        isError: isJoinError,
        error: joinError
    } = useMatchJoin(params.matchId);
    const joinMutation = useJoinMatch();

    useEffect(() => {
        if (isError) {
            console.error('Match details error:', error);
            Alert.alert('Error', 'Failed to load match details.');
        }
    }, [isError, error]);

    useEffect(() => {
        if (isJoinError) {
            console.error('Join request error:', joinError);
            Alert.alert('Error', 'Failed to fetch join request status.');
        }
    }, [isJoinError, joinError]);

    if (isLoading) {
        return (
            <LinearGradient
                colors={[COLORS.primary.dark, COLORS.primary.main]}
                style={styles.gradientContainer}
            >
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary.accent}/>
                </View>
            </LinearGradient>
        );
    }

    if (isError) {
        return (
            <LinearGradient
                colors={[COLORS.primary.dark, COLORS.primary.main]}
                style={styles.gradientContainer}
            >
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Failed to load match details</Text>
                </View>
            </LinearGradient>
        );
    }

    if (!match) {
        return (
            <LinearGradient
                colors={[COLORS.primary.dark, COLORS.primary.main]}
                style={styles.gradientContainer}
            >
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Match not found</Text>
                </View>
            </LinearGradient>
        );
    }

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Join me for a match: ${match.title} at ${match.location.address}!`,
            });
        } catch (error) {
            console.error('Error sharing match:', error);
            Alert.alert('Error', 'Could not share the match details.');
        }
    };

    const handleLike = () => {
        console.log('Liked the match:', match.id);
        Alert.alert('Liked', 'You have liked this match.');
    };

    const handleJoin = async () => {
        try {
            joinMutation.mutate(params.matchId, {
                onSuccess: (data) => {
                    Alert.alert('Request Sent', 'Your request to join the match is now pending!');
                },
                onError: (error: any) => {
                    console.error('Error requesting to join match:', error);
                    Alert.alert(
                        'Error',
                        error?.message || 'Could not join the match'
                    );
                }
            });
        } catch (error: any) {
            console.error('Unexpected error:', error);
            Alert.alert(
                'Error',
                error?.message || 'An unexpected error occurred'
            );
        }
    };

    const dateObj = new Date(match.startDate);
    const formattedDate = dateObj.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const formattedTime = dateObj.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });

    const joinStatus = joinRequest?.requestStatus || 'Not Requested';

    const isJoinDisabled = joinStatus === 'PENDING' || joinStatus === 'ACCEPTED';

    const joinButtonText = () => {
        switch (joinStatus) {
            case 'PENDING':
                return 'Request Pending';
            case 'ACCEPTED':
                return 'Joined';
            case 'REJECTED':
                return 'Request Rejected';
            default:
                return 'Join Match';
        }
    };

    const joinButtonStyle = () => {
        switch (joinStatus) {
            case 'PENDING':
                return styles.requestPendingButton;
            case 'ACCEPTED':
                return styles.joinedButton;
            case 'REJECTED':
                return styles.requestRejectedButton;
            default:
                return styles.joinButton;
        }
    };

    const joinButtonGradient = () => {
        switch (joinStatus) {
            case 'PENDING':
            case 'ACCEPTED':
            case 'REJECTED':
                return [COLORS.primary.dark, COLORS.primary.dark];
            default:
                return [COLORS.primary.accent, COLORS.primary.dark];
        }
    };

    return (
        <LinearGradient
            colors={[COLORS.primary.dark, COLORS.primary.main]}
            style={styles.gradientContainer}
        >
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <MaterialCommunityIcons
                            name="arrow-left"
                            size={28}
                            color={COLORS.neutral[50]}
                        />
                    </TouchableOpacity>

                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
                            <MaterialCommunityIcons
                                name="share-variant"
                                size={24}
                                color={COLORS.neutral[50]}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleLike} style={styles.iconButton}>
                            <MaterialCommunityIcons
                                name="heart-outline"
                                size={24}
                                color={COLORS.neutral[50]}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Scrollable Content */}
                <ScrollView contentContainerStyle={styles.contentContainer}>
                    {/* Main Image Section */}
                    <View style={styles.imageContainer}>
                        <Image
                            source={{
                                uri: match.imageUrl || 'https://via.placeholder.com/400x200',
                            }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                        {match.status && (
                            <View style={styles.statusBadge}>
                                <Text style={styles.statusText}>{match.status}</Text>
                            </View>
                        )}
                    </View>

                    {/* Title & Time */}
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>{match.title}</Text>
                        <View style={styles.row}>
                            <MaterialCommunityIcons
                                name="clock-outline"
                                size={20}
                                color={COLORS.neutral[300]}
                            />
                            <Text style={styles.infoText}>
                                {formattedDate} · {formattedTime} · {match.duration}min
                            </Text>
                        </View>
                    </View>

                    {/* Location */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons
                                name="map-marker"
                                size={24}
                                color={COLORS.primary.accent}
                            />
                            <Text style={styles.cardTitle}>Location</Text>
                        </View>
                        <Text style={styles.cardContent}>
                            {match.location?.address ?? 'Unknown location'}
                        </Text>
                    </View>

                    {/* Match Info */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons
                                name="soccer-field"
                                size={24}
                                color={COLORS.primary.accent}
                            />
                            <Text style={styles.cardTitle}>Match Info</Text>
                        </View>
                        <Text style={styles.cardContent}>
                            Format: {match.format || 'N/A'}
                        </Text>
                        <Text style={styles.cardContent}>
                            Skill Level: {match.skillLevel || 'N/A'}
                        </Text>
                    </View>
                </ScrollView>

                <View style={styles.joinButtonContainer}>
                    <TouchableOpacity
                        onPress={handleJoin}
                        style={[styles.joinButton, joinButtonStyle()]}
                        disabled={isJoinDisabled || joinMutation.isLoading}
                    >
                        <LinearGradient
                            colors={joinButtonGradient()}
                            style={styles.joinButtonGradient}
                            start={[0, 0]}
                            end={[1, 0]}
                        >
                            {joinMutation.isLoading ? (
                                <ActivityIndicator color={COLORS.neutral[50]}/>
                            ) : (
                                <Text style={styles.joinButtonText}>{joinButtonText()}</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
};

export default MatchDetailsScreen;

const styles = StyleSheet.create({
    gradientContainer: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        // Extra top padding for Android
        paddingTop: Platform.OS === 'android' ? 40 : 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    iconButton: {
        padding: 8,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 100, // Increased to accommodate button
    },
    imageContainer: {
        position: 'relative',
        width: '100%',
        height: 240,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
        backgroundColor: COLORS.neutral[800],
    },
    image: {
        width: '100%',
        height: '100%',
    },
    statusBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: COLORS.primary.accent,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        elevation: 3,
    },
    statusText: {
        color: COLORS.neutral[50],
        fontWeight: 'bold',
        fontSize: 12,
    },
    titleContainer: {
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.neutral[50],
        marginBottom: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    infoText: {
        fontSize: 14,
        color: COLORS.neutral[300],
    },
    card: {
        backgroundColor: COLORS.primary.light,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: {width: 0, height: 3},
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitle: {
        marginLeft: 8,
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.neutral[50],
    },
    cardContent: {
        fontSize: 14,
        color: COLORS.neutral[300],
        marginBottom: 4,
    },
    joinButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: 'transparent',
    },
    joinButton: {
        width: '100%',
        borderRadius: 24,
        overflow: 'hidden',
    },
    joinButtonGradient: {
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 24,
    },
    joinButtonText: {
        color: COLORS.neutral[50],
        fontSize: 16,
        fontWeight: '600',
    },
    requestPendingButton: {
    },
    joinedButton: {
    },
    requestRejectedButton: {
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: COLORS.neutral[50],
        fontSize: 16,
        textAlign: 'center',
    },
});
