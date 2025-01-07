import React, { useEffect, useState } from 'react';
import {
    Animated,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import type { Match } from '../types/Match';

interface MatchCalloutProps {
    match: Match;
    onClose: () => void;
    onLike: (match: Match) => void;
    setSelectedMarkerId: (id: string | null) => void;
    setShowCallout: (show: boolean) => void;
    onPress: (match: Match) => void;
}

const FocusedMatchCallout: React.FC<MatchCalloutProps> = ({
                                                              match,
                                                              onClose,
                                                              onLike,
                                                              setSelectedMarkerId,
                                                              setShowCallout,
                                                              onPress,
                                                          }) => {
    const [isLiked, setIsLiked] = useState(false);
    const scaleAnim = useState(new Animated.Value(0))[0];
    const likeScale = useState(new Animated.Value(1))[0];
    const entryAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        Animated.spring(entryAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 7,
            tension: 40,
            velocity: 3,
        }).start();
    }, [entryAnim]);

    const handleLike = () => {
        Animated.sequence([
            Animated.timing(likeScale, {
                toValue: 1.2,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.spring(likeScale, {
                toValue: 1,
                friction: 3,
                useNativeDriver: true,
            }),
        ]).start();

        setIsLiked((prev) => !prev);
        onLike(match);
    };

    const handleClose = () => {
        Animated.timing(entryAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setSelectedMarkerId(null);
            setShowCallout(false);
            onClose();
        });
    };

    const animatedStyle = {
        opacity: entryAnim,
        transform: [
            {
                scale: entryAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                }),
            },
            {
                translateY: entryAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                }),
            },
        ],
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const timeString = date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });

        if (date.toDateString() === today.toDateString()) {
            return `Today at ${timeString}`;
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return `Tomorrow at ${timeString}`;
        } else {
            return `${date.toLocaleDateString()} at ${timeString}`;
        }
    };

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <TouchableOpacity activeOpacity={0.95} onPress={() => onPress(match)}>
                <LinearGradient
                    colors={[COLORS.primary.dark, COLORS.primary.main]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradient}
                >
                    <View style={styles.header}>
                        <View style={styles.imageWrapper}>
                            <Image
                                source={{ uri: 'https://via.placeholder.com/100' }}
                                style={styles.image}
                            />
                        </View>
                        <View style={styles.actions}>
                            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                                <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
                                    <MaterialCommunityIcons
                                        name={isLiked ? 'heart' : 'heart-outline'}
                                        size={26}
                                        color={isLiked ? COLORS.secondary.error : COLORS.neutral[300]}
                                    />
                                </TouchableOpacity>
                            </Animated.View>

                            <TouchableOpacity onPress={handleClose} style={styles.actionButton}>
                                <MaterialCommunityIcons
                                    name="close"
                                    size={26}
                                    color={COLORS.neutral[300]}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.titleContainer}>
                        <Text style={styles.title} numberOfLines={1}>
                            {match.title}
                        </Text>
                        <View
                            style={[
                                styles.statusIndicator,
                                {
                                    backgroundColor:
                                        match.status === 'DRAFT'
                                            ? COLORS.secondary.warning
                                            : COLORS.secondary.success,
                                },
                            ]}
                        />
                    </View>

                    <View style={styles.infoContainer}>
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons
                                name="clock-outline"
                                size={20}
                                color={COLORS.primary.accent}
                            />
                            <Text style={styles.infoText}>
                                {formatDate(match.startDate)}
                                <Text style={styles.dotSeparator}> · </Text>
                                {match.duration}min
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons
                                name="map-marker-outline"
                                size={20}
                                color={COLORS.primary.accent}
                            />
                            <Text style={styles.infoText} numberOfLines={1}>
                                {match.location?.address}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <View style={styles.formatContainer}>
                            <MaterialCommunityIcons
                                name="trophy-outline"
                                size={18}
                                color={COLORS.primary.accent}
                            />
                            <Text style={styles.formatText}>
                                {match.format} - {match.skillLevel.toLowerCase()}
                            </Text>
                        </View>
                        <Text style={styles.price}>Free</Text>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default FocusedMatchCallout;

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 40,
        left: 16,
        right: 16,
        borderRadius: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
        zIndex: 999,
    },
    gradient: {
        borderRadius: 20,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    imageWrapper: {
        width: 64,
        height: 64,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: COLORS.primary.accent,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    actionButton: {
        padding: 8,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.neutral[50],
        flex: 1,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 8,
    },
    infoContainer: {
        gap: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    infoText: {
        fontSize: 15,
        color: COLORS.neutral[200],
        flex: 1,
    },
    dotSeparator: {
        color: COLORS.neutral[400],
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.primary.light,
    },
    formatContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    formatText: {
        fontSize: 15,
        color: COLORS.primary.accent,
        fontWeight: '600',
    },
    price: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.primary.accent,
    },
});
