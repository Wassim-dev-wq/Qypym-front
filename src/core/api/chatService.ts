import { initializeApp } from 'firebase/app';
import {
    addDoc,
    arrayUnion,
    collection,
    doc,
    DocumentData,
    getDoc,
    getDocs,
    getFirestore,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where,
    writeBatch,
    QueryDocumentSnapshot, setDoc, arrayRemove,
} from 'firebase/firestore';
import { IMessage } from 'react-native-gifted-chat';
import { t } from "src/constants/locales";
import debounce from 'lodash/debounce';
import {AppState} from "react-native";
import {userApi} from "@/src/core/hooks/useUserFetch";
import { User } from '@/src/types/user/user';

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain:  process.env.FIREBASE_AUTH_DOMAIN,
    projectId:  process.env.FIREBASE_PROJECT_ID,
    storageBucket:  process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId:  process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId:  process.env.FIREBASE_APP_ID,
    measurementId:  process.env.FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export interface ChatRoom {
    id: string;
    matchId: string;
    matchTitle: string;
    participants: string[];
    lastMessage?: string;
    lastMessageTime?: Date | null;
    createdAt: Date | null;
    sportType?: string;
    matchDate?: Date | null;
    unreadCount?: { [key: string]: number };
    typing?: { [key: string]: boolean };
    status: 'active' | 'archived' | 'deleted';
    lastSeen?: { [key: string]: Date | null };
    updatedAt?: any;
}

export interface ChatMessage extends IMessage {
    status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
    replyTo?: string;
    attachments?: Array<{
        type: 'image' | 'video' | 'audio' | 'location';
        url: string;
        thumbnail?: string;
        duration?: number;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    }>;
}

export const updateUserStatus = async (userId, activeChatRoomId = null, isOnline = true) => {
    if (!userId) return;

    try {
        const userStatusRef = doc(db, 'userStatus', userId);

        await setDoc(userStatusRef, {
            userId,
            activeChatRoom: activeChatRoomId,
            lastActive: serverTimestamp(),
            isOnline
        }, { merge: true });

        console.log('User status updated:', { userId, activeChatRoomId, isOnline });
    } catch (error) {
        console.error('Error updating user status:', error);
    }
};

export const setupPresenceTracking = (userId, chatRoomId) => {

    updateUserStatus(userId, chatRoomId, true);

    const intervalId = setInterval(() => {
        updateUserStatus(userId, chatRoomId, true);
    }, 30000);

    const subscription = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'active') {
            updateUserStatus(userId, chatRoomId, true);
        } else if (nextAppState === 'background' || nextAppState === 'inactive') {
            updateUserStatus(userId, null, false);
        }
    });

    const cleanup = () => {
        updateUserStatus(userId, null, true);
        clearInterval(intervalId);
        subscription.remove();
    };

    return cleanup;
};

class ChatService {
    private static instance: ChatService;

    private messageCache: Map<string, ChatMessage[]> = new Map();
    private userProfileCache: Map<string, User> = new Map();
    private roomCache: Map<string, ChatRoom> = new Map();

    private messageSubscriptions: Map<string, () => void> = new Map();
    private typingSubscriptions: Map<string, () => void> = new Map();
    private roomSubscriptions: Map<string, () => void> = new Map();

    private debouncedTypingUpdates: Map<string, ReturnType<typeof debounce>> = new Map();

    private constructor() {

    }

    public static getInstance(): ChatService {
        if (!ChatService.instance) {
            ChatService.instance = new ChatService();
        }
        return ChatService.instance;
    }

