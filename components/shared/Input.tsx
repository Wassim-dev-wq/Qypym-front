import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    Animated,
    NativeSyntheticEvent,
    StyleSheet,
    TextInput, TextInputFocusEventData,
    TextInputProps,
    TouchableOpacity,
    View,
} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {COLORS} from '@/constants/Colors';

interface InputProps extends TextInputProps {
    error?: string | boolean | undefined;
    style?: any;
    testID?: string;
    icon?: keyof typeof MaterialIcons.glyphMap;
    secureTextEntryToggle?: boolean;
    label?: string;
    onBlur?: (e: NativeSyntheticEvent<TextInputFocusEventData>) => void;
}

export function Input({
                          error,
                          style,
                          testID,
                          icon,
                          secureTextEntryToggle = false,
                          placeholder,
                          value,
                          onChangeText,
                          onBlur,
                          label,
                          secureTextEntry,
                          ...props
                      }: InputProps) {
    const [secureText, setSecureText] = useState(secureTextEntry);
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(Boolean(value));

    const borderAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        setSecureText(secureTextEntry);
    }, [secureTextEntry]);

    const handleToggleSecureText = useCallback(() => {
        setSecureText(prevState => !prevState);
    }, []);

    const animateFocus = useCallback((focused: boolean) => {
        Animated.parallel([
            Animated.timing(borderAnim, {
                toValue: focused ? 1 : 0,
                duration: 200,
                useNativeDriver: false,
            }),
        ]).start();
    }, [hasValue]);

    const handleFocus = useCallback(() => {
        setIsFocused(true);
        animateFocus(true);
    }, [animateFocus]);

    const handleBlurInput = useCallback((e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        setIsFocused(false);
        animateFocus(false);
        onBlur?.(e);
    }, [animateFocus, onBlur]);

    const handleChangeText = useCallback((text: string) => {
        setHasValue(Boolean(text));
        onChangeText?.(text);
    }, [onChangeText]);

    const borderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [COLORS.neutral[700], COLORS.primary.accent],
    });

    return (
        <View style={[styles.container, style]}>
            {label &&
                <Animated.Text style={[styles.label]}>
                    {label || placeholder}
                </Animated.Text>
            }
            <Animated.View
                style={[
                    styles.inputWrapper,
                    {
                        borderColor: error ? COLORS.validation.errorBorder : borderColor,
                        backgroundColor: isFocused
                            ? 'rgba(255, 255, 255, 0.03)'
                            : 'rgba(255, 255, 255, 0.01)',
                    },
                ]}
            >
                {icon && (
                    <MaterialIcons
                        name={icon}
                        size={20}
                        color={error
                            ? COLORS.validation.errorIcon
                            : isFocused
                                ? COLORS.primary.accent
                                : COLORS.neutral[400]
                        }
                        style={styles.icon}
                    />
                )}

                <TextInput
                    style={[
                        styles.input,
                        icon && styles.inputWithIcon,
                    ]}
                    placeholderTextColor={COLORS.neutral[500]}
                    placeholder={placeholder}
                    onBlur={handleBlurInput}
                    onChangeText={handleChangeText}
                    value={value}
                    secureTextEntry={secureText}
                    onFocus={handleFocus}
                    selectionColor={COLORS.primary.accent}
                    {...props}
                />

                {secureTextEntryToggle && (
                    <TouchableOpacity
                        onPress={handleToggleSecureText}
                        style={styles.toggleButton}
                        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                    >
                        <MaterialIcons
                            name={secureText ? 'visibility-off' : 'visibility'}
                            size={20}
                            color={isFocused ? COLORS.primary.accent : COLORS.neutral[400]}
                        />
                    </TouchableOpacity>
                )}
            </Animated.View>

            {error && (
                <Animated.Text style={styles.errorText}>
                    {error}
                </Animated.Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
        paddingTop: 12,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        height: 56,
        paddingHorizontal: 16,
        overflow: 'hidden',
    },
    label: {
        position: 'absolute',
        paddingLeft: 32,
        left: 16,
        top: 27,
        fontSize: 15,
        fontFamily: 'Inter_Regular',
        color: COLORS.neutral[300],
        zIndex: 1,
        backgroundColor: 'transparent',
    },
    input: {
        flex: 1,
        color: COLORS.neutral[50],
        fontSize: 16,
        fontFamily: 'Inter_Regular',
        height: '100%',
        paddingVertical: 8,
    },
    inputWithIcon: {
        paddingLeft: 32,
    },
    icon: {
        position: 'absolute',
        left: 16,
    },
    toggleButton: {
        padding: 8,
        marginLeft: 8,
    },
    errorText: {
        color: COLORS.validation.errorText,
        fontSize: 12,
        fontFamily: 'Inter_Regular',
        marginTop: 4,
        marginLeft: 16,
    },
});