import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, GestureResponderEvent, ViewStyle, TextStyle } from 'react-native';
import {COLORS} from '@/src/constants/Colors';


interface ButtonProps {
    title: string;
    onPress: (() => void) | ((event: GestureResponderEvent) => void);
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
    loading?: boolean;
    testID?: string;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export function Button({
                           title,
                           onPress,
                           variant = 'primary',
                           disabled = false,
                           loading = false,
                           testID,
                           style,
                           textStyle,
                           ...props
                       }: ButtonProps) {
    const backgroundColor = disabled
        ? COLORS.neutral[700]
        : variant === 'primary'
            ? COLORS.primary.accent
            : 'transparent';

    const borderColor = variant === 'secondary' ? COLORS.primary.accent : 'transparent';

    const textColor = variant === 'primary'
        ? COLORS.primary.dark
        : COLORS.primary.accent;

    return (
        <TouchableOpacity
            style={[
                Styles.button,
                {
                    backgroundColor,
                    borderColor,
                },
                variant === 'secondary' && Styles.secondaryButton,
                disabled && Styles.disabledButton,
                style,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            testID={testID}
            {...props}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === 'primary' ? COLORS.primary.dark : COLORS.primary.accent}
                />
            ) : (
                <Text
                    style={[
                        Styles.text,
                        { color: textColor },
                        variant === 'secondary' && Styles.secondaryText,
                        textStyle
                    ]}
                >
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
}

const Styles = StyleSheet.create({
    button: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary.accent,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    secondaryButton: {
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    disabledButton: {
        opacity: 0.6,
        backgroundColor: COLORS.neutral[700],
    },
    text: {
        fontSize: 16,
        fontFamily: 'Inter_SemiBold',
        color: COLORS.primary.dark,
    },
    secondaryText: {
        color: COLORS.primary.accent,
    },
    loadingIndicator: {
        color: COLORS.primary.dark,
    },
});
