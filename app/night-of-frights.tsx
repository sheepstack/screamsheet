import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { generateNightOfFrights, NightReq, NightResponse } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

const theme = {
  colors: {
    bg: "#000000",
    panel: "#111111",
    border: "#2a2a2a",
    text: "#ffffff",
    subtext: "#999999",
    accent: "#d11a2a",
    cardBg: "#1a1a1a",
    errorBg: "#220000",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
};

type FrightResponseMovie = {
  slug: string;
  title: string;
  year?: number;
  posterUrl?: string | null;
  why?: string;
};

export default function NightOfFrightsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : undefined;

  // User choices / filters
  const [vibe, setVibe] = useState<
    | "slashers"
    | "creature-feature"
    | "paranormal"
    | "psychological"
    | "party-horror"
    | "slow-burn-doom"
    | "found-footage"
    | "campy"
    | "cult-classics"
    | "new-scares"
  >("slashers");

  const [blood, setBlood] = useState<"low" | "medium" | "high">("medium");
  const [intensity, setIntensity] = useState<"chill" | "tense" | "relentless">(
    "tense"
  );
  const [era, setEra] = useState<"70s" | "80s" | "90s" | "modern">("80s");

  // Request state
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [plan, setPlan] = useState<NightResponse | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setErrMsg(null);
    setPlan(null);

    try {
      const req: NightReq = {
        vibe,
        blood,
        intensity,
        era,
        user_id: userId,
      };

      const resp = await generateNightOfFrights(req);

      if (resp && (resp.opener || resp.main_event || resp.chaser)) {
        setPlan(resp);
      } else {
        setPlan(null);
        setErrMsg("No lineup found. Try different options.");
      }
    } catch (err: any) {
      console.log("Night of Frights error:", err?.message ?? err);
      setErrMsg("Couldn't build your lineup.");
    } finally {
      setLoading(false);
    }
  }

  function SectionHeader({ title }: { title: string }) {
    return (
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
    );
  }

  function ChoiceRow({
    label,
    options,
    value,
    onChange,
  }: {
    label: string;
    options: { value: any; label: string }[];
    value: any;
    onChange: (v: any) => void;
  }) {
    return (
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
            fontSize: 14,
            fontWeight: "700",
            marginBottom: 10,
          }}
        >
          {label}
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => onChange(opt.value)}
                style={{
                  backgroundColor: selected
                    ? theme.colors.accent
                    : theme.colors.cardBg,
                  borderColor: selected
                    ? theme.colors.accent
                    : theme.colors.border,
                  borderWidth: 1,
                  borderRadius: theme.radius.sm,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  marginRight: 8,
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  function MovieSlot({
    label,
    data,
    accent,
  }: {
    label: string;
    data: FrightResponseMovie | null;
    accent: string;
  }) {
    if (!data) {
      return (
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.cardBg,
            borderRadius: theme.radius.sm,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              color: accent,
              fontSize: 13,
              fontWeight: "700",
              marginBottom: 4,
            }}
          >
            {label}
          </Text>
          <Text style={{ color: theme.colors.subtext, fontSize: 12 }}>—</Text>
        </View>
      );
    }

    const goToMovie = () => {
      if (!data.slug) return;
      router.push(`/movie/${data.slug}`);
    };

    return (
      <Pressable
        onPress={goToMovie}
        style={{
          flexDirection: "row",
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.cardBg,
          borderRadius: theme.radius.sm,
          padding: 12,
          marginBottom: 12,
        }}
      >
        {data.posterUrl ? (
          <Image
            source={{ uri: data.posterUrl }}
            style={{
              width: 70,
              height: 105,
              borderRadius: theme.radius.sm,
              backgroundColor: "#222",
              marginRight: 12,
            }}
          />
        ) : (
          <View
            style={{
              width: 70,
              height: 105,
              borderRadius: theme.radius.sm,
              backgroundColor: "#222",
              marginRight: 12,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: theme.colors.subtext, fontSize: 10 }}>
              no poster
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: accent,
              fontSize: 13,
              fontWeight: "700",
              marginBottom: 4,
            }}
          >
            {label}
          </Text>

          <Text
            style={{
              color: theme.colors.text,
              fontSize: 15,
              fontWeight: "700",
              marginBottom: 2,
            }}
          >
            {data.title}{" "}
            {data.year ? (
              <Text
                style={{
                  color: theme.colors.subtext,
                  fontSize: 13,
                  fontWeight: "400",
                }}
              >
                ({data.year})
              </Text>
            ) : null}
          </Text>

          {data.why ? (
            <Text
              style={{
                color: theme.colors.subtext,
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              {data.why}
            </Text>
          ) : null}

          <Text
            style={{
              color: theme.colors.accent,
              fontSize: 11,
              marginTop: 6,
            }}
          >
            Tap for details →
          </Text>
        </View>
      </Pressable>
    );
  }

  function LineupPanel() {
    if (loading) {
      return (
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.panel,
            borderRadius: theme.radius.md,
            padding: 16,
            alignItems: "center",
          }}
        >
          <ActivityIndicator color={theme.colors.accent} />
          <Text
            style={{
              color: theme.colors.subtext,
              marginTop: 10,
              fontSize: 13,
            }}
          >
            Summoning a cursed lineup...
          </Text>
        </View>
      );
    }

    if (errMsg) {
      return (
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
              fontWeight: "700",
              fontSize: 14,
              marginBottom: 4,
            }}
          >
            {errMsg}
          </Text>
          <Text
            style={{
              color: theme.colors.subtext,
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            Try a different era or vibe, or seed more movies for that era.
          </Text>
        </View>
      );
    }

    if (!plan) {
      return (
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
              marginBottom: 4,
            }}
          >
            Your Night Is Empty
          </Text>
          <Text
            style={{
              color: theme.colors.subtext,
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            Pick your theme and tap Generate Lineup.
          </Text>
        </View>
      );
    }

    return (
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.panel,
          borderRadius: theme.radius.md,
          padding: 16,
        }}
      >
        {/* Horror host intro */}
        {plan.blurb ? (
          <View
            style={{
              marginBottom: 16,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.sm,
              backgroundColor: theme.colors.cardBg,
              padding: 12,
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 14,
                fontWeight: "600",
                marginBottom: 6,
              }}
            >
              Tonight's Program
            </Text>
            <Text
              style={{
                color: theme.colors.subtext,
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              {plan.blurb}
            </Text>
          </View>
        ) : null}

        {/* Slots (now tappable) */}
        <MovieSlot
          label="🩸 Opener"
          data={plan.opener}
          accent={theme.colors.accent}
        />
        <MovieSlot
          label="🎞 Main Event"
          data={plan.main_event}
          accent={theme.colors.text}
        />
        <MovieSlot
          label="🍬 Chaser"
          data={plan.chaser}
          accent={theme.colors.subtext}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        {/* Header aligned with other tabs */}
        <View
          style={{
            backgroundColor: theme.colors.bg,
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
            Night of Frights
          </Text>
          <Text
            style={{
              color: theme.colors.subtext,
              fontSize: 12,
              lineHeight: 16,
              marginTop: 4,
            }}
          >
            I’ll build you a 3-movie horror marathon: opener, main event, and
            chaser.
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 20,
            paddingBottom: 40,
            gap: 20,
          }}
        >
          {/* Theme / vibe */}
          <ChoiceRow
            label="Theme"
            value={vibe}
            onChange={setVibe}
            options={[
              { value: "slashers", label: "Slashers 🔪" },
              { value: "creature-feature", label: "Creature Feature 🐾" },
              { value: "paranormal", label: "Paranormal 👻" },
              { value: "psychological", label: "Psychological 😵" },
              { value: "party-horror", label: "Party Horror 🎉" },
              { value: "slow-burn-doom", label: "Slow Burn Doom 🕷️" },
              { value: "found-footage", label: "Found Footage 📹" },
              { value: "campy", label: "Campy / So Bad It Rules 🎃" },
              { value: "cult-classics", label: "Cult Classics ☠️" },
              { value: "new-scares", label: "New Scares 🩸" },
            ]}
          />

          {/* Blood level */}
          <ChoiceRow
            label="Blood Level"
            value={blood}
            onChange={setBlood}
            options={[
              { value: "low", label: "Low 🩹" },
              { value: "medium", label: "Medium 💉" },
              { value: "high", label: "High 🩸" },
            ]}
          />

          {/* Intensity */}
          <ChoiceRow
            label="Intensity"
            value={intensity}
            onChange={setIntensity}
            options={[
              { value: "chill", label: "Chill 😌" },
              { value: "tense", label: "Tense 😬" },
              { value: "relentless", label: "Relentless 😱" },
            ]}
          />

          {/* Era */}
          <ChoiceRow
            label="Era"
            value={era}
            onChange={setEra}
            options={[
              { value: "70s", label: "1970s ☠️" },
              { value: "80s", label: "1980s 📼" },
              { value: "90s", label: "1990s 📟" },
              { value: "modern", label: "2000+" },
            ]}
          />

          {/* Generate */}
          <Pressable
            onPress={handleGenerate}
            style={{
              backgroundColor: theme.colors.accent,
              borderColor: theme.colors.accent,
              borderWidth: 1,
              borderRadius: theme.radius.md,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 15,
                fontWeight: "700",
              }}
            >
              Generate Lineup
            </Text>
          </Pressable>

          {/* Results */}
          <LineupPanel />

          {/* Close */}
          <Pressable
            onPress={() => router.back()}
            style={{
              backgroundColor: theme.colors.cardBg,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: theme.radius.md,
              paddingVertical: 12,
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <Text
              style={{
                color: theme.colors.subtext,
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              Close
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
