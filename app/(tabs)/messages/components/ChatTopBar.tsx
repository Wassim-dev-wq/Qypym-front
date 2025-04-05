import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, THEME_COLORS } from '@/src/constants/Colors';
import { ChatRoom } from '@/src/core/api/chatService';

interface ChatTopBarProps {
    chatRoom: ChatRoom | null;
    onBackPress: () => void;
    onHeaderPress: () => void;
    friendCount: number | undefined;
}

export default function ChatTopBar({
                                       chatRoom,
                                       onBackPress,
                                       onHeaderPress,
                                       friendCount
                                   }: ChatTopBarProps) {
    const edges = useSafeAreaInsets();

    return (
        <View style={[barStyles.topBar]}>
            <TouchableOpacity
                style={barStyles.backButton}
                onPress={onBackPress}
            >
                <MaterialCommunityIcons
                    name="chevron-left"
                    size={26}
                    color={THEME_COLORS.textPrimary}
                />
            </TouchableOpacity>

            <TouchableOpacity
                style={barStyles.roomTitle}
                onPress={onHeaderPress}
                activeOpacity={0.7}
            >
                <View style={barStyles.roomInfo}>
                    {chatRoom?.matchTitle ? (
                        <LinearGradient
                            colors={['rgba(255, 184, 0, 0.3)', 'rgba(255, 184, 0, 0.1)']}
                            style={barStyles.roomPicture}
                        >
                            <Text style={barStyles.roomLetter}>
                                {(chatRoom.matchTitle || 'C').charAt(0).toUpperCase()}
                            </Text>
                        </LinearGradient>
                    ) : (
                        <View style={barStyles.roomPicturePlain}>
                            <Text style={barStyles.roomLetter}>
                                {(chatRoom?.matchTitle || 'C').charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={barStyles.roomTextBox}>
                        <Text style={barStyles.roomName} numberOfLines={1}>
                            {chatRoom?.matchTitle || 'Discussion'}
                        </Text>
                        <Text style={barStyles.memberCount} numberOfLines={1}>
                            {friendCount || 0} Participants
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={barStyles.groupButton}
                onPress={onHeaderPress}
            >
                <MaterialCommunityIcons
                    name="account-group"
                    size={24}
                    color={THEME_COLORS.textPrimary}
                />
            </TouchableOpacity>
        </View>
    );
}

const barStyles = StyleSheet.create({
    topBar: {
        flexDirection: 'row',
        top: 10,
        alignItems: 'center',
        backgroundColor: 'rgba(10, 10, 10, 0.95)',
        borderBottomWidth: 1,
        borderBottomColor: THEME_COLORS.divider,
        paddingHorizontal: 16,
        paddingBottom: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: THEME_COLORS.cardAccent,
        justifyContent: 'center',
        alignItems: 'center'
    },
    roomTitle: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8
    },
    roomInfo: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    roomPicture: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    roomPicturePlain: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(26,26,26,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)'
    },
    roomLetter: {
        color: THEME_COLORS.textPrimary,
        fontSize: 18,
        fontWeight: 'bold'
    },
    roomTextBox: {
        flex: 1,
        justifyContent: 'center'
    },
    roomName: {
        color: THEME_COLORS.textPrimary,
        fontSize: 17,
        fontWeight: '600'
    },
    memberCount: {
        color: THEME_COLORS.textSecondary,
        fontSize: 13,
        marginTop: 1
    },
    groupButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: THEME_COLORS.cardAccent,
        justifyContent: 'center',
        alignItems: 'center'
    }
});
