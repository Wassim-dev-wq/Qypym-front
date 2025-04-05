import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, Animated, Pressable, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {t} from "src/constants/locales";
import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {useUser} from "@/src/core/hooks/useUserFetch";
import {MatchJoinRequestResponse} from "@/src/types/match/response/matchJoinRequestResponse";

interface RequestItemProps {
    request: MatchJoinRequestResponse;
    acceptRequest: (requestId: string) => Promise<void> | void;
    rejectRequest: (requestId: string) => Promise<void> | void;
    isLoading: boolean;
    viewProfile: () => void;
    gameId: string;
    ownerID: string;
}

const RequestItem: React.FC<RequestItemProps> = ({request, acceptRequest, rejectRequest, isLoading, viewProfile}) => {
    const {data: user} = useUser(request.userId);
    if (request.requestStatus !== 'PENDING') return null;
    const fadeAnimation = useRef(new Animated.Value(0)).current;
    const scaleAnimation = useRef(new Animated.Value(0.97)).current;
    const rotateAnimation = useRef(new Animated.Value(0)).current;
    const expandAnimation = useRef(new Animated.Value(0)).current;
    const [showDetails, setShowDetails] = useState(false);
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnimation, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnimation, {
                toValue: 1,
                tension: 40,
                friction: 7,
                useNativeDriver: true
            })
        ]).start();
    }, []);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(expandAnimation, {
                toValue: showDetails ? 1 : 0,
                duration: 300,
                useNativeDriver: false,
            }),
            Animated.timing(rotateAnimation, {
                toValue: showDetails ? 1 : 0,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start();
    }, [showDetails]);

    const handleAccept = useCallback(async () => {
        try {
            await acceptRequest(request.id);
        } catch (err) {
            Alert.alert(t('error'), t('error_accept', {error: err}));
        }
    }, [acceptRequest, request.id]);

    const handleReject = useCallback(async () => {
        try {
            await rejectRequest(request.id);
        } catch (err) {
            Alert.alert(t('error'), t('error_reject', {error: err}));
        }
    }, [rejectRequest, request.id]);

    const toggleDetails = () => setShowDetails(prev => !prev);

    const shortMessage = request.message
        ? (request.message.length > 35 ? request.message.slice(0, 35).trim() + '...' : request.message)
        : undefined;

    const roleDetails = [request.position, request.experience].filter(Boolean).join(' - ');

    const rotateValue = rotateAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg']
    });

    const renderAvatar = () => {
        const initial = user?.firstName?.charAt(0) || user?.lastName?.charAt(0) || '?';
        return (
            <LinearGradient
                colors={['rgba(255, 184, 0, 0.2)', 'rgba(255, 184, 0, 0.05)']}
                style={styles.avatarBox}
            >
                <Text style={styles.avatarLetter}>{initial.toUpperCase()}</Text>
            </LinearGradient>
        );
    };

    return (
        <Animated.View
            style={[
                styles.outerBox,
                {
                    opacity: fadeAnimation,
                    transform: [{scale: scaleAnimation}]
                }
            ]}
        >
            <LinearGradient
                colors={['rgba(26,26,26,0.5)', 'rgba(17,17,17,0.2)']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.cardBox}
            >
                <View style={styles.headerSection}>
                    <Pressable
                        style={({pressed}) => [
                            styles.profileSection,
                            pressed && styles.profileSectionPressed
                        ]}
                        onPress={viewProfile}
                        android_ripple={{color: 'rgba(255, 184, 0, 0.1)', borderless: false}}
                    >
                        {renderAvatar()}
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>
                                {`${user?.firstName || ''} ${user?.lastName || ''}`}
                            </Text>
                            {roleDetails ? (
                                <View style={styles.detailRow}>
                                    <MaterialCommunityIcons
                                        name="shield-account"
                                        size={14}
                                        color={COLORS.primary.accent}
                                        style={styles.detailIcon}
                                    />
                                    <Text style={styles.detailText}>{roleDetails}</Text>
                                </View>
                            ) : shortMessage ? (
                                <View style={styles.detailRow}>
                                    <MaterialCommunityIcons
                                        name="comment-text-outline"
                                        size={14}
                                        color={COLORS.primary.accent}
                                        style={styles.detailIcon}
                                    />
                                    <Text style={styles.detailText}>{shortMessage}</Text>
                                </View>
                            ) : null}
                        </View>
                    </Pressable>
                    <TouchableOpacity
                        onPress={toggleDetails}
                        style={styles.toggleButton}
                        activeOpacity={0.7}
                    >
                        <Animated.View style={{transform: [{rotate: rotateValue}]}}>
                            <MaterialCommunityIcons
                                name="chevron-down"
                                size={24}
                                color={THEME_COLORS.textSecondary}
                            />
                        </Animated.View>
                    </TouchableOpacity>
                </View>
                <Animated.View
                    style={[
                        styles.detailsBox,
                        {
                            maxHeight: expandAnimation.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 200]
                            }),
                            opacity: expandAnimation,
                            marginTop: expandAnimation.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 8]
                            })
                        }
                    ]}
                >
                    <View style={styles.expandedDetails}>
                        {request.position && (
                            <View style={styles.infoRow}>
                                <MaterialCommunityIcons
                                    name="account-tie"
                                    size={16}
                                    color={COLORS.primary.accent}
                                />
                                <Text style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>{t('position')}: </Text>
                                    {request.position}
                                </Text>
                            </View>
                        )}
                        {request.experience && (
                            <View style={styles.infoRow}>
                                <MaterialCommunityIcons
                                    name="medal-outline"
                                    size={16}
                                    color={COLORS.primary.accent}
                                />
                                <Text style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>{t('experience')}: </Text>
                                    {request.experience}
                                </Text>
                            </View>
                        )}
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons
                                name="note-text-outline"
                                size={16}
                                color={COLORS.primary.accent}
                            />
                            <Text style={styles.infoContent}>
                                <Text style={styles.infoLabel}>{t('personal_note')}: </Text>
                                {request.personalNote || t('no_personal_note')}
                            </Text>
                        </View>
                        {request.message && (
                            <View style={styles.infoRow}>
                                <MaterialCommunityIcons
                                    name="comment-text-outline"
                                    size={16}
                                    color={COLORS.primary.accent}
                                />
                                <Text style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>{t('message')}: </Text>
                                    {request.message}
                                </Text>
                            </View>
                        )}
                    </View>
                </Animated.View>
                <View style={styles.buttonSection}>
                    <TouchableOpacity
                        onPress={handleReject}
                        disabled={isLoading}
                        activeOpacity={0.8}
                        style={styles.declineButtonWrapper}
                    >
                        <View style={styles.declineButton}>
                            {isLoading ? (
                                <ActivityIndicator size="small" color={THEME_COLORS.textPrimary}/>
                            ) : (
                                <>
                                    <MaterialCommunityIcons
                                        name="close"
                                        size={16}
                                        color={THEME_COLORS.textPrimary}
                                        style={styles.buttonIcon}
                                    />
                                    <Text style={styles.declineButtonText}>{t('reject')}</Text>
                                </>
                            )}
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleAccept}
                        disabled={isLoading}
                        activeOpacity={0.8}
                        style={styles.approveButtonWrapper}
                    >
                        <LinearGradient
                            colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 1}}
                            style={styles.approveButton}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#000"/>
                            ) : (
                                <>
                                    <MaterialCommunityIcons
                                        name="check"
                                        size={16}
                                        color="#000"
                                        style={styles.buttonIcon}
                                    />
                                    <Text style={styles.approveButtonText}>{t('accept')}</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </Animated.View>
    );
};

