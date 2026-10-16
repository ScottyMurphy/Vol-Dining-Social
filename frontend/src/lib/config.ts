import { Platform } from "react-native";
import Constants from "expo-constants";

//Get the IP address of the computer running Expo
const expoHost = Constants.expoConfig?.hostUri;

//Remove the port from Expo's address
const computerIP = expoHost?.split(":")[0];

//Use localhost for web and the computer's IP for mobile
export const API_URL =
  Platform.OS === "web"
    ? "http://localhost:4000"
    : `http://${computerIP}:4000`;