import { StyleSheet, Dimensions } from "react-native";
import AppColors from "../../design_systems/colors";
import { MAIN_NAV_BAR_TOP_OFFSET } from "../../components/MainNavBar";

const rawWindow = Dimensions.get("window");
// Tablet branch only: phones keep the natural canvas width so the
// 0.62/0.44 ratios tune to each iPhone. On tablets the airplane was
// scaling to ~640pt and floating in the bottom-right corner instead
// of sitting on the navbar rail. Clamping to the iPhone reference
// (390pt) keeps the illustration phone-sized so its wheels still land
// on the centred navbar pill.
const isTablet = rawWindow.width >= 768;
const window = {
  width: isTablet ? 390 : rawWindow.width,
  height: isTablet ? 844 : rawWindow.height,
};

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
  ratePill: {
    marginTop: 10,
    marginLeft: 4,
    alignSelf: "flex-start",
    backgroundColor: AppColors.primaryLightGreen,
    borderWidth: 1.5,
    borderColor: AppColors.secondaryDarkGreen,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ratePillStar: {
    fontSize: 13,
    lineHeight: 14,
  },
  ratePillText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 12.5,
    color: AppColors.secondaryDarkGreen,
    letterSpacing: 0.2,
  },
  ratePillArrow: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 12,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.55,
    marginLeft: -2,
  },
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
  airplaneWrap: {
    position: "absolute",
    bottom: MAIN_NAV_BAR_TOP_OFFSET,
    // On phone: pull the airplane 6% past the right edge so the
    // nose pokes off-screen and the wheels land on the right
    // portion of the (full-width) navbar.
    //
    // On iPad: the navbar is a 540pt pill centred against a 1032+ pt
    // canvas, so the same negative offset would dump the airplane in
    // the bottom-right corner of the screen, well clear of the
    // navbar. We instead anchor the airplane's right edge a few
    // points past the navbar's right edge so the wheels still rest
    // on the rail, mirroring the phone composition.
    right: isTablet
      ? (rawWindow.width - 540) / 2 - 23
      : -window.width * 0.06,
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
