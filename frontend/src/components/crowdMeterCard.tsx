import { StyleSheet, Text, View } from "react-native";

type CrowdLevel = "low" | "medium" | "high" | "very-high";

type Props = {
  locationName: string;
  crowdLevel: CrowdLevel | null;
};

const LEVELS: { value: CrowdLevel; label: string; color: string }[] = [
  { value: "low", label: "Not busy", color: "#2E9D55" },
  { value: "medium", label: "Somewhat busy", color: "#9DBD35" },
  { value: "high", label: "Busy", color: "#F0A326" },
  { value: "very-high", label: "Very busy", color: "#D94343" },
];

export default function CrowdMeterCard({ locationName, crowdLevel }: Props) {
  const currentLevel = LEVELS.find((level) => level.value === crowdLevel);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{locationName}</Text>
      <View style={styles.meter}>
        {LEVELS.map((level) => (
          <View
            key={level.value}
            style={[
              styles.segment,
              { backgroundColor: level.color },
              crowdLevel === level.value && styles.activeSegment,
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
    height: 10,
    borderRadius: 5,
    opacity: 0.28,
  },
  activeSegment: {
    opacity: 1,
  },
  crowdText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
    color: "#333",
  },
});
