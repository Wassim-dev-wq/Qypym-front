import React, { useEffect, useRef } from 'react';
import { Marker } from 'react-native-maps';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/constants/Colors';
import type { Match } from '../types/Match';

interface MatchMarkerProps {
    match: Match;
    isSelected: boolean;
    onPress: () => void;
}

const MatchMarker: React.FC<MatchMarkerProps> = ({ match, isSelected, onPress }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 800,
                    useNativeDriver: true
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true
                })
            ])
        );

        if (match.status === 'IN_PROGRESS') {
            animation.start();
        }

        return () => animation.stop();
    }, [match.status]);

    const { style, displayText } = React.useMemo(() => {
        const baseStyle = {
            backgroundColor: COLORS.primary.main,
            icon: 'soccer'
        };

        let markerStyle = { ...baseStyle };
        let text = match.format;

        switch (match.status) {
            case 'IN_PROGRESS':
                markerStyle.backgroundColor = '#4CAF50';
                markerStyle.icon = 'whistle';
                break;
            case 'COMPLETED':
                markerStyle.backgroundColor = COLORS.neutral[600];
                markerStyle.icon = 'trophy-outline';
                text = match.format;
                break;
            case 'CANCELLED':
                markerStyle.backgroundColor = '#E57373';
                markerStyle.icon = 'close-circle';
                text = match.format;
                break;
        }

        if (isSelected) {
            markerStyle.backgroundColor = COLORS.primary.accent;
        }

        return { style: markerStyle, displayText: text };
    }, [match.status, match.format, isSelected]);

    if (!match.location?.coordinates) return null;

    return (
        <Marker
            identifier={match.id}
            coordinate={match.location.coordinates}
            onPress={(evt) => {
                evt.stopPropagation();
                onPress();
            }}
            tracksViewChanges={false}
        >
            <Animated.View style={[styles.wrapper, {
                transform: [{ scale: match.status === 'IN_PROGRESS' ? pulseAnim : 1 }]
            }]}>
                <View style={[styles.container, { backgroundColor: style.backgroundColor }]}>
                    <MaterialCommunityIcons name={style.icon} size={16} color="#FFF" />
                    <Text style={styles.text}>{displayText}</Text>
                </View>
            </Animated.View>
        </Marker>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#FFF',
        elevation: 3,
    },
    text: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    }
});

export default React.memo(MatchMarker);