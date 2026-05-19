import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ImageSourcePropType,
  Dimensions,
  Platform,
} from "react-native";
import {
  NavigationState,
} from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { navigationRef } from "../navigation/navigationRef";
import AppColors from "../design_systems/colors";
import { useAuthGate } from "../contexts/AuthGate";

// Tabs that require a signed-in user. Guests tapping these get the auth sheet.
const GUEST_GATED_ROUTES = new Set(["trips", "chat", "profile"]);

const { width, height } = Dimensions.get("window");

// --- Floating-nav-bar geometry --------------------------------------
// The bottom nav floats above the screen edge with a fixed bottom inset,
// a fixed height, and (on iOS) a small extra margin. Other screens that
// want to anchor decoration to the navbar (e.g. the BookingScreen empty
// state airplane whose wheels should sit on the rail) read these
// constants so the math stays in one place instead of being copy-pasted
// (and silently drifting) across files.
export const MAIN_NAV_BAR_BOTTOM_INSET = 15;
export const MAIN_NAV_BAR_HEIGHT = Platform.OS === "ios" ? 80 : 70;
export const MAIN_NAV_BAR_EXTRA_MARGIN = Platform.OS === "ios" ? 10 : 0;
/**
 * Distance from the screen's bottom edge to the *top* edge of the
 * floating nav bar — i.e. where decorative elements should rest.
 */
export const MAIN_NAV_BAR_TOP_OFFSET =
  MAIN_NAV_BAR_BOTTOM_INSET + MAIN_NAV_BAR_HEIGHT + MAIN_NAV_BAR_EXTRA_MARGIN;

interface NavItem {
  iconPath: ImageSourcePropType | any;
  route: string;
  label: string;
  isActive?: boolean;
}
interface BottomNavProps {
  items: NavItem[];
}
interface SingleBarProps {
  text: string;
  iconPath: ImageSourcePropType | any;
  onPress: () => void;
  showSwitchIcon?: boolean;
  // Optional dismiss affordance. When provided, a small lime X chip
  // is rendered on the right edge — tapping it should clear whatever
  // state put the bar into this variant (e.g. From / To locations).
  onClose?: () => void;
}
interface MainNavBarProps {
  variant: 0 | 1 | 2;
  bottomNavItems?: NavItem[];
  text?: string;
  iconPath: ImageSourcePropType | any;
  onPress?: () => void;
  showSwitchIcon?: boolean;
  onClose?: () => void;
}

type RouteMapValue = string | string[];

const ROUTE_MAP: Record<string, RouteMapValue> = {
  home: "HomeScreen",
  trips: "BookingScreen",
  // Chat tab routes ONLY to the trips list now. Passenger DMs were
  // intentionally cut — the app's chat surface is trip-scoped group
  // threads, and pending passengers can reach the host through their
  // own trip's chat (backend includes pending bookings in the room
  // list). PassengerInfoScreen is left in the route table for now
  // in case anything else linked there, but the nav bar no longer
  // surfaces it.
  chat: "TripsListScreen",
  profile: "ProfileScreen",
};

const DEFAULT_ACTIVE_SCREEN = "HomeScreen";

const getActiveRouteName = (state?: NavigationState): string => {
  if (!state) return DEFAULT_ACTIVE_SCREEN;
  const route = state.routes[state.index ?? 0] as any;
  if (route?.state) return getActiveRouteName(route.state);
  return route?.name || DEFAULT_ACTIVE_SCREEN;
};

