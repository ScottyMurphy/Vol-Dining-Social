// Shared look for the whole app. Change a value here and every screen that
// uses it updates, instead of hunting down hex codes in each file.

export const COLORS = {
  // UT orange: buttons, the selected tab, highlights
  orange: "#FF8200",
  // Darker orange for orange TEXT, so it stays readable on white
  orangeText: "#A34F00",
  // Light orange backgrounds (selected chips, tags, progress tracks)
  orangeTint: "#FFF1E3",
  orangeTintStrong: "#FFE2C4",
  orangeBorder: "#FFC58A",

  background: "#F6F6F4", // screen background
  card: "#FFFFFF",
  border: "#E9E8E4",
  divider: "#F0EFEB",
  inputBorder: "#D6D5D0",
  chip: "#F1F0EC",

  text: "#18181B", // main text
  textSecondary: "#3F3F46",
  muted: "#5B5B63", // supporting text
  faint: "#8A8A92", // icons, placeholders

  smokey: "#4B4B4B", // UT smokey gray: crowd meter bars
  meterEmpty: "#E2E1DC",

  success: "#1E6B34", // "OPEN", "liked"
  successTint: "#E5F3E8",
  successBorder: "#9FD0AC",
  danger: "#B3261E",
  closedTint: "#EEEEEE",
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  pill: 999,
};

export const SPACING = {
  screen: 20, // left/right padding on every screen
  topInset: 60, // space for the phone's status bar
};

export const TYPE = {
  screenTitle: { fontSize: 26, fontWeight: "800" as const, color: COLORS.text },
  sectionTitle: { fontSize: 19, fontWeight: "700" as const, color: COLORS.text },
  label: {
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 0.8,
    color: COLORS.muted,
  },
};

// Soft card shadow used on a few raised elements
export const SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};
