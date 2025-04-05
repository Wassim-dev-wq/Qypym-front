import React, {useCallback, useEffect, useRef} from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList, Platform,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {router, useFocusEffect, useRouter} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import {t} from 'src/constants/locales';
import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {useNotifications} from '@/src/core/hooks/useNotifications';
import {useAuth} from '@/src/core/api/auth/useAuth';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const NotificationItem = ({item, onPress, index}) => {
    const itemFade = useRef(new Animated.Value(0)).current;
    const itemScale = useRef(new Animated.Value(0.9)).current;
    const {userId} = useAuth();
    useEffect(() => {
        Animated.parallel([
            Animated.timing(itemFade, {
                toValue: 1,
                duration: 300,
                delay: index * 50,
                useNativeDriver: true
            }),
            Animated.spring(itemScale, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
                delay: index * 50
            })
        ]).start();
    }, [index]);

    return (
        <Animated.View
            style={{
                opacity: itemFade,
                transform: [{scale: itemScale}]
            }}
        >
            <TouchableOpacity
                style={[
                    styles.noteItem,
                    !item.read && styles.noteItemUnread
                ]}
                onPress={() => onPress(item)}
                activeOpacity={0.8}
            >
                <View style={[styles.noteIconBox, !item.read && styles.noteIconBoxUnread]}>
                    <MaterialCommunityIcons
                        name={item.read ? 'bell-check-outline' : 'bell-ring-outline'}
                        size={24}
                        color={item.read ? THEME_COLORS.textSecondary : COLORS.primary.accent}
                    />
                </View>
                <View style={styles.noteBody}>
                    <Text style={[styles.noteTitle, !item.read && styles.noteTitleAccent]}>
                        {item.title}
                    </Text>
                    <Text style={styles.noteText} numberOfLines={2}>
                        {item.message}
                    </Text>
                    <Text style={styles.noteTime}>
                        {new Date(item.createdAt).toLocaleString()}
                    </Text>
                </View>
                <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={THEME_COLORS.textSecondary}
                    style={styles.chevron}
                />
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function NotificationScreen() {
    const myRouter = useRouter();
    const edgeInsets = useSafeAreaInsets();
    const {user} = useAuth();
    const userId = user?.keycloakUserId || '';
    const fadeAnime = useRef(new Animated.Value(0)).current;
    const scaleAnime = useRef(new Animated.Value(0.95)).current;
    const {
        notifications,
        loading,
        error,
        refreshing,
        unreadCount,
        onRefresh,
        markAsRead,
        markAllAsRead
    } = useNotifications(userId);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnime, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true
            }),
            Animated.spring(scaleAnime, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true
            })
        ]).start();
    }, []);

    useFocusEffect(
        useCallback(() => {
            return () => {
                console.log("User is leaving the notification screen");
            };
        }, [])
    );

    const pressNote = useCallback(
        (note) => {
            if (!note.read) {
                markAsRead(note.id);
            }
            if(note.matchCreatorId === userId) {
                router.push({
                    pathname: '/(modals)/[matchId]/manage',
                    params: {matchId: note.matchId}
                });
                return;
            } else {
                router.push({
                    pathname: '/(modals)/[matchId]',
                    params: {matchId: note.matchId}
                });
            }
        },
        [markAsRead, router]
    );

    const allRead = useCallback(() => {
        if (notifications?.length > 0 && unreadCount > 0) {
            markAllAsRead();
        } else {
            Alert.alert('Information', "Vous n'avez pas de notifications non lues.");
        }
    }, [markAllAsRead, notifications, unreadCount]);

    const renderItem = useCallback(({item, index}) => (
        <NotificationItem item={item} onPress={pressNote} index={index}/>
    ), [pressNote]);

    const emptyArea = useCallback(() => {
        if (loading) return null;
        return (
            <Animated.View
                style={[
                    styles.emptyArea,
                    {
                        opacity: fadeAnime,
                        transform: [{scale: scaleAnime}]
                    }
                ]}
            >
                <View style={styles.emptyIconWrap}>
                    <MaterialCommunityIcons
                        name="bell-sleep-outline"
                        size={60}
                        color={COLORS.primary.accent}
                    />
                </View>
                <Text style={styles.emptyTitle}>{t('noNotifications')}</Text>
                <Text style={styles.emptyNote}>
                    Vous n'avez pas de notifications pour le moment. Elles apparaîtront ici lorsque
                    vous aurez des mises à jour.
                </Text>
            </Animated.View>
        );
    }, [loading, fadeAnime, scaleAnime]);

    const headBarStyle = {
        ...styles.headBar,
        paddingTop: Platform.OS === 'ios' ? 0 : edgeInsets.top,
        paddingBottom:  Platform.OS === 'ios' ? 0 : 12
    };

    return (
        <SafeAreaView style={styles.safeAreaBox}>
            <View style={headBarStyle}>
                <TouchableOpacity
                    style={styles.backSpot}
                    onPress={() => myRouter.back()}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons
                        name="chevron-left"
                        size={26}
                        color={THEME_COLORS.textPrimary}
                    />
                </TouchableOpacity>
                <Text style={styles.headTitle}>{t('notifications')}</Text>
                <TouchableOpacity
                    style={styles.allReadBtn}
                    onPress={allRead}
                    activeOpacity={0.7}
                    disabled={unreadCount === 0}
                >
                    <LinearGradient
                        colors={
                            unreadCount > 0
                                ? [COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']
                                : ['rgba(60, 60, 60, 0.5)', 'rgba(40, 40, 40, 0.5)']
                        }
                        style={styles.allReadGradient}
                    >
                        <Text style={styles.allReadText}>{t('markAllAsRead')}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
            <Animated.View
                style={[
                    styles.mainBox,
                    {
                        opacity: fadeAnime,
                        transform: [{scale: scaleAnime}]
                    }
                ]}
            >
                {loading ? (
                    <View style={styles.loadWrap}>
                        <ActivityIndicator size="large" color={COLORS.primary.accent}/>
                        <Text style={styles.loadText}>Chargement des notifications...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.failWrap}>
                        <MaterialCommunityIcons
                            name="alert-circle-outline"
                            size={60}
                            color={THEME_COLORS.error}
                        />
                        <Text style={styles.failTitle}>Oups !</Text>
                        <Text style={styles.failInfo}>
                            Une erreur s'est produite lors du chargement des notifications.
                        </Text>
                        <TouchableOpacity
                            style={styles.tryBtn}
                            onPress={onRefresh}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                                style={styles.tryGrad}
                            >
                                <Text style={styles.tryTxt}>{t('retry')}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={notifications}
                        keyExtractor={i => i.id}
                        renderItem={renderItem}
                        contentContainerStyle={[
                            styles.flatPad,
                            !notifications?.length && styles.flatEmpty
                        ]}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={[COLORS.primary.accent]}
                                tintColor={COLORS.primary.accent}
                            />
                        }
                        ListEmptyComponent={emptyArea}
                    />
                )}
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeAreaBox: {
        flex: 1,
        backgroundColor: THEME_COLORS.background
    },
    mainBox: {
        flex: 1,
        backgroundColor: THEME_COLORS.background
    },
    headBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'rgba(10, 10, 10, 0.95)',
        borderBottomWidth: 1,
        borderBottomColor: THEME_COLORS.divider,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        zIndex: 10
    },
    backSpot: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: THEME_COLORS.cardAccent,
        justifyContent: 'center',
        alignItems: 'center'
    },
    headTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: THEME_COLORS.textPrimary,
        textAlign: 'center'
    },
    allReadBtn: {
        borderRadius: 12,
        overflow: 'hidden'
    },
    allReadGradient: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12
    },
    allReadText: {
        color: '#000',
        fontSize: 13,
        fontWeight: '600'
    },
    badgeWrap: {
        position: 'absolute',
        top: 10,
        right: 20,
        zIndex: 10
    },
    badgeInside: {
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        minWidth: 24,
        alignItems: 'center'
    },
    badgeTxt: {
        color: '#000',
        fontSize: 12,
        fontWeight: 'bold'
    },
    loadWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    loadText: {
        marginTop: 16,
        color: THEME_COLORS.textSecondary,
        fontSize: 16
    },
    failWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    failTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
        marginTop: 16,
        marginBottom: 8
    },
    failInfo: {
        fontSize: 16,
        color: THEME_COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        maxWidth: '80%'
    },
    tryBtn: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    tryGrad: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12
    },
    tryTxt: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600'
    },
    flatPad: {
        padding: 16,
        paddingTop: 20
    },
    flatEmpty: {
        flexGrow: 1
    },
    noteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(26,26,26,0.5)',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)'
    },
    noteItemUnread: {
        backgroundColor: 'rgba(26,26,26,0.8)',
        borderColor: 'rgba(255, 184, 0, 0.1)'
    },
    noteIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(60, 60, 60, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    noteIconBoxUnread: {
        backgroundColor: 'rgba(255, 184, 0, 0.1)'
    },
    noteBody: {
        flex: 1,
        marginRight: 8
    },
    noteTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginBottom: 4
    },
    noteTitleAccent: {
        color: COLORS.primary.accent
    },
    noteText: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
        marginBottom: 6,
        lineHeight: 18
    },
    noteTime: {
        fontSize: 12,
        color: THEME_COLORS.textPlaceholder
    },
    chevron: {
        marginLeft: 4
    },
    emptyArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    emptyIconWrap: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 184, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)'
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
        marginBottom: 12
    },
    emptyNote: {
        fontSize: 16,
        color: THEME_COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: SCREEN_WIDTH * 0.8
    }
});