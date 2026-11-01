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
  description?: string | null;
  price?: string | null;
  calories?: number | null;
  dietary: string[];
};

type GroupedMenu = {
  breakfast?: MenuItem[];
  lunch?: MenuItem[];
  dinner?: MenuItem[];
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

function groupItemsByCategory(items: MenuItem[]) {
  const groups: Record<string, MenuItem[]> = {};

  for (const item of items) {
    const category = item.category?.trim() || "Other";

    if (!groups[category]) {
      groups[category] = [];
    }

    groups[category].push(item);
  }

  return Object.entries(groups).map(([category, items]) => ({
    category,
    items,
  }));
}

export default function Menu() {
  const { name, menuUrl } = useLocalSearchParams<{
    name: string;
    menuUrl: string;
  }>();

  const [items, setItems] = useState<MenuItem[]>([]);
  const [groupedMenu, setGroupedMenu] = useState<GroupedMenu | null>(null);
  const [selectedMeal, setSelectedMeal] = useState("breakfast");
  const [loading, setLoading] = useState(true);

  const groupedItems = groupItemsByCategory(items);

  useEffect(() => {
    if (!menuUrl) {
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/menu?url=${encodeURIComponent(menuUrl)}`)
      .then((response) => response.json())
      .then((data) => {
        console.log("MENU DATA:", data);

        // Regular dining location:
        // [
        //   { name, category, price, ... }
        // ]
        if (Array.isArray(data)) {
          setGroupedMenu(null);
          setItems(data);
          return;
        }

        // Dining hall:
        // {
        //   breakfast: [...],
        //   lunch: [...],
        //   dinner: [...]
        // }
        if (
          data &&
          typeof data === "object" &&
          ("breakfast" in data ||
            "lunch" in data ||
            "dinner" in data)
        ) {
          const menuData: GroupedMenu = data;

          setGroupedMenu(menuData);

          const hour = new Date().getHours();

          let currentMeal = "dinner";

          if (hour < 11) {
            currentMeal = "breakfast";
          } else if (hour < 17) {
            currentMeal = "lunch";
          }

          // If the current meal exists, show it first.
          if (
            menuData[currentMeal as keyof GroupedMenu]?.length
          ) {
            setSelectedMeal(currentMeal);
            setItems(
              menuData[currentMeal as keyof GroupedMenu] ?? []
            );
          } else {
            // Otherwise use the first meal that has items.
            const firstMeal = [
              "breakfast",
              "lunch",
              "dinner",
            ].find(
              (meal) =>
                menuData[meal as keyof GroupedMenu]?.length
            );

            if (firstMeal) {
              setSelectedMeal(firstMeal);
              setItems(
                menuData[firstMeal as keyof GroupedMenu] ?? []
              );
            } else {
              setItems([]);
            }
          }

          return;
        }

        setItems([]);
      })
      .catch((error) => {
        console.error("Failed to load menu:", error);
        setItems([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [menuUrl]);

  function selectMeal(meal: string) {
    if (!groupedMenu) {
      return;
    }

    setSelectedMeal(meal);
    setItems(
      groupedMenu[meal as keyof GroupedMenu] ?? []
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loading}>
          Loading menu...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>
          ← Back
        </Text>
      </TouchableOpacity>

      <Text style={styles.title}>
        {name}
      </Text>

      {groupedMenu && (
        <View style={styles.mealRow}>
          {["breakfast", "lunch", "dinner"].map(
            (meal) => {
              const mealItems =
                groupedMenu[
                  meal as keyof GroupedMenu
                ] ?? [];

              return (
                <TouchableOpacity
                  key={meal}
                  style={[
                    styles.mealChip,
                    selectedMeal === meal &&
                      styles.mealChipActive,
                  ]}
                  onPress={() => selectMeal(meal)}
                  disabled={mealItems.length === 0}
                >
                  <Text
                    style={[
                      styles.mealChipText,
                      selectedMeal === meal &&
                        styles.mealChipTextActive,
                      mealItems.length === 0 &&
                        styles.mealChipTextDisabled,
                    ]}
                  >
                    {MEAL_LABELS[meal]}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </View>
      )}

      <FlatList
        data={groupedItems}
        keyExtractor={(group) => group.category}
        contentContainerStyle={styles.list}
        renderItem={({ item: group }) => (
          <View>
            <View style={styles.stationHeader}>
              <Text style={styles.stationHeaderText}>
                {group.category}
              </Text>
            </View>

            {group.items.map((item, index) => (
              <View
                style={styles.card}
                key={`${group.category}-${item.name}-${index}`}
              >
                <View style={styles.row}>
                  <Text style={styles.itemName}>
                    {item.name}
                  </Text>

                  {item.price && (
                    <Text style={styles.price}>
                      {item.price}
                    </Text>
                  )}

                  {item.calories !== undefined &&
                    item.calories !== null && (
                      <Text style={styles.calories}>
                        {item.calories} cal
                      </Text>
                    )}
                </View>

                {item.description &&
                item.description !== "N/A" ? (
                  <Text style={styles.description}>
                    {item.description}
                  </Text>
                ) : null}

                {item.dietary.length > 0 && (
                  <Text style={styles.dietary}>
                    {item.dietary
                      .map((tag) =>
                        tag === "VE"
                          ? "Vegan"
                          : tag === "V"
                          ? "Vegetarian"
                          : tag
                      )
                      .join(" • ")}
                  </Text>
                )}
              </View>
            ))}
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

  mealRow: {
    flexDirection: "row",
    marginBottom: 20,
  },

  mealChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "#EAEAEA",
    marginRight: 8,
  },

  mealChipActive: {
    backgroundColor: "#FF8200",
  },

  mealChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#555",
  },

  mealChipTextActive: {
    color: "white",
  },

  mealChipTextDisabled: {
    color: "#AAA",
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

  calories: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
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
  stationHeader: {
  backgroundColor: "#FF8200",
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 10,
  marginTop: 12,
  marginBottom: 8,
  },

  stationHeaderText: {
    color: "white",
    fontSize: 17,
    fontWeight: "800",
  },
  
});