export default RequestItem;

const styles = StyleSheet.create({
    outerBox: {
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardBox: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    headerSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    profileSectionPressed: {
        backgroundColor: 'rgba(255, 184, 0, 0.05)',
    },
    avatarBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    avatarLetter: {
        color: THEME_COLORS.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    profileInfo: {
        marginLeft: 12,
        flex: 1,
    },
    profileName: {
        color: THEME_COLORS.textPrimary,
        fontWeight: '600',
        fontSize: 16,
        marginBottom: 2,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailIcon: {
        marginRight: 4,
    },
    detailText: {
        color: THEME_COLORS.textSecondary,
        fontSize: 13,
    },
    toggleButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(26,26,26,0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    detailsBox: {
        overflow: 'hidden',
    },
    expandedDetails: {
        padding: 12,
        backgroundColor: 'rgba(26,26,26,0.5)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'flex-start',
    },
    infoLabel: {
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
    },
    infoContent: {
        color: THEME_COLORS.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        marginLeft: 8,
        flex: 1,
    },
    buttonSection: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 16,
        gap: 12,
    },
    approveButtonWrapper: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    approveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    approveButtonText: {
        color: '#000',
        fontWeight: '600',
        fontSize: 14,
    },
    declineButtonWrapper: {
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)',
    },
    declineButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(26,26,26,0.8)',
    },
    declineButtonText: {
        color: THEME_COLORS.textPrimary,
        fontWeight: '600',
        fontSize: 14,
    },
    buttonIcon: {
        marginRight: 6,
    },
});