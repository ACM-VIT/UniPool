import { Platform } from "react-native";

// Floating nav-bar geometry shared by screens that anchor content above it.
export const MAIN_NAV_BAR_BOTTOM_INSET = 15;
export const MAIN_NAV_BAR_HEIGHT = Platform.OS === "ios" ? 80 : 70;
const MAIN_NAV_BAR_EXTRA_MARGIN = Platform.OS === "ios" ? 10 : 0;
export const MAIN_NAV_BAR_TOP_OFFSET =
  MAIN_NAV_BAR_BOTTOM_INSET + MAIN_NAV_BAR_HEIGHT + MAIN_NAV_BAR_EXTRA_MARGIN;
