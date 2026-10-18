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
    //replace with your IPv4 address from running 
    //ipconfig, and add the port number of your backend server
    //ie. :4000
    : "http://10.128.96.168:4000"; 