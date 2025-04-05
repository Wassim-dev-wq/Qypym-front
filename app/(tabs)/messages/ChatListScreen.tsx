import React, {useCallback, useEffect, useRef, useState} from 'react'
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native'
import {MaterialCommunityIcons} from '@expo/vector-icons'
import {useRouter} from 'expo-router'
import {LinearGradient} from 'expo-linear-gradient'
import {COLORS, THEME_COLORS} from '@/src/constants/Colors'
import {ChatRoom, chatService} from '@/src/core/api/chatService'
import {useAuth} from '@/src/core/api/auth/useAuth'
import {t} from 'src/constants/locales'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import GroupChatItem from "@/app/(tabs)/messages/GroupChatItem";

const {width: deviceWidth} = Dimensions.get('window')

export default function ChatListScreen() {
    const router = useRouter()
    const {user: currentUser} = useAuth()
    const insets = useSafeAreaInsets()

    const [rooms, setRooms] = useState<ChatRoom[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [unread, setUnread] = useState(0)
    const [errMsg, setErrMsg] = useState<string | null>(null)

    const fadeAnim = useRef(new Animated.Value(0)).current
    const scaleAnim = useRef(new Animated.Value(0.95)).current

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
        ]).start()
    }, [])

    const onTryAgain = useCallback(async () => {
        if (!currentUser?.keycloakUserId) return
        setLoading(true)
        setErrMsg(null)
        try {
            const count = await chatService.getUnreadCount(currentUser.keycloakUserId)
            setUnread(count)
        } catch {
            setErrMsg(t('error_refresh'))
        } finally {
            setLoading(false)
        }
    }, [currentUser?.keycloakUserId])

    const onRefresh = useCallback(async () => {
        if (!currentUser?.keycloakUserId) return
        setRefreshing(true)
        try {
            const count = await chatService.getUnreadCount(currentUser.keycloakUserId)
            setUnread(count)
        } finally {
            setRefreshing(false)
        }
    }, [currentUser?.keycloakUserId])

    const onRoomAction = useCallback(async (chatId: string, action: 'delete' | 'mute' | 'unmute') => {
        try {
            if (action === 'delete') {
                await chatService.deleteChatRoom(chatId)
            } else if (action === 'mute' || action === 'unmute') {
                await chatService.muteConversation(chatId, currentUser?.keycloakUserId, action === 'mute');
            }
        } catch {
        }
    }, [])

    useEffect(() => {
        if (!currentUser?.keycloakUserId) return
        let unsub: () => void

        const getRooms = async () => {
            try {
                unsub = chatService.subscribeToUserChatRooms(
                    currentUser.keycloakUserId,
                    data => {
                        const sorted = data.sort(
                            (a, b) => (b.lastMessageTime?.getTime() || 0) - (a.lastMessageTime?.getTime() || 0)
                        )
                        setRooms(sorted)
                        setErrMsg(null)
                    },
                    () => {
                        setErrMsg(t('error_conversations'))
                    }
                )
            } catch {
                setErrMsg(t('error_messages'))
            } finally {
                setLoading(false)
            }
        }

        getRooms()
        return () => {
            if (unsub) unsub()
        }
    }, [currentUser?.id])

    const renderTopBar = () => (
        <View style={[styles.topBarBox]}>
            <LinearGradient
                colors={['rgba(10, 10, 10, 0.98)', 'rgba(10, 10, 10, 0.95)']}
                style={styles.topBarOverlay}
            >
                <Text style={styles.topBarTitle}>
                    {t('messagesHeader')}
                </Text>
                <Text style={styles.topBarSubtitle}>
                    {rooms.length}{' '}
                    {rooms.length === 1 ? t('conversation') : t('conversations')}
                </Text>
            </LinearGradient>
        </View>
    )

    if (loading) {
        return (
            <View style={[styles.centerBox, {paddingBottom: insets.bottom}]}>
                <ActivityIndicator size="large" color={COLORS.primary.accent}/>
                <Text style={styles.loadingMsg}>
                    {t('loading_conversations')}
                </Text>
            </View>
        )
    }

    if (errMsg) {
        return (
            <Animated.View
                style={[
                    styles.centerBox,
                    {
                        paddingBottom: insets.bottom,
                        opacity: fadeAnim,
                        transform: [{scale: scaleAnim}]
                    }
                ]}
            >
                <View style={styles.errorSymbolBox}>
                    <MaterialCommunityIcons
                        name="alert-circle-outline"
                        size={60}
                        color={THEME_COLORS.error}
                    />
                </View>
                <Text style={styles.errorHeading}>{t('error_occurred')}</Text>
                <Text style={styles.errorMsg}>{errMsg}</Text>
                <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={onTryAgain}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                        style={styles.retryOverlay}
                    >
                        <Text style={styles.retryMsg}>
                            {t('try_again')}
                        </Text>
                        <MaterialCommunityIcons
                            name="refresh"
                            size={18}
                            color="#000"
                        />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        )
    }

    if (rooms.length === 0) {
        return (
            <View style={styles.mainBox}>
                <StatusBar barStyle="light-content"/>
                <LinearGradient
                    colors={['rgba(10, 10, 10, 0.98)', 'rgba(10, 10, 10, 0.95)']}
                    style={[styles.pinnedBar, {paddingTop: insets.top}]}
                >
                    <Text style={styles.pinnedBarTitle}>
                        {t('messagesHeader')}
                    </Text>
                </LinearGradient>
                <Animated.View
                    style={[
                        styles.centerBox,
                        {
                            paddingBottom: insets.bottom,
                            opacity: fadeAnim,
                            transform: [{scale: scaleAnim}]
                        }
                    ]}
                >
                    <Text style={styles.noChatMsg}>{t('start_chat')}</Text>
                </Animated.View>
            </View>
        )
    }

    return (
        <View style={[styles.mainBox, {paddingBottom: insets.bottom}]}>
            <StatusBar barStyle="light-content"/>
            {renderTopBar()}
            <Animated.View
                style={{
                    flex: 1,
                    opacity: fadeAnim,
                    transform: [{scale: scaleAnim}]
                }}
            >
                <FlatList
                    data={rooms}
                    keyExtractor={item => item.id}
                    renderItem={({item}) => (
                        <GroupChatItem
                            room={item}
                            onAction={onRoomAction}
                            userId={currentUser?.keycloakUserId}
                        />
                    )}
                    contentContainerStyle={[
                        styles.scrollBox,
                        {paddingTop: 60}
                    ]}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={COLORS.primary.accent}
                            colors={[COLORS.primary.accent]}
                            progressViewOffset={60}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            </Animated.View>
            {unread > 0 && (
                <View style={styles.unreadBadgeBox}>
                    <LinearGradient
                        colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                        style={styles.unreadBadge}
                    >
                        <Text style={styles.unreadMsgText}>
                            {unread}
                        </Text>
                    </LinearGradient>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    mainBox: {
        flex: 1,
        backgroundColor: THEME_COLORS.background
    },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: THEME_COLORS.background,
        padding: 20,
    },
    scrollBox: {
        paddingHorizontal: 16,
        paddingBottom: 24
    },
    topBarBox: {
        height: 100,
        top: 40,
        width: '100%',
        zIndex: 10,
        backgroundColor: 'transparent'
    },
    topBarOverlay: {
        paddingHorizontal: 16,
        justifyContent: 'flex-end',
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 184, 0, 0.1)',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 10,
        height: '100%'
    },
    topBarTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
        marginBottom: 4
    },
    topBarSubtitle: {
        fontSize: 16,
        color: THEME_COLORS.textSecondary,
        marginTop: 4
    },
    pinnedBar: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 184, 0, 0.1)',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 10
    },
    pinnedBarTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
        marginTop: 16
    },
    loadingMsg: {
        marginTop: 16,
        color: THEME_COLORS.textSecondary,
        fontSize: 16
    },
    errorSymbolBox: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)'
    },
    errorHeading: {
        fontSize: 22,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
        marginTop: 16,
        marginBottom: 8
    },
    errorMsg: {
        color: THEME_COLORS.textSecondary,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        maxWidth: '80%'
    },
    retryBtn: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    retryOverlay: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
    },
    retryMsg: {
        color: '#000',
        fontWeight: '600',
        fontSize: 16
    },
    noChatMsg: {
        fontSize: 16,
        color: THEME_COLORS.textSecondary,
        textAlign: 'center',
        maxWidth: deviceWidth * 0.8,
        marginBottom: 32,
        lineHeight: 22
    },
    floatingBtnBox: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
        zIndex: 100
    },
    floatingBtn: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center'
    },
    unreadBadgeBox: {
        position: 'absolute',
        bottom: 75,
        right: 25,
        zIndex: 100
    },
    unreadBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#FFFFFF'
    },
    unreadMsgText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 12
    }
})