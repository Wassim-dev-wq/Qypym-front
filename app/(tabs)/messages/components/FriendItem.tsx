import React, { useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, THEME_COLORS } from '@/src/constants/Colors';
import { useUserPresence } from '@/src/core/hooks/useUserPresence';
import { User } from '@/src/types/user/user';

interface FriendItemProps {
    user: User | null;
    userId: string;
    isLoading: boolean;
    isCurrentUser: boolean;
    onModalClose?: () => void;
}

export default function FriendItem({
                                       user,
                                       userId,
                                       isLoading,
                                       isCurrentUser,
                                       onModalClose
                                   }: FriendItemProps) {
    const router = useRouter();
    const bounceAnim = useRef(new Animated.Value(0.95)).current;

    const { isOnline, lastActiveText } = useUserPresence(userId);

    useEffect(() => {
        Animated.spring(bounceAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true
        }).start();
    }, []);

    const handleProfilePress = () => {
        console.log('handleProfilePress');
        if (!isLoading && user) {
            router.push({
                pathname: '/(modals)/profile/[userId]',
                params: { userId }
            });
            setTimeout(() => {
                if (onModalClose) {
                    onModalClose();
                }
            }, 100);
        }
    };

    if (isLoading) {
        return (
            <Animated.View style={[friendStyles.friendBox, { transform: [{ scale: bounceAnim }] }]}>
                <View style={friendStyles.friendPicture} />
                <View style={friendStyles.friendLoading}>
                    <ActivityIndicator size="small" color={COLORS.primary.accent} />
                </View>
            </Animated.View>
        );
    }

    const userIsOnline = isCurrentUser || isOnline;

    const statusText = isCurrentUser ? 'Actif maintenant' : lastActiveText || 'Hors ligne';

    const displayName = user?.username || user?.firstName || userId.substring(0, 8);
    const firstLetter = (displayName.charAt(0) || '?').toUpperCase();

    return (
        <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
            <TouchableOpacity
                style={friendStyles.friendBox}
                onPress={handleProfilePress}
                activeOpacity={0.7}
            >
                <View style={friendStyles.friendPicture}>
                    {user?.videoIntroUrl ? (
                        <Image
                            source={{ uri: user.videoIntroUrl }}
                            style={friendStyles.profileImage}
                        />
                    ) : (
                        <Text style={friendStyles.profileLetter}>{firstLetter}</Text>
                    )}
                    <View style={[
                        friendStyles.onlineStatus,
                        userIsOnline ? friendStyles.online : friendStyles.offline
                    ]} />
                </View>
                <View style={friendStyles.friendInfo}>
                    <Text style={friendStyles.friendName} numberOfLines={1}>
                        {isCurrentUser ? `${displayName} (vous)` : displayName}
                    </Text>
                    <Text style={[
                        friendStyles.activityStatus,
                        userIsOnline && friendStyles.activeStatusText
                    ]}>
                        {statusText}
                    </Text>
                </View>
                <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color={THEME_COLORS.textSecondary}
                    style={friendStyles.arrowIcon}
                />
            </TouchableOpacity>
        </Animated.View>
    );
}

const friendStyles = StyleSheet.create({

    friendBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: THEME_COLORS.divider,
        backgroundColor: 'rgba(26,26,26,0.5)',
        marginBottom: 8,
        borderRadius: 12,
        zIndex: 10,
        position: 'relative'
    },
    friendPicture: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(26,26,26,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)'
    },
    friendLoading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center'
    },
    profileLetter: {
        color: THEME_COLORS.textPrimary,
        fontWeight: 'bold',
        fontSize: 20
    },
    profileImage: {
        width: 48,
        height: 48,
        borderRadius: 24
    },
    onlineStatus: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: THEME_COLORS.background
    },
    online: {
        backgroundColor: '#22c55e'
    },
    offline: {
        backgroundColor: THEME_COLORS.cardAccent
    },
    friendInfo: {
        flex: 1
    },
    friendName: {
        fontSize: 16,
        fontWeight: '500',
        color: THEME_COLORS.textPrimary,
        marginBottom: 2
    },
    activityStatus: {
        fontSize: 13,
        color: THEME_COLORS.textSecondary
    },
    activeStatusText: {
        color: '#22c55e'
    },
    arrowIcon: {
        marginLeft: 'auto'
    }
});