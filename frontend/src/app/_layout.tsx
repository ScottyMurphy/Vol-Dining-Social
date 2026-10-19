import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "../context/AuthContext";

function RootNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!token}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={!!token}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="service-reviews" />
        <Stack.Screen name="menu" />
        <Stack.Screen name="rocky-top" />
        <Stack.Screen name="stokely" />
      </Stack.Protected>
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