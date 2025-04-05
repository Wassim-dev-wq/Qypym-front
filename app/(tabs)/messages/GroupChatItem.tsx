import React, {useCallback, useEffect, useState} from 'react'
import {KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View} from 'react-native'
import {Ionicons, MaterialCommunityIcons} from '@expo/vector-icons'
import {useRouter} from 'expo-router'
import {format, isToday, isYesterday} from 'date-fns'
import {COLORS} from '@/src/constants/Colors'
import {ChatRoom, chatService} from '@/src/core/api/chatService'
import {Menu, MenuOption, MenuOptions, MenuTrigger} from 'react-native-popup-menu'
import {t} from 'src/constants/locales'

interface GroupChatProps {
    room: ChatRoom
    userId: string | undefined
    onAction: (roomId: string, action: 'delete' | 'mute' | 'unmute') => void
}

export default function GroupChatItem({room, userId, onAction}: GroupChatProps) {
    const router = useRouter()
    const buddyId = room.participants?.find(id => id !== userId)
    const unreadCount = room.unreadCount?.[userId || ''] || 0
    const isTyping = room.typing?.[buddyId || ''] || false
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        if (room.id && userId) {
            chatService.isConversationMuted(room.id, userId)
                .then(muted => setIsMuted(muted))
        }
    }, [room.id, userId]);

    const formatTime = (date?: Date): string => {
        if (!date) return ''
        if (isToday(date)) return format(date, 'HH:mm')
        if (isYesterday(date)) return t('yesterday')
        return format(date, 'dd/MM/yyyy')
    }

    const onOpenRoom = useCallback(() => {
        router.push({
            pathname: "/(modals)/chat/[id]",
            params: {
                id: room.id,
                participants: JSON.stringify(room.participants)
            }
        })
        if (unreadCount > 0) {
            chatService.markMessagesAsRead(room.id, userId).catch(() => {
            })
        }
    }, [router, room.id, room.participants, userId, unreadCount])


    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{flex: 1}}
        >
            <TouchableOpacity
                style={[styles.chatContainer, unreadCount > 0 && styles.unreadBg]}
                onPress={onOpenRoom}
                activeOpacity={0.7}
            >
                <View style={styles.chatRow}>
                    <View style={styles.avatarWrap}>
                        <View style={styles.avatarBg}>
                            <MaterialCommunityIcons
                                name="account-group"
                                size={32}
                                color={COLORS.primary.accent}
                            />
                        </View>
                        {isMuted && (
                            <View style={styles.mutedIndicator}>
                                <MaterialCommunityIcons
                                    name="bell-off-outline"
                                    size={14}
                                    color={COLORS.neutral[400]}
                                />
                            </View>
                        )}
                        {isTyping && (
                            <View style={styles.typingStatus}>
                                <MaterialCommunityIcons
                                    name="message-processing"
                                    size={16}
                                    color={COLORS.neutral[400]}
                                />
                            </View>
                        )}
                    </View>
                    <View style={styles.messageWrap}>
                        <View style={styles.topRow}>
                            <Text style={styles.groupTitle} numberOfLines={1}>
                                {room.matchTitle || t('match_group')}
                            </Text>
                            <Text style={styles.timeText}>
                                {formatTime(room.lastMessageTime || room.createdAt)}
                            </Text>
                        </View>
                        <View style={styles.bottomRow}>
                            {room.sportType && (
                                <View style={styles.sportBadge}>
                                    <MaterialCommunityIcons
                                        name="soccer"
                                        size={14}
                                        color={COLORS.primary.accent}
                                    />
                                    <Text style={styles.sportLabel}>{room.sportType}</Text>
                                </View>
                            )}
                            <Text
                                style={[styles.previewText, unreadCount > 0 && styles.previewUnreadText]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {room.lastMessage || t('no_messages_yet')}
                            </Text>
                            {unreadCount > 0 && (
                                <View style={styles.countWrap}>
                                    <Text style={styles.countText}>{unreadCount}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <Menu>
                        <MenuTrigger>
                            <View style={styles.menuBtn}>
                                <Ionicons
                                    name="ellipsis-vertical"
                                    size={20}
                                    color={COLORS.neutral[400]}
                                />
                            </View>
                        </MenuTrigger>
                        <MenuOptions customStyles={menuStyles}>
                            <MenuOption
                                onSelect={() => onAction(room.id, 'delete')}
                                customStyles={{optionWrapper: styles.menuOption, optionText: styles.optionDeleteText}}
                            >
                                <MaterialCommunityIcons
                                    name="delete-outline"
                                    size={20}
                                    color={COLORS.secondary.error}
                                />
                                <Text style={styles.optionDeleteText}>{t('leave_group')}</Text>
                            </MenuOption>
                            <MenuOption
                                onSelect={() => {
                                    const action = isMuted ? 'unmute' : 'mute';
                                    onAction(room.id, action);
                                    setIsMuted(!isMuted);
                                }}
                                customStyles={{optionWrapper: styles.menuOption, optionText: styles.optionText}}
                            >
                                <MaterialCommunityIcons
                                    name={isMuted ? "bell-off-outline" : "bell-outline"}
                                    size={20}
                                    color={COLORS.neutral[200]}
                                />
                                <Text style={styles.optionText}>
                                    {isMuted ? t('unmute_group') : t('mute_group')}
                                </Text>
                            </MenuOption>
                        </MenuOptions>
                    </Menu>
                </View>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    )
}

const menuStyles = {
    optionsContainer: {
        backgroundColor: COLORS.neutral[900],
        borderRadius: 12,
        padding: 4,
        width: 200,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 4},
                shadowOpacity: 0.35,
                shadowRadius: 12
            },
            android: {
                elevation: 12
            }
        })
    }
}

