import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DiningHallReviewCard from "../components/DiningHallReviewCard";

const DINING_HALLS = [
  { id: "rocky-top", name: "Rocky Top" },
  { id: "stokely", name: "Stokely" },
  { id: "southern-kitchen", name: "Southern Kitchen" },
];

export default function ServiceReviews() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Link href="/(tabs)/community" asChild>
        <TouchableOpacity accessibilityRole="button" style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#C76100" />
          <Text style={styles.backText}>Back to Community</Text>
        </TouchableOpacity>
      </Link>

      <Text style={styles.title}>Service Reviews</Text>
      <Text style={styles.subtitle}>
        Rate cleanliness and service at your dining halls.
      </Text>

      {DINING_HALLS.map((hall) => (
        <DiningHallReviewCard
          key={hall.id}
          locationId={hall.id}
          locationName={hall.name}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  content: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
    paddingVertical: 6,
  },
  backText: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: "600",
    color: "#C76100",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FF8200",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 20,
    fontSize: 16,
    color: "#666",
  },
});
