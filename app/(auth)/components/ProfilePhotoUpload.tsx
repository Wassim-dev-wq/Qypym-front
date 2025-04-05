import React, {useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {Ionicons} from '@expo/vector-icons';
import {COLORS, THEME_COLORS} from '@/src/constants/Colors';
import {t} from 'src/constants/locales';
import {userApi} from "@/src/core/hooks/useUserFetch";

const defaultAvatar = require('@/assets/images/default-avatar.png');

interface ProfilePhotoUploadProps {
    onPhotoUploaded?: (success: boolean) => void;
    initialPhotoUri?: string;
    deferPermissions?: boolean;
}

export const ProfilePhotoUpload: React.FC<ProfilePhotoUploadProps> = ({
                                                                          onPhotoUploaded,
                                                                          initialPhotoUri,
                                                                      }) => {
    const [photoUri, setPhotoUri] = useState<string | null>(initialPhotoUri || null);
    const [isUploading, setIsUploading] = useState(false);

    const requestLibraryPermission = async () => {
        const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                t('permissionRequired'),
                t('photoLibraryPermissionNeeded'),
                [
                    {text: t('cancel'), style: 'cancel'},
                    {
                        text: t('settings'),
                        onPress: () => Platform.OS === 'ios' ?
                            Linking.openURL('app-settings:') :
                            Linking.openSettings()
                    }
                ]
            );
            return false;
        }
        return true;
    };

    const requestCameraPermission = async () => {
        if (Platform.OS !== 'web') {
            const {status} = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    t('permissionRequired'),
                    t('cameraPermissionNeeded'),
                    [
                        {text: t('cancel'), style: 'cancel'},
                        {
                            text: t('settings'),
                            onPress: () => Platform.OS === 'ios' ?
                                Linking.openURL('app-settings:') :
                                Linking.openSettings()
                        }
                    ]
                );
                return false;
            }
            return true;
        }
        return true;
    };

    const pickImage = async () => {
        try {
            const hasPermission = await requestLibraryPermission();
            if (!hasPermission) return;

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
                allowsMultipleSelection: false,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const selectedAsset = result.assets[0];
                setPhotoUri(selectedAsset.uri);
                uploadPhoto(selectedAsset.uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert(
                t('error'),
                t('photoSelectFailed'),
                [{text: t('ok')}]
            );
        }
    };

    const takePhoto = async () => {
        try {
            const hasPermission = await requestCameraPermission();
            if (!hasPermission) return;

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const selectedAsset = result.assets[0];
                setPhotoUri(selectedAsset.uri);
                uploadPhoto(selectedAsset.uri);
            }
        } catch (error) {
            console.error('Error taking photo:', error);
            Alert.alert(
                t('error'),
                t('photoCaptureFailed'),
                [{text: t('ok')}]
            );
        }
    };

    const uploadPhoto = async (uri: string) => {
        setIsUploading(true);
        try {
            await userApi.uploadProfilePhoto(uri);
            onPhotoUploaded && onPhotoUploaded(true);
        } catch (error) {
            console.error('Failed to upload profile photo:', error);
            Alert.alert(
                t('error'),
                t('photoUploadFailed'),
                [{text: t('ok')}]
            );
            onPhotoUploaded && onPhotoUploaded(false);
        } finally {
            setIsUploading(false);
        }
    };

    const renderImageOptions = () => {
        if (isUploading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary.accent}/>
                    <Text style={styles.loadingText}>{t('uploading')}</Text>
                </View>
            );
        }

        return (
            <View style={styles.optionsContainer}>
                <TouchableOpacity
                    style={styles.optionButton}
                    onPress={takePhoto}
                    disabled={isUploading}
                >
                    <Ionicons name="camera" size={22} color={THEME_COLORS.textPrimary}/>
                    <Text style={styles.optionText}>{t('takePhoto')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.optionButton}
                    onPress={pickImage}
                    disabled={isUploading}
                >
                    <Ionicons name="images" size={22} color={THEME_COLORS.textPrimary}/>
                    <Text style={styles.optionText}>{t('chooseFromLibrary')}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{t('profilePhoto')}</Text>
            <Text style={styles.subtitle}>{t('addProfilePhotoPrompt')}</Text>

            <View style={styles.photoContainer}>
                {photoUri ? (
                    <Image source={{uri: photoUri}} style={styles.photo}/>
                ) : (
                    <Image source={defaultAvatar} style={styles.photo}/>
                )}

                <TouchableOpacity
                    style={styles.photoOverlay}
                    onPress={pickImage}
                    disabled={isUploading}
                >
                    <Ionicons name="camera" size={32} color="white"/>
                </TouchableOpacity>
            </View>

            {renderImageOptions()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: THEME_COLORS.textPrimary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: THEME_COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    photoContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        position: 'relative',
        marginBottom: 20,
    },
    photo: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: COLORS.primary.accent
    },
    photoOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 60,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 30, 30, 0.8)',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginHorizontal: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.2)',
    },
    optionText: {
        color: THEME_COLORS.textPrimary,
        marginLeft: 8,
        fontSize: 14,
    },
    loadingContainer: {
        alignItems: 'center',
        marginTop: 10,
    },
    loadingText: {
        color: THEME_COLORS.textSecondary,
        marginTop: 10,
        fontSize: 14,
    }
});