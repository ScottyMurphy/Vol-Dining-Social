import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { API_URL } from "../../lib/config";
import { useAuth } from "../../context/AuthContext";
import LogoutButton from "../../components/LogoutButton";
import { COLORS, RADIUS, SPACING, TYPE } from "../../lib/theme";

type PreferenceCategory = "dietary" | "allergen";
type Preferences = Record<PreferenceCategory, string[]>;

const OPTIONS: {
  category: PreferenceCategory;
  title: string;
  description: string;
  values: { value: string; label: string }[];
}[] = [
  {
    category: "dietary",
    title: "Dietary preferences",
    description: "Choose the types of food that fit your diet.",
    values: [
      { value: "low_calorie", label: "Low calorie" },
      { value: "vegan", label: "Vegan" },
      { value: "vegetarian", label: "Vegetarian" },
    ],
  },
  {
    category: "allergen",
    title: "Allergen preferences",
    description: "Select ingredients you need to avoid.",
    values: [{ value: "gluten_free", label: "Gluten-free" }],
  },
];

const EMPTY_PREFERENCES: Preferences = { dietary: [], allergen: [] };

export default function Preferences() {
  const { token } = useAuth();
  const [preferences, setPreferences] = useState<Preferences>(EMPTY_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const loadPreferences = useCallback(async () => {
    if (!token) throw new Error("Please sign in to manage your preferences.");

    const response = await fetch(`${API_URL}/api/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Couldn't load your preferences.");
    }
    setPreferences(data);
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await loadPreferences();
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Couldn't load your preferences.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [loadPreferences]);

  async function togglePreference(category: PreferenceCategory, value: string) {
    if (!token || saving) return;

    const selected = preferences[category].includes(value);
    const nextPreferences = {
      ...preferences,
      [category]: selected
        ? preferences[category].filter((preference) => preference !== value)
        : [...preferences[category], value],
    };

    setSaving(true);
    setError("");
    setFeedback("");
    try {
      const response = await fetch(`${API_URL}/api/preferences`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextPreferences),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Couldn't save your preferences.");
      }

      setPreferences(data);
      setFeedback("Preferences saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Couldn't save your preferences.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={TYPE.screenTitle}>Preferences</Text>
      <Text style={styles.subtitle}>We&apos;ll highlight menu items that fit.</Text>
      {loading ? (
        <ActivityIndicator color={COLORS.orange} style={styles.loading} />
      ) : (
        <>
          {OPTIONS.map((section) => (
            <View key={section.category} style={styles.section}>
              <Text style={styles.sectionTitle}>
                {section.category === "dietary" ? "DIETARY" : "ALLERGENS"}
              </Text>
              <View style={styles.group}>
                {section.values.map((option, index) => {
                  const selected = preferences[section.category].includes(option.value);
                  return (
                    <View
                      key={option.value}
                      style={[styles.row, index > 0 && styles.rowDivider]}
                    >
                      <Text style={styles.rowLabel}>{option.label}</Text>
                      <Switch
                        value={selected}
                        disabled={saving}
                        onValueChange={() => togglePreference(section.category, option.value)}
                        trackColor={{ false: COLORS.inputBorder, true: COLORS.orange }}
                        thumbColor="#FFFFFF"
                        ios_backgroundColor={COLORS.inputBorder}
                        accessibilityLabel={option.label}
                      />
                    </View>
                  );
                })}
              </View>
              <Text style={styles.sectionDescription}>{section.description}</Text>
            </View>
          ))}
          {saving && <ActivityIndicator color={COLORS.orange} style={styles.status} />}
          {!!feedback && <Text style={styles.feedback}>{feedback}</Text>}
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACCOUNT</Text>
            <View style={[styles.group, styles.accountRow]}>
              <LogoutButton />
            </View>
          </View>

          <Text style={styles.note}>
            Dietary and allergen preferences are for guidance only. Always check
            ingredient and cross-contamination information with dining staff.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: SPACING.screen,
    paddingTop: SPACING.topInset,
    paddingBottom: 40,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: COLORS.muted,
  },
  loading: {
    marginTop: 30,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    ...TYPE.label,
    marginLeft: 4,
    marginBottom: 8,
  },
  sectionDescription: {
    marginTop: 8,
    marginLeft: 4,
    fontSize: 13,
    color: COLORS.muted,
  },
  group: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
  },
  row: {
    minHeight: 54,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  accountRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  status: {
    marginTop: 16,
  },
  feedback: {
    marginTop: 14,
    color: COLORS.success,
    fontWeight: "600",
  },
  error: {
    marginTop: 14,
    color: COLORS.danger,
    fontWeight: "600",
  },
  note: {
    marginTop: 24,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.muted,
  },
});
