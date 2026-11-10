import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../lib/theme";

type CrowdLevel = "low" | "medium" | "high" | "very-high";

type Props = {
  locationName: string;
  crowdLevel: CrowdLevel | null;
};

const LEVELS: { value: CrowdLevel; label: string }[] = [
  { value: "low", label: "Not busy" },
  { value: "medium", label: "Somewhat busy" },
  { value: "high", label: "Busy" },
  { value: "very-high", label: "Very busy" },
];

export default function CrowdMeterCard({ locationName, crowdLevel }: Props) {
  const currentLevel = LEVELS.find((level) => level.value === crowdLevel);
  const filled = currentLevel ? LEVELS.indexOf(currentLevel) + 1 : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{locationName}</Text>
      <View style={styles.meter}>
        {LEVELS.map((level, index) => (
          <View
            key={level.value}
            style={[
              styles.segment,
              { backgroundColor: index < filled ? COLORS.smokey : COLORS.meterEmpty },
            ]}
          />
        ))}
      </View>
      <Text style={styles.crowdText}>
        {currentLevel?.label ?? "No recent reports"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
    color: "#222",
  },
  meter: {
    flexDirection: "row",
    gap: 5,
  },
  segment: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  crowdText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
    color: "#333",
  },
});
