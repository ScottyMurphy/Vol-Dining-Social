import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../lib/config";
import { getToken } from "../lib/tokenStorage";

type Rating = 1 | 2 | 3 | 4 | 5;
type ReviewSummary = {
  averageCleanliness: number | null;
  averageService: number | null;
  reviewCount: number;
  myReview: { cleanliness: Rating; service: Rating } | null;
};

function StarRating({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (rating: Rating) => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.stars}>
        {([1, 2, 3, 4, 5] as const).map((rating) => (
          <TouchableOpacity
            key={rating}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${rating} out of 5 stars`}
            accessibilityState={{ selected: value === rating, disabled }}
            disabled={disabled}
            onPress={() => onChange(rating)}
            style={styles.starButton}
          >
            <Ionicons
              name={rating <= value ? "star" : "star-outline"}
              size={30}
              color={rating <= value ? "#FF8200" : "#A8A8A8"}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function DiningHallReviewCard({
  locationId,
  locationName,
}: {
  locationId: string;
  locationName: string;
}) {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [cleanliness, setCleanliness] = useState(0);
  const [service, setService] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const loadSummary = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("Please sign in to view dining hall reviews.");

    const response = await fetch(`${API_URL}/api/reviews/${locationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Couldn't load dining hall reviews.");
    }

    return data as ReviewSummary;
  }, [locationId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const reviewSummary = await loadSummary();
        if (cancelled) return;
        setSummary(reviewSummary);
        setCleanliness(reviewSummary.myReview?.cleanliness ?? 0);
        setService(reviewSummary.myReview?.service ?? 0);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Couldn't load dining hall reviews.",
          );
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

  async function submitReview() {
    if (!cleanliness || !service) {
      setFeedback("Choose a star rating for cleanliness and service.");
      return;
    }

    setSubmitting(true);
    setFeedback("");
    setError("");

    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in to submit a dining hall review.");

      const response = await fetch(`${API_URL}/api/reviews/${locationId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cleanliness, service }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Couldn't submit your dining hall review.");
      }

      setSummary(data as ReviewSummary);
      setFeedback("Thanks! Your review was saved.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Couldn't submit your dining hall review.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((isExpanded) => !isExpanded)}
        style={styles.header}
      >
        <View style={styles.headerText}>
          <Text style={styles.heading}>{locationName}</Text>
          <Text style={styles.summary}>
            {loading
              ? "Loading reviews..."
              : summary?.reviewCount
                ? `${summary.reviewCount} ${summary.reviewCount === 1 ? "review" : "reviews"} | Cleanliness ${summary.averageCleanliness?.toFixed(1)} | Service ${summary.averageService?.toFixed(1)}`
                : "Be the first to leave a review"}
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={22}
          color="#555"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.form}>
          {loading ? (
            <ActivityIndicator color="#FF8200" style={styles.spinner} />
          ) : (
            <>
              {!!error && <Text style={styles.error}>{error}</Text>}
              <Text style={styles.prompt}>Rate your experience</Text>
              <StarRating
                label="Cleanliness"
                value={cleanliness}
                onChange={(rating) => {
                  setCleanliness(rating);
                  setFeedback("");
                }}
                disabled={submitting}
              />
              <StarRating
                label="Service"
                value={service}
                onChange={(rating) => {
                  setService(rating);
                  setFeedback("");
                }}
                disabled={submitting}
              />
              <TouchableOpacity
                accessibilityRole="button"
                disabled={submitting || !cleanliness || !service}
                style={[
                  styles.submitButton,
                  (submitting || !cleanliness || !service) && styles.disabledButton,
                ]}
                onPress={submitReview}
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitText}>
                    {summary?.myReview ? "Update review" : "Submit review"}
                  </Text>
                )}
              </TouchableOpacity>
              {!!feedback && <Text style={styles.feedback}>{feedback}</Text>}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    overflow: "hidden",
  },
  header: {
    minHeight: 76,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  heading: {
    fontSize: 19,
    fontWeight: "700",
    color: "#222",
  },
  summary: {
    marginTop: 5,
    fontSize: 13,
    color: "#666",
  },
  form: {
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    padding: 16,
  },
  spinner: {
    marginVertical: 16,
  },
  prompt: {
    marginBottom: 12,
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  ratingRow: {
    marginBottom: 14,
  },
  ratingLabel: {
    marginBottom: 4,
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
  },
  stars: {
    flexDirection: "row",
    marginLeft: -7,
  },
  starButton: {
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  submitButton: {
    backgroundColor: "#FF8200",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    marginTop: 2,
  },
  disabledButton: {
    opacity: 0.6,
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
    marginBottom: 12,
  },
});
