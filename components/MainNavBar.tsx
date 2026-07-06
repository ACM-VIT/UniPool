import React from "react";
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
  appHref,
  routeNameFromPath,
} from "../navigation/routes";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppColors from "../design_systems/colors";
import { useAuthGate } from "../contexts/AuthGate";
import { useThemeColors } from "../contexts/ThemeContext";
import { MAIN_NAV_BAR_BOTTOM_INSET, MAIN_NAV_BAR_HEIGHT } from "./MainNavBar.constants";

const GUEST_GATED_ROUTES = new Set(["trips", "chat", "profile"]);

const { width: rawWidth, height: rawHeight } = Dimensions.get("window");
// Keep tablet nav icons at phone scale while preserving native phone sizing.
const isTablet = rawWidth >= 768;
const width = isTablet ? 390 : rawWidth;
const height = isTablet ? 844 : rawHeight;

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
  /** Optional right-edge dismiss action for stateful single-bar variants. */
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
  // Chat starts from the trips list; individual group chats are ride-scoped.
  chat: "TripsListScreen",
  profile: "ProfileScreen",
};

const DEFAULT_ACTIVE_SCREEN = "HomeScreen";
const EMPTY_NAV_ITEMS: NavItem[] = [];

const BottomNav: React.FC<BottomNavProps> = ({ items }) => {
  const insets = useSafeAreaInsets();
  const { replace, navigate } = useRouter();
  const pathname = usePathname();
  const activeRouteName = (
    routeNameFromPath(pathname) ?? DEFAULT_ACTIVE_SCREEN
  ).toLowerCase();
  const { requireAuth, isGuest } = useAuthGate();
  const colors = useThemeColors();

  const handleNavigation = (routeKey: string) => {
    const mapping = ROUTE_MAP[routeKey] ?? routeKey;
    const firstScreen = Array.isArray(mapping) ? mapping[0] : mapping;
    const firstScreenName = String(firstScreen).toLowerCase();

    // Guest-only sessions can browse, but account-owned tabs require auth.
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

    if (activeRouteName === firstScreenName) return;

    if (Array.isArray(mapping)) {
      const [rootScreen, ...nextScreens] = mapping;
      replace(appHref(rootScreen as any));
      nextScreens.forEach((screen) => {
        navigate(appHref(screen as any));
      });
    } else {
      replace(appHref(mapping as any));
    }
  };

  return (
    <View style={[
      styles.bottomNavContainer,
      { backgroundColor: colors.navFill },
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
            key={item.route}
            style={styles.navItem}
            onPress={() => handleNavigation(item.route)}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: isActive }}
          >
            <Image
              source={item.iconPath}
              style={[
                styles.icon,
                {
                  tintColor: isActive
                    ? colors.navIconActive
                    : colors.navIconInactive,
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
                    ? colors.navIconActive
                    : colors.navIconInactive,
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
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.singleBarContainer,
        { backgroundColor: colors.navFill },
        // Lift the centered single-bar content above the iOS home indicator.
        Platform.OS === 'ios' && {
          marginBottom: Math.max(insets.bottom - 12, 10),
        },
      ]}
    >
      <TouchableOpacity
        style={styles.singleBarTouchable}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <View style={styles.singleBarContent}>
          <Text style={[styles.singleBarText, colors.mode === "dark" && { color: colors.navIconActive }]}>{text}</Text>
          <View style={styles.iconsContainer}>
            <Image
              source={iconPath}
              style={[styles.icon, colors.mode === "dark" && { tintColor: colors.navIconActive }]}
              resizeMode="contain"
            />
            {showSwitchIcon && (
              <Image
                source={require("../assets/switch-1.png")}
                style={[styles.switchIcon, colors.mode === "dark" && { tintColor: colors.navIconActive }]}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {onClose ? (
        <TouchableOpacity
          style={styles.singleBarCloseBtn}
          onPress={onClose}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Text style={[styles.singleBarCloseGlyph, { color: colors.navIconInactive }]}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const MainNavBar: React.FC<MainNavBarProps> = ({
  variant,
  bottomNavItems = EMPTY_NAV_ITEMS,
  text = "",
  iconPath,
  onPress = () => {},
  showSwitchIcon = false,
  onClose,
}) => {
  // Resolve the window-global handler at PRESS time, not render time.
  // HomeScreen re-registers `mainNavBarOnPress` whenever the selected
  // search changes, but this bar's props (variant/text/icon) stay
  // identical across searches, so it doesn't re-render — capturing the
  // global during render froze the FIRST search's closure and the CTA
  // kept navigating with that stale route/time.
  const effectiveOnPress = () => {
    const globalHandler = (window as any).mainNavBarOnPress;
    if (variant === 1 && typeof globalHandler === "function") {
      globalHandler();
      return;
    }
    onPress();
  };

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
    // Keep the four-tab bar compact on tablets.
    maxWidth: 540,
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
    // Match the bottom-nav tablet width cap.
    maxWidth: 540,
    height: MAIN_NAV_BAR_HEIGHT,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 23,
    position: "absolute",
    bottom: MAIN_NAV_BAR_BOTTOM_INSET,
    alignSelf: "center",
  },
  singleBarContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
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
