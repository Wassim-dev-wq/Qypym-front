import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {format} from 'date-fns';
import {Match} from '@/app/utils/types/match/match';
import {COLORS} from '@/constants/Colors';
import {MatchEnums} from "@/app/utils/types/match/matchEnums";

type StatusStyle = {
    backgroundColor: string;
    textColor: string;
};

const statusStyles: Record<MatchEnums["Status"], StatusStyle> = {
    DRAFT: {
        backgroundColor: 'rgba(117, 117, 117, 0.1)',
        textColor: COLORS.neutral[300],
    },
    OPEN: {
        backgroundColor: 'rgba(61, 209, 58, 0.1)',
        textColor: COLORS.secondary.success,
    },
    IN_PROGRESS: {
        backgroundColor: 'rgba(230, 153, 0, 0.1)',
        textColor: COLORS.primary.accent,
    },
    COMPLETED: {
        backgroundColor: 'rgba(117, 117, 117, 0.1)',
        textColor: COLORS.neutral[300],
    },
    CANCELLED: {
        backgroundColor: 'rgba(255, 75, 75, 0.1)',
        textColor: COLORS.secondary.error,
    },
};


const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0
        ? `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`
        : `${remainingMinutes}m`;
};

const getStatusStyle = (status: MatchEnums["Status"]): StatusStyle => {
    return statusStyles[status];
};

interface MatchCardProps {
    match: Match;
    onPress: (match: Match) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({match, onPress}) => {
    const formattedDate = format(new Date(match.startDate), 'EEE, MMM d');
    const formattedTime = format(new Date(match.startDate), 'h:mm a');
    const duration = formatDuration(match.duration);
    const statusStyle = getStatusStyle(match.status);

    return (
        <Pressable
            style={({pressed}) => [
                styles.container,
                pressed && {backgroundColor: COLORS.background.cardPressed}
            ]}
            onPress={() => onPress(match)}
        >
            <View style={[styles.statusBadge, {backgroundColor: statusStyle.backgroundColor}]}>
                <Text style={[styles.statusText, {color: statusStyle.textColor}]}>
                    {match.status}
                </Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.title} numberOfLines={2}>
                    {match.title}
                </Text>

                <View style={styles.locationContainer}>
                    <MaterialCommunityIcons
                        name="map-marker"
                        size={16}
                        color={COLORS.neutral[300]}
                        style={styles.locationIcon}
                    />
                    <Text style={styles.locationText}>
                        {match.location.address}
                    </Text>
                </View>

                <View style={styles.divider}/>

                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                        <MaterialCommunityIcons
                            name="calendar-clock"
                            size={16}
                            color={COLORS.primary.accent}
                        />
                        <View>
                            <Text style={styles.infoLabel}>Date & Time</Text>
                            <Text style={styles.infoValue}>{formattedDate} • {formattedTime}</Text>
                        </View>
                    </View>

                    <View style={styles.infoItem}>
                        <MaterialCommunityIcons
                            name="clock-outline"
                            size={16}
                            color={COLORS.primary.accent}
                        />
                        <View>
                            <Text style={styles.infoLabel}>Duration</Text>
                            <Text style={styles.infoValue}>{duration}</Text>
                        </View>
                    </View>

                    <View style={styles.infoItem}>
                        <MaterialCommunityIcons
                            name="soccer"
                            size={16}
                            color={COLORS.primary.accent}
                        />
                        <View>
                            <Text style={styles.infoLabel}>Match Type</Text>
                            <Text style={styles.infoValue}>{match.matchType}</Text>
                        </View>
                    </View>

                    <View style={styles.infoItem}>
                        <MaterialCommunityIcons
                            name="trophy-outline"
                            size={16}
                            color={COLORS.primary.accent}
                        />
                        <View>
                            <Text style={styles.infoLabel}>Skill Level</Text>
                            <Text style={styles.infoValue}>{match.skillLevel}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.background.card,
        borderRadius: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: COLORS.primary.light,
        overflow: 'hidden',
    },
    content: {
        padding: 16,
    },
    statusBadge: {
        position: 'absolute',
        top: 16,
        right: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        zIndex: 1,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.neutral[50],
        marginBottom: 16,
        lineHeight: 26,
        paddingRight: 64,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    locationIcon: {
        marginTop: 2,
        marginRight: 8,
    },
    locationText: {
        flex: 1,
        fontSize: 15,
        color: COLORS.neutral[200],
        lineHeight: 20,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.primary.light,
        marginVertical: 16,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -8,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        width: '50%',
        paddingHorizontal: 8,
        marginBottom: 16,
        gap: 8,
    },
    infoLabel: {
        fontSize: 12,
        color: COLORS.neutral[300],
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 14,
        color: COLORS.neutral[50],
        fontWeight: '500',
    },
});

export default React.memo(MatchCard);