import React from 'react';
import {StyleSheet, View} from 'react-native';
import {THEME_COLORS} from '@/src/constants/Colors';
import {MatchFeedbackForm} from '../components/MatchFeedbackForm';
import {useLocalSearchParams, useRouter} from 'expo-router';

export default function FeedbackScreen() {
    const {matchId} = useLocalSearchParams<{ matchId: string }>();
    const router = useRouter();

    return (
        <View style={styles.container}>
            <MatchFeedbackForm
                matchId={matchId as string}
                onClose={() => router.back()}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME_COLORS.background,
    },
});