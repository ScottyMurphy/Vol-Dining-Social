import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { API_URL } from "../../lib/config";
import { useAuth } from "../../context/AuthContext";

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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Preferences</Text>
      <Text style={styles.subtitle}>
        Customize food and allergy preferences for your account.
      </Text>
      {loading ? (
        <ActivityIndicator color="#FF8200" style={styles.loading} />
      ) : (
        <>
          {OPTIONS.map((section) => (
            <View key={section.category} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionDescription}>{section.description}</Text>
              <View style={styles.options}>
                {section.values.map((option) => {
                  const selected = preferences[section.category].includes(option.value);
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected, disabled: saving }}
                      disabled={saving}
                      onPress={() => togglePreference(section.category, option.value)}
                      style={[
                        styles.option,
                        selected && styles.optionSelected,
                        saving && styles.disabledOption,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selected && styles.optionTextSelected,
                        ]}
                      >
                        {selected ? "✓  " : ""}
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          {saving && <ActivityIndicator color="#FF8200" style={styles.status} />}
          {!!feedback && <Text style={styles.feedback}>{feedback}</Text>}
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
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
  container: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#F7F7F7",
    flexGrow: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FF8200",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: "#666",
  },
  loading: {
    marginTop: 32,
  },
  section: {
    marginTop: 28,
    padding: 18,
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#222",
  },
  sectionDescription: {
    marginTop: 5,
    marginBottom: 14,
    fontSize: 14,
    color: "#666",
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  option: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionSelected: {
    backgroundColor: "#FFF1E3",
    borderColor: "#FF8200",
  },
  disabledOption: {
    opacity: 0.65,
  },
  optionText: {
    color: "#555",
    fontSize: 14,
    fontWeight: "600",
  },
  optionTextSelected: {
    color: "#C76100",
  },
  status: {
    marginTop: 16,
  },
  feedback: {
    marginTop: 14,
    color: "#208A45",
    fontSize: 14,
  },
  error: {
    marginTop: 14,
    color: "#B00020",
    fontSize: 14,
  },
  note: {
    marginTop: 22,
    color: "#666",
    fontSize: 13,
    lineHeight: 18,
  },
});
