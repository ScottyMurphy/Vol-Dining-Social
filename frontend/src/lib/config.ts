import { Platform } from "react-native";

export const API_URL =
  Platform.OS === "web"
    ? "http://localhost:4000"
    //replace with your IPv4 address from running 
    //ipconfig, and add the port number of your backend server
    //ie. :4000
    : "http://10.128.96.168:4000"; 