import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { router } from "expo-router";

export default function Index() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>VOL Dining Social</Text>
          <Text style={styles.tagline}>Eat better together.</Text>
        </View>

        {/* Meal Period */}
        <View style={styles.mealCard}>
          <Text style={styles.mealLabel}>CURRENTLY SERVING</Text>
          <Text style={styles.mealTitle}>Dinner</Text>
          <Text style={styles.mealTime}>4:30 PM – 9:00 PM</Text>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dining Near You</Text>

          <TouchableOpacity>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Dining Locations */}

        <TouchableOpacity
          style={styles.restaurantCard}
          onPress={() => router.push("/rocky-top")}
        >
          <View>
            <Text style={styles.restaurantName}>Rocky Top</Text>
            <Text style={styles.restaurantInfo}>
              Dinner • Open Now
            </Text>
          </View>

          <View style={styles.openBadge}>
            <Text style={styles.openText}>OPEN</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restaurantCard}
          onPress={() => router.push("/stokely")}
        >
          <View>
            <Text style={styles.restaurantName}>Stokely</Text>
            <Text style={styles.restaurantInfo}>
              Dinner • Open Now
            </Text>
          </View>

          <View style={styles.openBadge}>
            <Text style={styles.openText}>OPEN</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.restaurantCard}>
          <View>
            <Text style={styles.restaurantName}>Southern Kitchen</Text>
            <Text style={styles.restaurantInfo}>
              Closed for the evening
            </Text>
          </View>

          <View style={styles.closedBadge}>
            <Text style={styles.closedText}>CLOSED</Text>
          </View>
        </TouchableOpacity>

        {/* Community Preview */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Community</Text>

          <TouchableOpacity>
            <Text style={styles.viewAll}>See Posts</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.postCard}>
          <Text style={styles.postUser}>Alex M.</Text>

          <Text style={styles.postText}>
            Rocky Top has the BBQ turkey panini tonight 🔥
          </Text>

          <View style={styles.postFooter}>
            <Text style={styles.postAction}>♡ Like</Text>
            <Text style={styles.postAction}>💬 Comment</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },

  container: {
    padding: 20,
    paddingBottom: 100,
  },

  header: {
    marginBottom: 24,
  },

  logo: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FF8200",
  },

  tagline: {
    fontSize: 15,
    color: "#666",
    marginTop: 4,
  },

  mealCard: {
    backgroundColor: "#FF8200",
    padding: 22,
    borderRadius: 18,
    marginBottom: 28,
  },

  mealLabel: {
    color: "#FFE1C2",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },

  mealTitle: {
    color: "white",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 4,
  },

  mealTime: {
    color: "white",
    marginTop: 4,
    fontSize: 14,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#222",
  },

  viewAll: {
    color: "#FF8200",
    fontWeight: "600",
  },

  restaurantCard: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  restaurantName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },

  restaurantInfo: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },

  openBadge: {
    backgroundColor: "#E7F7ED",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  openText: {
    color: "#208A45",
    fontSize: 11,
    fontWeight: "800",
  },

  closedBadge: {
    backgroundColor: "#EEEEEE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  closedText: {
    color: "#777",
    fontSize: 11,
    fontWeight: "800",
  },

  postCard: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 14,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  postUser: {
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 8,
  },

  postText: {
    fontSize: 15,
    lineHeight: 21,
    color: "#333",
  },

  postFooter: {
    flexDirection: "row",
    marginTop: 16,
    gap: 20,
  },

  postAction: {
    color: "#666",
    fontWeight: "500",
  },
});