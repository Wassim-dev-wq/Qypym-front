import React, {useEffect, useRef} from 'react';
import {Marker} from 'react-native-maps';
import {Animated, StyleSheet, Text} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {COLORS} from '@/src/constants/Colors';
import {isValidMatchStatus} from "@/src/types/match/options";
import { Match } from '@/src/types/match/match';

type IconNames =
    | 'soccer'
    | 'pencil-outline'
    | 'check-circle-outline'
    | 'whistle'
    | 'flag-checkered'
    | 'close-circle-outline'
    | 'file-edit'
    | 'account-group'
    | 'trophy'
    | 'close-circle'
    | 'shield-crown';

interface PinProps {
    match: Match;
    isSelected: boolean;
    onPress: () => void;
}

const FocusedMatchMarker: React.FC<PinProps> = ({match, isSelected, onPress}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const ownerFlag = match.owner;

    useEffect(() => {
        if (match.status === 'IN_PROGRESS') {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 100,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [match.status, scaleAnim]);

    if (!match.location?.coordinates) return null;

    const getVariantStyle = () => {
        let variant = {...styles.variants.default};
        if (ownerFlag) {
            variant = {...variant, ...styles.variants.owner};
        }
        if (isValidMatchStatus(match.status)) {
            variant = {...variant, ...styles.variants.status[match.status]};
        }
        if (isSelected) {
            variant = {...variant, ...styles.variants.selected};
        }
        return variant;
    };

    const variantStyle = getVariantStyle();
    const label = match.format;

    return (
        <Marker
            identifier={match.id}
            coordinate={match.location.coordinates}
            onPress={(event) => {
                event.stopPropagation();
                onPress();
            }}
            tracksViewChanges={false}
        >
            <Animated.View style={{transform: [{scale: scaleAnim}]}}>
                <LinearGradient
                    colors={[
                        variantStyle.backgroundColor,
                        variantStyle.gradientEnd || variantStyle.backgroundColor,
                    ] as [string, string]}
                    start={{x: 0, y: 0}}
                    end={{x: 0, y: 1}}
                    style={[
                        styles.base.container,
                        {
                            borderColor: variantStyle.borderColor,
                            shadowColor: variantStyle.shadowColor || '#000',
                            shadowOpacity: 0.4,
                            shadowRadius: 5,
                            shadowOffset: {width: 0, height: 2},
                            elevation: 5,
                        },
                    ]}
                >
                    <MaterialCommunityIcons
                        name={variantStyle.icon as IconNames}
                        size={16}
                        color="#FFF"
                    />
                    <Text style={styles.base.text}>{label}</Text>
                </LinearGradient>
            </Animated.View>
        </Marker>
    );
};

export default React.memo(FocusedMatchMarker);

const styles = {
    base: StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: '#FFF',
        },
        text: {
            color: '#FFF',
            fontSize: 12,
            fontWeight: '600',
        },
    }),
    variants: {
        default: {
            backgroundColor: 'rgba(26,26,26,0.9)',
            gradientEnd: 'rgba(17,17,17,0.85)',
            icon: 'soccer' as IconNames,
            borderColor: 'rgba(255, 184, 0, 0.3)',
            shadowColor: 'rgba(0, 0, 0, 0.5)',
        },
        owner: {
            backgroundColor: 'rgba(26,26,26,0.9)',
            gradientEnd: 'rgba(17,17,17,0.85)',
            borderColor: COLORS.primary.accent,
            shadowColor: COLORS.primary.accent,
        },
        status: {
            DRAFT: {
                backgroundColor: 'rgba(100, 100, 100, 0.9)',
                gradientEnd: 'rgba(80, 80, 80, 0.85)',
                icon: 'file-edit' as IconNames,
                borderColor: 'rgba(255, 255, 255, 0.3)',
            },
            OPEN: {
                backgroundColor: 'rgba(26,26,26,0.9)',
                gradientEnd: 'rgba(17,17,17,0.85)',
                icon: 'account-group' as IconNames,
                borderColor: 'rgba(255, 184, 0, 0.3)',
            },
            IN_PROGRESS: {
                backgroundColor: 'rgba(34, 197, 94, 0.9)',
                gradientEnd: 'rgba(34, 180, 94, 0.85)',
                icon: 'whistle' as IconNames,
                borderColor: 'rgba(255, 255, 255, 0.5)',
                shadowColor: 'rgba(34, 197, 94, 0.7)',
            },
            COMPLETED: {
                backgroundColor: 'rgba(100, 100, 100, 0.9)',
                gradientEnd: 'rgba(80, 80, 80, 0.85)',
                icon: 'trophy' as IconNames,
                borderColor: 'rgba(255, 255, 255, 0.3)',
            },
            CANCELLED: {
                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                gradientEnd: 'rgba(220, 38, 38, 0.85)',
                icon: 'close-circle' as IconNames,
                borderColor: 'rgba(255, 255, 255, 0.5)',
                shadowColor: 'rgba(239, 68, 68, 0.7)',
            },
        },
        selected: {
            backgroundColor: COLORS.primary.accent,
            gradientEnd: COLORS.primary.pressed,
            icon: 'soccer' as IconNames,
            borderColor: '#FFF',
            shadowColor: COLORS.primary.accent,
        },
    },
};