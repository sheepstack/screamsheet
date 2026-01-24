// app/movie/[slug].tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Slider from "@react-native-community/slider";

import {
  getMovieDetail,
  getScores,
  postRatings,
  getLastWords,
  postLastWord,
  getLibrary,
  setUserMovieState,
  removeFromLibrary,
  getMyRating,
  getLikeStatus,
  likeMovie,
  unlikeMovie,
} from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

const theme = {
  colors: {
    bg: "#000",
    panel: "#111",
    card: "#1a1a1a",
    border: "#2a2a2a",
    text: "#fff",
    subtext: "#9aa0a6",
    accent: "#d11a2a",
    accentSoft: "#3b0d12",
    chip: "#161616",
    chipBorder: "#3a3a3a",
  },
  radius: { sm: 8, md: 12 },
};

type MovieDetail = {
  slug: string;
  title: string;
  year?: number;
  overview?: string;
  posterUrl?: string | null;
  subgenres?: string[];
};

type ScoresOut = {
  counts: number;
  averages: Record<string, number | null>;
  consensus: Record<string, string | null>;
};

type LastWordItem = {
  user_id: string;
  text: string;
  created_at: string;
};

type RatingsState = {
  panic: number;
  splatter: number;
  dread: number;
  creature: number;
  fun: number;
  plot: number;
  rewatch: number;
};

const METRICS: { key: keyof RatingsState; label: string }[] = [
  { key: "panic", label: "Panic Meter 😱" },
  { key: "splatter", label: "Splatter Score 🩸" },
  { key: "dread", label: "Dread Level 🕷️" },
  { key: "creature", label: "Creature Feature 🐾" },
  { key: "fun", label: "Fun Factor 🎃" },
  { key: "plot", label: "Plot Points 📖" },
  { key: "rewatch", label: "Rewatchability 📼" },
];

