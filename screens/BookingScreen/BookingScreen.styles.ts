import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";
import { MAIN_NAV_BAR_TOP_OFFSET } from "../../components/MainNavBar";

const window = Dimensions.get("window");

// Sizing for the decorative airplane. The PNG (347×370) has a chunk of
// transparent padding under its wheels — without compensation the
// image's bottom edge sits on the navbar but the *wheels* float above
// it. We wrap the Image in a clipping View, then translate the image
// down inside it, so the wrapper's bottom edge == the tyres.
const AIRPLANE_WIDTH = window.width * 0.62;
const AIRPLANE_HEIGHT = window.width * 0.44;
const AIRPLANE_WHEEL_PADDING_RATIO = 0.22;
const AIRPLANE_BOTTOM_CROP = AIRPLANE_HEIGHT * AIRPLANE_WHEEL_PADDING_RATIO;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: AppColors.primaryLightGreen,
  },

  // ---- Header (title + subtitle on lime canvas) ----
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 30,
    letterSpacing: -0.6,
    color: AppColors.secondaryDarkGreen,
  },

  // ---- Tab pills ----
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 12,
    gap: 8,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(38,59,51,0.08)",
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: AppColors.secondaryDarkGreen,
  },
  tabText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 13.5,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: 0.1,
  },
  tabTextActive: {
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_800ExtraBold",
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "rgba(38,59,51,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeActive: {
    backgroundColor: AppColors.primaryLightGreen,
  },
  tabBadgeText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 11,
    color: AppColors.secondaryDarkGreen,
  },
  tabBadgeTextActive: {
    color: AppColors.secondaryDarkGreen,
  },

  // ---- Vertical list of RideCards ----
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    // Clear the floating MainNavBar with breathing room so the last
    // card never hides under the tab bar.
    paddingBottom: MAIN_NAV_BAR_TOP_OFFSET + 24,
  },
  cardSlot: {
    marginBottom: 14,
  },

  // ---- Empty state ----
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 36,
  },
  emptyTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 22,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.4,
    marginBottom: 16,
  },
  primaryCta: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 2,
  },
  primaryCtaText: {
    color: AppColors.primaryLightGreen,
    fontSize: 15,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: 0.2,
  },

  // ---- Error state ----
  errorWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  errorText: {
    color: AppColors.secondaryDarkGreen,
    fontSize: 15,
    fontFamily: "NunitoSans_700Bold",
    textAlign: "center",
  },

  // ---- Airplane decoration (empty state only) ----
  airplaneWrap: {
    position: "absolute",
    bottom: MAIN_NAV_BAR_TOP_OFFSET,
    right: -window.width * 0.06,
    width: AIRPLANE_WIDTH,
    height: AIRPLANE_HEIGHT - AIRPLANE_BOTTOM_CROP,
    overflow: "hidden",
    opacity: 0.92,
  },
  airplaneImage: {
    width: AIRPLANE_WIDTH,
    height: AIRPLANE_HEIGHT,
  },
});

export default styles;
