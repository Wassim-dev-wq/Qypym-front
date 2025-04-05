import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/core/api/chatService';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';


export const useUserPresence = (userId) => {
    const [presenceData, setPresenceData] = useState({
        isOnline: false,
        lastActive: null,
        lastActiveText: '',
        activeChatRoom: null
    });

    useEffect(() => {
        if (!userId) return;

        const userStatusRef = doc(db, 'userStatus', userId);

        const unsubscribe = onSnapshot(userStatusRef,
            (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    const now = new Date();
                    const lastActive = data.lastActive?.toDate();
                    let lastActiveText = '';

                    const isOnline = data.isOnline && lastActive &&
                        (now.getTime() - lastActive.getTime() < 2 * 60 * 1000);

                    if (lastActive) {
                        if (isOnline) {
                            lastActiveText = 'En ligne';
                        } else {
                            try {
                                lastActiveText = `Actif ${formatDistanceToNow(lastActive, {
                                    addSuffix: true,
                                    locale: fr
                                })}`;
                            } catch (e) {
                                lastActiveText = 'Hors ligne';
                            }
                        }
                    } else {
                        lastActiveText = 'Hors ligne';
                    }

                    setPresenceData({
                        isOnline,
                        lastActive,
                        lastActiveText,
                        activeChatRoom: data.activeChatRoom
                    });
                } else {
                    setPresenceData({
                        isOnline: false,
                        lastActive: null,
                        lastActiveText: 'Hors ligne',
                        activeChatRoom: null
                    });
                }
            },
            (error) => {
                console.error('Error tracking user presence:', error);
                setPresenceData({
                    isOnline: false,
                    lastActive: null,
                    lastActiveText: 'Hors ligne',
                    activeChatRoom: null
                });
            }
        );

        return () => unsubscribe();
    }, [userId]);

    return presenceData;
};