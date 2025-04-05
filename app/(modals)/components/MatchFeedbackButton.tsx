import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {t} from "src/constants/locales";
import {useFeedback} from '@/src/shared/hooks/useFeedback';
import {useRouter} from 'expo-router';

interface MatchFeedbackButtonProps {
    matchId: string;
    isFinished: boolean;
}

export const MatchFeedbackButton: React.FC<MatchFeedbackButtonProps> = ({matchId, isFinished}) => {
    const [hasFeedbackRequest, setHasFeedbackRequest] = useState<boolean>(false);
    const {getMatchFeedbackRequest, loading} = useFeedback();
    const router = useRouter();

    useEffect(() => {
        const checkFeedbackRequest = async () => {
            if (isFinished) {
                const request = await getMatchFeedbackRequest(matchId);
                setHasFeedbackRequest(!!request);
            }
        };
        checkFeedbackRequest();
    }, [matchId, isFinished]);

    if (!isFinished || !hasFeedbackRequest) {
        return null;
    }

    const handleFeedbackPress = () => {
        router.push({
            pathname: '../feedback/[matchId]',
            params: {matchId}
        });
    };

    return (
        <View style={styles.sectionContainer}>
            <TouchableOpacity
                style={styles.feedbackButton}
                onPress={handleFeedbackPress}
                disabled={loading}
            >
                <LinearGradient
                    colors={[COLORS.primary.accent, COLORS.primary.pressed || '#E59C00']}
                    style={styles.buttonGradient}
                >
                    <MaterialCommunityIcons name="star-outline" size={20} color="#000"/>
                    <Text style={styles.buttonText}>{t('ratePlayersAndMatch')}</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    sectionContainer: {
        marginHorizontal: 20,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginLeft: 10,
    },
    feedbackButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 8,
    },
    buttonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600',
    }
});