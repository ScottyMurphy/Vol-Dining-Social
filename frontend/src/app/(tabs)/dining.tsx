import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import CrowdReportCard from "../../components/CrowdReportCard";
import { API_URL } from "../../lib/config";

type DiningLocation = {
  name: string;
  menuUrl: string | null;
};

export default function Dining() {
  const [locations, setLocations] = useState<DiningLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/dining`)
      .then((response) => response.json())
      .then((data) => {
        console.log("DINING DATA:", data);

        if (Array.isArray(data)) {
          setLocations(data);
        } else if (Array.isArray(data.locations)) {
          setLocations(data.locations);
        } else {
          console.error("Unexpected dining data format:", data);
          setLocations([]);
        }
      })
      .catch((error) => {
        console.error("Failed to load dining locations:", error);
        setLocations([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading dining options...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Dining Options</Text>

      <Text style={styles.subtitle}>
        Find somewhere to eat and check the current crowd level.
      </Text>

      <Text style={styles.sectionTitle}>Crowd Reports</Text>

      <CrowdReportCard
        locationId="rocky-top"
        locationName="Rocky Top"
      />

      <CrowdReportCard
        locationId="stokely"
        locationName="Stokely"
      />

      <CrowdReportCard
        locationId="southern-kitchen"
        locationName="Southern Kitchen"
      />

      <Text style={styles.sectionTitle}>Menus</Text>
      {Array.isArray(locations) &&
        locations.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={styles.card}
            disabled={!item.menuUrl}
            onPress={() => {
            if (item.menuUrl) {
              router.push({
                pathname: "/menu",
                params: {
                  name: item.name,
                  menuUrl: item.menuUrl,
                },
              });
            }
          }}
        >
          <Text style={styles.name}>
            {item.name}
          </Text>

          {item.menuUrl ? (
            <Text style={styles.menuAvailable}>
              View Menu
            </Text>
          ) : (
            <Text style={styles.noMenu}>
              No menu available
            </Text>
          )}
        </TouchableOpacity>
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
    paddingTop: 60,
    paddingBottom: 100,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F7F7",
  },

  loadingText: {
    marginTop: 10,
    color: "#666",
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
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
    marginTop: 20,
    marginBottom: 14,
  },

  card: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },

  menuAvailable: {
    marginTop: 6,
    color: "#FF8200",
    fontWeight: "600",
  },

  noMenu: {
    marginTop: 6,
    color: "#888",
  },
});