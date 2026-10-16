import { ScrollView, StyleSheet, Text } from "react-native";
import CrowdReportCard from "../../components/CrowdReportCard";

export default function Dining() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dining Options</Text>
      <Text style={styles.subtitle}>Find somewhere to eat and share the current crowd level.</Text>

      <CrowdReportCard locationId="rocky-top" locationName="Rocky Top" />
      <CrowdReportCard locationId="stokely" locationName="Stokely" />
      <CrowdReportCard locationId="southern-kitchen" locationName="Southern Kitchen" />
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
    fontSize: 16,
    color: "#666",
  },
});
