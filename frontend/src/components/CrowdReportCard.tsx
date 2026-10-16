import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import CrowdMeterCard from "./crowdMeterCard";
import { API_URL } from "../lib/config";
import { getToken } from "../lib/tokenStorage";

type CrowdLevel = "low" | "medium" | "high" | "very-high";
type CrowdSummary = {
  level: CrowdLevel | null;
  reportCount: number;
  myLevel: CrowdLevel | null;
};

const LEVEL_OPTIONS: { value: CrowdLevel; label: string }[] = [
  { value: "low", label: "Not busy" },
  { value: "medium", label: "Somewhat busy" },
  { value: "high", label: "Busy" },
  { value: "very-high", label: "Very busy" },
];

export default function CrowdReportCard({
  locationId,
  locationName,
}: {
  locationId: string;
  locationName: string;
}) {
  const [summary, setSummary] = useState<CrowdSummary>({
    level: null,
    reportCount: 0,
    myLevel: null,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<CrowdLevel | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const loadSummary = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("Please sign in to view crowd reports.");

    const response = await fetch(`${API_URL}/api/crowd/${locationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Couldn't load crowd reports.");
    }

    setSummary(data);
    setSelectedLevel(data.myLevel);
  }, [locationId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await loadSummary();
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Couldn't load crowd reports.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [loadSummary]);

  async function submitReport() {
    if (!selectedLevel) {
      setFeedback("Choose a crowd level first.");
      return;
    }

    setSubmitting(true);
    setFeedback("");
    setError("");

    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in to report the crowd level.");

      const response = await fetch(`${API_URL}/api/crowd/${locationId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ level: selectedLevel }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Couldn't submit your crowd report.");
      }

      setFeedback("Thanks! Your crowd report was saved.");
      try {
        await loadSummary();
      } catch (refreshError) {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : "Your report was saved, but the crowd summary could not be refreshed.",
        );
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Couldn't submit your crowd report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>How busy is {locationName}?</Text>
      {loading ? (
        <ActivityIndicator color="#FF8200" style={styles.spinner} />
      ) : (
        <>
          {error ? <Text style={styles.error}>{error}</Text> : (
            <>
              <CrowdMeterCard locationName={locationName} crowdLevel={summary.level} />
              <Text style={styles.reportCount}>
                {summary.reportCount === 1
                  ? "1 report in the last 2 hours"
                  : `${summary.reportCount} reports in the last 2 hours`}
              </Text>
            </>
          )}

          <Text style={styles.prompt}>Report the current crowd level</Text>
          <View style={styles.options}>
            {LEVEL_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{
                  selected: selectedLevel === option.value,
                  disabled: submitting,
                }}
                disabled={submitting}
                style={[
                  styles.option,
                  selectedLevel === option.value && styles.optionSelected,
                ]}
                onPress={() => {
                  setSelectedLevel(option.value);
                  setFeedback("");
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedLevel === option.value && styles.optionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            disabled={submitting || loading}
            style={[styles.submitButton, (submitting || loading) && styles.disabledButton]}
            onPress={submitReport}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitText}>Submit crowd report</Text>
            )}
          </TouchableOpacity>
          {!!feedback && <Text style={styles.feedback}>{feedback}</Text>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  heading: {
    fontSize: 19,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
  },
  spinner: {
    marginVertical: 20,
  },
  reportCount: {
    color: "#666",
    textAlign: "center",
    marginTop: -6,
    marginBottom: 16,
  },
  prompt: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionSelected: {
    backgroundColor: "#FFF1E3",
    borderColor: "#FF8200",
  },
  optionText: {
    color: "#555",
    fontSize: 13,
    fontWeight: "600",
  },
  optionTextSelected: {
    color: "#C76100",
  },
  submitButton: {
    backgroundColor: "#FF8200",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    marginTop: 14,
  },
  disabledButton: {
    opacity: 0.65,
  },
  submitText: {
    color: "white",
    fontWeight: "700",
  },
  feedback: {
    color: "#208A45",
    fontSize: 13,
    marginTop: 10,
  },
  error: {
    color: "#B00020",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 14,
  },
});
