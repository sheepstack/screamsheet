import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { Link } from "expo-router";
import { getRandomMovies } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const theme = {
  colors: {
    bg: "#000000",
    panel: "#111111",
    border: "#2a2a2a",
    text: "#ffffff",
    subtext: "#999999",
    accent: "#d11a2a",
    chipBg: "#1a1a1a",
    chipBorder: "#444444",
    errorBg: "#220000",
  },
  radius: {
    sm: 8,
    md: 12,
  },
};

function UserStrip() {
  const { user, signOut } = useAuth();
  const displayName = user?.username || user?.email || "";
  const initials =
    displayName && displayName.length > 0
      ? displayName.slice(0, 2).toUpperCase()
      : "?";

  if (!user) {
    return (
      <Link href="/login" asChild>
        <Pressable
          style={{
            marginTop: 10,
            alignSelf: "flex-start",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: "#181818",
          }}
        >
          <Text
            style={{
              color: theme.colors.subtext,
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            Sign in to save your screams →
          </Text>
        </Pressable>
      </Link>
    );
  }

  return (
    <View
      style={{
        marginTop: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: "#141414",
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: "#222",
          justifyContent: "center",
          alignItems: "center",
          marginRight: 8,
        }}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 12,
            fontWeight: "700",
          }}
        >
          {initials}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: theme.colors.subtext,
            fontSize: 11,
          }}
        >
          Signed in as
        </Text>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 13,
            fontWeight: "600",
          }}
        >
          {displayName}
        </Text>
      </View>
      <Pressable
        onPress={signOut}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: "#181818",
        }}
      >
        <Text
          style={{
            color: theme.colors.subtext,
            fontSize: 11,
            fontWeight: "600",
          }}
        >
          Sign out
        </Text>
      </Pressable>
    </View>
  );
}

export default function DiscoverScreen() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [movies, setMovies] = useState<any[]>([]);

  async function loadRandom() {
    setLoading(true);
    setErr(null);
    try {
      const data = await getRandomMovies(10);
      setMovies(data.results || []);
    } catch (e: any) {
      setErr("Couldn't load movies.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRandom();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {/* header area */}
      <View
        style={{
          backgroundColor: theme.colors.bg,
          paddingTop: 60,
          paddingBottom: 12,
          paddingHorizontal: 16,
          borderBottomColor: theme.colors.border,
          borderBottomWidth: 1,
        }}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 20,
            fontWeight: "700",
          }}
        >
          ScreamSheet
        </Text>

        <Text
          style={{
            color: theme.colors.subtext,
            fontSize: 12,
            lineHeight: 16,
            marginTop: 4,
          }}
        >
          10 fresh nightmares every time you shuffle.
        </Text>

        {/* buttons row */}
        <View
          style={{
            flexDirection: "row",
            marginTop: 12,
          }}
        >
          <Pressable
            onPress={loadRandom}
            style={{
              marginRight: 8,
              backgroundColor: theme.colors.accent,
              borderColor: theme.colors.accent,
              borderWidth: 1,
              borderRadius: theme.radius.sm,
              paddingVertical: 8,
              paddingHorizontal: 12,
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontWeight: "700",
                fontSize: 13,
              }}
            >
              🔄 Shuffle
            </Text>
          </Pressable>

          <Link href="/night-of-frights" asChild>
            <Pressable
              style={{
                backgroundColor: "#141414",
                borderColor: theme.colors.border,
                borderWidth: 1,
                borderRadius: theme.radius.sm,
                paddingVertical: 8,
                paddingHorizontal: 12,
              }}
            >
              <Text
                style={{
                  color: theme.colors.subtext,
                  fontWeight: "600",
                  fontSize: 13,
                }}
              >
                🌙 Night of Frights
              </Text>
            </Pressable>
          </Link>
        </View>

        {/* user strip */}
        <UserStrip />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 40,
        }}
      >
        {loading ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <ActivityIndicator color={theme.colors.accent} />
            <Text
              style={{
                color: theme.colors.subtext,
                fontSize: 13,
                marginTop: 8,
              }}
            >
              Loading screams...
            </Text>
          </View>
        ) : err ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.errorBg,
              borderRadius: theme.radius.md,
              padding: 16,
            }}
          >
            <Text
              style={{
                color: theme.colors.accent,
                fontSize: 14,
                fontWeight: "700",
                marginBottom: 4,
              }}
            >
              {err}
            </Text>
            <Text
              style={{
                color: theme.colors.subtext,
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              Try again.
            </Text>
          </View>
        ) : (
          <>
            {movies.map((m) => (
              <Link key={m.slug} href={`/movie/${m.slug}`} asChild>
                <Pressable
                  style={{
                    flexDirection: "row",
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.panel,
                    borderRadius: theme.radius.md,
                    padding: 12,
                    marginBottom: 12,
                  }}
                >
                  {m.posterUrl ? (
                    <Image
                      source={{ uri: m.posterUrl }}
                      style={{
                        width: 60,
                        height: 90,
                        borderRadius: theme.radius.sm,
                        backgroundColor: "#222",
                        marginRight: 12,
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 60,
                        height: 90,
                        borderRadius: theme.radius.sm,
                        backgroundColor: "#222",
                        marginRight: 12,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.subtext,
                          fontSize: 10,
                        }}
                      >
                        no poster
                      </Text>
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: 15,
                        fontWeight: "700",
                      }}
                    >
                      {m.title}{" "}
                      {m.year ? (
                        <Text
                          style={{
                            color: theme.colors.subtext,
                            fontSize: 13,
                            fontWeight: "400",
                          }}
                        >
                          ({m.year})
                        </Text>
                      ) : null}
                    </Text>

                    {m.subgenres && m.subgenres.length ? (
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          marginTop: 6,
                        }}
                      >
                        {m.subgenres.slice(0, 4).map((tag: string) => (
                          <View
                            key={tag}
                            style={{
                              borderWidth: 1,
                              borderColor: theme.colors.chipBorder,
                              backgroundColor: theme.colors.chipBg,
                              borderRadius: 999,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              marginRight: 6,
                              marginBottom: 6,
                            }}
                          >
                            <Text
                              style={{
                                color: theme.colors.subtext,
                                fontSize: 11,
                              }}
                            >
                              {tag}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              </Link>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
