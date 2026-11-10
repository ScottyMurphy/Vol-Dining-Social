import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import LogoutButton from "../../components/LogoutButton";
import CrowdBars from "../../components/CrowdBars";
import { API_URL } from "../../lib/config";
import { useAuth } from "../../context/AuthContext";
import { crowdBars, crowdLabel, useCrowd } from "../../lib/crowd";
import {
  DINING_HALLS,
  getHallState,
  getHallStatus,
  getSplash,
  type DiningHall,
} from "../../lib/mealPeriods";
import { COLORS, RADIUS, SHADOW, SPACING, TYPE } from "../../lib/theme";

const BANNER = require("../../../assets/images/community-banner.jpg");

// How often to re-check the clock so the splash and open halls stay current.
const CLOCK_CHECK_MS = 30 * 1000;

function openHall(id: string) {
  if (id === "rocky-top") router.push("/rocky-top");
  else if (id === "stokely") router.push("/stokely");
  else router.push("/(tabs)/dining");
}

// Progress through the current meal, using whichever open hall closes last.
function mealProgress(now: Date) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  let best: { start: number; end: number } | null = null;
  for (const hall of DINING_HALLS) {
    const state = getHallState(hall, now);
    if (state.open && (!best || state.end > best.end)) {
      best = { start: state.start, end: state.end };
    }
  }
  if (!best) return null;
  const left = Math.max(0, best.end - minutes);
  const fraction = Math.min(1, Math.max(0, (minutes - best.start) / (best.end - best.start)));
  const hours = Math.floor(left / 60);
  const mins = left % 60;
  return {
    fraction,
    leftText: hours > 0 ? `${hours} hr ${mins} min left` : `${mins} min left`,
  };
}

