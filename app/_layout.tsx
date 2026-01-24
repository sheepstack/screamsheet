// app/_layout.tsx
import React from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, ActivityIndicator } from "react-native";
import { AuthProvider, useAuth } from "../contexts/AuthContext";

function RootNavigator() {
  const { user, ready } = useAuth(); 

  // Wait for AuthProvider to restore token/user from AsyncStorage
  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#d11a2a" />
      </View>
    );
  }

  // Build a flat array of Stack.Screen children
  const screens = user
    ? [
        // Logged-in stack
        <Stack.Screen
          key="tabs"
          name="(tabs)"
          options={{ headerShown: false }}
        />,
        <Stack.Screen
          key="movie"
          name="movie/[slug]"
          options={{ headerShown: false }}
        />,
        <Stack.Screen
          key="night-of-frights"
          name="night-of-frights"
          options={{ headerShown: false }}
        />,
        <Stack.Screen
          key="modal"
          name="modal"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />,
      ]
    : [
        // Auth stack
        <Stack.Screen
          key="login"
          name="login"
          options={{ headerShown: false }}
        />,
        <Stack.Screen
          key="signup"
          name="signup"
          options={{ headerShown: false }}
        />,
      ];

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#000" },
      }}
    >
      {screens}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
