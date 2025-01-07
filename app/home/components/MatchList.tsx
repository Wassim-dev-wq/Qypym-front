import React, { useMemo } from 'react';
import {
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Chip, Avatar, Surface } from 'react-native-paper';
import { COLORS } from '@/constants/Colors';
import { format, isToday, isTomorrow } from 'date-fns';
import Animated, { FadeInDown } from 'react-native-reanimated';
import MatchStatusBadge from './MatchStatusBadge';
import { LinearGradient } from 'expo-linear-gradient';
import type { Match } from '../types/Match';

interface MatchListProps {
    matches: Match[];
    onSelectMatch: (match: Match) => void;
    onShareMatch?: (match: Match) => void;
    onBookmarkMatch?: (match: Match) => void;
    onShowOnMap?: (match: Match) => void;
}

const ActionWithLabel: React.FC<{
    icon: string;
    label: string;
    onPress?: () => void;
    style?: any;
    accessibilityLabel?: string;
}> = ({ icon, label, onPress, style, accessibilityLabel }) => (
    <Pressable
        style={[styles.actionWithLabelContainer, style]}
        onPress={onPress}
        accessible
        accessibilityLabel={accessibilityLabel}
    >
        <MaterialCommunityIcons name={icon} size={24} color={COLORS.neutral[50]} />
        <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
);

const MatchCard: React.FC<{
    match: Match;
    onPress: () => void;
    onShare?: () => void;
    onBookmark?: () => void;
    onShowOnMap?: () => void;
    index: number;
}> = ({ match, onPress, onShare, onBookmark, onShowOnMap, index }) => {
    const formattedDate = useMemo(() => {
        const date = new Date(match.startDate);
        if (isToday(date)) return 'Today';
        if (isTomorrow(date)) return 'Tomorrow';
        return format(date, 'EEE, MMM d');
    }, [match.startDate]);

    const timeInfo = `${match.duration}min`;

    return (
        <Animated.View entering={FadeInDown.delay(index * 100)} style={styles.cardContainer}>
            <Pressable onPress={onPress}>
                <Surface style={styles.card}>
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: 'https://via.placeholder.com/300x200' }}
                            style={styles.image}
                        />
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.7)']}
                            style={styles.gradient}
                        />
                        <View style={styles.cardOverlay}>
                            <MatchStatusBadge status={match.status} />
                            <View style={styles.headerActions}>
                                <ActionWithLabel
                                    icon="share-variant"
                                    label="Share"
                                    onPress={onShare}
                                    accessibilityLabel="Share Match"
                                />
                                <ActionWithLabel
                                    icon="bookmark-outline"
                                    label="Bookmark"
                                    onPress={onBookmark}
                                    accessibilityLabel="Bookmark Match"
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.cardContent}>
                        <View style={styles.topContent}>
                            <Text style={styles.title}>{match.title}</Text>
                            <View style={styles.timeContainer}>
                                <MaterialCommunityIcons
                                    name="clock-outline"
                                    size={16}
                                    color={COLORS.primary.accent}
                                />
                                <Text style={styles.timeText}>
                                    {`${formattedDate} · ${timeInfo}`}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.detailsRow}>
                            <View style={styles.locationContainer}>
                                <MaterialCommunityIcons
                                    name="map-marker"
                                    size={16}
                                    color={COLORS.neutral[300]}
                                />
                                <Text style={styles.locationText} numberOfLines={1}>
                                    {match.location?.address || 'No address'}
                                </Text>
                                {onShowOnMap && (
                                    <ActionWithLabel
                                        icon="crosshairs-gps"
                                        label="Map"
                                        onPress={onShowOnMap}
                                        style={styles.mapAction}
                                        accessibilityLabel="Show on Map"
                                    />
                                )}
                            </View>
                            <View style={styles.priceContainer}>
                                <Text style={styles.priceText}>
                                    {`$0`}
                                </Text>
                                <Text style={styles.perPlayerText}>
                                    {match.format === '5v5' ? '/player' : ''}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.tagsContainer}>
                            <Chip mode="outlined" style={styles.formatChip}>
                                {match.format}
                            </Chip>
                            <Chip mode="outlined" style={styles.skillChip}>
                                {match.skillLevel}
                            </Chip>
                            <Chip mode="outlined" style={styles.intensityChip}>
                                {match.skillLevel}
                            </Chip>
                        </View>

                        <View style={styles.footer}>
                            <View style={styles.hostInfo}>
                                <Avatar.Image
                                    size={24}
                                    source={{ uri: 'https://via.placeholder.com/50' }}
                                />
                                <Text style={styles.hostName}>Host Name</Text>
                                <MaterialCommunityIcons
                                    name="check-decagram"
                                    size={16}
                                    color={COLORS.primary.accent}
                                    style={styles.verifiedIcon}
                                />
                            </View>
                            <View style={styles.playersInfo}>
                                <MaterialCommunityIcons
                                    name="account-group"
                                    size={20}
                                    color={COLORS.primary.accent}
                                />
                                <Text style={styles.playersText}>{`5/10`}</Text>
                            </View>
                        </View>
                    </View>
                </Surface>
            </Pressable>
        </Animated.View>
    );
};

