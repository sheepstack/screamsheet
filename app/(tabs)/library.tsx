import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { Link, useRouter, useFocusEffect } from "expo-router";
import {
  getLibrary,
  setUserMovieState,
  removeFromLibrary,
} from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";

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
            Sign in to sync your library →
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

type MovieEntry = {
  slug: string;
  title: string;
  year?: number;
  posterUrl?: string | null;
  subgenres?: string[];
};

type LibraryData = {
  kill: MovieEntry[];
  grave: MovieEntry[];
};

export default function LibraryScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [library, setLibrary] = useState<LibraryData>({
    kill: [],
    grave: [],
  });

  const loadLibrary = useCallback(async () => {
    if (!userId) {
      setLibrary({ kill: [], grave: [] });
      setErr("Sign in to see your Kill List and Graveyard.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);
    try {
      const data = await getLibrary(userId);
      setLibrary({
        kill: data.kill || [],
        grave: data.grave || [],
      });
    } catch (e: any) {
      console.log("library load err:", e?.message ?? e);
      setErr("Couldn't load your lists.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 🔄 Reload library whenever this tab/screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadLibrary();
    }, [loadLibrary])
  );

  function inKillList(slug: string) {
    return library.kill.some((m) => m.slug === slug);
  }
  function inGraveyard(slug: string) {
    return library.grave.some((m) => m.slug === slug);
  }

  async function handleAddKill(slug: string) {
    if (!userId) return;
    try {
      await setUserMovieState(userId, slug, "kill");
      await loadLibrary();
    } catch (e) {
      console.log("add kill err", e);
    }
  }

  async function handleAddGrave(slug: string) {
    if (!userId) return;
    try {
      await setUserMovieState(userId, slug, "grave");
      await loadLibrary();
    } catch (e) {
      console.log("add grave err", e);
    }
  }

  async function handleRemove(slug: string) {
    if (!userId) return;
    try {
      await removeFromLibrary(userId, slug);
      await loadLibrary();
    } catch (e) {
      console.log("remove err", e);
    }
  }

  function MovieCard({
    movie,
    context,
  }: {
    movie: MovieEntry;
    context: "kill" | "grave";
  }) {
    const isInKill = inKillList(movie.slug);
    const isInGrave = inGraveyard(movie.slug);

    let buttonLabel = "";
    let buttonAction: (() => void) | null = null;
    let buttonColorBG = theme.colors.accent;
    let buttonColorBorder = theme.colors.accent;
    let buttonTextColor = theme.colors.text;

    if (!userId) {
      buttonLabel = "Sign in to edit";
      buttonAction = null;
      buttonColorBG = theme.colors.panel;
      buttonColorBorder = theme.colors.border;
      buttonTextColor = theme.colors.subtext;
    } else if (context === "kill") {
      if (isInKill) {
        buttonLabel = "Remove from Kill List";
        buttonAction = () => handleRemove(movie.slug);
        buttonColorBG = theme.colors.panel;
        buttonColorBorder = theme.colors.border;
        buttonTextColor = theme.colors.subtext;
      } else {
        buttonLabel = "Add to Kill List";
        buttonAction = () => handleAddKill(movie.slug);
      }
    } else if (context === "grave") {
      if (isInGrave) {
        buttonLabel = "Remove from Graveyard";
        buttonAction = () => handleRemove(movie.slug);
        buttonColorBG = theme.colors.panel;
        buttonColorBorder = theme.colors.border;
        buttonTextColor = theme.colors.subtext;
      } else {
        buttonLabel = "Add to Graveyard";
        buttonAction = () => handleAddGrave(movie.slug);
      }
    }

    const onCardPress = () => {
      if (!movie.slug) return;
      router.push(`/movie/${movie.slug}`);
    };

    return (
      <Pressable
        onPress={onCardPress}
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
        {movie.posterUrl ? (
          <Image
            source={{ uri: movie.posterUrl }}
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
            {movie.title}{" "}
            {movie.year ? (
              <Text
                style={{
                  color: theme.colors.subtext,
                  fontSize: 13,
                  fontWeight: "400",
                }}
              >
                ({movie.year})
              </Text>
            ) : null}
          </Text>

          {movie.subgenres && movie.subgenres.length ? (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                marginTop: 6,
              }}
            >
              {movie.subgenres.slice(0, 4).map((tag: string) => (
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

          {buttonLabel ? (
            <Pressable
              onPress={(e) => {
                // prevent navigating when tapping the action button
                e.stopPropagation();
                if (buttonAction) buttonAction();
              }}
              disabled={!buttonAction}
              style={{
                marginTop: 10,
                alignSelf: "flex-start",
                backgroundColor: buttonColorBG,
                borderColor: buttonColorBorder,
                borderWidth: 1,
                borderRadius: theme.radius.sm,
                paddingVertical: 8,
                paddingHorizontal: 12,
                opacity: buttonAction ? 1 : 0.7,
              }}
            >
              <Text
                style={{
                  color: buttonTextColor,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                {buttonLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    );
  }

  function ListPanel({
    title,
    movies,
    context,
    emptyText,
  }: {
    title: string;
    movies: MovieEntry[];
    context: "kill" | "grave";
    emptyText: string;
  }) {
    return (
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.panel,
          borderRadius: theme.radius.md,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 16,
            fontWeight: "700",
            marginBottom: 12,
          }}
        >
          {title}
        </Text>

        {movies.length === 0 ? (
          <Text
            style={{
              color: theme.colors.subtext,
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            {emptyText}
          </Text>
        ) : (
          movies.map((m) => (
            <MovieCard key={m.slug} movie={m} context={context} />
          ))
        )}
      </View>
    );
  }

  return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        {/* header bar */}
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
            Your Library
          </Text>
          <Text
            style={{
              color: theme.colors.subtext,
              fontSize: 12,
              lineHeight: 16,
              marginTop: 4,
            }}
          >
            Kill List = watch soon. Graveyard = you survived it.
          </Text>

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
                Digging up your lists...
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
              <ListPanel
                title="Kill List 🔪"
                movies={library.kill}
                context="kill"
                emptyText="Nothing on deck. Add something you want to watch."
              />

              <ListPanel
                title="Graveyard ☠️"
                movies={library.grave}
                context="grave"
                emptyText="You haven't logged anything dead and buried yet."
              />
            </>
          )}
        </ScrollView>
      </View>
  );
}
