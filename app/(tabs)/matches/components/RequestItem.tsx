import React, { useEffect, useRef } from 'react'
import {
    Animated,
    Text,
    TouchableOpacity,
    View,
    StyleSheet
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, THEME_COLORS } from '@/src/constants/Colors'

interface RequestItemProps {
    request: any
    onPress: (id: string) => void
    matchDetails: any
}
const RequestItem: React.FC<RequestItemProps> = ({ request, onPress, matchDetails }) => {
    const statusColors = {
        PENDING: 'rgba(255, 184, 0, 0.9)',
        ACCEPTED: 'rgba(34, 197, 94, 0.9)',
        DECLINED: 'rgba(239, 68, 68, 0.9)',
        CANCELED: 'rgba(107, 114, 128, 0.9)',
        LEFT: 'rgba(59, 130, 246, 0.9)'
    };

    const statusIcons = {
        PENDING: 'clock-outline',
        ACCEPTED: 'check-circle',
        DECLINED: 'close-circle',
        CANCELED: 'cancel',
        LEFT: 'exit-to-app'
    };

    const statusLabels = {
        PENDING: 'En attente',
        ACCEPTED: 'Confirmé',
        DECLINED: 'Refusé',
        CANCELED: 'Annulé',
        LEFT: 'Parti'
    };

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

    const normalizedStatus = request.requestStatus ? request.requestStatus.toUpperCase() : 'PENDING';

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
                marginBottom: 16
            }}
        >
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onPress(request.matchId)}
                style={styles.requestCard}
            >
                <LinearGradient
                    colors={['rgba(26,26,26,0.5)', 'rgba(17,17,17,0.2)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.requestCardContent}
                >
                    <View style={styles.requestHeader}>
                        <View>
                            <Text style={styles.requestTitle}>
                                {matchDetails?.title || 'Match details'}
                            </Text>
                            <Text style={styles.requestDate}>
                                {matchDetails?.startDate
                                    ? new Date(matchDetails.startDate).toLocaleDateString('fr-FR', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })
                                    : 'Date non disponible'}
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.statusBadge,
                                { backgroundColor: statusColors[normalizedStatus] || statusColors.PENDING }
                            ]}
                        >
                            <MaterialCommunityIcons
                                name={statusIcons[normalizedStatus] || statusIcons.PENDING}
                                size={14}
                                color="#FFF"
                            />
                            <Text style={styles.statusText}>
                                {statusLabels[normalizedStatus] || statusLabels.PENDING}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.requestDetails}>
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons
                                name="calendar-clock"
                                size={16}
                                color={COLORS.primary.accent}
                                style={styles.detailIcon}
                            />
                            <Text style={styles.detailText}>
                                Demande soumise le {new Date(request.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            })}
                            </Text>
                        </View>

                        {request.message && (
                            <View style={styles.detailRow}>
                                <MaterialCommunityIcons
                                    name="comment-text-outline"
                                    size={16}
                                    color={COLORS.primary.accent}
                                    style={styles.detailIcon}
                                />
                                <Text style={styles.detailText}>{request.message}</Text>
                            </View>
                        )}

                        {normalizedStatus === 'LEFT' && (
                            <View style={styles.detailRow}>
                                <MaterialCommunityIcons
                                    name="information-outline"
                                    size={16}
                                    color={COLORS.primary.accent}
                                    style={styles.detailIcon}
                                />
                                <Text style={styles.detailText}>
                                    Vous avez quitté ce match
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.requestFooter}>
                        <MaterialCommunityIcons
                            name="chevron-right"
                            size={20}
                            color={COLORS.primary.accent}
                        />
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    requestCard: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    requestCardContent: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12
    },
    requestTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
        marginBottom: 4
    },
    requestDate: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12
    },
    statusText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 4
    },
    requestDetails: {
        backgroundColor: 'rgba(26,26,26,0.5)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8
    },
    detailIcon: {
        marginRight: 8,
        marginTop: 2
    },
    detailText: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
        flex: 1,
        lineHeight: 20
    },
    requestFooter: {
        alignItems: 'flex-end',
        paddingTop: 4
    }
});

export default RequestItem;