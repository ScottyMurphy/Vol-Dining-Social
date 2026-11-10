import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import CrowdBars from "../../components/CrowdBars";
import { API_URL } from "../../lib/config";
import { getToken } from "../../lib/tokenStorage";
import { CROWD_LEVELS, crowdBars, crowdLabel, useCrowd, type CrowdLevel } from "../../lib/crowd";
import { DINING_HALLS, getHallStatus, type DiningHall } from "../../lib/mealPeriods";
import { COLORS, RADIUS, SPACING, TYPE } from "../../lib/theme";

type DiningLocation = {
  name: string;
  menuUrl: string | null;
};

type ReviewSummary = {
  averageCleanliness: number | null;
  averageService: number | null;
  reviewCount: number;
  myReview: { cleanliness: number; service: number } | null;
};

// Menu pages for the dining halls, used if the scraped list doesn't have them.
const HALL_MENU_URLS: Record<string, string> = {
  "rocky-top": "https://dining.utk.edu/vendor/rocky-top-dining-hall/",
  stokely: "https://dining.utk.edu/vendor/stokely-dining-hall/",
};

function findMenuUrl(hall: DiningHall, locations: DiningLocation[]) {
  const match = locations.find(
    (location) => location.menuUrl && location.name.toLowerCase().includes(hall.name.toLowerCase()),
  );
  return match?.menuUrl ?? HALL_MENU_URLS[hall.id] ?? null;
}

function isHallLocation(location: DiningLocation) {
  const name = location.name.toLowerCase();
  return DINING_HALLS.some((hall) => name.includes(hall.name.toLowerCase()));
}

// ---------- Cleanliness / service ratings for one hall ----------
function useReviews(locationId: string) {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const response = await fetch(`${API_URL}/api/reviews/${locationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setSummary(data);
    } catch {
      // The card still works without ratings.
    }
  }, [locationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = useCallback(
    async (cleanliness: number, service: number) => {
      const token = await getToken();
      if (!token) throw new Error("Please sign in to rate this dining hall.");
      const response = await fetch(`${API_URL}/api/reviews/${locationId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ cleanliness, service }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Couldn't save your rating.");
      setSummary(data);
    },
    [locationId],
  );

  return { summary, submit };
}

function StarRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (rating: number) => void;
}) {
  return (
    <View style={styles.starRow}>
      <Text style={styles.starLabel}>{label}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <Pressable
            key={rating}
            hitSlop={4}
            onPress={() => onChange(rating)}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${rating} out of 5 stars`}
            accessibilityState={{ selected: value === rating }}
            style={styles.starButton}
          >
            <Ionicons
              name={rating <= value ? "star" : "star-outline"}
              size={26}
              color={rating <= value ? COLORS.orange : COLORS.faint}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ---------- One dining hall card ----------
function HallCard({ hall, menuUrl }: { hall: DiningHall; menuUrl: string | null }) {
  const status = getHallStatus(hall, new Date());
  const crowd = useCrowd(hall.id);
  const reviews = useReviews(hall.id);

  const [panel, setPanel] = useState<"none" | "crowd" | "rate">("none");
  const [cleanliness, setCleanliness] = useState(0);
  const [service, setService] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const togglePanel = (next: "crowd" | "rate") => {
    setMessage("");
    if (next === "rate") {
      setCleanliness(reviews.summary?.myReview?.cleanliness ?? 0);
      setService(reviews.summary?.myReview?.service ?? 0);
    }
    setPanel((current) => (current === next ? "none" : next));
  };

  const reportCrowd = async (level: CrowdLevel) => {
    setBusy(true);
    setMessage("");
    try {
      await crowd.report(level);
      setPanel("none");
      setMessage("Thanks! Crowd report saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Couldn't save your report.");
    } finally {
      setBusy(false);
    }
  };

  const submitRating = async () => {
    if (!cleanliness || !service) {
      setMessage("Pick a star rating for both cleanliness and service.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await reviews.submit(cleanliness, service);
      setPanel("none");
      setMessage("Thanks! Your rating was saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Couldn't save your rating.");
    } finally {
      setBusy(false);
    }
  };

  const level = crowd.summary?.level ?? null;
  const reportCount = crowd.summary?.reportCount ?? 0;
  const review = reviews.summary;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.hallName}>{hall.name}</Text>
          <Text style={styles.hallInfo}>{status.info}</Text>
        </View>
        <View style={status.open ? styles.openBadge : styles.closedBadge}>
          <Text style={status.open ? styles.openText : styles.closedText}>
            {status.open ? "OPEN" : "CLOSED"}
          </Text>
        </View>
      </View>

      {/* Crowd meter */}
      <View style={styles.crowdBlock}>
        <View style={styles.crowdTop}>
          <Text style={styles.crowdLevel}>{crowdLabel(level)}</Text>
          <Text style={styles.crowdCount}>
            {reportCount === 1 ? "1 report" : `${reportCount} reports`} · last 2 hrs
          </Text>
        </View>
        <CrowdBars filled={crowdBars(level)} size="wide" />
      </View>

      {/* Ratings + Rate */}
      <View style={styles.ratingsRow}>
        <Text style={styles.ratingsText}>
          {review?.reviewCount ? (
            <>
              Cleanliness <Text style={styles.ratingNumber}>{review.averageCleanliness?.toFixed(1)}</Text>
              {"   "}Service <Text style={styles.ratingNumber}>{review.averageService?.toFixed(1)}</Text>
            </>
          ) : (
            "No ratings yet"
          )}
        </Text>
        <Pressable
          onPress={() => togglePanel("rate")}
          style={styles.rateButton}
          accessibilityRole="button"
          accessibilityLabel={`Rate ${hall.name}`}
          accessibilityState={{ expanded: panel === "rate" }}
        >
          <Ionicons name="star-outline" size={16} color={COLORS.orangeText} />
          <Text style={styles.rateText}>{review?.myReview ? "Edit rating" : "Rate"}</Text>
        </Pressable>
      </View>

      {panel === "rate" && (
        <View style={styles.panel}>
          <StarRow label="Cleanliness" value={cleanliness} onChange={setCleanliness} />
          <StarRow label="Service" value={service} onChange={setService} />
          <Pressable
            style={[styles.primaryButton, busy && styles.disabled]}
            disabled={busy}
            onPress={submitRating}
          >
            {busy ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.primaryText}>Save rating</Text>}
          </Pressable>
        </View>
      )}

      {panel === "crowd" && (
        <View style={styles.panel}>
          <Text style={styles.panelPrompt}>How busy is it right now?</Text>
          <View style={styles.levelGrid}>
            {CROWD_LEVELS.map((option) => {
              const mine = crowd.summary?.myLevel === option.value;
              return (
                <Pressable
                  key={option.value}
                  disabled={busy}
                  onPress={() => reportCrowd(option.value)}
                  style={[styles.levelOption, mine && styles.levelOptionMine]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mine, disabled: busy }}
                >
                  <CrowdBars filled={option.bars} />
                  <Text style={[styles.levelText, mine && styles.levelTextMine]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {!!message && <Text style={styles.message}>{message}</Text>}

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.primaryButton, styles.flex, !menuUrl && styles.disabled]}
          disabled={!menuUrl}
          onPress={() =>
            menuUrl &&
            router.push({
              pathname: "/menu",
              params: { name: hall.name, menuUrl, hallId: hall.id },
            })
          }
        >
          <Text style={styles.primaryText}>{menuUrl ? "View menu" : "No menu yet"}</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, styles.flex, panel === "crowd" && styles.secondaryActive]}
          onPress={() => togglePanel("crowd")}
          accessibilityState={{ expanded: panel === "crowd" }}
        >
          <Text style={styles.secondaryText}>Report crowd</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function Dining() {
  const [locations, setLocations] = useState<DiningLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/dining`)
      .then((response) => response.json())
      .then((data) => {
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

  const otherLocations = locations.filter((location) => !isHallLocation(location));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={TYPE.screenTitle}>Dining</Text>
      <Text style={styles.subtitle}>Check the menu and see how busy it is before you go.</Text>

      {DINING_HALLS.map((hall) => (
        <HallCard key={hall.id} hall={hall} menuUrl={findMenuUrl(hall, locations)} />
      ))}

      <Text style={[TYPE.sectionTitle, styles.sectionTitle]}>More places to eat</Text>
      {loading ? (
        <ActivityIndicator color={COLORS.orange} style={{ marginTop: 12 }} />
      ) : otherLocations.length === 0 ? (
        <Text style={styles.empty}>Couldn&apos;t load other dining locations.</Text>
      ) : (
        <View style={styles.listCard}>
          {otherLocations.map((item, index) => (
            <Pressable
              key={item.name}
              style={[styles.listRow, index > 0 && styles.listDivider]}
              disabled={!item.menuUrl}
              onPress={() => {
                if (item.menuUrl) {
                  router.push({ pathname: "/menu", params: { name: item.name, menuUrl: item.menuUrl } });
                }
              }}
            >
              <Text style={styles.listName}>{item.name}</Text>
              {item.menuUrl ? (
                <Ionicons name="chevron-forward" size={18} color={COLORS.faint} />
              ) : (
                <Text style={styles.noMenu}>No menu</Text>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.screen,
    paddingTop: SPACING.topInset,
    paddingBottom: 40,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 20,
    fontSize: 15,
    color: COLORS.muted,
  },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 12,
  },

  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 14,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitleBlock: {
    flex: 1,
    gap: 3,
  },
  hallName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  hallInfo: {
    fontSize: 13,
    color: COLORS.muted,
  },
  openBadge: {
    backgroundColor: COLORS.successTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  openText: { color: COLORS.success, fontSize: 11, fontWeight: "800" },
  closedBadge: {
    backgroundColor: COLORS.closedTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  closedText: { color: COLORS.muted, fontSize: 11, fontWeight: "800" },

  crowdBlock: { gap: 8 },
  crowdTop: { flexDirection: "row", justifyContent: "space-between" },
  crowdLevel: { fontSize: 13, fontWeight: "700", color: COLORS.text },
  crowdCount: { fontSize: 13, color: COLORS.muted },

  ratingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: -8,
  },
  ratingsText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  ratingNumber: { fontWeight: "800", color: COLORS.text },
  rateButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 4,
  },
  rateText: { fontSize: 14, fontWeight: "700", color: COLORS.orangeText },

  panel: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 10,
  },
  panelPrompt: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  starRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  starLabel: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  stars: { flexDirection: "row" },
  starButton: { padding: 3 },
  levelGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  levelOption: {
    width: "48%",
    flexGrow: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.card,
  },
  levelOptionMine: { backgroundColor: COLORS.orangeTint, borderColor: COLORS.orangeBorder },
  levelText: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  levelTextMine: { color: COLORS.orangeText },
  message: { fontSize: 13, color: COLORS.textSecondary },

  buttonRow: { flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
  primaryButton: {
    minHeight: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  secondaryButton: {
    minHeight: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActive: { backgroundColor: COLORS.orangeTint, borderColor: COLORS.orangeBorder },
  secondaryText: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  disabled: { opacity: 0.45 },

  listCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
  },
  listRow: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listDivider: { borderTopWidth: 1, borderTopColor: COLORS.divider },
  listName: { fontSize: 15, fontWeight: "500", color: COLORS.text, flex: 1 },
  noMenu: { fontSize: 13, color: COLORS.muted },
  empty: { color: COLORS.muted },
});
