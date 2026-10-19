import { Alert, Platform, Pressable, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../styles/auth";

export default function LogoutButton() {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Failed to log out:", error);
      const message = "Unable to log out. Please try again.";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Logout failed", message);
      }
    }
  };

  return (
    <Pressable
      onPress={() => void handleLogout()}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Log out"
    >
      <Ionicons name="log-out-outline" size={20} color={COLORS.muted} />
      <Text style={styles.text}>Log out</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  pressed: { opacity: 0.6 },
  text: { color: COLORS.muted, fontSize: 15, fontWeight: "600" },
});