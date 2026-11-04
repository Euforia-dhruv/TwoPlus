import React from "react";
import { Platform, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, radius } from "../../src/lib/theme";
import { ui } from "../../src/components/ui";

/**
 * The five destinations. A floating glass bar rather than a full-bleed strip:
 * it keeps the bar clear of content, sits above the gesture area, and reads as
 * one deliberate surface instead of an OS default.
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.accentText,
        tabBarInactiveTintColor: color.textFaint,
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontFamily: ui.family.medium,
          marginTop: 2,
          letterSpacing: 0.2,
        },
        tabBarItemStyle: { paddingTop: 8 },
        tabBarStyle: {
          position: "absolute",
          left: 14,
          right: 14,
          bottom,
          height: 62,
          borderRadius: radius.xxl,
          backgroundColor: color.glass,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: color.glassBorder,
          paddingBottom: 0,
          paddingTop: 0,
          elevation: 0,
          ...Platform.select({
            android: { elevation: 0 },
            ios: {
              shadowColor: "#000",
              shadowOpacity: 0.35,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
            },
          }),
        },
        sceneStyle: { backgroundColor: color.canvas },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={21} color={focused ? color.accentText : color.textFaint} />
          ),
        }}
      />
      <Tabs.Screen
        name="train"
        options={{
          title: "Train",
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? "barbell" : "barbell-outline"} size={22} color={focused ? color.accentText : color.textFaint} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={22} color={focused ? color.accentText : color.textFaint} />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: "Coach",
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? "sparkles" : "sparkles-outline"} size={21} color={focused ? color.accentText : color.textFaint} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={21} color={focused ? color.accentText : color.textFaint} />
          ),
        }}
      />
    </Tabs>
  );
}

/** Shared bottom padding so no screen hides content behind the floating bar. */
export function tabBarSpace(insetBottom: number) {
  return 96 + Math.max(insetBottom, 0);
}

export function Spacer() {
  return <View style={{ height: 12 }} />;
}
