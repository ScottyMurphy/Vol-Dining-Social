// Dining hall hours, and helpers that work out which meal each hall is serving
// (or when it opens next) from the device's local clock.
//
// To set a hall's hours, add an `hours` object to that hall in DINING_HALLS
// below. Hours are grouped into four day groups:
//
//   monThu = Monday, Tuesday, Wednesday, Thursday
//   fri    = Friday
//   sat    = Saturday
//   sun    = Sunday
//
// Each day group lists the meals served as [open, close]. Leave a meal out if
// the hall doesn't serve it that day, and use {} for a day the hall is closed.
// Times can be written "7:00 AM", "4:30 PM", "16:30" or "9 PM".
//
// A hall with no `hours` at all uses DEFAULT_DAY (7:00-10:30 breakfast,
// 10:30-16:30 lunch, 16:30-22:00 dinner) every day. Once a hall has `hours`,
// any day group you leave out counts as closed.

export type MealId = "breakfast" | "lunch" | "dinner";
export type DayGroup = "monThu" | "fri" | "sat" | "sun";

export const MEAL_LABELS: Record<MealId, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export type MealHours = [open: string, close: string];
export type DayHours = Partial<Record<MealId, MealHours>>;
export type WeeklyHours = Partial<Record<DayGroup, DayHours>>;

export type DiningHall = {
  id: string;
  name: string;
  hours?: WeeklyHours;
};

export const DEFAULT_DAY: DayHours = {
  breakfast: ["7:00 AM", "10:30 AM"],
  lunch: ["10:30 AM", "4:30 PM"],
  dinner: ["4:30 PM", "10:00 PM"],
};

export const DINING_HALLS: DiningHall[] = [
  {
    id: "rocky-top",
    name: "Rocky Top",
    hours: {
      monThu: {
        breakfast: ["7:00", "10:30"],
        lunch: ["10:30", "16:30"],
        dinner: ["16:30", "22:00 "],
      },
      fri: {
        breakfast: ["7:00", "10:30"],
        lunch: ["10:30", "16:30"],
        dinner: ["16:30", "21:00 "],
        },
      sat: {
        breakfast: ["9:00", "10:30"],
        lunch: ["10:30", "16:30"],
        dinner: ["16:30", "21:00 "],
      },
      sun: {
        breakfast: ["9:00", "10:30"],
        lunch: ["10:30", "16:30"],
        dinner: ["16:30", "22:00 "],
      },
    },
  },
  
  { 
    id: "stokely",
    name: "Stokely",
    hours: {
      monThu: {
        breakfast: ["7:00", "10:30"],
        lunch: ["10:30", "16:30"],
        dinner: ["16:30", "22:00 "],
      },
      fri: {
        breakfast: ["7:00", "10:30"],
        lunch: ["10:30", "16:30"],
        dinner: ["16:30", "21:00 "],
        },
      sat: {
        breakfast: ["9:00", "10:30"],
        lunch: ["10:30", "16:30"],
        dinner: ["16:30", "21:00 "],
      },
      sun: {
        breakfast: ["9:00", "10:30"],
        lunch: ["10:30", "16:30"],
        dinner: ["16:30", "22:00 "],
      },
    },
  },
  
  { 
    id: "southern-kitchen",
    name: "Southern Kitchen",
    hours: {
      monThu: {
        breakfast: ["7:00", "10:30"],
        lunch: ["10:30", "16:30"],
        dinner: ["16:30", "20:00 "],
      },
      fri: {
        breakfast: ["7:00", "10:30"],
        lunch: ["10:30", "15:00"],
        },
      sat: {},
      sun: {},
    },
  },
];

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

/** Parses "7:00 AM", "4:30 pm", "16:30" or "9 PM" into minutes after midnight. */
export function parseTime(text: string): number {
  const match = text.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) {
    throw new Error(`Bad time "${text}": use a format like "7:00 AM" or "16:30".`);
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const suffix = match[3]?.toLowerCase();

  if (minutes > 59) {
    throw new Error(`Bad time "${text}": minutes must be 0-59.`);
  }

  if (suffix) {
    if (hours < 1 || hours > 12) {
      throw new Error(`Bad time "${text}": hour must be 1-12 with AM/PM.`);
    }
    hours = (hours % 12) + (suffix === "pm" ? 12 : 0);
  } else if (hours > 24) {
    throw new Error(`Bad time "${text}": hour must be 0-24.`);
  }

  return hours * 60 + minutes;
}

