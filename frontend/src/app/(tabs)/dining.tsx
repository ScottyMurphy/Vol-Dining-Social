import { StyleSheet, Text, View } from "react-native";

export default function Dining() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dining Options</Text>
      <Text style={styles.subtitle}>Find somewhere to eat.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#F7F7F7",
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
