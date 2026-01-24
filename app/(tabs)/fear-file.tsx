import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getFearFile } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "expo-router";

const theme = {
  colors: {
    bg: "#000000",
    headerBg: "#000000",
    panel: "#111111",
    border: "#2a2a2a",
    text: "#ffffff",
    subtext: "#999999",
    accent: "#d11a2a",
    errorBg: "#220000",
  },
  radius: {
    lg: 16,
    md: 10,
    sm: 8,
  },
};

type FearFileData = {
  totals?: { ratings_count?: number };
  averages?: {
    panic?: number;
    splatter?: number;
    dread?: number;
    creature?: number;
    fun?: number;
    plot?: number;
    rewatch?: number;
  };
  favorites?: {
    top_creature?: { title: string; slug: string }[];
    top_splatter?: { title: string; slug: string }[];
    comfort_rewatch?: { title: string; slug: string }[];
  };
};

function UserStripInHeader() {
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
            Sign in to unlock your Fear File →
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

export default function FearFileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [data, setData] = useState<FearFileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const userId = user?.id ?? null;

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!userId) {
        setData(null);
        setErrorMsg("Sign in to unlock your Fear File.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await getFearFile(userId);
        if (!alive) return;

        setData(res || {});
      } catch (err: any) {
        console.log("fear-file load error:", err?.message ?? err);
        if (alive) {
          setErrorMsg("Not enough ratings to build your Fear File yet.");
          setData(null);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [userId]);

  function Header() {
    return (
      <View
        style={{
          backgroundColor: theme.colors.headerBg,
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
          Fear File
        </Text>
        <Text
          style={{
            color: theme.colors.subtext,
            fontSize: 12,
            marginTop: 4,
            lineHeight: 16,
          }}
        >
          Your horror DNA: what scares you, what you crave, and what you keep
          rewatching in the dark.
        </Text>

        <UserStripInHeader />
      </View>
    );
  }

  function StatRow({
    label,
    value,
    emoji,
  }: {
    label: string;
    value: number | undefined;
    emoji: string;
  }) {
    return (
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          borderBottomColor: theme.colors.border,
          borderBottomWidth: 1,
          paddingVertical: 8,
        }}
      >
        <Text
          style={{ color: theme.colors.text, fontSize: 14, fontWeight: "600" }}
        >
          {emoji} {label}
        </Text>
        <Text
          style={{ color: theme.colors.accent, fontSize: 14, fontWeight: "700" }}
        >
          {value ? value.toFixed(1) : "--"}
        </Text>
      </View>
    );
  }

  function FavoriteList({
    title,
    list,
  }: {
    title: string;
    list: { title: string; slug: string }[] | undefined;
  }) {
    return (
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 16,
            fontWeight: "700",
            marginBottom: 8,
          }}
        >
          {title}
        </Text>

        {list && list.length > 0 ? (
          list.map((m, idx) => (
            <Text
              key={idx}
              style={{
                color: theme.colors.subtext,
                fontSize: 13,
                marginBottom: 4,
              }}
            >
              • {m.title}
            </Text>
          ))
        ) : (
          <Text
            style={{
              color: theme.colors.subtext,
              fontSize: 13,
              fontStyle: "italic",
            }}
          >
            None yet.
          </Text>
        )}
      </View>
    );
  }

  function Body() {
    if (!userId) {
      return (
        <View
          style={{
            flex: 1,
            paddingHorizontal: 16,
            paddingTop: 24,
            backgroundColor: theme.colors.bg,
          }}
        >
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.panel,
              borderRadius: theme.radius.md,
              padding: 16,
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 16,
                fontWeight: "700",
                marginBottom: 6,
              }}
            >
              Fear File locked
            </Text>
            <Text
              style={{
                color: theme.colors.subtext,
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              Sign in or create an account to see your horror profile.
            </Text>

            <Link href="/login" asChild>
              <Pressable
                style={{
                  backgroundColor: theme.colors.accent,
                  borderColor: theme.colors.accent,
                  borderWidth: 1,
                  borderRadius: theme.radius.sm,
                  paddingVertical: 10,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  Go to sign in
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      );
    }

    if (loading) {
      return (
        <View
          style={{
            flex: 1,
            paddingHorizontal: 16,
            paddingTop: 24,
            alignItems: "center",
            backgroundColor: theme.colors.bg,
          }}
        >
          <ActivityIndicator color={theme.colors.accent} />
          <Text
            style={{
              color: theme.colors.subtext,
              fontSize: 13,
              marginTop: 8,
            }}
          >
            Building your Fear File...
          </Text>
        </View>
      );
    }

    if (errorMsg || !data) {
      return (
        <View
          style={{
            flex: 1,
            paddingHorizontal: 16,
            paddingTop: 24,
            backgroundColor: theme.colors.bg,
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.errorBg,
              borderColor: theme.colors.accent,
              borderWidth: 1,
              borderRadius: theme.radius.md,
              padding: 16,
            }}
          >
            <Text
              style={{
                color: theme.colors.accent,
                fontWeight: "600",
                fontSize: 14,
                marginBottom: 4,
              }}
            >
              Fear File unavailable
            </Text>
            <Text
              style={{
                color: theme.colors.subtext,
                fontSize: 12,
                lineHeight: 16,
              }}
            >
              {errorMsg ?? "Rate a few movies to unlock your Fear File."}
            </Text>
          </View>
        </View>
      );
    }

    const avg = data.averages || {};
    const fav = data.favorites || {};
    const totalRatings = data.totals?.ratings_count ?? 0;

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.bg }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 24,
          paddingBottom: insets.bottom + 40,
          backgroundColor: theme.colors.bg,
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.panel,
            borderColor: theme.colors.border,
            borderWidth: 1,
            borderRadius: theme.radius.md,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontSize: 16,
              fontWeight: "700",
              marginBottom: 4,
            }}
          >
            Your Taste Profile
          </Text>
          <Text
            style={{
              color: theme.colors.subtext,
              fontSize: 12,
              marginBottom: 12,
            }}
          >
            Based on {totalRatings} rated movies
          </Text>

          <StatRow label="Panic Meter" emoji="😱" value={avg.panic} />
          <StatRow label="Splatter Score" emoji="🩸" value={avg.splatter} />
          <StatRow label="Dread Level" emoji="🕷️" value={avg.dread} />
          <StatRow label="Creature Feature" emoji="🐾" value={avg.creature} />
          <StatRow label="Fun Factor" emoji="🎃" value={avg.fun} />
          <StatRow label="Plot Points" emoji="📖" value={avg.plot} />
          <StatRow label="Rewatchability" emoji="📼" value={avg.rewatch} />
        </View>

        <View
          style={{
            backgroundColor: theme.colors.panel,
            borderColor: theme.colors.border,
            borderWidth: 1,
            borderRadius: theme.radius.md,
            padding: 16,
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
            Calling Cards
          </Text>

          <FavoriteList
            title="Most obsessed with creatures"
            list={fav.top_creature}
          />
          <FavoriteList
            title="Bloodlust champions"
            list={fav.top_splatter}
          />
          <FavoriteList
            title="Comfort rewatches"
            list={fav.comfort_rewatch}
          />
        </View>
      </ScrollView>
    );
  }

  return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: 60 }}>
        <Header />
        <Body />
      </View>
  );
}
