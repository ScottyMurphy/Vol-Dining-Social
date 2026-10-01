import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export const saveToken = async (t: string) =>
  Platform.OS === "web" ? localStorage.setItem("token", t) : SecureStore.setItemAsync("token", t);

export const getToken = async () =>
  Platform.OS === "web" ? localStorage.getItem("token") : SecureStore.getItemAsync("token");

export const deleteToken = async () =>
  Platform.OS === "web" ? localStorage.removeItem("token") : SecureStore.deleteItemAsync("token");