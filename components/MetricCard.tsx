import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../lib/theme";

function levelColor(consensus?: string) {
  if (!consensus) return theme.colors.teal;
  if (["Perennial Haunt","Masterpiece of Fear","Iconic Nightmare Fuel","Bloodbath Approved","Nightmare Fuel","Cult Classic Energy"].includes(consensus))
    return theme.colors.green;   // high
  if (["Occasional Visit","Solid Spine-Tingler","Decent Boogeyman","Messy But Manageable","Creepy Enough","Cheeky Chills"].includes(consensus))
    return theme.colors.yellow;  // medium
  return theme.colors.red;       // low
}

export default function MetricCard({
  icon, name, value, consensus,
}: { icon:string; name:string; value?:number; consensus?:string }) {

  const pct = Math.max(0, Math.min(1, (value ?? 0) / 5));
  const accent = levelColor(consensus);

  return (
    <View
      style={{
        padding: 14,
        borderRadius: theme.radius,
        backgroundColor: theme.colors.surface,
        borderWidth: 1, borderColor: theme.colors.border,
        gap: 10,
      }}
    >
      <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center" }}>
        <View style={{ flexDirection:"row", gap: 8, alignItems:"center" }}>
          <Text style={{ fontSize: 22 }}>{icon}</Text>
          <Text style={{ color: theme.colors.text, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>{name}</Text>
        </View>
        <Text style={{ color: theme.colors.subtext }}>{value ? `${value.toFixed(1)}/5` : "–"}</Text>
      </View>

      {/* Progress bar */}
      <View style={{ height: 10, borderRadius: 999, backgroundColor: theme.colors.surface2, overflow:"hidden" }}>
        <LinearGradient
          colors={[accent, theme.colors.pumpkin]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ width: `${pct*100}%`, height: "100%" }}
        />
      </View>

      {consensus ? (
        <View style={{
          alignSelf:"flex-start",
          backgroundColor: theme.colors.surface2,
          borderWidth: 1, borderColor: theme.colors.border,
          paddingHorizontal:10, paddingVertical:6, borderRadius: 999
        }}>
          <Text style={{ color: theme.colors.text, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>{consensus}</Text>
        </View>
      ) : null}
    </View>
  );
}
