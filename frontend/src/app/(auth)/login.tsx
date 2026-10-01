import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { Link } from "expo-router";
import { API_URL } from "../../lib/config";
import { useAuth } from "../../context/AuthContext";
import { authStyles as s, COLORS } from "../../styles/auth";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      await signIn(data.token);
    } catch {
      setError("Can't reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.container}>
        <Text style={s.title}>VOL Dining Social</Text>
        <Text style={s.subtitle}>Eat better together.</Text>

        <View style={s.card}>
          <Text style={s.cardHeading}>Log in</Text>

          <Text style={s.label}>UT Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="netid@vols.utk.edu"
            placeholderTextColor={COLORS.placeholder}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={COLORS.placeholder}
            secureTextEntry
            onSubmitEditing={handleLogin}
          />

          {error ? <Text style={s.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [s.button, (pressed || loading) && s.buttonPressed]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={s.buttonText}>Log In</Text>}
          </Pressable>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Don't have an account? </Text>
          <Link href="/signup" style={s.link}>Sign up</Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}