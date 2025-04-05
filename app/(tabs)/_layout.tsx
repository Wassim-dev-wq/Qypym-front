import React from 'react';
import {Tabs, usePathname} from 'expo-router';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {COLORS} from '@/src/constants/Colors';
import {Animated, Easing, Platform, View} from "react-native";
import {useBottomSheetState} from "@/src/features/matches/components/bottomSheetContext";
import {useUnreadCount} from "@/src/core/hooks/useUnreadCount";
import { Text } from 'react-native';

export default function TabsLayout() {
    const {tabBarHeight} = useBottomSheetState();
    const pathname = usePathname();
    const unread = useUnreadCount();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: COLORS.primary.accent,
                tabBarInactiveTintColor: COLORS.neutral[300],
                tabBarStyle: {
                    backgroundColor: COLORS.primary.main,
                    borderTopWidth: 1,
                    borderTopColor: COLORS.primary.light,
                    height: tabBarHeight,
                    paddingBottom: Platform.OS === 'ios' ? 40 : 16,
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    display: tabBarHeight === 0 ? 'none' : 'flex',
                },
                tabBarHideOnKeyboard: true,
                headerShown: false,
                lazy: false,
            }}
        >
            <Tabs.Screen
                name="explore"
                options={{
                    title: 'Découvrir',
                    tabBarIcon: ({focused, color, size}) => (
                        <MaterialCommunityIcons
                            name={focused ? 'magnify' : 'magnify'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="saved"
                options={{
                    title: 'Favoris',
                    tabBarIcon: ({focused, color, size}) => (
                        <MaterialCommunityIcons
                            name={focused ? 'bookmark' : 'bookmark-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="matches"
                options={{
                    title: 'Matchs',
                    tabBarIcon: ({focused, color, size}) => (
                        <MaterialCommunityIcons
                            name={focused ? 'calendar-text' : 'calendar-text-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="messages"
                options={{
                    title: 'Messages',
                    tabBarIcon: ({ focused, color, size }) => (
                        <View style={{ position: 'relative' }}>
                            <MaterialCommunityIcons name={focused ? 'message' : 'message-outline'} size={size} color={color} />
                            {unread > 0 && (
                                <View
                                    style={{
                                        position: 'absolute',
                                        right: -6,
                                        top: -3,
                                        backgroundColor: 'red',
                                        borderRadius: 8,
                                        width: 16,
                                        height: 16,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                                        {unread}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ),
                }}></Tabs.Screen>
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profil',
                    tabBarIcon: ({focused, color, size}) => (
                        <MaterialCommunityIcons
                            name={focused ? 'account-circle' : 'account-circle-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}