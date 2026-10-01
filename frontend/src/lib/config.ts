import { Platform } from "react-native";

export const API_URL =
  Platform.OS === "web"
    ? "http://localhost:4000"
    : "http://10.2.42.251:4000"; // replace with your IPv4 address from ipconfig