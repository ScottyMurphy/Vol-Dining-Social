import { Platform } from "react-native";
import Constants from "expo-constants";

const expoHost = Constants.expoConfig?.hostUri;
const computerIP = expoHost
  ? new URL(`http://${expoHost}`).hostname
  : undefined;
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;

export const API_URL =
  configuredApiUrl ??
  (Platform.OS === "web"
    ? "http://localhost:4000"
    : computerIP
      ? `http://${computerIP}:4000`
      : "http://10.128.96.168:4000");