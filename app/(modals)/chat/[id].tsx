import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {
    Avatar,
    Bubble,
    Composer,
    GiftedChat,
    IMessage,
    InputToolbar,
    MessageImage,
    MessageText,
    Send,
    Time
} from 'react-native-gifted-chat';
import {Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {ChatMessage, ChatRoom, chatService, setupPresenceTracking, updateUserStatus} from '@/src/core/api/chatService';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import ChatTopBar from '@/app/(tabs)/messages/components/ChatTopBar';
import FriendItem from '@/app/(tabs)/messages/components/FriendItem';
import {useIsFocused} from '@react-navigation/native';
import {useAuth} from "@/src/core/api/auth/useAuth";
import {useUser} from "@/src/core/hooks/useUserFetch";
import {User} from "@/src/types/user/user";
import {t} from "@/src/constants/locales";

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

interface ChatState {
    chatRoom: ChatRoom | null;
    messages: ChatMessage[];
    isLoading: boolean;
    loadingOlder: boolean;
    errorMsg: string | null;
    typingUsers: string[];
    userProfiles: Map<string, User>;
    showParticipantsModal: boolean;
    showAttachmentOptions: boolean;
    isUploading: boolean;
    showImageViewer: boolean;
    selectedImage: string | null;
}

export default function ChatDetailScreen() {
    const params = useLocalSearchParams();
    const chatId = params.id as string;
    const router = useRouter();
    const isFocused = useIsFocused();
    const edges = useSafeAreaInsets();
    const listRef = useRef<FlatList>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    const [myUserId, setMyUserId] = useState<string>('');
    const {data: currentUser, isLoading: loadingCurrentUser} = useUser(myUserId);

    const [state, setState] = useState<ChatState>({
        chatRoom: null,
        messages: [],
        isLoading: true,
        loadingOlder: false,
        errorMsg: null,
        typingUsers: [],
        userProfiles: new Map(),
        showParticipantsModal: false,
        showAttachmentOptions: false,
        isUploading: false,
        showImageViewer: false,
        selectedImage: null,
    });

    const [inputHeight, setInputHeight] = useState(44);
    const [keyboardOpen, setKeyboardOpen] = useState(false);
    const {userId} = useAuth();

    useEffect(() => {
        if (userId) {
            updateUserStatus(userId, null, true);
        }
    }, [userId]);

    useEffect(() => {
        if (currentUser?.keycloakUserId && chatId) {
            const cleanupPresence = setupPresenceTracking(currentUser?.keycloakUserId, chatId);

            return () => {
                cleanupPresence();
            };
        }
    }, [currentUser?.keycloakUserId, chatId]);

    const handleBack = useCallback(() => {
        router.back();
    }, [router]);

    const navigateToMatch = useCallback(() => {
        if (state.chatRoom?.matchId) {
            setState(prev => ({...prev, showParticipantsModal: false}));
            router.navigate({
                pathname: '/(modals)/[matchId]',
                params: {
                    matchId: state.chatRoom!.matchId,
                    source: 'chat'
                }
            });
        }
    }, [state.chatRoom, router]);

    const toggleParticipantsModal = useCallback((show: boolean) => {
        setState(prev => ({...prev, showParticipantsModal: show}));
    }, []);

    const toggleAttachmentOptions = useCallback((show: boolean) => {
        setState(prev => ({...prev, showAttachmentOptions: show}));
    }, []);

    useEffect(() => {
        if (!state.isLoading && !loadingCurrentUser) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [state.isLoading, loadingCurrentUser, fadeAnim, scaleAnim]);

    useEffect(() => {
        let isMounted = true;

        const loadChatRoom = async () => {
            try {
                if (!chatId) return;

                setState(prev => ({...prev, isLoading: true}));
                const room = await chatService.getChatRoom(chatId);
                if (!isMounted) return;
                if (room) {
                    setState(prev => ({...prev, chatRoom: room}));
                    setMyUserId(userId);
                    if (room.participants?.length > 0) {
                        const profiles = await chatService.loadUserProfiles(room.participants);
                        if (isMounted) {
                            setState(prev => ({...prev, userProfiles: profiles}));
                        }
                    }
                } else {
                    setState(prev => ({...prev, errorMsg: t('chat_not_found')}));
                }
            } catch (e) {
                console.error(t('error_loading_chat'), e);
                if (isMounted) {
                    setState(prev => ({...prev, errorMsg: t('error_loading_chat')}));
                }
            } finally {
                if (isMounted) {
                    setState(prev => ({...prev, isLoading: false}));
                }
            }
        };

        loadChatRoom();

        return () => {
            isMounted = false;
        };
    }, [chatId]);

    useEffect(() => {
        if (!chatId || !myUserId || !isFocused) return;
        setState(prev => ({...prev, isLoading: true}));
        setTimeout(() => {
            chatService.markMessagesAsRead(chatId, myUserId)
                .catch(err => console.error(t('error_marking_read'), err));
        }, 300);

        const unsubscribeMessages = chatService.subscribeToMessages(
            chatId,
            (newMessages) => {
                setState(prev => ({
                    ...prev,
                    messages: newMessages,
                    isLoading: false
                }));

                if (newMessages.length > 0) {
                    chatService
                        .markMessagesAsDelivered(chatId, myUserId, newMessages)
                        .catch(err => console.error(t('error_marking_delivered'), err));
                }
            },
            50
        );

        const unsubscribeTyping = chatService.subscribeToTypingStatus(
            chatId,
            (typingStatus) => {
                const typingUsers = Object.entries(typingStatus)
                    .filter(([id, isTyping]) => isTyping && id !== myUserId)
                    .map(([id]) => id);

                setState(prev => ({...prev, typingUsers}));
            }
        );

        return () => {
            unsubscribeMessages();
            unsubscribeTyping();
        };
    }, [chatId, myUserId, isFocused]);

    useEffect(() => {
        if (!isFocused || !chatId || !myUserId || state.messages.length === 0) return;
        const markAsRead = () => {
            chatService.markMessagesAsRead(chatId, myUserId)
                .catch(err => console.error(t('error_marking_read'), err));
        };
        markAsRead();
        const interval = setInterval(markAsRead, 5000);
        return () => clearInterval(interval);
    }, [isFocused, chatId, myUserId, state.messages.length]);

    const handleSend = useCallback(
        (newMessages: IMessage[] = []) => {
            if (!myUserId || !chatId || !currentUser) return;
            newMessages.forEach(msg => {
                chatService
                    .sendMessage(chatId, {
                        ...msg,
                        user: {
                            _id: myUserId,
                            name: currentUser.username || currentUser.firstName || myUserId,
                            avatar: currentUser.avatar ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    currentUser.username || 'U'
                                )}&background=random`
                        }
                    })
                    .catch(err => console.error(t('error_sending_message'), err));
            });
        },
        [myUserId, chatId, currentUser]
    );

    const handleImagePress = useCallback((imageUrl: string) => {
        setState(prev => ({
            ...prev,
            showImageViewer: true,
            selectedImage: imageUrl
        }));
    }, []);


    const handleLoadEarlier = useCallback(async () => {
        if (state.messages.length === 0 || !chatId || state.loadingOlder) return;

        try {
            setState(prev => ({...prev, loadingOlder: true}));

            const oldest = state.messages[state.messages.length - 1];

            const createdAtValue = oldest.createdAt instanceof Date
                ? oldest.createdAt
                : new Date(oldest.createdAt);

            const olderMessages = await chatService.loadMoreMessages(
                chatId,
                createdAtValue,
                30
            );

            if (olderMessages.length > 0) {
                setState(prev => ({
                    ...prev,
                    messages: [...prev.messages, ...olderMessages]
                }));
            }
        } catch (err) {
            console.error(t('error_loading_earlier'), err);
        } finally {
            setState(prev => ({...prev, loadingOlder: false}));
        }
    }, [chatId, state.messages, state.loadingOlder]);

    const handleInputTextChanged = useCallback(
        (text: string) => {
            if (!myUserId || !chatId) return;
            chatService.updateTypingStatus(chatId, myUserId, text.length > 0);
        },
        [myUserId, chatId]
    );

    const getTypingText = useCallback(() => {
        if (state.typingUsers.length === 0) return undefined;

        const typingUserNames = state.typingUsers.map(userId => {
            const user = state.userProfiles.get(userId);
            return user?.username || user?.firstName || userId;
        });

        if (typingUserNames.length === 1) {
            return `${typingUserNames[0]} ${t('is_typing')}`;
        }

        return t('someone_typing');
    }, [state.typingUsers, state.userProfiles]);


    const renderBubble = useCallback((props: any) => {
        return (
            <Bubble
                {...props}
                wrapperStyle={{
                    right: styles.myBubble,
                    left: styles.otherBubble
                }}
                containerStyle={{
                    left: {marginLeft: 6},
                    right: {marginRight: 6}
                }}
                touchableProps={{activeOpacity: 0.7}}
            />
        );
    }, []);

    const renderMessage = useCallback((props: any) => {
        const {currentMessage, previousMessage, nextMessage} = props;
        if (!currentMessage?.user) return null;

        const isFirstInSequence =
            !previousMessage ||
            !previousMessage.user ||
            previousMessage.user._id !== currentMessage.user._id;

        const isLastInSequence =
            !nextMessage ||
            !nextMessage.user ||
            nextMessage.user._id !== currentMessage.user._id;

        const isMyMessage = currentMessage.user._id === myUserId;
        const shouldShowName = !isMyMessage && isFirstInSequence;

        const hasAttachments = currentMessage.attachments && currentMessage.attachments.length > 0;

        return (
            <View style={{marginBottom: isLastInSequence ? 10 : 2}}>
                {shouldShowName && (
                    <Text style={[styles.senderName, {marginLeft: 16}]}>
                        {currentMessage.user.name || t('unknown_user')}
                    </Text>
                )}
                {hasAttachments && currentMessage.attachments[0].type === 'document' && (
                    <View style={[
                        styles.documentContainer,
                        isMyMessage ? styles.myDocumentContainer : styles.otherDocumentContainer
                    ]}>
                        <View style={styles.documentIconContainer}>
                            <MaterialCommunityIcons name="file-document-outline" size={24}
                                                    color={isMyMessage ? "#000" : COLORS.primary.accent}/>
                        </View>
                        <View style={styles.documentInfo}>
                            <Text
                                style={[styles.documentName, isMyMessage ? styles.myDocumentText : styles.otherDocumentText]}
                                numberOfLines={1}>
                                {currentMessage.attachments[0].name || t('document')}
                            </Text>
                            {currentMessage.attachments[0].size && (
                                <Text
                                    style={[styles.documentSize, isMyMessage ? styles.myDocumentText : styles.otherDocumentText]}>
                                    {(currentMessage.attachments[0].size / 1024).toFixed(1)} KB
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity style={styles.documentDownload}>
                            <MaterialCommunityIcons
                                name="download"
                                size={20}
                                color={isMyMessage ? "#000" : COLORS.primary.accent}
                            />
                        </TouchableOpacity>
                    </View>
                )}
                {renderBubble(props)}
            </View>
        );
    }, [myUserId, renderBubble]);

    const renderAvatar = useCallback((props: any) => {
        const {currentMessage, previousMessage} = props;
        if (!currentMessage?.user) return null;

        const isSameUser =
            previousMessage &&
            previousMessage.user &&
            previousMessage.user._id === currentMessage.user._id;

        const isCurrentUser = currentMessage.user._id === myUserId;
        if (isCurrentUser) return null;
        if (isSameUser) return <View style={{width: 36, marginRight: 6}}/>;

        const profile = state.userProfiles.get(currentMessage.user._id.toString());

        return (
            <Avatar
                {...props}
                containerStyle={styles.avatarContainer}
                imageStyle={styles.avatarImage}
                renderAvatar={() => (
                    <View style={styles.avatarContainer}>
                        {profile?.avatar || currentMessage.user.avatar ? (
                            <Image
                                source={{
                                    uri: profile?.avatar || currentMessage.user.avatar
                                }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Text style={styles.avatarInitials}>
                                    {getInitials(currentMessage.user.name || profile?.username || profile?.firstName || '')}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            />
        );
    }, [myUserId, state.userProfiles]);
    const renderMessageImage = useCallback((props: any) => {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleImagePress(props.currentMessage.image)}
                style={styles.imageContainer}
            >
                <MessageImage
                    {...props}
                    imageStyle={styles.messageImage}
                    lightboxProps={{
                        useNativeDriver: true,
                    }}
                />
            </TouchableOpacity>
        );
    }, [handleImagePress]);
    const getInitials = (name: string): string => {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name[0]?.toUpperCase() || '?';
    };
    const renderInputToolbar = useCallback((props: any) => (
        <InputToolbar
            {...props}
            containerStyle={styles.inputBox}
            primaryStyle={styles.inputMain}
        />
    ), []);
    const renderComposer = useCallback((props: any) => (
        <Composer
            {...props}
            textInputStyle={styles.messageInput}
            textInputProps={{
                placeholderTextColor: THEME_COLORS.textPlaceholder,
                selectionColor: COLORS.primary.accent,
                multiline: true,
            }}
        />
    ), []);
    const renderSend = useCallback((props: any) => {
        if (!props.text) {
            return (
                <Send {...props} containerStyle={styles.sendBox} disabled={true}>
                    <View style={styles.sendButtonWrap}>
                        <MaterialCommunityIcons
                            name="send-circle"
                            size={36}
                            color={THEME_COLORS.cardAccent}
                        />
                    </View>
                </Send>
            );
        }
        return (
            <Send {...props} containerStyle={styles.sendBox} disabled={!props.text}>
                <View style={styles.sendButtonWrap}>
                    <LinearGradient
                        colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                        style={styles.sendButtonGlow}
                    >
                        <MaterialCommunityIcons
                            name="send"
                            size={20}
                            color="#000"
                        />
                    </LinearGradient>
                </View>
            </Send>
        );
    }, []);
    const renderActions = useCallback(() => {
        return (
            <TouchableOpacity
                style={styles.attachButton}
                onPress={() => toggleAttachmentOptions(true)}
            >
                <MaterialCommunityIcons
                    name="paperclip"
                    size={24}
                    color={COLORS.primary.accent}
                />
            </TouchableOpacity>
        );
    }, [toggleAttachmentOptions]);
    const renderTime = useCallback((props: any) => (
        <Time
            {...props}
            timeTextStyle={{
                right: {color: 'rgba(0, 0, 0, 0.5)', fontSize: 11},
                left: {color: THEME_COLORS.textSecondary, fontSize: 11}
            }}
            containerStyle={{
                left: {marginLeft: 0, marginBottom: 0},
                right: {marginRight: 0, marginBottom: 0}
            }}
        />
    ), []);
    const renderMessageText = useCallback((props: any) => (
        <MessageText
            {...props}
            textStyle={{
                right: {color: '#000', lineHeight: 20},
                left: {color: THEME_COLORS.textPrimary, lineHeight: 20}
            }}
            linkStyle={{
                left: {color: COLORS.primary.accent},
                right: {color: '#000', textDecorationLine: 'underline'}
            }}
        />
    ), []);
    const ensureValidMessages = useCallback((msgs: ChatMessage[]) => {
        return msgs
            .map(m => ({
                ...m,
                user: m.user || {_id: 'unknown', name: 'Unknown User'}
            }))
            .filter(Boolean);
    }, []);
    if (state.isLoading || loadingCurrentUser) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="light-content"/>
                <View style={styles.centerScreen}>
                    <ActivityIndicator size="large" color={COLORS.primary.accent}/>
                    <Text style={styles.loadingText}>{t('loading_messages')}</Text>
                </View>
            </SafeAreaView>
        );
    }
    if (state.errorMsg) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="light-content"/>
                <View style={styles.centerScreen}>
                    <MaterialCommunityIcons
                        name="alert-circle-outline"
                        size={60}
                        color={THEME_COLORS.error}
                    />
                    <Text style={styles.errorTitle}>{t('error_occurred')}</Text>
                    <Text style={styles.errorMessage}>{state.errorMsg}</Text>
                    <TouchableOpacity
                        style={styles.tryAgainButton}
                        onPress={handleBack}
                    >
                        <LinearGradient
                            colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                            style={styles.tryAgainGlow}
                        >
                            <Text style={styles.tryAgainText}>{t('back')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content"/>
            <Animated.View
                style={[
                    styles.container,
                    {
                        opacity: fadeAnim,
                        transform: [{scale: scaleAnim}]
                    }
                ]}
            >
                <ChatTopBar
                    chatRoom={state.chatRoom}
                    onBackPress={handleBack}
                    onHeaderPress={() => toggleParticipantsModal(true)}
                    friendCount={state.chatRoom?.participants?.length}
                />

                <View style={styles.mainBox}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? -120 : 0}
                        style={styles.keyboardFix}
                    >
                        {state.isUploading && (
                            <View style={styles.uploadingOverlay}>
                                <ActivityIndicator size="large" color={COLORS.primary.accent}/>
                                <Text style={styles.uploadingText}>{t('uploading')}</Text>
                            </View>
                        )}

                        <GiftedChat
                            messages={ensureValidMessages(state.messages)}
                            onSend={handleSend}
                            user={{
                                _id: myUserId,
                                name: currentUser?.username || currentUser?.firstName || '',
                                avatar: currentUser?.avatar ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                        currentUser?.username || 'U'
                                    )}&background=random`
                            }}
                            renderMessage={renderMessage}
                            renderAvatar={renderAvatar}
                            renderInputToolbar={renderInputToolbar}
                            renderComposer={renderComposer}
                            renderSend={renderSend}
                            renderTime={renderTime}
                            renderMessageText={renderMessageText}
                            renderMessageImage={renderMessageImage}
                            showUserAvatar
                            alwaysShowSend
                            scrollToBottom
                            infiniteScroll
                            maxComposerHeight={100}
                            loadEarlier={state.messages.length >= 30}
                            isLoadingEarlier={state.loadingOlder}
                            onLoadEarlier={handleLoadEarlier}
                            isTyping={!!getTypingText()}
                            renderFooter={() =>
                                getTypingText() ? (
                                    <View style={styles.typingBox}>
                                        <Text style={styles.typingText}>{getTypingText()}</Text>
                                    </View>
                                ) : null
                            }
                            onInputTextChanged={handleInputTextChanged}
                            listViewProps={{
                                style: styles.messageList,
                                contentContainerStyle: styles.messagesContent,
                                ref: listRef,
                                onScrollToIndexFailed: () => {
                                },
                                onEndReached: Platform.OS === 'ios' ? handleLoadEarlier : undefined,
                                onEndReachedThreshold: 0.2,
                                showsVerticalScrollIndicator: false,
                                removeClippedSubviews: true,
                                windowSize: 10,
                                initialNumToRender: 15,
                                maxToRenderPerBatch: 10,
                                updateCellsBatchingPeriod: 50,
                            }}
                            timeFormat="HH:mm"
                            dateFormat="DD.MM.YYYY"
                            bottomOffset={Platform.OS === 'ios' ? (keyboardOpen ? 0 : edges.bottom) : 0}
                            minInputToolbarHeight={inputHeight}
                            messagesContainerStyle={{paddingBottom: Platform.OS === 'ios' ? 10 : 0}}
                            textInputProps={{
                                autoCorrect: true,
                            }}
                        />
                    </KeyboardAvoidingView>
                </View>
            </Animated.View>

            {state.showParticipantsModal && (
                <Modal
                    visible={state.showParticipantsModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => toggleParticipantsModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <Pressable
                            style={styles.modalBackground}
                            onPress={() => toggleParticipantsModal(false)}
                        />
                        <SafeAreaView style={styles.modalBox}>
                            <View style={styles.modalTop}>
                                <View style={styles.handleBar}/>
                                <TouchableOpacity
                                    style={styles.matchTitleContainer}
                                    onPress={navigateToMatch}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.modalTitle}>
                                        {state.chatRoom?.matchTitle || t('chat')}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => toggleParticipantsModal(false)}
                                >
                                    <Ionicons
                                        name="close"
                                        size={24}
                                        color={THEME_COLORS.textPrimary}
                                    />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.modalContent}>
                                <LinearGradient
                                    colors={['rgba(255, 184, 0, 0.2)', 'rgba(255, 184, 0, 0.05)']}
                                    style={styles.friendsTag}
                                >
                                    <Text style={styles.friendsTagText}>
                                        {t('participants')} ({state.chatRoom?.participants?.length || 0})
                                    </Text>
                                </LinearGradient>
                                <FlatList
                                    data={state.chatRoom?.participants || []}
                                    keyExtractor={(item) => `participant-${item}`}
                                    renderItem={({item: userId}) => (
                                        <FriendItem
                                            user={state.userProfiles.get(userId) || null}
                                            userId={userId}
                                            isLoading={!state.userProfiles.has(userId)}
                                            isCurrentUser={userId === myUserId}
                                            onModalClose={() => toggleParticipantsModal(false)}
                                        />
                                    )}
                                    contentContainerStyle={styles.friendsList}
                                    ListEmptyComponent={
                                        <View style={styles.noFriendsBox}>
                                            <MaterialCommunityIcons
                                                name="account-group-outline"
                                                size={48}
                                                color={THEME_COLORS.textSecondary}
                                            />
                                            <Text style={styles.noFriendsText}>
                                                {t('no_participants')}
                                            </Text>
                                        </View>
                                    }
                                    showsVerticalScrollIndicator={false}
                                />
                            </View>
                        </SafeAreaView>
                    </View>
                </Modal>
            )}

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: THEME_COLORS.background,
    },
    container: {
        flex: 1,
        backgroundColor: THEME_COLORS.background,
    },
    mainBox: {
        flex: 1,
        backgroundColor: THEME_COLORS.background,
    },
    keyboardFix: {
        flex: 1,
    },
    centerScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: THEME_COLORS.background,
        padding: 20
    },
    loadingText: {
        marginTop: 16,
        color: THEME_COLORS.textSecondary,
        fontSize: 16
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
        marginTop: 16,
        marginBottom: 8
    },
    errorMessage: {
        color: THEME_COLORS.textSecondary,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        maxWidth: '80%'
    },
    tryAgainButton: {
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 3
    },
    tryAgainGlow: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12
    },
    tryAgainText: {
        color: '#000',
        fontWeight: '600',
        fontSize: 16
    },
    uploadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    uploadingText: {
        color: 'white',
        marginTop: 12,
        fontSize: 16,
    },
    messageList: {
        backgroundColor: THEME_COLORS.background,
    },
    messagesContent: {
        paddingBottom: 8,
        paddingHorizontal: 4
    },
    inputBox: {
        backgroundColor: '#1A1A1A',
        borderTopWidth: 1,
        borderTopColor: THEME_COLORS.divider,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 24,
        marginHorizontal: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
        elevation: 2
    },
    inputMain: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 0
    },
    messageInput: {
        flex: 1,
        color: THEME_COLORS.textPrimary,
        backgroundColor: 'transparent',
        borderRadius: 20,
        paddingHorizontal: 12,
        marginLeft: 4,
        marginRight: 4,
        fontSize: 15,
        lineHeight: 20,
        maxHeight: 100,
        minHeight: 30
    },
    attachButton: {
        height: 40,
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
    },
    sendBox: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 4
    },
    sendButtonWrap: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center'
    },
    sendButtonGlow: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center'
    },
    typingBox: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center'
    },
    typingText: {
        color: THEME_COLORS.textSecondary,
        fontSize: 12,
        fontStyle: 'italic',
        marginLeft: 16
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        position: 'relative'
    },
    modalBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
    },
    modalBox: {
        backgroundColor: THEME_COLORS.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: 'auto',
        maxHeight: '90%',
        minHeight: 400
    },
    modalTop: {
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: THEME_COLORS.divider,
        paddingVertical: 16,
        paddingHorizontal: 20,
        position: 'relative'
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: THEME_COLORS.divider,
        borderRadius: 2,
        position: 'absolute',
        top: 8
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginTop: 12
    },
    closeButton: {
        position: 'absolute',
        right: 16,
        top: 16,
        padding: 4
    },
    modalContent: {
        flex: 1,
        padding: 16
    },
    matchTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: '#1A1A1A'
    },
    attachmentModalBox: {
        backgroundColor: THEME_COLORS.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: 'auto',
        padding: 16,
    },
    attachmentBar: {
        width: 40,
        height: 4,
        backgroundColor: THEME_COLORS.divider,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16
    },
    attachmentOptions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 20,
    },
    attachmentOption: {
        alignItems: 'center',
        width: SCREEN_WIDTH / 4,
    },
    attachmentIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    attachmentText: {
        color: THEME_COLORS.textPrimary,
        fontSize: 12,
        textAlign: 'center',
    },
    cancelButton: {
        marginTop: 16,
        borderRadius: 12,
        overflow: 'hidden',
    },
    cancelButtonGradient: {
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: 12,
    },
    cancelButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    imageViewerContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    imageViewerHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 40 : 16,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    imageViewerCloseButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageViewerActionButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageViewerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    friendsTag: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginBottom: 16
    },
    friendsTagText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary.accent
    },
    friendsList: {
        paddingBottom: 20
    },
    noFriendsBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40
    },
    noFriendsText: {
        color: THEME_COLORS.textSecondary,
        textAlign: 'center',
        padding: 20,
        fontSize: 14
    },
    senderName: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary.accent,
        marginBottom: 2,
        marginTop: 8
    },
    myBubble: {
        backgroundColor: COLORS.primary.accent,
        marginVertical: 2,
        marginRight: 8,
        borderRadius: 18,
        borderBottomRightRadius: 4
    },
    otherBubble: {
        backgroundColor: COLORS.neutral[800] || '#333333',
        marginVertical: 2,
        marginLeft: 8,
        borderRadius: 18,
        borderBottomLeftRadius: 4
    },
    imageContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        marginVertical: 4,
    },
    messageImage: {
        width: 200,
        height: 200,
        borderRadius: 16,
        margin: 0,
        resizeMode: 'cover',
    },
    documentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginHorizontal: 8,
        marginVertical: 4,
        borderRadius: 16,
        minWidth: 220,
        maxWidth: 280,
    },
    myDocumentContainer: {
        backgroundColor: COLORS.primary.accent,
        marginLeft: 'auto',
        borderBottomRightRadius: 4,
    },
    otherDocumentContainer: {
        backgroundColor: COLORS.neutral[800] || '#333333',
        marginRight: 'auto',
        borderBottomLeftRadius: 4,
    },
    documentIconContainer: {
        marginRight: 12,
    },
    documentInfo: {
        flex: 1,
    },
    documentName: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    myDocumentText: {
        color: '#000',
    },
    otherDocumentText: {
        color: THEME_COLORS.textPrimary,
    },
    documentSize: {
        fontSize: 12,
    },
    documentDownload: {
        padding: 4,
    },
    avatarContainer: {
        width: 34,
        height: 34,
        borderRadius: 17,
        overflow: 'hidden',
        marginRight: 5
    },
    avatarImage: {
        width: '100%',
        height: '100%'
    },
    avatarFallback: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1A1A1A',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.2)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    avatarInitials: {
        color: THEME_COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '600'
    }
});