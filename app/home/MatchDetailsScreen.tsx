import React, { useState } from 'react';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Match } from './types/Match';
import { requestJoinMatch } from '@/app/create-match/services/api/matchJoinRequests';
import { useLocalSearchParams, useRouter } from 'expo-router';

const MatchDetailsScreen: React.FC = () => {
    const router = useRouter();
    const params = useLocalSearchParams<{ match: string }>();
    const match: Match = JSON.parse(params.match);

    const [isJoining, setIsJoining] = useState(false);
    const [hasRequested, setHasRequested] = useState(
        match?.userHasRequested || false
    );

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Join me for a match: ${match.title} at ${match.location.address}!`,
            });
        } catch (error) {
            console.error('Error sharing match:', error);
        }
    };

    const handleLike = () => {
        console.log('Liked the match:', match.id);
    };

    const handleJoin = async () => {
        try {
            setIsJoining(true);
            await requestJoinMatch(match.id);
            setHasRequested(true);
            Alert.alert('Request Sent', 'Your request to join the match is now pending!');
        } catch (error: any) {
            console.error('Error requesting to join match:', error);
            Alert.alert(
                'Error',
                error?.response?.data?.message || 'Could not join the match'
            );
        } finally {
            setIsJoining(false);
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

    return (
        <LinearGradient
            colors={[COLORS.primary.dark, COLORS.primary.main]}
            style={styles.gradientContainer}
        >
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
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

                {/* Join Button */}
                <View style={styles.joinButtonContainer}>
                    <TouchableOpacity
                        onPress={handleJoin}
                        style={styles.joinButton}
                        disabled={isJoining || hasRequested}
                    >
                        <LinearGradient
                            colors={
                                isJoining || hasRequested
                                    ? [COLORS.primary.dark, COLORS.primary.dark]
                                    : [COLORS.primary.accent, COLORS.primary.dark]
                            }
                            style={styles.joinButtonGradient}
                            start={[0, 0]}
                            end={[1, 0]}
                        >
                            {isJoining ? (
                                <ActivityIndicator color={COLORS.neutral[50]} />
                            ) : hasRequested ? (
                                <Text style={[styles.joinButtonText, styles.requestPendingText]}>
                                    Request Pending
                                </Text>
                            ) : (
                                <Text style={styles.joinButtonText}>Join Match</Text>
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
        paddingBottom: 80,
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
        shadowOffset: { width: 0, height: 3 },
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
    requestPendingText: {
        color: '#F0AD4E',
        fontWeight: 'bold',
    },
});
