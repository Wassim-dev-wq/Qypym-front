import React, { useState, useEffect, useRef, memo } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    Animated,
    ActivityIndicator,
    TouchableOpacity,
    Modal,
    Pressable,
    Dimensions,
    StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, THEME_COLORS } from '@/src/constants/Colors';
import * as FileSystem from 'expo-file-system';
import { ApiService, API_CONFIG } from '@/src/core/api/core/axios.config';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUserPresence } from '@/src/core/hooks/useUserPresence';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PROFILE_CACHE_DIR = `${FileSystem.cacheDirectory}profile-photos/`;

const ensureCacheDirectory = async () => {
    try {
        const dirInfo = await FileSystem.getInfoAsync(PROFILE_CACHE_DIR);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(PROFILE_CACHE_DIR, { intermediates: true });
        }
    } catch (error) {
        console.error('Failed to create cache directory:', error);
    }
};

ensureCacheDirectory();

interface ProfilePhotoProps {
    userId: string;
    size?: number;
    fontSize?: number;
    letter?: string;
    style?: any;
    showOnlineStatus?: boolean;
    isOnline?: boolean;
    zoomable?: boolean;
    onPress?: () => void;
    usePresence?: boolean;
    showStatusText?: boolean;
}

export const ProfilePhoto = memo(({
                                      userId,
                                      size = 120,
                                      fontSize = 48,
                                      letter = '?',
                                      style,
                                      showOnlineStatus = false,
                                      isOnline = false,
                                      zoomable = true,
                                      onPress,
                                      usePresence = false,
                                      showStatusText = false
                                  }: ProfilePhotoProps) => {
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    const presenceData = usePresence ? useUserPresence(userId) : { isOnline, lastActiveText: '' };

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const modalScaleAnim = useRef(new Animated.Value(0.9)).current;
    const modalOpacityAnim = useRef(new Animated.Value(0)).current;
    const modalBackdropAnim = useRef(new Animated.Value(0)).current;

    const isMounted = useRef(true);
    const cacheKey = `user_${userId}`;
    const cachePath = `${PROFILE_CACHE_DIR}${cacheKey}.jpg`;

    const fadeIn = () => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const animateModalIn = () => {
        Animated.parallel([
            Animated.timing(modalScaleAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(modalOpacityAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(modalBackdropAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start();
    };

    const animateModalOut = (callback: () => void) => {
        Animated.parallel([
            Animated.timing(modalScaleAnim, {
                toValue: 0.9,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(modalOpacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(modalBackdropAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start(callback);
    };

    const loadPhotoFromCache = async () => {
        try {
            const cacheInfo = await FileSystem.getInfoAsync(cachePath);
            if (cacheInfo.exists) {

                const now = Date.now();
                const modTime = cacheInfo.modificationTime || 0;
                const cacheAge = now - modTime;

                if (cacheAge < 60 * 60 * 1000) {
                    if (isMounted.current) {
                        setPhotoUri(`${cachePath}?${now}`);
                        setIsLoading(false);
                        fadeIn();
                        return true;
                    }
                }
            }
            return false;
        } catch (error) {
            return false;
        }
    };

    const fetchAndCachePhoto = async () => {
        if (!userId) {
            setIsLoading(false);
            setHasError(true);
            return;
        }

        try {

            const cachedImageLoaded = await loadPhotoFromCache();
            if (cachedImageLoaded) return;
            setIsLoading(true);
            const response = await ApiService.getInstance().get(
                API_CONFIG.ENDPOINTS.USERS.GET_PHOTO(userId),
                { responseType: 'blob' }
            );

            const reader = new FileReader();
            reader.readAsDataURL(response.data);

            reader.onload = async () => {
                if (!isMounted.current) return;

                const base64Data = reader.result as string;

                try {
                    const base64Image = base64Data.split(',')[1];
                    await FileSystem.writeAsStringAsync(cachePath, base64Image, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                } catch (cacheError) {
                    console.error('Error caching image:', cacheError);
                }

                setPhotoUri(base64Data);
                setIsLoading(false);
                setHasError(false);
                setTimeout(() => {
                    if (isMounted.current) {
                        fadeIn();
                    }
                }, 50);
                fadeIn();
            };

            reader.onerror = () => {
                if (isMounted.current) {
                    setIsLoading(false);
                    setHasError(true);
                }
            };
        } catch (error) {
            if (isMounted.current) {
                setIsLoading(false);
                setHasError(true);
            }
        }
    };

    useEffect(() => {
        isMounted.current = true;
        fetchAndCachePhoto();

        return () => {
            isMounted.current = false;
        };
    }, [userId]);

    const handlePress = () => {
        if (onPress) {
            onPress();
            return;
        }

        if (zoomable && photoUri && !hasError) {
            setModalVisible(true);
            setTimeout(animateModalIn, 50);
        }
    };

    const closeModal = () => {
        animateModalOut(() => {
            setModalVisible(false);
        });
    };

    const userIsOnline = usePresence ? presenceData.isOnline : isOnline;

    const renderProfilePhoto = () => (
        <View style={[styles.container, { width: size, height: size }, style]}>
            <LinearGradient
                colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                style={[styles.frame, { width: size, height: size, borderRadius: size / 2 }]}
            >
                <View
                    style={[
                        styles.inner,
                        { width: size - 6, height: size - 6, borderRadius: (size - 6) / 2 }
                    ]}
                >
                    {isLoading ? (
                        <ActivityIndicator color={COLORS.primary.accent} size="small" />
                    ) : hasError || !photoUri ? (
                        <Text style={[styles.letter, { fontSize }]}>
                            {letter}
                        </Text>
                    ) : (
                        <Animated.View style={{ opacity: fadeAnim, width: '100%', height: '100%' }}>
                            <Image
                                source={{ uri: photoUri }}
                                style={[styles.photo, { width: size - 6, height: size - 6, borderRadius: (size - 6) / 2 }]}
                                onError={() => setHasError(true)}
                            />
                        </Animated.View>
                    )}
                </View>
            </LinearGradient>

            {showOnlineStatus && (
                <View
                    style={[
                        styles.onlineIndicator,
                        {
                            width: size * 0.13,
                            height: size * 0.13,
                            borderRadius: size * 0.065,
                            backgroundColor: userIsOnline ? THEME_COLORS.success : 'rgba(255, 255, 255, 0.3)'
                        }
                    ]}
                />
            )}

            {showStatusText && usePresence && (
                <View style={styles.statusTextContainer}>
                    <LinearGradient
                        colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.5)']}
                        style={styles.statusTextGradient}
                    >
                        <Text style={styles.statusText} numberOfLines={1}>
                            {presenceData.lastActiveText}
                        </Text>
                    </LinearGradient>
                </View>
            )}
        </View>
    );

    const renderZoomModal = () => (
        <Modal
            transparent={true}
            visible={modalVisible}
            animationType="none"
            statusBarTranslucent={true}
            onRequestClose={closeModal}
        >
            <Animated.View
                style={[
                    styles.modalOverlay,
                    { opacity: modalBackdropAnim }
                ]}
            >
                <Pressable
                    style={styles.modalBackground}
                    onPress={closeModal}
                >
                    <Animated.View
                        style={[
                            styles.modalContent,
                            {
                                opacity: modalOpacityAnim,
                                transform: [{ scale: modalScaleAnim }]
                            }
                        ]}
                    >
                        {photoUri ? (
                            <Image
                                source={{ uri: photoUri }}
                                style={styles.zoomedImage}
                                resizeMode="contain"
                            />
                        ) : (
                            <View style={styles.fallbackContainer}>
                                <Text style={styles.fallbackLetter}>{letter}</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={closeModal}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons name="close" size={24} color="#fff" />
                        </TouchableOpacity>

                        {usePresence && (
                            <View style={styles.modalStatusContainer}>
                                <View style={[
                                    styles.modalStatusDot,
                                    { backgroundColor: userIsOnline ? THEME_COLORS.success : 'rgba(255, 255, 255, 0.3)' }
                                ]} />
                                <Text style={styles.modalStatusText}>
                                    {presenceData.lastActiveText}
                                </Text>
                            </View>
                        )}
                    </Animated.View>
                </Pressable>
            </Animated.View>
        </Modal>
    );

    if (!zoomable && !onPress) {
        return renderProfilePhoto();
    }

    return (
        <>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={handlePress}
                disabled={isLoading || (!zoomable && !onPress)}
            >
                {renderProfilePhoto()}
            </TouchableOpacity>
            {renderZoomModal()}
        </>
    );
});

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    frame: {
        padding: 3,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inner: {
        backgroundColor: 'rgba(26,26,26,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    letter: {
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
    },
    photo: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        borderWidth: 2,
        borderColor: THEME_COLORS.background,
    },
    statusTextContainer: {
        position: 'absolute',
        bottom: -10,
        left: '50%',
        transform: [{ translateX: -50 }],
        borderRadius: 10,
        overflow: 'hidden',
        zIndex: 10,
    },
    statusTextGradient: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    statusText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: '#000',
    },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: SCREEN_WIDTH * 0.9,
        height: SCREEN_WIDTH * 0.9,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(26,26,26,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    zoomedImage: {
        width: '100%',
        height: '100%',
    },
    closeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fallbackContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(26,26,26,0.9)',
    },
    fallbackLetter: {
        fontSize: 100,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
    },
    modalStatusContainer: {
        position: 'absolute',
        bottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    modalStatusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    modalStatusText: {
        color: 'white',
        fontSize: 14,
    }
});