export default function MovieDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const slug =
    typeof params.slug === "string" ? params.slug : (params.slug?.[0] ?? "");

  const { user } = useAuth();
  // We are using email as the "user_id"
  const userId = user?.id ? String(user.id) : null;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [scores, setScores] = useState<ScoresOut | null>(null);

  const [ratings, setRatings] = useState<RatingsState>({
    panic: 3,
    splatter: 3,
    dread: 3,
    creature: 3,
    fun: 3,
    plot: 3,
    rewatch: 3,
  });
  const [savingRatings, setSavingRatings] = useState(false);

  const [lastWords, setLastWords] = useState<LastWordItem[]>([]);
  const [myLastWord, setMyLastWord] = useState<string>("");
  const [postingLW, setPostingLW] = useState(false);

  const [inKillList, setInKillList] = useState(false);
  const [inGraveyard, setInGraveyard] = useState(false);
  const [changingLibrary, setChangingLibrary] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  const titleLine = useMemo(() => {
    if (!movie) return "";
    return movie.year ? `${movie.title} (${movie.year})` : movie.title;
  }, [movie]);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setErr(null);

    try {
      // fetch movie, aggregate scores, and last words
      const [m, s, lw] = await Promise.all([
        getMovieDetail(slug),
        getScores(slug),
        getLastWords(slug),
      ]);

      setMovie(m);
      setScores(s);
      setLastWords(Array.isArray(lw) ? lw : []);

      if (userId) {
        // if logged in, also fetch library + *my* rating + like status
        const [lib, myRating, likeStatus] = await Promise.all([
          getLibrary(userId),
          getMyRating(userId, slug),
          getLikeStatus(slug, userId),
        ]);

        const isKill = (lib?.kill ?? []).some((x: any) => x.slug === slug);
        const isGrave = (lib?.grave ?? []).some((x: any) => x.slug === slug);
        setInKillList(isKill);
        setInGraveyard(isGrave);
        setLiked(!!likeStatus?.liked);

        if (myRating && myRating.exists) {
          setRatings({
            panic: myRating.panic ?? 3,
            splatter: myRating.splatter ?? 3,
            dread: myRating.dread ?? 3,
            creature: myRating.creature ?? 3,
            fun: myRating.fun ?? 3,
            plot: myRating.plot ?? 3,
            rewatch: myRating.rewatch ?? 3,
          });
        } else {
          // no prior rating -> neutral defaults
          setRatings({
            panic: 3,
            splatter: 3,
            dread: 3,
            creature: 3,
            fun: 3,
            plot: 3,
            rewatch: 3,
          });
        }
      } else {
        // logged-out: no personal library state
        setInKillList(false);
        setInGraveyard(false);
        setLiked(false);
        setRatings({
          panic: 3,
          splatter: 3,
          dread: 3,
          creature: 3,
          fun: 3,
          plot: 3,
          rewatch: 3,
        });
      }
    } catch (e: any) {
      console.log("movie detail load err:", e?.message ?? e);
      setErr("Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [slug, userId]);

  useEffect(() => {
    load();
  }, [load]);

  function requireLogin(actionDescription: string, cb: () => void) {
    if (!userId) {
      Alert.alert(
        "Sign in required",
        `Sign in to ${actionDescription}.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign in",
            onPress: () => router.push("/login"),
          },
        ]
      );
      return false;
    }
    cb();
    return true;
  }

  async function saveRatings() {
    if (!slug) return;
    if (!userId) {
      requireLogin("save ratings", () => {});
      return;
    }

    setSavingRatings(true);
    try {
      await postRatings(userId, slug, ratings);
      const s = await getScores(slug);
      setScores(s);
    } catch (e: any) {
      console.log("postRating error:", e?.message ?? e);
      Alert.alert("Couldn't save rating");
    } finally {
      setSavingRatings(false);
    }
  }

  async function submitLastWord() {
    if (!slug) return;
    const text = (myLastWord || "").trim();
    if (!text)
      return Alert.alert("Write a short 'Last Words' line first.");
    if (text.length > 200)
      return Alert.alert("Keep it under 200 characters.");

    if (!userId) {
      requireLogin("post Last Words", () => {});
      return;
    }

    setPostingLW(true);
    try {
      await postLastWord(userId, slug, text);
      setMyLastWord("");
      const lw = await getLastWords(slug);
      setLastWords(Array.isArray(lw) ? lw : []);
    } catch (e: any) {
      console.log("postLastWord error:", e?.message ?? e);
      Alert.alert("Couldn't post Last Words");
    } finally {
      setPostingLW(false);
    }
  }

  async function toggleKill() {
    if (!slug) return;
    if (!userId) {
      requireLogin("manage your Kill List", () => {});
      return;
    }

    setChangingLibrary(true);
    try {
      if (inKillList) {
        await removeFromLibrary(userId, slug);
        setInKillList(false);
      } else {
        await setUserMovieState(userId, slug, "kill");
        setInKillList(true);
        if (inGraveyard) setInGraveyard(false);
      }
    } catch (e: any) {
      console.log("setUserMovieState error:", e?.message ?? e);
      Alert.alert("Action failed");
    } finally {
      setChangingLibrary(false);
    }
  }

  async function toggleGrave() {
    if (!slug) return;
    if (!userId) {
      requireLogin("manage your Graveyard", () => {});
      return;
    }

    setChangingLibrary(true);
    try {
      if (inGraveyard) {
        await removeFromLibrary(userId, slug);
        setInGraveyard(false);
      } else {
        await setUserMovieState(userId, slug, "grave");
        setInGraveyard(true);
        if (inKillList) setInKillList(false);
      }
    } catch (e: any) {
      console.log("setUserMovieState error:", e?.message ?? e);
      Alert.alert("Action failed");
    } finally {
      setChangingLibrary(false);
    }
  }

  async function toggleLike() {
    if (!slug) return;
    if (!userId) {
      requireLogin("like movies", () => {});
      return;
    }

    setLikeBusy(true);
    try {
      if (liked) {
        await unlikeMovie(slug, userId);
        setLiked(false);
      } else {
        await likeMovie(slug, userId);
        setLiked(true);
      }
    } catch (e: any) {
      console.log("like toggle error:", e?.message ?? e);
      Alert.alert("Could not update like");
    } finally {
      setLikeBusy(false);
    }
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={theme.colors.accent} />
        <Text
          style={{
            color: theme.colors.subtext,
            marginTop: 8,
          }}
        >
          Loading…
        </Text>
      </View>
    );
  }

  if (err || !movie) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.bg,
          padding: 16,
        }}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontWeight: "700",
            fontSize: 16,
          }}
        >
          Something went wrong
        </Text>
        <Text
          style={{
            color: theme.colors.subtext,
            marginTop: 6,
          }}
        >
          {err ?? "No movie found."}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            marginTop: 16,
            alignSelf: "flex-start",
            backgroundColor: theme.colors.card,
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
              fontWeight: "700",
            }}
          >
            Back
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        {/* simple header */}
        <View
          style={{
            backgroundColor: theme.colors.bg,
            paddingTop: 0,
            paddingBottom: 12,
            paddingHorizontal: 16,
            borderBottomColor: theme.colors.border,
            borderBottomWidth: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: theme.radius.sm,
              paddingVertical: 6,
              paddingHorizontal: 10,
            }}
          >
            <Text
              style={{
                color: theme.colors.subtext,
                fontWeight: "700",
              }}
            >
              Close
            </Text>
          </Pressable>
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.text,
              fontSize: 16,
              fontWeight: "700",
              marginLeft: 12,
              flex: 1,
              textAlign: "center",
            }}
          >
            {movie.title}
          </Text>
          <View style={{ width: 64 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 48,
          }}
        >
          {/* Poster + title */}
          <View
            style={{
              flexDirection: "row",
              marginBottom: 16,
            }}
          >
            {movie.posterUrl ? (
              <Image
                source={{ uri: movie.posterUrl }}
                style={{
                  width: 110,
                  height: 165,
                  borderRadius: theme.radius.sm,
                  backgroundColor: "#222",
                  marginRight: 12,
                }}
              />
            ) : (
              <View
                style={{
                  width: 110,
                  height: 165,
                  borderRadius: theme.radius.sm,
                  backgroundColor: "#222",
                  marginRight: 12,
                  alignItems: "center",
                  justifyContent: "center",
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
                  fontSize: 18,
                  fontWeight: "800",
                }}
              >
                {titleLine}
              </Text>
              {!!movie.subgenres?.length && (
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    marginTop: 8,
                  }}
                >
                  {movie.subgenres.slice(0, 6).map((tag) => (
                    <View
                      key={tag}
                      style={{
                        borderWidth: 1,
                        borderColor: theme.colors.chipBorder,
                        backgroundColor: theme.colors.chip,
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
              )}
            </View>
          </View>

          {/* Library + Like (moved ABOVE Last Words) */}
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.panel,
              borderRadius: theme.radius.md,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontWeight: "800",
                marginBottom: 10,
              }}
            >
              Your Library
            </Text>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
              }}
            >
              {/* Like */}
              <Pressable
                onPress={toggleLike}
                disabled={likeBusy}
                style={{
                  marginRight: 8,
                  marginBottom: 8,
                  borderRadius: 999,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: liked
                    ? theme.colors.accent
                    : theme.colors.border,
                  backgroundColor: liked
                    ? theme.colors.accentSoft
                    : theme.colors.card,
                  opacity: likeBusy ? 0.7 : 1,
                }}
              >
                <Text
                  style={{
                    color: liked ? theme.colors.accent : theme.colors.text,
                    fontWeight: "700",
                    fontSize: 13,
                  }}
                >
                  {liked ? "♥ Liked" : "♡ Like this movie"}
                </Text>
              </Pressable>

              {/* Kill List */}
              <Pressable
                onPress={toggleKill}
                disabled={changingLibrary}
                style={{
                  marginRight: 8,
                  marginBottom: 8,
                  borderRadius: 999,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.accent,
                  backgroundColor: inKillList
                    ? theme.colors.card
                    : theme.colors.accent,
                  opacity: changingLibrary ? 0.7 : 1,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.text,
                    fontWeight: "700",
                    fontSize: 13,
                  }}
                >
                  {inKillList ? "Remove from Kill List" : "Add to Kill List"}
                </Text>
              </Pressable>

              {/* Graveyard */}
              <Pressable
                onPress={toggleGrave}
                disabled={changingLibrary}
                style={{
                  marginBottom: 8,
                  borderRadius: 999,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: "#555",
                  backgroundColor: inGraveyard ? theme.colors.card : "#555",
                  opacity: changingLibrary ? 0.7 : 1,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.text,
                    fontWeight: "700",
                    fontSize: 13,
                  }}
                >
                  {inGraveyard
                    ? "Remove from Graveyard"
                    : "Add to Graveyard"}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Overview */}
          {movie.overview ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.panel,
                borderRadius: theme.radius.md,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: theme.colors.text,
                  fontWeight: "700",
                  marginBottom: 6,
                }}
              >
                Synopsis
              </Text>
              <Text
                style={{
                  color: theme.colors.subtext,
                  lineHeight: 20,
                }}
              >
                {movie.overview}
              </Text>
            </View>
          ) : null}

          {/* Community aggregate scores */}
          {scores && scores.counts > 0 && (
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.panel,
                borderRadius: theme.radius.md,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: theme.colors.text,
                  fontWeight: "800",
                  marginBottom: 4,
                }}
              >
                Community Scores
              </Text>
              <Text
                style={{
                  color: theme.colors.subtext,
                  fontSize: 12,
                  marginBottom: 10,
                }}
              >
                Based on {scores.counts} rating
                {scores.counts === 1 ? "" : "s"}
              </Text>

              {METRICS.map(({ key, label }) => {
                const avg = scores.averages[key as string];
                const cons = scores.consensus[key as string];
                return (
                  <View
                    key={`agg-${key}`}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      borderBottomColor: theme.colors.border,
                      borderBottomWidth: 1,
                      paddingVertical: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      {label}
                    </Text>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={{
                          color: theme.colors.accent,
                          fontSize: 13,
                          fontWeight: "700",
                        }}
                      >
                        {avg != null ? avg.toFixed(2) : "—"}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.subtext,
                          fontSize: 11,
                          marginTop: 2,
                        }}
                      >
                        {cons ?? "No consensus"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Your Ratings - ONLY show if user is logged in */}
          {userId && (
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.panel,
                borderRadius: theme.radius.md,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: theme.colors.text,
                  fontWeight: "800",
                  marginBottom: 8,
                }}
              >
                Your ScreamSheet Meters
              </Text>
              {METRICS.map(({ key, label }) => (
                <View key={key} style={{ marginBottom: 14 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontWeight: "700",
                      }}
                    >
                      {label}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.subtext,
                      }}
                    >
                      {ratings[key]}
                    </Text>
                  </View>
                  <Slider
                    minimumValue={1}
                    maximumValue={5}
                    step={1}
                    value={ratings[key]}
                    onValueChange={(v) =>
                      setRatings((prev) => ({
                        ...prev,
                        [key]: Math.round(v),
                      }))
                    }
                    minimumTrackTintColor={theme.colors.accent}
                    maximumTrackTintColor="#333"
                    thumbTintColor={theme.colors.accent}
                  />
                </View>
              ))}

              <Pressable
                onPress={saveRatings}
                disabled={savingRatings}
                style={{
                  marginTop: 6,
                  alignSelf: "flex-start",
                  backgroundColor: theme.colors.accent,
                  borderColor: theme.colors.accent,
                  borderWidth: 1,
                  borderRadius: theme.radius.sm,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  opacity: savingRatings ? 0.7 : 1,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.text,
                    fontWeight: "800",
                  }}
                >
                  {savingRatings ? "Saving…" : "Save Ratings"}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Last Words block (now BELOW library/ratings) */}
          <View
            style={{
              borderWidth: 2,
              borderColor: theme.colors.accent,
              backgroundColor: theme.colors.accentSoft,
              borderRadius: theme.radius.md,
              padding: 12,
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontWeight: "800",
                marginBottom: 8,
              }}
            >
              Last Words
            </Text>

            {lastWords?.length ? (
              <View style={{ marginBottom: 12 }}>
                {lastWords.slice(0, 3).map((lw, idx) => (
                  <View
                    key={lw.user_id + lw.created_at + idx}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.card,
                      borderRadius: theme.radius.sm,
                      padding: 10,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: 15,
                        fontStyle: "italic",
                        lineHeight: 20,
                      }}
                    >
                      “{lw.text}”
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.subtext,
                        fontSize: 11,
                        marginTop: 6,
                      }}
                    >
                      — {lw.user_id} •{" "}
                      {new Date(lw.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text
                style={{
                  color: theme.colors.subtext,
                  marginBottom: 12,
                }}
              >
                No one has spoken their Last Words yet…
              </Text>
            )}

            <TextInput
              value={myLastWord}
              onChangeText={setMyLastWord}
              placeholder="Your one-sentence verdict (200 chars max)…"
              placeholderTextColor={theme.colors.subtext}
              style={{
                color: theme.colors.text,
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                borderWidth: 1,
                borderRadius: theme.radius.sm,
                paddingHorizontal: 10,
                paddingVertical: 10,
                marginBottom: 8,
              }}
              maxLength={200}
              multiline
            />
            <Pressable
              onPress={submitLastWord}
              disabled={postingLW}
              style={{
                alignSelf: "flex-start",
                backgroundColor: theme.colors.accent,
                borderColor: theme.colors.accent,
                borderWidth: 1,
                borderRadius: theme.radius.sm,
                paddingVertical: 8,
                paddingHorizontal: 12,
                opacity: postingLW ? 0.7 : 1,
              }}
            >
              <Text
                style={{
                  color: theme.colors.text,
                  fontWeight: "700",
                }}
              >
                {postingLW ? "Posting…" : "Post Last Words"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
