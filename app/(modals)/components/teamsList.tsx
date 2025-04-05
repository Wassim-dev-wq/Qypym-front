import React from 'react';
import {StyleSheet, Text, View,} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import PlayerItem from "@/app/(tabs)/explore/components/PlayerItem";
import {MatchPlayerResponse, MatchTeamResponse} from "@/src/types/match/matchDetails";

interface TeamsListProps {
    teams: MatchTeamResponse[];
    joinRequest: any;
    router: any;
    t: (key: string, options?: any) => string;
    isCreator?: boolean;
    userId?: string;
}

const TeamsList: React.FC<TeamsListProps> = ({
                                                 teams,
                                                 joinRequest,
                                                 router,
                                                 t,
                                                 isCreator = false,
                                                 userId
                                             }) => {
    if (!teams || teams.length === 0) {
        return null;
    }

    return (
        <View style={styles.sectionContainer}>
            {teams.map((team) => (
                <View key={team.id} style={styles.teamCard}>
                    <LinearGradient
                        colors={['rgba(26,26,26,0.9)', 'rgba(17,17,17,0.8)']}
                        style={styles.teamCardGradient}
                    >
                        <View style={styles.teamHeader}>
                            <Text style={styles.teamName}>{team.name}</Text>
                            <View style={styles.playerCount}>
                                <Text style={styles.playerCountText}>
                                    {team.currentPlayers}/{team.maxPlayers}
                                </Text>
                            </View>
                        </View>
                        {team.players && team.players.length > 0 ? (
                            <View style={styles.playersContainer}>
                                {(isCreator || joinRequest?.requestStatus !== 'LEFT') ? (
                                    <LinearGradient
                                        colors={['rgba(26,26,26,0.95)', 'rgba(17,17,17,0.85)']}
                                        style={styles.playersGradient}
                                    >
                                        {team.players.map((player) => (
                                            <PlayerItem
                                                key={player.playerId.toString()}
                                                player={player}
                                                onPress={() => {
                                                    router.push({
                                                        pathname: '/(modals)/profile/[userId]',
                                                        params: {userId: player.playerId}
                                                    })
                                                }}
                                            />
                                        ))}
                                    </LinearGradient>
                                ) : (
                                    team.players.map((player) => (
                                        <PlayerRow
                                            key={player.playerId.toString()}
                                            player={player}
                                            isCurrentUser={player.playerId === joinRequest?.userId}
                                            t={t}
                                        />
                                    ))
                                )}
                            </View>
                        ) : (
                            <Text style={styles.emptyTeamText}>{t('noPlayers')}</Text>
                        )}
                    </LinearGradient>
                </View>
            ))}
        </View>
    );
};

interface PlayerRowProps {
    player: MatchPlayerResponse
    isCurrentUser: boolean;
    t: (key: string, options?: any) => string;
}

const PlayerRow: React.FC<PlayerRowProps> = ({player, isCurrentUser, t}) => {
    return (
        <View style={styles.playerRow}>
            <View style={[
                styles.playerAvatar,
                isCurrentUser && {backgroundColor: 'rgba(255, 184, 0, 0.3)'}
            ]}>
                <MaterialCommunityIcons
                    name="account"
                    size={22}
                    color={THEME_COLORS.textPrimary}
                />
            </View>
            <Text style={[
                styles.playerName,
                isCurrentUser && {color: COLORS.primary.accent, fontWeight: '600'}
            ]}>
                {isCurrentUser
                    ? t('anonymous')
                    : t('anonymous')}
            </Text>
            {player.role && isCurrentUser && (
                <View style={styles.playerPositionBadge}>
                    <Text style={styles.playerPositionText}>{player.role}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    sectionContainer: {
        marginHorizontal: 10,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginLeft: 10,
    },
    teamCard: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    teamCardGradient: {
        padding: 16,
    },
    teamHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        paddingBottom: 8,
    },
    teamName: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
    },
    playerCount: {
        backgroundColor: 'rgba(255, 184, 0, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    playerCountText: {
        color: COLORS.primary.accent,
        fontSize: 12,
        fontWeight: 'bold',
    },
    playersContainer: {
        marginTop: 8,
    },
    playersGradient: {
        padding: 12,
        borderRadius: 16,
    },
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    playerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 184, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    playerName: {
        fontSize: 15,
        color: THEME_COLORS.textPrimary,
    },
    emptyTeamText: {
        fontSize: 14,
        color: THEME_COLORS.textPlaceholder,
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 10,
    },
    playerPositionBadge: {
        backgroundColor: 'rgba(255, 184, 0, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginLeft: 10,
    },
    playerPositionText: {
        color: COLORS.primary.accent,
        fontSize: 12,
        fontWeight: '500',
    },
});

export default TeamsList;