import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";

const theme = {
  bg: "#000000",
  text: "#ffffff",
  sub: "#999999",
  accent: "#d11a2a",
  border: "#2a2a2a",
};

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async () => {
    if (loading) return;
    setErr(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // ✅ after successful login, jump into the app
      router.replace("/"); // this will show (tabs) because user is now truthy in _layout
    } catch (e: any) {
      setErr(e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          paddingHorizontal: 16,
          paddingTop: 16,
        }}
      >
        <Text
          style={{
            color: theme.text,
            fontSize: 24,
            fontWeight: "700",
            marginBottom: 16,
          }}
        >
          Sign in
        </Text>

        <View
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <TextInput
            placeholder="Email"
            placeholderTextColor={theme.sub}
            style={{ color: theme.text, paddingVertical: 8 }}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <TextInput
            placeholder="Password"
            placeholderTextColor={theme.sub}
            style={{ color: theme.text, paddingVertical: 8 }}
            secureTextEntry
            value={password}
            onChangeText={setPw}
          />
        </View>

        {!!err && (
          <Text style={{ color: "#ff6666", marginBottom: 12 }}>{err}</Text>
        )}

        <Pressable
          onPress={onSubmit}
          disabled={loading}
          style={{
            backgroundColor: theme.accent,
            borderColor: theme.accent,
            borderWidth: 1,
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: "center",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: theme.text, fontWeight: "700" }}>
              Sign in
            </Text>
          )}
        </Pressable>

        <Link href="/signup" asChild>
          <Pressable style={{ marginTop: 16 }}>
            <Text style={{ color: theme.sub, textAlign: "center" }}>
              No account? Create one
            </Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}
