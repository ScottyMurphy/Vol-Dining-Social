import { StyleSheet, View } from "react-native";
import { COLORS } from "../lib/theme";

// The 4-bar crowd meter. size "small" = little rising bars (Home),
// "wide" = four segments across the card (Dining).
export default function CrowdBars({
  filled,
  size = "small",
}: {
  filled: number; // 0-4
  size?: "small" | "wide";
}) {
  if (size === "wide") {
    return (
      <View style={styles.wide} accessible={false}>
        {[1, 2, 3, 4].map((bar) => (
          <View
            key={bar}
            style={[styles.wideBar, { backgroundColor: bar <= filled ? COLORS.smokey : COLORS.meterEmpty }]}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.small} accessible={false}>
      {[6, 9, 12, 15].map((height, index) => (
        <View
          key={height}
          style={[
            styles.smallBar,
            { height, backgroundColor: index < filled ? COLORS.smokey : COLORS.meterEmpty },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  small: { flexDirection: "row", alignItems: "flex-end", gap: 3 },
  smallBar: { width: 5, borderRadius: 2 },
  wide: { flexDirection: "row", gap: 4 },
  wideBar: { flex: 1, height: 8, borderRadius: 4 },
});
