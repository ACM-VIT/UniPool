import AsyncStorage from "./safeAsyncStorage";
import * as Location from "expo-location";

export const HAS_SEEN_PERMISSIONS_PROMPT_KEY = "hasSeenPermissionsPrompt";

export const markPermissionsPromptSeen = async () => {
  await AsyncStorage.setItem(HAS_SEEN_PERMISSIONS_PROMPT_KEY, "true");
};

export const hasGrantedForegroundLocationPermission = async () => {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === "granted";
};

export const shouldShowPermissionsPrompt = async () => {
  if (await hasGrantedForegroundLocationPermission()) {
    await markPermissionsPromptSeen().catch((e) => {
      console.warn("Failed to persist permissions-prompt-seen flag", e);
    });
    return false;
  }

  const seen = await AsyncStorage.getItem(HAS_SEEN_PERMISSIONS_PROMPT_KEY);
  return seen !== "true";
};
