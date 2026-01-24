// app/signup.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { register as apiRegister } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

const theme = {
  colors: {
    bg: "#000000",
    text: "#ffffff",
    subtext: "#999999",
    accent: "#d11a2a",
    border: "#2a2a2a",
    error: "#ff6666",
  },
};

export default function SignupScreen() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPw] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSignup() {
    if (loading) return;

    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();

    if (!trimmedEmail || !password || !confirm) {
      setErr("Email and password are required.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords don’t match.");
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      // 1) Create user
      await apiRegister(trimmedEmail, password, trimmedUsername || undefined);

      // 2) Immediately log in (this will set token + user_id in AuthProvider)
      await signIn(trimmedEmail, password);
    } catch (e: any) {
      setErr(e?.message ?? "Sign up failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.bg,
          paddingHorizontal: 16,
          paddingTop: 16, // safe area handles top inset; this adds a little breathing room
        }}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 24,
            fontWeight: "700",
            marginBottom: 8,
          }}
        >
          Join ScreamSheet
        </Text>
        <Text
          style={{
            color: theme.colors.subtext,
            fontSize: 13,
            marginBottom: 24,
          }}
        >
          Create an account to save your Kill List, Graveyard, and Fear File.
        </Text>

        {/* Email */}
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
            marginBottom: 12,
          }}
        >
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={theme.colors.subtext}
            style={{
              color: theme.colors.text,
              paddingVertical: 8,
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Username (optional) */}
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
            marginBottom: 12,
          }}
        >
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Username (optional)"
            placeholderTextColor={theme.colors.subtext}
            style={{
              color: theme.colors.text,
              paddingVertical: 8,
            }}
            autoCapitalize="none"
          />
        </View>

        {/* Password */}
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
            marginBottom: 12,
          }}
        >
          <TextInput
            value={password}
            onChangeText={setPw}
            placeholder="Password"
            placeholderTextColor={theme.colors.subtext}
            style={{
              color: theme.colors.text,
              paddingVertical: 8,
            }}
            secureTextEntry
          />
        </View>

        {/* Confirm password */}
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
            marginBottom: 12,
          }}
        >
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Confirm password"
            placeholderTextColor={theme.colors.subtext}
            style={{
              color: theme.colors.text,
              paddingVertical: 8,
            }}
            secureTextEntry
          />
        </View>

        {!!err && (
          <Text
            style={{
              color: theme.colors.error,
              marginBottom: 12,
              fontSize: 13,
            }}
          >
            {err}
          </Text>
        )}

        <Pressable
          onPress={handleSignup}
          disabled={loading}
          style={{
            backgroundColor: theme.colors.accent,
            borderColor: theme.colors.accent,
            borderWidth: 1,
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: "center",
            marginBottom: 16,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={{
                color: theme.colors.text,
                fontWeight: "700",
                fontSize: 15,
              }}
            >
              Create account
            </Text>
          )}
        </Pressable>

        <Link href="/login" asChild>
          <Pressable>
            <Text
              style={{
                color: theme.colors.subtext,
                textAlign: "center",
                fontSize: 13,
              }}
            >
              Already screaming with us? Log in
            </Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}
