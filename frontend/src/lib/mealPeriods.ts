// Meal periods used to decide which dining hall menu to show, based on the
// device's local clock. Times are minutes after midnight; start is inclusive,
// end is exclusive (so 10:30 is lunch, 16:30 is dinner, 22:00 is closed).

export type MealId = "breakfast" | "lunch" | "dinner";

export type MealPeriod = {
  id: MealId;
  label: string;
  start: number;
  end: number;
};

const at = (hours: number, minutes = 0) => hours * 60 + minutes;

export const MEAL_PERIODS: MealPeriod[] = [
  { id: "breakfast", label: "Breakfast", start: at(7), end: at(10, 30) },
  { id: "lunch", label: "Lunch", start: at(10, 30), end: at(16, 30) },
  { id: "dinner", label: "Dinner", start: at(16, 30), end: at(22) },
];

export type CurrentMeal = {
  meal: MealId;
  // true while a meal is actually being served; false overnight (22:00-7:00)
  open: boolean;
  period: MealPeriod;
};

/**
 * Returns the meal being served at `date`. Outside serving hours the dining
 * halls are closed, so we return the next meal to be served (always breakfast,
 * since the closed window runs from dinner's end to breakfast's start).
 */
export function getCurrentMeal(date: Date = new Date()): CurrentMeal {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const active = MEAL_PERIODS.find((p) => minutes >= p.start && minutes < p.end);

  if (active) {
    return { meal: active.id, open: true, period: active };
  }

  return { meal: MEAL_PERIODS[0].id, open: false, period: MEAL_PERIODS[0] };
}

export type DiningHall = {
  id: string;
  name: string;
  // Meals this hall serves. A hall is open only during the meal periods above,
  // so edit `meals` here to change when a hall is open.
  meals: MealId[];
};

export const DINING_HALLS: DiningHall[] = [
  { id: "rocky-top", name: "Rocky Top", meals: ["breakfast", "lunch", "dinner"] },
  { id: "stokely", name: "Stokely", meals: ["breakfast", "lunch", "dinner"] },
  // Placeholder schedule: replace with Southern Kitchen's real hours.
  { id: "southern-kitchen", name: "Southern Kitchen", meals: ["breakfast", "lunch", "dinner"] },
];

export type HallStatus = {
  open: boolean;
  info: string;
};

/** Whether a hall is open at the given meal period, plus a short status line. */
export function getHallStatus(hall: DiningHall, current: CurrentMeal): HallStatus {
  if (!current.open) {
    return { open: false, info: `Closed • Opens ${formatMinutes(current.period.start)}` };
  }

  if (!hall.meals.includes(current.meal)) {
    return { open: false, info: `Not serving ${current.period.label}` };
  }

  return { open: true, info: `${current.period.label} • Open Now` };
}

/** Formats minutes after midnight as e.g. "7:00 AM" or "4:30 PM". */
export function formatMinutes(total: number): string {
  const hours24 = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}