const styles = StyleSheet.create({
    chatContainer: {
        marginVertical: 0,
        backgroundColor: 'transparent',
        paddingHorizontal: 16
    },
    unreadBg: {
        backgroundColor: 'rgba(99,102,241,0.06)'
    },
    chatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10
    },
    avatarWrap: {
        position: 'relative',
        marginRight: 12
    },
    avatarBg: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(99,102,241,0.08)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    typingStatus: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: COLORS.neutral[900],
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.primary.accent
    },
    mutedIndicator: {
        position: 'absolute',
        top: 12,
        right: 40,
        backgroundColor: COLORS.neutral[900],
        borderRadius: 8,
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: COLORS.neutral[800],
    },
    messageWrap: {
        flex: 1,
        marginRight: 12
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    groupTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.neutral[50],
        flex: 1,
        marginRight: 8,
        letterSpacing: -0.3
    },
    timeText: {
        fontSize: 12,
        color: COLORS.neutral[400],
        marginTop: 2
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    sportBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(99,102,241,0.08)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginRight: 8
    },
    sportLabel: {
        fontSize: 12,
        color: COLORS.primary.accent,
        fontWeight: '500',
        marginLeft: 3
    },
    previewText: {
        fontSize: 13,
        color: COLORS.neutral[400],
        flex: 1,
        marginRight: 8
    },
    previewUnreadText: {
        color: COLORS.neutral[200],
        fontWeight: '500'
    },
    countWrap: {
        backgroundColor: COLORS.primary.accent,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6
    },
    countText: {
        color: COLORS.neutral[50],
        fontSize: 11,
        fontWeight: '600'
    },
    menuBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent'
    },
    menuOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 12,
        borderRadius: 8,
        marginHorizontal: 4
    },
    optionText: {
        fontSize: 14,
        color: COLORS.neutral[200],
        fontWeight: '500'
    },
    optionDeleteText: {
        fontSize: 14,
        color: COLORS.validation.errorText,
        fontWeight: '500'
    }
})

export type {GroupChatProps}