    async createMatchChatRoom(
        matchId: string,
        participants: string[],
        matchTitle: string,
        sportType?: string,
        matchDate?: Date
    ): Promise<string> {
        try {
            if (!matchId) throw new Error(t('matchIdRequired'));
            if (!participants || participants.length === 0)
                throw new Error(t('participantsRequired'));
            const chatRoomData = {
                matchId,
                matchTitle: matchTitle || t('defaultMatch'),
                participants,
                sportType: sportType || t('notSpecified'),
                matchDate: matchDate || new Date(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastMessageTime: serverTimestamp(),
                status: 'active' as const,
                unreadCount: participants.reduce((acc, id) => ({ ...acc, [id]: 0 }), {}),
                typing: participants.reduce((acc, id) => ({ ...acc, [id]: false }), {}),
                lastSeen: participants.reduce(
                    (acc, id) => ({ ...acc, [id]: serverTimestamp() }),
                    {}
                ),
            };
            const chatRoomsRef = collection(db, 'chatRooms');
            const docRef = await addDoc(chatRoomsRef, chatRoomData);
            this.updateRoomCache(docRef.id, {
                id: docRef.id,
                ...chatRoomData,
                createdAt: new Date(),
            } as ChatRoom);
            await this.sendMessage(docRef.id, {
                _id: `welcome-${Date.now()}`,
                text: t('welcomeChatRoom', {
                    sport: matchTitle ?? t('defaultMatch'),
                    date: matchDate?.toLocaleDateString() ?? t('unknownDate')
                }),
                system: true,
                createdAt: new Date(),
            });
            return docRef.id;
        } catch (error) {
            console.error(t('errorCreatingChatRoom'), error);
            throw new Error(t('failedToCreateChatRoom', { message: (error as Error).message }));
        }
    }

    async sendMessage(chatRoomId: string, message: Partial<ChatMessage>): Promise<string> {
        try {
            const messageId = message._id?.toString() || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const timestamp = serverTimestamp();
            const optimisticMessage: ChatMessage = {
                _id: messageId,
                text: message.text || '',
                createdAt: new Date(),
                user: message.user || { _id: 'system', name: 'System' },
                system: message.system || false,
                status: 'sending',
                ...message,
            };
            this.updateLocalCache(chatRoomId, [optimisticMessage]);
            const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
            const chatRoomSnap = await getDoc(chatRoomRef);

            if (!chatRoomSnap.exists()) {
                this.updateMessageStatus(chatRoomId, messageId, 'error');
                throw new Error(t('chat_not_found'));
            }
            const batch = writeBatch(db);
            const messagesRef = collection(db, 'chatRooms', chatRoomId, 'messages');
            const messageDoc = doc(messagesRef, messageId);
            batch.set(messageDoc, {
                ...optimisticMessage,
                status: 'sent',
                createdAt: timestamp,
            });
            const { participants, unreadCount = {} } = chatRoomSnap.data() as DocumentData;
            const chatRoomUpdate: Partial<DocumentData> = {
                lastMessage: message.text,
                lastMessageTime: timestamp,
                lastMessageId: messageId,
                updatedAt: timestamp,
            };
            participants.forEach((pId: string) => {
                if (pId !== optimisticMessage.user._id) {
                    chatRoomUpdate[`unreadCount.${pId}`] = (unreadCount[pId] || 0) + 1;
                }
            });

            batch.update(chatRoomRef, chatRoomUpdate);
            await batch.commit();
            this.updateMessageStatus(chatRoomId, messageId, 'sent');

            return messageId;
        } catch (error) {
            console.error('Error sending message:', error);
            if (message._id) {
                this.updateMessageStatus(chatRoomId, message._id.toString(), 'error');
            }

            throw error;
        }
    }

    subscribeToMessages(
        chatRoomId: string,
        callback: (messages: ChatMessage[]) => void,
        pageSize: number = 30
    ): () => void {
        this.unsubscribeFromMessages(chatRoomId);

        const messagesRef = collection(db, 'chatRooms', chatRoomId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(pageSize));
        const unsubscribe = onSnapshot(
            q,
            async (snapshot) => {
                const messages = snapshot.docs.map(this.convertMessageDoc);
                this.messageCache.set(chatRoomId, messages);
                callback(messages);
            },
            (error) => {
                console.error('Error in message subscription:', error);
                const cachedMessages = this.messageCache.get(chatRoomId);
                if (cachedMessages && cachedMessages.length > 0) {
                    callback(cachedMessages);
                }
            }
        );
        this.messageSubscriptions.set(chatRoomId, unsubscribe);

        return () => this.unsubscribeFromMessages(chatRoomId);
    }

    unsubscribeFromMessages(chatRoomId: string): void {
        const unsubscribe = this.messageSubscriptions.get(chatRoomId);
        if (unsubscribe) {
            unsubscribe();
            this.messageSubscriptions.delete(chatRoomId);
        }
    }

    async loadMoreMessages(
        chatRoomId: string,
        lastMessageDate: Date | number,
        pageSize: number = 30
    ): Promise<ChatMessage[]> {
        try {
            const messagesRef = collection(db, 'chatRooms', chatRoomId, 'messages');
            const q = query(
                messagesRef,
                orderBy('createdAt', 'desc'),
                where('createdAt', '<', lastMessageDate),
                limit(pageSize)
            );

            const snapshot = await getDocs(q);
            const olderMessages = snapshot.docs.map(this.convertMessageDoc);
            this.updateLocalCache(chatRoomId, olderMessages);

            return olderMessages;
        } catch (error) {
            console.error('Error loading older messages:', error);
            return [];
        }
    }

    async markMessagesAsDelivered(
        chatRoomId: string,
        userId: string,
        messages: ChatMessage[]
    ): Promise<void> {
        try {
            const batch = writeBatch(db);
            const messagesRef = collection(db, 'chatRooms', chatRoomId, 'messages');
            let updateCount = 0;
            messages.forEach((msg) => {
                if (
                    msg.user._id !== userId &&
                    (msg.status === 'sent' || msg.status === 'sending')
                ) {
                    const docRef = doc(messagesRef, msg._id.toString());
                    batch.update(docRef, { status: 'delivered' });
                    this.updateMessageStatus(chatRoomId, msg._id.toString(), 'delivered');
                    updateCount++;
                }
            });
            if (updateCount > 0) {
                await batch.commit();
            }
        } catch (err) {
            console.error('Error marking as delivered:', err);
        }
    }

    async markMessagesAsRead(chatRoomId: string, userId: string): Promise<void> {
        if (!userId || !chatRoomId) return;
        try {
            const batch = writeBatch(db);
            const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
            batch.update(chatRoomRef, {
                [`unreadCount.${userId}`]: 0,
                [`lastSeen.${userId}`]: serverTimestamp(),
            });
            const messagesRef = collection(db, 'chatRooms', chatRoomId, 'messages');
            const unreadMessages = await getDocs(
                query(
                    messagesRef,
                    where('status', 'in', ['delivered', 'sent']),
                    where('user._id', '!=', userId)
                )
            );
            unreadMessages.docs.forEach((msgDoc) => {
                batch.update(msgDoc.ref, { status: 'read' });
                this.updateMessageStatus(chatRoomId, msgDoc.id, 'read');
            });

            await batch.commit();
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    async muteConversation(chatRoomId: string, userId: string, mute = true) {
        try {
            const chatRef = doc(db, 'chatRooms', chatRoomId);
            if (mute) {
                await updateDoc(chatRef, {
                    mutedUsers: arrayUnion(userId)
                });
            } else {
                await updateDoc(chatRef, {
                    mutedUsers: arrayRemove(userId)
                });
            }
            return true;
        } catch (error) {
            throw error;
        }
    }

    async isConversationMuted(chatRoomId: string, userId: string) {
        try {
            const chatSnapshot = await getDoc(doc(db, 'chatRooms', chatRoomId));
            if (chatSnapshot.exists()) {
                const data = chatSnapshot.data();
                return data.mutedUsers?.includes(userId) || false;
            }
            return false;
        } catch (error) {
            console.error('Error checking mute status:', error);
            return false;
        }
    }

    async updateTypingStatus(chatRoomId: string, userId: string, isTyping: boolean): void {
        if (!chatRoomId || !userId) return;
        if (!this.debouncedTypingUpdates.has(userId)) {
            this.debouncedTypingUpdates.set(
                userId,
                debounce(async (roomId: string, uid: string, typing: boolean) => {
                    try {
                        const chatRoomRef = doc(db, 'chatRooms', roomId);
                        await updateDoc(chatRoomRef, {
                            [`typing.${uid}`]: typing,
                        });
                        if (typing) {
                            setTimeout(async () => {
                                try {
                                    await updateDoc(chatRoomRef, {
                                        [`typing.${uid}`]: false,
                                    });
                                } catch (err) {
                                    console.error('Error resetting typing state:', err);
                                }
                            }, 5000);
                        }
                    } catch (err) {
                        console.error('Error updating typing state:', err);
                    }
                }, 300)
            );
        }
        const debouncedUpdate = this.debouncedTypingUpdates.get(userId);
        if (debouncedUpdate) {
            debouncedUpdate(chatRoomId, userId, isTyping);
        }
    }

    subscribeToTypingStatus(
        chatRoomId: string,
        callback: (typingState: { [key: string]: boolean }) => void
    ): () => void {
        this.unsubscribeFromTypingStatus(chatRoomId);

        const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
        const unsubscribe = onSnapshot(
            chatRoomRef,
            (snapshot) => {
                if (!snapshot.exists()) return;
                const data = snapshot.data() as DocumentData;
                callback(data.typing || {});
            },
            (error) => {
                console.error('Error in typing subscription:', error);
            }
        );
        this.typingSubscriptions.set(chatRoomId, unsubscribe);

        return () => this.unsubscribeFromTypingStatus(chatRoomId);
    }

    unsubscribeFromTypingStatus(chatRoomId: string): void {
        const unsubscribe = this.typingSubscriptions.get(chatRoomId);
        if (unsubscribe) {
            unsubscribe();
            this.typingSubscriptions.delete(chatRoomId);
        }
    }

    async getChatRoom(chatRoomId: string): Promise<ChatRoom | null> {
        try {
            const cachedRoom = this.roomCache.get(chatRoomId);
            if (cachedRoom) {
                return cachedRoom;
            }
            const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
            const snap = await getDoc(chatRoomRef);

            if (!snap.exists()) return null;

            const data = snap.data();
            const room = this.convertRoomDoc(snap);
            this.updateRoomCache(chatRoomId, room);

            return room;
        } catch (err) {
            console.error('Error getChatRoom:', err);
            return null;
        }
    }

    subscribeToUserChatRooms(
        userId: string,
        callback: (rooms: ChatRoom[]) => void,
        onError?: (error: any) => void
    ): () => void {
        if (!userId) {
            if (onError) onError(new Error('User ID is required'));
            return () => {};
        }

        console.log("User subscribing to chatRooms", userId);
        const chatRoomsRef = collection(db, 'chatRooms');
        const q = query(
            chatRoomsRef,
            where('participants', 'array-contains', userId),
            where('status', '==', 'active'),
            orderBy('lastMessageTime', 'desc')
        );
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const rooms = snapshot.docs.map(this.convertRoomDoc);
                rooms.forEach(room => {
                    this.updateRoomCache(room.id, room);
                });

                callback(rooms);
            },
            (error) => {
                console.error('Error in room subscription:', error);
                if (onError) onError(error);
            }
        );
        this.roomSubscriptions.set(userId, unsubscribe);

        return () => {
            const unsub = this.roomSubscriptions.get(userId);
            if (unsub) {
                unsub();
                this.roomSubscriptions.delete(userId);
            }
        };
    }

    async loadUserProfiles(userIds: string[]): Promise<Map<string, User>> {
        const uniqueIds = [...new Set(userIds)].filter(id => id && id !== 'system');
        const result = new Map<string, User>();
        const idsToFetch: string[] = [];
        for (const id of uniqueIds) {
            if (this.userProfileCache.has(id)) {
                result.set(id, this.userProfileCache.get(id)!);
            } else {
                idsToFetch.push(id);
            }
        }
        if (idsToFetch.length > 0) {
            try {
                const promises = idsToFetch.map(id => userApi.getById(id));
                const profiles = await Promise.all(promises);

                profiles.forEach((profile, index) => {
                    const id = idsToFetch[index];
                    if (profile) {
                        this.userProfileCache.set(id, profile);
                        result.set(id, profile);
                    }
                });
            } catch (error) {
                console.error('Error loading user profiles:', error);
            }
        }

        return result;
    }

    async getMatchChatRoom(matchId: string): Promise<ChatRoom | null> {
        try {
            const chatRoomsRef = collection(db, 'chatRooms');
            const q = query(
                chatRoomsRef,
                where('matchId', '==', matchId),
                where('status', '==', 'active'),
                limit(1)
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) return null;

            const room = this.convertRoomDoc(snapshot.docs[0]);
            this.updateRoomCache(room.id, room);

            return room;
        } catch (error) {
            console.error('Error getting match chat room:', error);
            return null;
        }
    }

    async deleteChatRoom(chatRoomId: string): Promise<void> {
        try {
            const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
            await updateDoc(chatRoomRef, {
                status: 'deleted',
                updatedAt: serverTimestamp(),
            });
            const cachedRoom = this.roomCache.get(chatRoomId);
            if (cachedRoom) {
                this.updateRoomCache(chatRoomId, { ...cachedRoom, status: 'deleted' });
            }
        } catch (error) {
            console.error('Error deleting chat room:', error);
            throw error;
        }
    }

    async getUnreadCount(userId: string): Promise<number> {
        try {
            const chatRoomsRef = collection(db, 'chatRooms');
            const q = query(
                chatRoomsRef,
                where('participants', 'array-contains', userId),
                where('status', '==', 'active')
            );

            const snap = await getDocs(q);

            return snap.docs.reduce((total, doc) => {
                const data = doc.data();
                return total + (data.unreadCount?.[userId] || 0);
            }, 0);
        } catch (error) {
            console.error('Error getUnreadCount:', error);
            return 0;
        }
    }

    async addParticipantToChatRoom(chatRoomId: string, participantId: string): Promise<boolean> {
        try {
            const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
            const snap = await getDoc(chatRoomRef);

            if (!snap.exists()) throw new Error('Chat room not found');

            const chatData = snap.data();
            if (chatData.participants.includes(participantId)) return true;

            const batch = writeBatch(db);
            batch.update(chatRoomRef, {
                participants: arrayUnion(participantId),
                [`unreadCount.${participantId}`]: 0,
                [`typing.${participantId}`]: false,
                [`lastSeen.${participantId}`]: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            await batch.commit();
            const cachedRoom = this.roomCache.get(chatRoomId);
            if (cachedRoom) {
                this.updateRoomCache(chatRoomId, {
                    ...cachedRoom,
                    participants: [...cachedRoom.participants, participantId]
                });
            }

            return true;
        } catch (error) {
            console.error('Error adding participant:', error);
            throw error;
        }
    }

    private convertMessageDoc = (doc: QueryDocumentSnapshot<DocumentData>): ChatMessage => {
        const data = doc.data();
        return {
            _id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
        } as ChatMessage;
    };

    private convertRoomDoc = (doc: QueryDocumentSnapshot<DocumentData>): ChatRoom => {
        const data = doc.data();
        const lastSeen: { [key: string]: Date | null } = {};
        if (data.lastSeen) {
            Object.entries(data.lastSeen || {}).forEach(([key, value]) => {
                if (value instanceof Timestamp) {
                    lastSeen[key] = value.toDate();
                } else {
                    lastSeen[key] = null;
                }
            });
        }

        return {
            id: doc.id,
            matchId: data.matchId || '',
            matchTitle: data.matchTitle || '',
            participants: data.participants || [],
            lastMessage: data.lastMessage,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            lastMessageTime: data.lastMessageTime instanceof Timestamp ? data.lastMessageTime.toDate() : null,
            matchDate: data.matchDate instanceof Timestamp ? data.matchDate.toDate() : null,
            sportType: data.sportType,
            unreadCount: data.unreadCount || {},
            typing: data.typing || {},
            status: (data.status as 'active' | 'archived' | 'deleted') || 'active',
            lastSeen
        };
    };

    private updateLocalCache(chatRoomId: string, newMessages: ChatMessage[]): void {
        const current = this.messageCache.get(chatRoomId) || [];
        const messageMap = new Map<string, ChatMessage>();
        current.forEach(msg => messageMap.set(msg._id.toString(), msg));
        newMessages.forEach(msg => messageMap.set(msg._id.toString(), msg));
        const merged = Array.from(messageMap.values()).sort((a, b) => {
            const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
            const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
            return timeB - timeA;
        });

        this.messageCache.set(chatRoomId, merged);
    }

    private updateRoomCache(roomId: string, room: any): void {
        const typedRoom: ChatRoom = {
            id: roomId,
            matchId: room.matchId || '',
            matchTitle: room.matchTitle || '',
            participants: room.participants || [],
            lastMessage: room.lastMessage,
            lastMessageTime: room.lastMessageTime instanceof Date ? room.lastMessageTime : null,
            createdAt: room.createdAt instanceof Date ? room.createdAt : new Date(),
            sportType: room.sportType,
            matchDate: room.matchDate instanceof Date ? room.matchDate : null,
            unreadCount: room.unreadCount || {},
            typing: room.typing || {},
            status: room.status as 'active' | 'archived' | 'deleted' || 'active',
            lastSeen: room.lastSeen || {}
        };

        this.roomCache.set(roomId, typedRoom);
    }

    private updateMessageStatus(
        chatRoomId: string,
        messageId: string,
        status: ChatMessage['status']
    ): void {
        const current = this.messageCache.get(chatRoomId) || [];
        const updated = current.map((msg) =>
            msg._id.toString() === messageId ? { ...msg, status } : msg
        );
        this.messageCache.set(chatRoomId, updated);
    }
}
export const chatService = ChatService.getInstance();