/** Formats minutes after midnight as e.g. "7:00 AM" or "4:30 PM". */
export function formatMinutes(total: number): string {
  const hours24 = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Which of the four day groups a date falls in. */
export function dayGroupOf(date: Date): DayGroup {
  const day = date.getDay(); // 0 = Sunday
  if (day === 0) return "sun";
  if (day === 5) return "fri";
  if (day === 6) return "sat";
  return "monThu";
}

// ---------------------------------------------------------------------------
// Hall state
// ---------------------------------------------------------------------------

type Period = { meal: MealId; start: number; end: number };

function periodsFor(hall: DiningHall, date: Date): Period[] {
  const day: DayHours = hall.hours ? hall.hours[dayGroupOf(date)] ?? {} : DEFAULT_DAY;
  const periods: Period[] = [];

  (Object.keys(MEAL_LABELS) as MealId[]).forEach((meal) => {
    const hours = day[meal];
    if (!hours) return;

    const start = parseTime(hours[0]);
    let end = parseTime(hours[1]);
    if (end === 0) end = 24 * 60; // "12:00 AM" as a closing time means midnight

    if (end <= start) {
      throw new Error(
        `${hall.name} ${meal}: closing time ${hours[1]} must be after opening time ${hours[0]}.`
      );
    }

    periods.push({ meal, start, end });
  });

  return periods.sort((a, b) => a.start - b.start);
}

export type NextOpening = {
  meal: MealId;
  start: number;
  daysAway: number; // 0 = later today, 1 = tomorrow, ...
  dayName: string; // "Mon", "Tue", ...
};

export type HallState =
  | { open: true; meal: MealId; start: number; end: number }
  | { open: false; meal: MealId | null; next: NextOpening | null };

/**
 * What a hall is doing at `now`: the meal being served, or, when closed, the
 * next meal it will serve (looking up to a week ahead) and when.
 */
export function getHallState(hall: DiningHall, now: Date = new Date()): HallState {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const today = periodsFor(hall, now);

  const active = today.find((p) => minutes >= p.start && minutes < p.end);
  if (active) {
    return { open: true, meal: active.meal, start: active.start, end: active.end };
  }

  for (let daysAway = 0; daysAway <= 7; daysAway++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAway);
    const periods = daysAway === 0 ? today.filter((p) => p.start > minutes) : periodsFor(hall, day);

    if (periods.length > 0) {
      const first = periods[0];
      return {
        open: false,
        meal: first.meal,
        next: { meal: first.meal, start: first.start, daysAway, dayName: DAY_NAMES[day.getDay()] },
      };
    }
  }

  return { open: false, meal: null, next: null };
}

// ---------------------------------------------------------------------------
// Text for the screens
// ---------------------------------------------------------------------------

/** "7:00 AM", "tomorrow at 7:00 AM" or "Fri at 7:00 AM". */
function whenText(next: NextOpening): string {
  const time = formatMinutes(next.start);
  if (next.daysAway === 0) return time;
  if (next.daysAway === 1) return `tomorrow at ${time}`;
  return `${next.dayName} at ${time}`;
}

/** Short status for a hall card, e.g. "Lunch • Open until 4:30 PM". */
export function getHallStatus(
  hall: DiningHall,
  now: Date = new Date()
): { open: boolean; info: string } {
  const state = getHallState(hall, now);

  if (state.open) {
    return {
      open: true,
      info: `${MEAL_LABELS[state.meal]} • Open until ${formatMinutes(state.end)}`,
    };
  }

  return {
    open: false,
    info: state.next ? `Closed • Opens ${whenText(state.next)}` : "Closed",
  };
}

/** One-line status for a hall's menu, e.g. "Now serving Lunch until 4:30 PM". */
export function describeHallState(state: HallState): string {
  if (state.open) {
    return `Now serving ${MEAL_LABELS[state.meal]} until ${formatMinutes(state.end)}`;
  }

  if (!state.next) return "Closed right now";
  return `Closed right now. ${MEAL_LABELS[state.next.meal]} opens ${whenText(state.next)}`;
}

export type Splash = {
  open: boolean;
  label: string;
  title: string;
  subtitle: string;
};

/** Content for the home screen card, summarizing all halls. */
export function getSplash(halls: DiningHall[], now: Date = new Date()): Splash {
  const states = halls.map((hall) => ({ hall, state: getHallState(hall, now) }));
  const openStates = states.flatMap(({ state }) => (state.open ? [state] : []));

  if (openStates.length > 0) {
    return {
      open: true,
      label: "CURRENTLY SERVING",
      title: MEAL_LABELS[openStates[0].meal],
      subtitle: `${openStates.length} of ${halls.length} dining halls open`,
    };
  }

  const upcoming = states
    .flatMap(({ hall, state }) => (!state.open && state.next ? [{ hall, next: state.next }] : []))
    .sort((a, b) => a.next.daysAway - b.next.daysAway || a.next.start - b.next.start);

  if (upcoming.length === 0) {
    return { open: false, label: "DINING HALLS CLOSED", title: "Closed", subtitle: "No upcoming hours" };
  }

  const soonest = upcoming[0];
  return {
    open: false,
    label: "DINING HALLS CLOSED",
    title: `${MEAL_LABELS[soonest.next.meal]} is next`,
    subtitle: `${soonest.hall.name} opens ${whenText(soonest.next)}`,
  };
}
