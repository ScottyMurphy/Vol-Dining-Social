import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { API_URL } from "../lib/config";

type MenuItem = {
  category: string;
  name: string;
  description: string;
  price: string | null;
  dietary: string[];
};

export default function Menu() {
  const { name, menuUrl } = useLocalSearchParams<{
    name: string;
    menuUrl: string;
  }>();

  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!menuUrl) {
      setLoading(false);
      return;
    }

    fetch(
      `${API_URL}/api/menu?url=${encodeURIComponent(menuUrl)}`
    )
      .then((response) => response.json())
      .then((data) => {
        console.log("MENU DATA:", data);
        setItems(data);
      })
      .catch((error) => {
        console.error("Failed to load menu:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [menuUrl]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loading}>Loading menu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{name}</Text>

      <FlatList
        data={items}
        keyExtractor={(item, index) =>
          `${item.name}-${index}`
        }
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.itemName}>
                {item.name}
              </Text>

              {item.price && (
                <Text style={styles.price}>
                  {item.price}
                </Text>
              )}
            </View>

            <Text style={styles.category}>
              {item.category}
            </Text>

            {item.description ? (
              <Text style={styles.description}>
                {item.description}
              </Text>
            ) : null}

            {item.dietary.length > 0 && (
              <Text style={styles.dietary}>
                {item.dietary.join(" • ")}
              </Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No menu items found.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    padding: 24,
    paddingTop: 60,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loading: {
    marginTop: 10,
    color: "#666",
  },

  back: {
    color: "#FF8200",
    fontWeight: "700",
    marginBottom: 18,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FF8200",
    marginBottom: 20,
  },

  list: {
    paddingBottom: 60,
  },

  card: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  itemName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
  },

  price: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FF8200",
  },

  category: {
    marginTop: 4,
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
  },

  description: {
    marginTop: 8,
    color: "#444",
    lineHeight: 20,
  },

  dietary: {
    marginTop: 10,
    color: "#208A45",
    fontWeight: "600",
  },

  empty: {
    color: "#777",
    textAlign: "center",
    marginTop: 40,
  },
});