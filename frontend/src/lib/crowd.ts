import { useCallback, useEffect, useState } from "react";
import { API_URL } from "./config";
import { getToken } from "./tokenStorage";

export type CrowdLevel = "low" | "medium" | "high" | "very-high";

export type CrowdSummary = {
  level: CrowdLevel | null;
  reportCount: number;
  myLevel: CrowdLevel | null;
};

export const CROWD_LEVELS: { value: CrowdLevel; label: string; bars: number }[] = [
  { value: "low", label: "Not busy", bars: 1 },
  { value: "medium", label: "Somewhat busy", bars: 2 },
  { value: "high", label: "Busy", bars: 3 },
  { value: "very-high", label: "Very busy", bars: 4 },
];

export function crowdLabel(level: CrowdLevel | null) {
  return CROWD_LEVELS.find((l) => l.value === level)?.label ?? "No recent reports";
}

export function crowdBars(level: CrowdLevel | null) {
  return CROWD_LEVELS.find((l) => l.value === level)?.bars ?? 0;
}

// Loads the crowd summary for one dining hall and lets you submit a report.
export function useCrowd(locationId: string) {
  const [summary, setSummary] = useState<CrowdSummary | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in to see crowd reports.");
      const response = await fetch(`${API_URL}/api/crowd/${locationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Couldn't load crowd reports.");
      setSummary(data);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Couldn't load crowd reports.");
    }
  }, [locationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const report = useCallback(
    async (level: CrowdLevel) => {
      const token = await getToken();
      if (!token) throw new Error("Sign in to report the crowd level.");
      const response = await fetch(`${API_URL}/api/crowd/${locationId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ level }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Couldn't submit your crowd report.");
      await load();
    },
    [locationId, load],
  );

  return { summary, error, reload: load, report };
}