const BottomNav: React.FC<BottomNavProps> = ({ items }) => {
  const insets = useSafeAreaInsets();
  const [activeRouteName, setActiveRouteName] = useState(DEFAULT_ACTIVE_SCREEN.toLowerCase());
  const { requireAuth, isGuest } = useAuthGate();
  
  useEffect(() => {
    // Get initial route name
    if (navigationRef.isReady()) {
      const state = navigationRef.getRootState();
      setActiveRouteName(getActiveRouteName(state).toLowerCase());
    }
    
    // Subscribe to navigation state changes
    const unsubscribe = navigationRef.addListener('state', () => {
      if (navigationRef.isReady()) {
        const state = navigationRef.getRootState();
        setActiveRouteName(getActiveRouteName(state).toLowerCase());
      }
    });
    
    return unsubscribe;
  }, []);

  const handleNavigation = (routeKey: string) => {
    if (!navigationRef.isReady()) return;

    const mapping = ROUTE_MAP[routeKey] ?? routeKey;
    const firstScreen = Array.isArray(mapping) ? mapping[0] : mapping;

    // Guest gate: tab taps that require an account open the lightweight
    // AuthSheet (Vibecode pattern). Contextual reason copy = "to see your
    // trips" / "to message co-riders" / "to view your profile" so the
    // sheet feels purposeful, not punitive.
    if (isGuest && GUEST_GATED_ROUTES.has(routeKey)) {
      const reason =
        routeKey === "trips"
          ? "to see trips you've booked or posted"
          : routeKey === "chat"
          ? "to message your co-riders"
          : "to set up your profile";
      requireAuth({ screen: firstScreen as any }, reason);
      return;
    }

    if (Array.isArray(mapping)) {
      mapping.forEach((screen) => {
        navigationRef.navigate(screen as never);
      });
    } else {
      navigationRef.navigate(mapping as never);
    }
  };

  return (
    <View style={[
      styles.bottomNavContainer,
      Platform.OS === 'ios' && {
        paddingBottom: Math.max(insets.bottom, 20),
        marginBottom: 10,
      }
    ]}>
      {items.map((item, index) => {
        const mapping = ROUTE_MAP[item.route] ?? item.route;
        const screenNames = Array.isArray(mapping) ? mapping : [mapping];
        const isActive = screenNames.some(
          (name) => activeRouteName === name.toLowerCase()
        );

        return (
          <TouchableOpacity
            key={index}
            style={styles.navItem}
            onPress={() => handleNavigation(item.route)}
          >
            <Image
              source={item.iconPath}
              style={[
                styles.icon,
                {
                  tintColor: isActive
                    ? AppColors.basicWhite
                    : AppColors.primaryLightGreen,
                  opacity: isActive ? 1 : 0.8,
                },
              ]}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.navLabel,
                {
                  color: isActive
                    ? AppColors.basicWhite
                    : AppColors.primaryLightGreen,
                  opacity: isActive ? 1 : 0.8,
                },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const SingleBar: React.FC<SingleBarProps> = ({
  text,
  iconPath,
  onPress,
  showSwitchIcon = false,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.singleBarContainer,
        // On iOS, lift the bar a little (marginBottom) so it sits
        // above the home indicator. Do NOT add paddingBottom — the
        // SingleBar's content is centered (not pinned to the bottom
        // like the BottomNav tab icons), so eating into the bar's
        // bottom would just shove the text + emoji above the visual
        // center.
        Platform.OS === 'ios' && {
          marginBottom: Math.max(insets.bottom - 12, 10),
        },
      ]}
    >
      {/* Main tappable surface — the bar itself. Press fires the
          primary action (e.g. "Search Rides"). */}
      <TouchableOpacity
        style={styles.singleBarTouchable}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <View style={styles.singleBarContent}>
          <Text style={styles.singleBarText}>{text}</Text>
          <View style={styles.iconsContainer}>
            <Image
              source={iconPath}
              style={[styles.icon, { tintColor: AppColors.primaryLightGreen }]}
              resizeMode="contain"
            />
            {showSwitchIcon && (
              <Image
                source={require("../assets/switch-1.png")}
                style={[styles.switchIcon, { tintColor: AppColors.primaryLightGreen }]}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Close affordance — sits on the right edge as a hit-target
          large enough to land reliably but visually small. Lime glyph
          on the forest bar matches the rest of the inverse-button
          pattern. */}
      {onClose ? (
        <TouchableOpacity
          style={styles.singleBarCloseBtn}
          onPress={onClose}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Text style={styles.singleBarCloseGlyph}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const MainNavBar: React.FC<MainNavBarProps> = ({
  variant,
  bottomNavItems = [],
  text = "",
  iconPath,
  onPress = () => {},
  showSwitchIcon = false,
  onClose,
}) => {
  const effectiveOnPress =
    variant === 1 && typeof (window as any).mainNavBarOnPress === "function"
      ? (window as any).mainNavBarOnPress
      : onPress;

  switch (variant) {
    case 0:
      return <BottomNav items={bottomNavItems} />;
    case 1:
    case 2:
      return (
        <SingleBar
          text={text}
          iconPath={iconPath}
          onPress={effectiveOnPress}
          showSwitchIcon={showSwitchIcon}
          onClose={onClose}
        />
      );
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  bottomNavContainer: {
    width: "95%",
    // Height pulled from the same constants other screens use to align
    // decoration to the navbar, so they can't drift apart.
    height: MAIN_NAV_BAR_HEIGHT,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: Platform.OS === 'ios' ? "flex-start" : "center",
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: 0,
    paddingHorizontal: 0,
    paddingTop: Platform.OS === 'ios' ? 10 : 0,
    borderRadius: 23,
    position: "absolute",
    bottom: MAIN_NAV_BAR_BOTTOM_INSET,
    alignSelf: "center",
  },
  navItem: {
    width: "25%",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: Platform.OS === 'ios' ? 5 : 0,
    height: Platform.OS === 'ios' ? 55 : "auto",
  },
  navLabel: {
    fontSize: 10,
    fontFamily: "NunitoSans_600SemiBold",
    marginTop: 2,
    textAlign: "center",
  },
  singleBarContainer: {
    width: "95%",
    height: MAIN_NAV_BAR_HEIGHT,
    flexDirection: "row",
    justifyContent: "center",
    // True vertical centering on both platforms — content sits in the
    // middle of the bar. Home-indicator clearance on iOS is handled
    // by the runtime `paddingBottom` (added inline in the JSX), so
    // the container doesn't need the old `flex-start + paddingTop`
    // hack any more.
    alignItems: "center",
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 23,
    position: "absolute",
    bottom: MAIN_NAV_BAR_BOTTOM_INSET,
    alignSelf: "center",
  },
  // Auto-width row so the parent's `justifyContent: "center"` can
  // center it as a single block. The previous `width: "100%"` made
  // this fill the parent and then re-center its children, which let
  // small asymmetries in the icon's bounding box drift the text + icon
  // visibly off-center.
  singleBarContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  // The whole bar (minus the close X) is a tappable surface. Filling
  // the container so the press hit-area covers everything except the
  // close glyph in the corner.
  singleBarTouchable: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  // Close X sits on the right edge as a small chip that's still
  // comfortable to land on with a thumb.
  singleBarCloseBtn: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  singleBarCloseGlyph: {
    color: AppColors.primaryLightGreen,
    fontSize: 18,
    fontFamily: "NunitoSans_700Bold",
    opacity: 0.85,
  },
  iconsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  singleBarText: {
    color: AppColors.primaryLightGreen,
    fontSize: 18,
    fontFamily: "NunitoSans_600SemiBold",
  },
  icon: {
    width: width * 0.05,
    height: height * 0.035,
  },
  switchIcon: {
    width: width * 0.05,
    height: height * 0.04,
  },
});

export default MainNavBar;
