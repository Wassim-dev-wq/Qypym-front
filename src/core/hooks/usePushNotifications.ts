import {useCallback, useEffect, useState} from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import {Alert, Platform} from 'react-native';
import {t} from 'src/constants/locales';
import {pushNotificationsApi} from "@/src/core/api/pushNotificationsApi";

export const setupNotificationHandler = () => {

    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            enableVibrate: true,
            enableLights: true,
            sound: 'default',
            lightColor: '#FF231F7C',
            showBadge: true
        });

        Notifications.setNotificationChannelAsync('chat_messages', {
            name: 'Messages de chat',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            enableVibrate: true,
            enableLights: true,
            sound: 'default',
            lightColor: '#FF231F7C',
            showBadge: true
        });
    }

    Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
            const data = notification.request.content.data;
            return {
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                identifier: data.notificationId || (data.chatRoomId ? `chat_${data.chatRoomId}` : undefined)
            };
        }
    });
};

interface UseNotificationsReturn {
    registerForPushNotifications: () => Promise<void>;
    token: string | null;
    notificationPermissionStatus: string | null;
    dismissNotifications: (identifier: string) => Promise<void>;
}

export const usePushNotifications = (userId: string | null): UseNotificationsReturn => {
    const [token, setToken] = useState<string | null>(null);
    const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<string | null>(null);

    useEffect(() => {
        setupNotificationHandler();
    }, []);

    const requestPermissions = useCallback(async (): Promise<boolean> => {
        try {
            if (!Device.isDevice) {
                console.warn('Push notifications are not available in the simulator');
                return false;
            }

            const {status: existingStatus} = await Notifications.getPermissionsAsync();
            setNotificationPermissionStatus(existingStatus);

            if (existingStatus !== 'granted') {
                const {status} = await Notifications.requestPermissionsAsync();
                setNotificationPermissionStatus(status);
                return status === 'granted';
            }
            return true;
        } catch (error) {
            console.error('Error requesting notification permissions:', error);
            return false;
        }
    }, []);

    const registerForPushNotifications = useCallback(async () => {
        try {
            const permissionGranted = await requestPermissions();
            if (!permissionGranted) {
                Alert.alert(
                    t('notifications'),
                    t('notificationsPermissionDenied'),
                    [{text: t('ok')}]
                );
                return;
            }
            const expoPushToken = await Notifications.getExpoPushTokenAsync({
                projectId: Constants.expoConfig?.extra?.eas?.projectId,
            });
            setToken(expoPushToken.data);
            if (userId) {
                await pushNotificationsApi.registerPushToken({
                    userId,
                    token: expoPushToken.data,
                    platform: Platform.OS,
                });
            }
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error details:', error.message);
            }
            Alert.alert(
                t('error'),
                t('pushNotificationSetupError'),
                [{text: t('ok')}]
            );
        }
    }, [userId, requestPermissions]);

    const dismissNotifications = useCallback(async (identifier: string) => {
        try {
            await Notifications.dismissNotificationAsync(identifier);
        } catch (error) {
            console.error('Error dismissing notification:', error);
        }
    }, []);

    return {
        registerForPushNotifications,
        token,
        notificationPermissionStatus,
        dismissNotifications
    };
};