function HallRow({ hall, now }: { hall: DiningHall; now: Date }) {
  const status = getHallStatus(hall, now);
  const { summary } = useCrowd(hall.id);

  return (
    <Pressable
      style={({ pressed }) => [styles.hallCard, pressed && styles.pressed]}
      onPress={() => openHall(hall.id)}
      accessibilityRole="button"
      accessibilityLabel={`${hall.name}, ${status.open ? "open" : "closed"}`}
    >
      <View style={styles.hallText}>
        <View style={styles.hallTitleRow}>
          <Text style={styles.hallName}>{hall.name}</Text>
          <View style={status.open ? styles.openBadge : styles.closedBadge}>
            <Text style={status.open ? styles.openText : styles.closedText}>
              {status.open ? "OPEN" : "CLOSED"}
            </Text>
          </View>
        </View>
        <Text style={styles.hallInfo}>{status.info}</Text>
        {status.open && (
          <View style={styles.crowdRow}>
            <CrowdBars filled={crowdBars(summary?.level ?? null)} />
            <Text style={styles.crowdText}>{crowdLabel(summary?.level ?? null)}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.faint} />
    </Pressable>
  );
}

type TopPost = { id: number; text: string; tag: string | null; createdAt: string };

const TAG_LABELS: Record<string, string> = {
  "rocky-top": "Rocky Top",
  stokely: "Stokely",
  "southern-kitchen": "Southern Kitchen",
  general: "General",
};

// The hottest community post, shown as a preview on Home.
function useTopPost() {
  const { token } = useAuth();
  const [post, setPost] = useState<TopPost | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/community/posts?sort=hot`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setPost(data.find((p: TopPost) => p.text) ?? null);
      }
    } catch {
      // Home still works without the preview.
    } finally {
      setLoaded(true);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return { post, loaded };
}

export default function Index() {
  const [now, setNow] = useState(() => new Date());
  const { post, loaded } = useTopPost();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), CLOCK_CHECK_MS);
    return () => clearInterval(timer);
  }, []);

  const splash = getSplash(DINING_HALLS, now);
  const progress = splash.open ? mealProgress(now) : null;
  const dateText = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // Open halls first; otherwise keep the original order.
  const halls = [...DINING_HALLS].sort(
    (a, b) => Number(getHallStatus(b, now).open) - Number(getHallStatus(a, now).open),
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {/* Ayres Hall header */}
      <ImageBackground
        source={BANNER}
        style={styles.hero}
        imageStyle={styles.heroImage}
        accessibilityLabel="Ayres Hall framed by fall trees"
        accessibilityRole="image"
      >
        <View style={styles.heroShade} />
        <View style={styles.heroTop}>
          <View style={styles.logoutPill}>
            <LogoutButton />
          </View>
        </View>
        <View style={styles.heroText}>
          <Text style={styles.date}>{dateText}</Text>
          <Text style={styles.logo}>
            VOL Dining Social<Text style={{ color: COLORS.orange }}>.</Text>
          </Text>
        </View>
      </ImageBackground>

      <View style={styles.body}>
        {/* Meal period */}
        <View style={styles.mealCard}>
          <Text style={styles.mealLabel}>{splash.label}</Text>
          <Text style={styles.mealTitle}>{splash.title}</Text>
          <Text style={styles.mealTime}>{splash.subtitle}</Text>
          {progress && (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress.fraction * 100}%` }]} />
              </View>
              <Text style={styles.mealTime}>{progress.leftText}</Text>
            </View>
          )}
        </View>

        {/* Dining halls */}
        <View style={styles.sectionHeader}>
          <Text style={TYPE.sectionTitle}>Dining halls</Text>
          <Pressable onPress={() => router.push("/(tabs)/dining")} hitSlop={10}>
            <Text style={styles.link}>See all</Text>
          </Pressable>
        </View>
        {halls.map((hall) => (
          <HallRow key={hall.id} hall={hall} now={now} />
        ))}

        {/* Community preview */}
        <View style={styles.sectionHeader}>
          <Text style={TYPE.sectionTitle}>From the community</Text>
          <Pressable onPress={() => router.push("/(tabs)/community")} hitSlop={10}>
            <Text style={styles.link}>See posts</Text>
          </Pressable>
        </View>
        <Pressable
          style={({ pressed }) => [styles.postCard, pressed && styles.pressed]}
          onPress={() => router.push("/(tabs)/community")}
        >
          {post ? (
            <>
              {post.tag && TAG_LABELS[post.tag] && (
                <View style={styles.tagPill}>
                  <Text style={styles.tagPillText}>{TAG_LABELS[post.tag]}</Text>
                </View>
              )}
              <Text style={styles.postText} numberOfLines={3}>
                {post.text}
              </Text>
            </>
          ) : (
            <Text style={styles.postEmpty}>
              {loaded ? "No posts yet. Be the first to share what's good today." : "Loading..."}
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    paddingBottom: 32,
  },

  hero: {
    height: 290,
    justifyContent: "space-between",
    backgroundColor: "#3A5A7A",
  },
  heroImage: {
    resizeMode: "cover",
  },
  heroShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  heroTop: {
    paddingTop: 52,
    paddingHorizontal: SPACING.screen,
    alignItems: "flex-end",
  },
  logoutPill: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
  },
  heroText: {
    paddingHorizontal: SPACING.screen,
    paddingBottom: 72,
  },
  date: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  logo: {
    color: "white",
    fontSize: 30,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowRadius: 10,
  },

  body: {
    paddingHorizontal: SPACING.screen,
  },

  mealCard: {
    marginTop: -56,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: 18,
    gap: 4,
    ...SHADOW,
  },
  mealLabel: {
    ...TYPE.label,
    color: COLORS.orangeText,
  },
  mealTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
  },
  mealTime: {
    fontSize: 14,
    color: COLORS.muted,
  },
  progressWrap: {
    marginTop: 10,
    gap: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.orangeTintStrong,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.orange,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 26,
    marginBottom: 12,
  },
  link: {
    color: COLORS.orangeText,
    fontSize: 14,
    fontWeight: "700",
  },

  hallCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  hallText: {
    flex: 1,
    gap: 5,
  },
  hallTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hallName: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  hallInfo: {
    fontSize: 13,
    color: COLORS.muted,
  },
  crowdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  crowdText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  openBadge: {
    backgroundColor: COLORS.successTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  openText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "800",
  },
  closedBadge: {
    backgroundColor: COLORS.closedTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  closedText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "800",
  },

  postCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 10,
  },
  tagPill: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.orangeTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.orangeText,
  },
  postText: {
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.text,
  },
  postEmpty: {
    fontSize: 14,
    color: COLORS.muted,
  },
});
