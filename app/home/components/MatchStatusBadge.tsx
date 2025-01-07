import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/Colors';

interface MatchStatusBadgeProps {
    status: string;
}

const MatchStatusBadge: React.FC<MatchStatusBadgeProps> = ({ status }) => {
    const getStatusStyle = () => {
        switch (status) {
            case 'Open':
                return { backgroundColor: COLORS.secondary.success };
            case 'Almost Full':
                return { backgroundColor: COLORS.secondary.warning };
            case 'Full':
                return { backgroundColor: COLORS.secondary.error };
            case 'Cancelled':
                return { backgroundColor: COLORS.neutral[500] };
            default:
                return { backgroundColor: COLORS.primary.accent };
        }
    };

    return (
        <View style={[styles.badge, getStatusStyle()]}>
            <Text style={styles.badgeText}>{status}</Text>
        </View>
    );
};

export default React.memo(MatchStatusBadge);

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    badgeText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
    },
});
