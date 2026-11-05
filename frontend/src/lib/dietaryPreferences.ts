import { API_URL } from "./config";

export type UserPreferences = {
  dietary: string[];
  allergen: string[];
};

type MenuItemForMatching = {
  name: string;
  category: string;
  calories?: number | null;
  dietary?: string[];
};

export async function fetchUserPreferences(
  token: string,
): Promise<UserPreferences> {
  const response = await fetch(`${API_URL}/api/preferences`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data: unknown = await response.json();

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : "Couldn't load your preferences.";
    throw new Error(message);
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !("dietary" in data) ||
    !("allergen" in data) ||
    !Array.isArray(data.dietary) ||
    !Array.isArray(data.allergen) ||
    !data.dietary.every((value) => typeof value === "string") ||
    !data.allergen.every((value) => typeof value === "string")
  ) {
    throw new Error("The server returned invalid preferences.");
  }

  return {
    dietary: data.dietary,
    allergen: data.allergen,
  };
}

export function getPreferenceMatchLabels(
  item: MenuItemForMatching,
  preferences: UserPreferences,
): string[] {
  const matches: string[] = [];
  const dietaryTags = new Set(
    (item.dietary ?? []).map((tag) => tag.trim().toLowerCase()),
  );
  const isVegan = dietaryTags.has("ve") || dietaryTags.has("vegan");
  const isVegetarian =
    isVegan ||
    dietaryTags.has("v") ||
    dietaryTags.has("vegetarian");

  if (
    preferences.dietary.includes("low_calorie") &&
    typeof item.calories === "number" &&
    item.calories < 200
  ) {
    matches.push("Under 200 calories");
  }
  if (preferences.dietary.includes("vegan") && isVegan) {
    matches.push("Vegan");
  }
  if (preferences.dietary.includes("vegetarian") && isVegetarian) {
    matches.push("Vegetarian");
  }
  if (
    preferences.allergen.includes("gluten_free") &&
    /true\s*balance/i.test(`${item.category} ${item.name}`)
  ) {
    matches.push("Gluten-free (True Balance)");
  }

  return matches;
}
