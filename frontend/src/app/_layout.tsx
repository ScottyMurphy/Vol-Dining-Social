import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "../context/AuthContext";

function RootNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  // Logged-in user
  if (token) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="service-reviews" />
        <Stack.Screen name="menu" />
      </Stack>
    );
  }

  // Logged-out user
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}