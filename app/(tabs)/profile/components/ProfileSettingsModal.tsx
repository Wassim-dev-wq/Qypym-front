import React, {useEffect, useRef} from 'react';
import {Alert, Animated, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {User} from '@/src/types/user/user';

const {height: FULL_HEIGHT} = Dimensions.get('window');

interface ProfileSettingsModalProps {
    visible: boolean;
    onClose: () => void;
    user: User;
    onSignOut: () => void;
    onDeleteAccount: () => void;
}

export const ProfileSettingsModal = ({
                                         visible,
                                         onClose,
                                         user,
                                         onSignOut,
                                         onDeleteAccount
                                     }: ProfileSettingsModalProps) => {
    const edges = useSafeAreaInsets();
    const showAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(FULL_HEIGHT)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(showAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 40,
                    friction: 8,
                    useNativeDriver: true
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(showAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true
                }),
                Animated.timing(slideAnim, {
                    toValue: FULL_HEIGHT,
                    duration: 250,
                    useNativeDriver: true
                })
            ]).start();
        }
    }, [visible]);

    const confirmSignOut = () => {
        Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
            {text: 'Annuler', style: 'cancel'},
            {
                text: 'Déconnexion',
                onPress: () => {
                    onClose();
                    setTimeout(() => {
                        onSignOut();
                    }, 300);
                },
                style: 'destructive'
            }
        ]);
    };

    const confirmDelete = () => {
        Alert.alert(
            'Supprimer le compte',
            'Cette action est irréversible. Toutes vos données seront supprimées définitivement.',
            [
                {text: 'Annuler', style: 'cancel'},
                {
                    text: 'Supprimer',
                    onPress: () => {
                        onClose();
                        setTimeout(() => {
                            onDeleteAccount();
                        }, 300);
                    },
                    style: 'destructive'
                }
            ]
        );
    };

    const itemBlock = (
        iconName,
        mainText,
        extraText,
        onItemPress,
        isDanger = false,
        rightIcon = 'chevron-right'
    ) => (
        <TouchableOpacity style={styles.itemBox} onPress={onItemPress} activeOpacity={0.7}>
            <View style={[styles.itemIconWrap, isDanger && styles.itemIconDanger]}>
                <MaterialCommunityIcons
                    name={iconName}
                    size={22}
                    color={isDanger ? THEME_COLORS.error : COLORS.primary.accent}
                />
            </View>
            <View style={styles.itemCenter}>
                <Text style={[styles.itemMain, isDanger && styles.itemDangerTxt]}>{mainText}</Text>
                {extraText && <Text style={styles.itemSub}>{extraText}</Text>}
            </View>
            <MaterialCommunityIcons
                name={rightIcon}
                size={22}
                color={THEME_COLORS.textSecondary}
            />
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Animated.View style={[styles.backShade, {opacity: showAnim}]}>
                <TouchableOpacity style={styles.touchClose} activeOpacity={1} onPress={onClose}/>
                <Animated.View
                    style={[
                        styles.boxWrap,
                        {
                            transform: [{translateY: slideAnim}],
                            paddingBottom: edges.bottom || 20
                        }
                    ]}
                >
                    <View style={styles.boxHead}>
                        <View style={styles.dragBar}/>
                        <Text style={styles.boxTitle}>Paramètres du profil</Text>
                        <TouchableOpacity style={styles.closeSpot} onPress={onClose}>
                            <MaterialCommunityIcons
                                name="close"
                                size={24}
                                color={THEME_COLORS.textPrimary}
                            />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.boxInside} showsVerticalScrollIndicator={false}>
                        <View style={styles.parts}>
                            <Text style={styles.partsTitle}>Compte</Text>
                            {/*{itemBlock(*/}
                            {/*    'account-edit',*/}
                            {/*    'Modifier le profil',*/}
                            {/*    'Changer votre nom, photo et informations',*/}
                            {/*    () => {}*/}
                            {/*)}*/}
                            {/*{itemBlock(*/}
                            {/*    'email-edit',*/}
                            {/*    "Changer l'email",*/}
                            {/*    user?.isEmailVerified ? 'Email vérifié' : 'Email non vérifié',*/}
                            {/*    () => {}*/}
                            {/*)}*/}
                            {/*{itemBlock(*/}
                            {/*    'shield-account',*/}
                            {/*    'Sécurité',*/}
                            {/*    'Mot de passe et authentification',*/}
                            {/*    () => {}*/}
                            {/*)}*/}
                        </View>
                        <View style={styles.parts}>
                            <Text style={styles.partsTitle}>Préférences</Text>
                            {/*{itemBlock('bell-outline', 'Notifications', 'Gérer les alertes et notifications', () => {})}*/}
                            {/*{itemBlock('earth', 'Langue', 'Français', () => {})}*/}
                            {/*{itemBlock('theme-light-dark', 'Thème', 'Sombre', () => {})}*/}
                        </View>
                        <View style={styles.parts}>
                            <Text style={styles.partsTitle}>Aide & Légal</Text>
                            {/*{itemBlock('help-circle-outline', "Centre d'aide", 'Questions fréquentes et support', () => {})}*/}
                            {/*{itemBlock('file-document-outline', "Conditions d'utilisation", null, () => {})}*/}
                            {/*{itemBlock('shield-lock-outline', 'Politique de confidentialité', null, () => {})}*/}
                        </View>
                        <View style={styles.parts}>
                            <Text style={styles.partsTitle}>Actions</Text>
                            {/*{itemBlock('export-variant', 'Exporter mes données', 'Télécharger une copie de vos données', () => {})}*/}
                            {itemBlock('logout', 'Déconnexion', null, confirmSignOut, true)}
                            {/*{itemBlock('delete', 'Supprimer le compte', 'Supprimer définitivement toutes vos données', confirmDelete, true, 'alert')}*/}
                        </View>
                        <View style={styles.versionArea}>
                            <Text style={styles.versionTxt}>Version 1.0.0</Text>
                        </View>
                    </ScrollView>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backShade: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)'
    },
    touchClose: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
    },
    boxWrap: {
        backgroundColor: THEME_COLORS.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '85%'
    },
    boxHead: {
        alignItems: 'center',
        paddingTop: 16,
        paddingHorizontal: 20,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 184, 0, 0.1)'
    },
    dragBar: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 2,
        marginBottom: 16
    },
    boxTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: THEME_COLORS.textPrimary,
        marginBottom: 8
    },
    closeSpot: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(26,26,26,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.1)'
    },
    boxInside: {
        flex: 1
    },
    parts: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 12
    },
    partsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.primary.accent,
        marginBottom: 16
    },
    itemBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)'
    },
    itemIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 184, 0, 0.1)'
    },
    itemIconDanger: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)'
    },
    itemCenter: {
        flex: 1,
        marginLeft: 16
    },
    itemMain: {
        fontSize: 16,
        fontWeight: '500',
        color: THEME_COLORS.textPrimary,
        marginBottom: 2
    },
    itemDangerTxt: {
        color: THEME_COLORS.error
    },
    itemSub: {
        fontSize: 13,
        color: THEME_COLORS.textSecondary
    },
    versionArea: {
        alignItems: 'center',
        paddingVertical: 24
    },
    versionTxt: {
        fontSize: 13,
        color: THEME_COLORS.textSecondary
    }
});
