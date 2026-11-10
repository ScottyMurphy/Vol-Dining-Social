import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { API_URL } from "../lib/config";
import { useAuth } from "../context/AuthContext";
import {
  fetchUserPreferences,
  getPreferenceMatchLabels,
  type UserPreferences,
} from "../lib/dietaryPreferences";
import { dishKey, fetchDishRatings, type DishRating } from "../lib/dishRatings";
import { COLORS, RADIUS, SPACING } from "../lib/theme";

type MenuItem = {
  category: string;
  name: string;
  description?: string | null;
  price?: string | null;
  calories?: number | null;
  dietary?: string[];
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

// Filter chips. They start from the user's saved preferences, and tapping one
// only changes this screen (the Preferences tab is where they're saved).
const FILTERS: { category: keyof UserPreferences; value: string; label: string }[] = [
  { category: "dietary", value: "vegan", label: "Vegan" },
  { category: "dietary", value: "vegetarian", label: "Vegetarian" },
  { category: "dietary", value: "low_calorie", label: "Low calorie" },
  { category: "allergen", value: "gluten_free", label: "Gluten-free" },
];

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

function dietaryLabel(tag: string) {
  return tag === "VE" ? "Vegan" : tag === "V" ? "Vegetarian" : tag;
}

export default function Menu() {
  const { token } = useAuth();
  const { name, menuUrl, hallId } = useLocalSearchParams<{
    name: string;
    menuUrl: string;
    hallId?: string;
  }>();

  const [items, setItems] = useState<MenuItem[]>([]);
  const [groupedMenu, setGroupedMenu] = useState<GroupedMenu | null>(null);
  const [selectedMeal, setSelectedMeal] = useState("breakfast");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UserPreferences>({
    dietary: [],
    allergen: [],
  });
  const [preferencesError, setPreferencesError] = useState("");
  const [ratings, setRatings] = useState<Record<string, DishRating>>({});

  const groupedItems = groupItemsByCategory(items);
  const activeFilterCount = filters.dietary.length + filters.allergen.length;

  // Start the filter chips from the user's saved preferences.
  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      if (!token) {
        setPreferencesError("Sign in to see menu matches for your preferences.");
        return;
      }

      try {
        const userPreferences = await fetchUserPreferences(token);
        if (!cancelled) {
          setFilters(userPreferences);
          setPreferencesError("");
        }
      } catch (preferenceError) {
        if (!cancelled) {
          setPreferencesError(
            preferenceError instanceof Error
              ? preferenceError.message
              : "Couldn't load your preferences, so menu matches aren't highlighted.",
          );
        }
      }
    }

    void loadPreferences();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Today's thumbs up/down scores from Community dish reviews.
  useEffect(() => {
    if (!token || !hallId) return;
    let cancelled = false;

    fetchDishRatings(token, hallId)
      .then((list) => {
        if (cancelled) return;
        const byDish: Record<string, DishRating> = {};
        for (const rating of list) byDish[dishKey(rating.name)] = rating;
        setRatings(byDish);
      })
      .catch((error) => console.error("Failed to load dish ratings:", error));

    return () => {
      cancelled = true;
    };
  }, [token, hallId]);

  useEffect(() => {
    if (!menuUrl) {
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/menu?url=${encodeURIComponent(menuUrl)}`)
      .then((response) => response.json())
      .then((data) => {
        // Regular dining location: [{ name, category, price, ... }]
        if (Array.isArray(data)) {
          setGroupedMenu(null);
          setItems(data);
          return;
        }

        // Dining hall: { breakfast: [...], lunch: [...], dinner: [...] }
        if (
          data &&
          typeof data === "object" &&
          ("breakfast" in data || "lunch" in data || "dinner" in data)
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
          if (menuData[currentMeal as keyof GroupedMenu]?.length) {
            setSelectedMeal(currentMeal);
            setItems(menuData[currentMeal as keyof GroupedMenu] ?? []);
          } else {
            // Otherwise use the first meal that has items.
            const firstMeal = ["breakfast", "lunch", "dinner"].find(
              (meal) => menuData[meal as keyof GroupedMenu]?.length,
            );

            if (firstMeal) {
              setSelectedMeal(firstMeal);
              setItems(menuData[firstMeal as keyof GroupedMenu] ?? []);
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
    setItems(groupedMenu[meal as keyof GroupedMenu] ?? []);
  }

  function toggleFilter(category: keyof UserPreferences, value: string) {
    setFilters((current) => ({
      ...current,
      [category]: current[category].includes(value)
        ? current[category].filter((v) => v !== value)
        : [...current[category], value],
    }));
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.orange} />
        <Text style={styles.loading}>Loading menu...</Text>
      </View>
    );
  }

  const header = (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={20} color={COLORS.text} />
      </Pressable>

      <Text style={styles.title}>{name}</Text>
      {!!hallId && (
        <Text style={styles.subtitle}>Ratings come from today&apos;s Community dish reviews.</Text>
      )}
      {!!preferencesError && <Text style={styles.preferencesError}>{preferencesError}</Text>}

      {groupedMenu && (
        <View style={styles.mealTabs} accessibilityRole="tablist">
          {["breakfast", "lunch", "dinner"].map((meal) => {
            const mealItems = groupedMenu[meal as keyof GroupedMenu] ?? [];
            const selected = selectedMeal === meal;

            return (
              <Pressable
                key={meal}
                accessibilityRole="tab"
                accessibilityState={{ selected, disabled: mealItems.length === 0 }}
                style={[styles.mealTab, selected && styles.mealTabActive]}
                onPress={() => selectMeal(meal)}
                disabled={mealItems.length === 0}
              >
                <Text
                  style={[
                    styles.mealTabText,
                    selected && styles.mealTabTextActive,
                    mealItems.length === 0 && styles.mealTabTextDisabled,
                  ]}
                >
                  {MEAL_LABELS[meal]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={styles.filterLabel}>FILTER BY YOUR PREFERENCES</Text>
      <View style={styles.filterRow}>
        {FILTERS.map((filter) => {
          const on = filters[filter.category].includes(filter.value);
          return (
            <Pressable
              key={filter.value}
              onPress={() => toggleFilter(filter.category, filter.value)}
              style={[styles.chip, on && styles.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={groupedItems}
        keyExtractor={(group) => group.category}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        renderItem={({ item: group }) => (
          <View style={styles.station}>
            <Text style={styles.stationTitle}>{group.category}</Text>
            <View style={styles.stationCard}>
              {group.items.map((item, index) => {
                const matches = getPreferenceMatchLabels(item, filters);
                const fits = activeFilterCount === 0 || matches.length >= activeFilterCount;
                const rating = ratings[dishKey(item.name)];

                return (
                  <View
                    key={`${group.category}-${item.name}-${index}`}
                    style={[styles.itemRow, index > 0 && styles.itemDivider, !fits && styles.itemDimmed]}
                  >
                    <View style={styles.itemTop}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {!!item.price && <Text style={styles.price}>{item.price}</Text>}
                      {!!hallId &&
                        (rating ? (
                          <View style={styles.liked}>
                            <Ionicons name="thumbs-up-outline" size={14} color={COLORS.success} />
                            <Text style={styles.likedText}>{rating.percentLiked}% liked</Text>
                          </View>
                        ) : (
                          <Text style={styles.noRatings}>No ratings yet</Text>
                        ))}
                    </View>

                    {rating && (
                      <Text style={styles.meta}>
                        {rating.total} {rating.total === 1 ? "Vol" : "Vols"} rated this today
                      </Text>
                    )}

                    {item.calories !== undefined && item.calories !== null && (
                      <Text style={styles.meta}>{item.calories} cal</Text>
                    )}

                    {item.description && item.description !== "N/A" ? (
                      <Text style={styles.description}>{item.description}</Text>
                    ) : null}

                    {(!!item.dietary?.length || matches.length > 0) && (
                      <View style={styles.tagRow}>
                        {(item.dietary ?? []).map((tag) => (
                          <View key={tag} style={styles.tag}>
                            <Text style={styles.tagText}>{dietaryLabel(tag)}</Text>
                          </View>
                        ))}
                        {matches
                          .filter((m) => !(item.dietary ?? []).map(dietaryLabel).includes(m))
                          .map((m) => (
                            <View key={m} style={styles.tag}>
                              <Text style={styles.tagText}>{m}</Text>
                            </View>
                          ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No menu items found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loading: {
    marginTop: 10,
    color: COLORS.muted,
  },
  list: {
    paddingHorizontal: SPACING.screen,
    paddingTop: 52,
    paddingBottom: 60,
  },

  header: {
    gap: 4,
    marginBottom: 6,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
  },
  preferencesError: {
    color: "#8A5A00",
    fontSize: 13,
    marginTop: 4,
  },

  mealTabs: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    marginTop: 16,
    backgroundColor: "#ECEBE7",
    borderRadius: RADIUS.lg,
  },
  mealTab: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  mealTabActive: {
    backgroundColor: COLORS.card,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  mealTabText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.muted,
  },
  mealTabTextActive: {
    fontWeight: "700",
    color: COLORS.text,
  },
  mealTabTextDisabled: {
    color: "#AAA",
  },

  filterLabel: {
    marginTop: 18,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: COLORS.muted,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.card,
    justifyContent: "center",
  },
  chipOn: {
    backgroundColor: COLORS.orangeTint,
    borderColor: COLORS.orangeBorder,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  chipTextOn: {
    color: COLORS.orangeText,
  },

  station: {
    marginTop: 18,
    gap: 8,
  },
  stationTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  stationCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
  },
  itemRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 5,
  },
  itemDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  itemDimmed: {
    opacity: 0.4,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.orangeText,
  },
  liked: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  likedText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.success,
  },
  noRatings: {
    fontSize: 12,
    color: COLORS.muted,
  },
  meta: {
    fontSize: 12,
    color: COLORS.muted,
  },
  description: {
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.chip,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  empty: {
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 40,
  },
});