const MatchList: React.FC<MatchListProps> = ({
                                                 matches,
                                                 onSelectMatch,
                                                 onShareMatch,
                                                 onBookmarkMatch,
                                                 onShowOnMap,
                                             }) => {
    const renderItem = ({ item, index }: { item: Match; index: number }) => (
        <MatchCard
            match={item}
            onPress={() => onSelectMatch(item)}
            onShare={() => onShareMatch?.(item)}
            onBookmark={() => onBookmarkMatch?.(item)}
            onShowOnMap={() => onShowOnMap?.(item)}
            index={index}
        />
    );

    if (matches.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                    name="soccer-field"
                    size={64}
                    color={COLORS.neutral[300]}
                />
                <Text style={styles.emptyTitle}>No Matches Found</Text>
                <Text style={styles.emptyText}>Try adjusting your filters or create a new match.</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={matches}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
        />
    );
};

export default React.memo(MatchList);

const styles = StyleSheet.create({
    listContainer: {
        padding: 16,
        gap: 16,
    },
    cardContainer: {
        marginBottom: 16,
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        backgroundColor: COLORS.primary.light,
    },
    imageContainer: {
        height: 200,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
    },
    cardOverlay: {
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cardContent: {
        padding: 16,
        gap: 12,
    },
    topContent: {
        gap: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.neutral[50],
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeText: {
        fontSize: 14,
        color: COLORS.neutral[300],
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
        flexWrap: 'wrap',
    },
    locationText: {
        fontSize: 14,
        color: COLORS.neutral[300],
        maxWidth: '70%',
    },
    mapAction: {
        marginLeft: 8,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 2,
    },
    priceText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary.accent,
    },
    perPlayerText: {
        fontSize: 12,
        color: COLORS.neutral[300],
    },
    tagsContainer: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    formatChip: {
        backgroundColor: COLORS.primary.dark,
    },
    skillChip: {
        backgroundColor: COLORS.primary.main,
    },
    intensityChip: {
        backgroundColor: COLORS.primary.accent,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    hostInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    hostName: {
        fontSize: 14,
        color: COLORS.neutral[50],
    },
    verifiedIcon: {
        marginLeft: 4,
    },
    playersInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    playersText: {
        fontSize: 14,
        color: COLORS.neutral[50],
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.neutral[50],
        marginTop: 16,
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.neutral[300],
        textAlign: 'center',
        marginTop: 8,
    },
    actionWithLabelContainer: {
        alignItems: 'center',
    },
    actionLabel: {
        fontSize: 10,
        color: COLORS.neutral[50],
        marginTop: 2,
    },
});
