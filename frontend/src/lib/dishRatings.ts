import { API_URL } from "./config";

export type DishRating = {
  name: string;
  up: number;
  down: number;
  total: number;
  percentLiked: number;
  myRating: "up" | "down" | null;
};

// Same rule the backend uses, so "BBQ Turkey Panini" matches "bbq turkey panini".
export const dishKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

// Today's thumbs up/down totals for every rated dish at one dining hall.
export async function fetchDishRatings(token: string, hallId: string): Promise<DishRating[]> {
  const response = await fetch(`${API_URL}/api/dishes/ratings?hall=${encodeURIComponent(hallId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Couldn't load dish ratings.");
  return Array.isArray(data) ? data : [];
}

// Dishes on the hall's menu right now, for the "rate a dish" picker.
export async function fetchCurrentDishes(hallId: string): Promise<string[]> {
  const response = await fetch(`${API_URL}/api/menus/${encodeURIComponent(hallId)}/current`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Couldn't load today's menu.");
  const names: string[] = (Array.isArray(data.items) ? data.items : [])
    .map((item: { name?: unknown }) => (typeof item.name === "string" ? item.name.trim() : ""))
    .filter((name: string) => name.length > 0);
  // Remove duplicates (the same dish can be listed at two stations).
  const seen = new Set<string>();
  return names.filter((name) => {
    const key = dishKey(name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
