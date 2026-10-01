import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { Link } from "expo-router";
import { API_URL } from "../../lib/config";
import { useAuth } from "../../context/AuthContext";
import { authStyles as s, COLORS } from "../../styles/auth";

export default function SignupScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const post = (path: string) =>
    fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

  const handleSignup = async () => {
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const signupRes = await post("/api/signup");
      const signupData = await signupRes.json();
      if (!signupRes.ok) {
        setError(signupData.error ?? "Something went wrong");
        return;
      }

      const loginRes = await post("/api/login");
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        setError("Account created. Please log in.");
        return;
      }
      await signIn(loginData.token);
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
          <Text style={s.cardHeading}>Create an account</Text>

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
            placeholder="At least 8 characters"
            placeholderTextColor={COLORS.placeholder}
            secureTextEntry
          />

          <Text style={s.label}>Confirm Password</Text>
          <TextInput
            style={s.input}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Re-enter your password"
            placeholderTextColor={COLORS.placeholder}
            secureTextEntry
            onSubmitEditing={handleSignup}
          />

          {error ? <Text style={s.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [s.button, (pressed || loading) && s.buttonPressed]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={s.buttonText}>Sign Up</Text>}
          </Pressable>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Already have an account? </Text>
          <Link href="/login" style={s.link}>Log in</Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}