import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Community() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Community</Text>
      <Text style={styles.subtitle}>
        See what other Vols are saying.
      </Text>

      <Link href="../service-reviews" asChild>
        <TouchableOpacity accessibilityRole="button" style={styles.button}>
          <View style={styles.buttonText}>
            <Text style={styles.buttonTitle}>Service Reviews</Text>
            <Text style={styles.buttonSubtitle}>
              Rate cleanliness and service at your dining halls
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="white" />
        </TouchableOpacity>
      </Link>
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
    paddingTop: 60,
    paddingBottom: 40,
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
  button: {
    minHeight: 76,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#FF8200",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  buttonText: {
    flex: 1,
    marginRight: 12,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  buttonSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "white",
  },
});
