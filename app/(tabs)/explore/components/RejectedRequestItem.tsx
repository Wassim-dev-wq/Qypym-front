import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/src/constants/Colors';
import {MatchJoinRequestResponse} from "@/src/types/match/response/matchJoinRequestResponse";
import {useUser} from "@/src/core/hooks/useUserFetch";

interface RejectedRequestItemProps {
    request: MatchJoinRequestResponse;
}

const RejectedRequestItem: React.FC<RejectedRequestItemProps> = ({ request }) => {
    const { data: user, isLoading: isUserLoading } = useUser(request.userId);

    if (isUserLoading) {
        return (
            <View style={styles.requestItem}>
                <ActivityIndicator color={COLORS.primary.accent} />
            </View>
        );
    }

    return (
        <View style={styles.requestItem}>
            <View style={styles.requestInfo}>
                <MaterialCommunityIcons
                    name="account"
                    size={24}
                    color={COLORS.neutral[300]}
                />
                <View>
                    <Text style={styles.playerName}>
                        {user ? `${user.firstName} ${user.lastName}` : 'Unknown Player'}
                    </Text>
                    {user?.playerLevel && (
                        <Text style={styles.playerLevel}>
                            Level {user.playerLevel}
                        </Text>
                    )}
                </View>
            </View>
            <View style={styles.statusContainer}>
                <MaterialCommunityIcons
                    name="close-circle"
                    size={20}
                    color={COLORS.secondary.error}
                />
                <Text style={styles.statusText}>Rejected</Text>
            </View>
        </View>
    );
};

export default RejectedRequestItem;

const styles = StyleSheet.create({
    requestItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.primary.main,
    },
    requestInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    playerName: {
        color: COLORS.neutral[50],
        fontSize: 16,
        fontWeight: '500',
    },
    playerLevel: {
        color: COLORS.neutral[300],
        fontSize: 14,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusText: {
        color: COLORS.secondary.error,
        fontSize: 14,
        fontWeight: '600',
    },
});
