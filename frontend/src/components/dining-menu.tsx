import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { API_URL } from "../lib/config";

type MenuItem = {
  name: string;
  category: string;
  calories: number;
};

type Menu = {
  id: string;
  name: string;
  meals: Record<string, MenuItem[]>;
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

// Picks the meal that is being served right now, based on the device clock.
function currentMeal(available: string[]) {
  const hour = new Date().getHours();
  const guess = hour < 11 ? "breakfast" : hour < 16 ? "lunch" : "dinner";
  return available.includes(guess) ? guess : available[0];
}

export default function DiningMenu({ hallId, hallName }: { hallId: string; hallName: string }) {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [meal, setMeal] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMenu() {
      try {
        const res = await fetch(`${API_URL}/api/menus/${hallId}`);
        if (!res.ok) throw new Error("Could not load the menu");
        const data: Menu = await res.json();
        if (cancelled) return;
        setMenu(data);
        setMeal(currentMeal(Object.keys(data.meals)));
      } catch {
        if (!cancelled) setError("Couldn't load today's menu. Is the backend running?");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMenu();
    return () => {
      cancelled = true;
    };
  }, [hallId]);

  const meals = menu ? Object.keys(menu.meals) : [];
  const items = menu && meal ? menu.meals[meal] : [];

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Today's Menu at {hallName}</Text>

      {loading && <ActivityIndicator color="#FF8200" style={styles.spinner} />}

      {!!error && <Text style={styles.error}>{error}</Text>}

      {menu && (
        <>
          <View style={styles.mealRow}>
            {meals.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.mealChip, m === meal && styles.mealChipActive]}
                onPress={() => setMeal(m)}
              >
                <Text style={[styles.mealChipText, m === meal && styles.mealChipTextActive]}>
                  {MEAL_LABELS[m] ?? m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {items.map((item) => (
            <View style={styles.itemRow} key={`${meal}-${item.name}`}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemCategory}>{item.category}</Text>
              </View>
              <Text style={styles.itemCalories}>{item.calories} cal</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  heading: {
    color: "#FF8200",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 12,
  },

  spinner: {
    marginVertical: 12,
  },

  error: {
    color: "#B00020",
    fontSize: 14,
  },

  mealRow: {
    flexDirection: "row",
    marginBottom: 8,
  },

  mealChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F7F7F7",
    marginRight: 8,
  },

  mealChipActive: {
    backgroundColor: "#FF8200",
  },

  mealChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
  },

  mealChipTextActive: {
    color: "white",
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },

  itemInfo: {
    flex: 1,
    paddingRight: 12,
  },

  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
  },

  itemCategory: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },

  itemCalories: {
    fontSize: 13,
    color: "#555",
  },
});
