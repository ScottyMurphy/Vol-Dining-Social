import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { API_URL } from "../lib/config";
import {
  DINING_HALLS,
  describeHallState,
  getHallState,
} from "../lib/mealPeriods";

// Re-check the clock so the hall status updates automatically.
const CLOCK_CHECK_MS = 30 * 1000;

type MenuItem = {
  id?: string;
  name: string;
  category: string;
  calories: number | null;
  description?: string | null;
  dietary?: string[];
};

type CurrentMenu = {
  id: string;
  name: string;
  meal: string;
  items: MenuItem[];
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export default function DiningMenu({
  hallId,
  hallName,
}: {
  hallId: string;
  hallName: string;
}) {
  const [menu, setMenu] = useState<CurrentMenu | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const hall = DINING_HALLS.find((h) => h.id === hallId);
  const state = hall ? getHallState(hall, now) : null;

  // Keep the hall status current.
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, CLOCK_CHECK_MS);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMenu() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `${API_URL}/api/menus/${hallId}/current`
        );

        if (!res.ok) {
          throw new Error("Could not load the menu");
        }

        const data: CurrentMenu = await res.json();

        console.log("LIVE MENU RESPONSE:", data);

        if (cancelled) {
          return;
        }

        setMenu(data);
      } catch (error) {
        console.error("DINING MENU ERROR:", error);

        if (!cancelled) {
          setError(
            "Couldn't load today's menu. Is the backend running?"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMenu();

    return () => {
      cancelled = true;
    };
  }, [hallId]);

  const status = state ? describeHallState(state) : "";

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>
        Today's Menu at {hallName}
      </Text>

      {loading && (
        <ActivityIndicator
          color="#FF8200"
          style={styles.spinner}
        />
      )}

      {!!error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      {menu && !loading && (
        <>
          {!!status && (
            <Text style={styles.status}>
              {status}
            </Text>
          )}

          <View style={styles.mealHeader}>
            <Text style={styles.mealLabel}>
              {MEAL_LABELS[menu.meal] ?? menu.meal}
            </Text>
          </View>

          {menu.items.length === 0 ? (
            <Text style={styles.empty}>
              No menu items available for this meal.
            </Text>
          ) : (
            menu.items.map((item) => (
              <View
                style={styles.itemRow}
                key={item.id ?? `${menu.meal}-${item.category}-${item.name}`}
              >
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>
                    {item.name}
                  </Text>

                  <Text style={styles.itemCategory}>
                    {item.category}
                  </Text>

                  {!!item.description &&
                    item.description !== "N/A" && (
                      <Text style={styles.itemDescription}>
                        {item.description}
                      </Text>
                    )}

                  {!!item.dietary?.length && (
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

                <Text style={styles.itemCalories}>
                  {item.calories !== null
                    ? `${item.calories} cal`
                    : "—"}
                </Text>
              </View>
            ))
          )}
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

  status: {
    color: "#555",
    fontSize: 13,
    marginBottom: 10,
  },

  mealHeader: {
    alignSelf: "flex-start",
    backgroundColor: "#FF8200",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },

  mealLabel: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },

  empty: {
    color: "#777",
    fontSize: 14,
    paddingVertical: 12,
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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

  itemDescription: {
    fontSize: 12,
    color: "#555",
    marginTop: 4,
    lineHeight: 17,
  },

  dietary: {
    fontSize: 12,
    color: "#2E7D32",
    fontWeight: "600",
    marginTop: 4,
  },

  itemCalories: {
    fontSize: 13,
    color: "#555",
  },
});