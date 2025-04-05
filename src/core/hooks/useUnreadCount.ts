import {useEffect, useRef, useState} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import * as Notifications from 'expo-notifications';
import {db, updateUserStatus} from '@/src/core/api/chatService';
import {useAuth} from '@/src/core/api/auth/useAuth';
import {collection, doc, DocumentData, getDoc, onSnapshot, query, QuerySnapshot, where} from 'firebase/firestore';
import {router, usePathname} from 'expo-router';
import {setupNotificationHandler, usePushNotifications} from "@/src/core/hooks/usePushNotifications";

interface ChatRoom {
    participants: string[];
    status: string;
    unreadCount?: Record<string, number>;
    lastMessageId?: string;
}

interface ChatMessage {
    user?: {
        name: string;
    };
    text?: string;
    createdAt?: {
        toDate: () => Date;
    };
}

interface ChatRoomWithChanges {
    id: string;
    senderName: string;
    messageText: string;
    timestamp: Date;
}

export function useUnreadCount(): number {
    const {user} = useAuth();
    const [unread, setUnread] = useState<number>(0);
    const prevUnreadRef = useRef<number>(0);
    const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
    const pathname = usePathname();
    const [activeChatRoomId, setActiveChatRoomId] = useState<string | null>(null);
    const lastNotificationSent = useRef<number>(0);
    const isInitialMount = useRef(true);

    const {dismissNotifications} = usePushNotifications(user?.keycloakUserId || null);

    useEffect(() => {

        setupNotificationHandler();

        const subscription = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data as { chatRoomId?: string, type?: string };
            if (data.type === 'CHAT_MESSAGE' && data.chatRoomId) {
                router.push(`/chat/${data.chatRoomId}`);
            }
        });

        return () => subscription.remove();
    }, []);

    useEffect(() => {
        if (isInitialMount.current && user?.keycloakUserId) {
            updateUserStatus(user.keycloakUserId, null, true);
            isInitialMount.current = false;
        }
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if ((appState === 'background' || appState === 'inactive') && nextAppState === 'active') {
                if (user?.keycloakUserId) {
                    updateUserStatus(user.keycloakUserId, null, true);
                }
            }
            setAppState(nextAppState);
        });
        return () => {
            subscription.remove();
        };
    }, [user?.keycloakUserId, appState]);

    useEffect(() => {
        const chatPathMatch = pathname.match(/^\/chat\/([^\/]+)$/);
        if (chatPathMatch) {
            const chatId = chatPathMatch[1];
            setActiveChatRoomId(chatId);
            dismissNotifications(`chat_${chatId}`);
        } else {
            setActiveChatRoomId(null);
        }
    }, [pathname, dismissNotifications]);

    useEffect(() => {
        if (!user?.keycloakUserId) return;

        const chatRoomsRef = collection(db, 'chatRooms');
        const q = query(
            chatRoomsRef,
            where('participants', 'array-contains', user.keycloakUserId),
            where('status', '==', 'active')
        );

        const unsubscribe = onSnapshot(
            q,
            async (snapshot: QuerySnapshot<DocumentData>) => {
                let totalUnread = 0;
                let latestMessage: ChatRoomWithChanges | null = null;

                for (const docChange of snapshot.docChanges()) {
                    const chatRoomId = docChange.doc.id;
                    const data = docChange.doc.data() as ChatRoom;
                    const unreadCount = data.unreadCount?.[user.keycloakUserId] || 0;
                    totalUnread += unreadCount;
                    if (docChange.type === 'modified' && unreadCount > 0) {
                        const lastMessageId = data.lastMessageId;
                        if (lastMessageId) {
                            try {
                                const messageRef = doc(db, 'chatRooms', chatRoomId, 'messages', lastMessageId);
                                const messageSnapshot = await getDoc(messageRef);

                                if (messageSnapshot.exists()) {
                                    const messageData = messageSnapshot.data() as ChatMessage;
                                    const timestamp = messageData.createdAt?.toDate() || new Date();

                                    if (!latestMessage || timestamp > latestMessage.timestamp) {
                                        latestMessage = {
                                            id: chatRoomId,
                                            senderName: messageData.user?.name || 'Someone',
                                            messageText: messageData.text || 'Nouveau message',
                                            timestamp
                                        };
                                    }
                                }
                            } catch (err) {
                                console.error('Erreur lors de la récupération des détails du message:', err);
                            }
                        }
                    }
                }
                prevUnreadRef.current = totalUnread;
                setUnread(totalUnread);
            },
            (error) => {
                console.error('Erreur lors de l\'écoute du nombre de messages non lus:', error);
            }
        );

        return () => unsubscribe();
    }, [user?.keycloakUserId, appState, pathname]);
    return unread;
}