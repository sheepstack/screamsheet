// app/(tabs)/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const bg = "#000000";
const active = "#d11a2a";
const inactive = "#888888";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: bg,
          borderTopColor: "#222",
        },
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
      }}
    >
      {/* DISCOVER / ScreamSheet home */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="compass-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Kill List + Graveyard */}
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cassette" size={size + 2} color={color} />
          ),
        }}
      />

      {/* Fear File tab */}
      <Tabs.Screen
        name="fear-file"
        options={{
          title: "Fear File",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="skull-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Explore tab */}
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="movie-search-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
