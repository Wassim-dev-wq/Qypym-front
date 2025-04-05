import React from 'react';
import { TouchableOpacity, Image, StyleSheet, Text, View, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { t } from 'src/constants/locales';
import { COLORS, THEME_COLORS } from '@/src/constants/Colors';
import { Match } from '@/src/types/match/match';

const { width } = Dimensions.get('window');
const margin = 12;
const cardW = width - margin * 4;

interface SavedCardProps {
    match: Match;
    toggleSave: (id: string) => void;
    openMatch: (id: string) => void;
}

const SavedMatchCard: React.FC<SavedCardProps> = ({ match, toggleSave, openMatch }) => (
    <TouchableOpacity style={styles.container} activeOpacity={0.7} onPress={() => openMatch(match.id)}>
        <Image source={{ uri: match.imageUrl || '/api/placeholder/400/300' }} style={styles.img} />
        <LinearGradient colors={[COLORS.background.overlay, 'transparent']} style={styles.gradientOverlay} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }}>
            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={styles.title} numberOfLines={1}>
                        {match.title}
                    </Text>
                    <TouchableOpacity onPress={() => toggleSave(match.id)} style={styles.saveBtn}>
                        <MaterialCommunityIcons
                            name={match.savedCount > 0 ? 'bookmark' : 'bookmark-outline'}
                            size={24}
                            color={match.savedCount > 0 ? COLORS.primary.accent : COLORS.neutral[50]}
                        />
                    </TouchableOpacity>
                </View>
                <Text style={styles.locationText} numberOfLines={1}>
                    {match.location.address}
                </Text>
                <LinearGradient colors={THEME_COLORS.statusColors.open} style={styles.statusBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.statusLabel}>{t('open')}</Text>
                </LinearGradient>
            </View>
        </LinearGradient>
    </TouchableOpacity>
);

export default SavedMatchCard;

const styles = StyleSheet.create({
    container: { marginVertical: margin, borderRadius: 16, backgroundColor: COLORS.background.card, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.background.cardHover },
    img: { width: cardW, height: 200, resizeMode: 'cover' },
    gradientOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' },
    content: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    saveBtn: { padding: 8, marginRight: -8 },
    title: { fontSize: 18, fontWeight: '600', color: COLORS.neutral[50], flex: 1, marginRight: 8 },
    locationText: { fontSize: 14, color: COLORS.neutral[300], marginTop: 4 },
    statusBox: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
    statusLabel: { color: COLORS.neutral[50], fontSize: 12, fontWeight: '500' },
});
