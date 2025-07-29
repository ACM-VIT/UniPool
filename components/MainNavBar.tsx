import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ImageSourcePropType,
  Dimensions,
} from "react-native";
import {
  useNavigation,
  useNavigationState,
  NavigationState,
} from "@react-navigation/native";
import AppColors from "../design_systems/colors";

const { width, height } = Dimensions.get("window");

interface NavItem {
  iconPath: ImageSourcePropType;
  route: string;
  label: string;
  isActive?: boolean;
}
interface BottomNavProps {
  items: NavItem[];
}
interface SingleBarProps {
  text: string;
  iconPath: ImageSourcePropType;
  onPress: () => void;
  showSwitchIcon?: boolean;
}
interface MainNavBarProps {
  variant: 0 | 1 | 2;
  bottomNavItems?: NavItem[];
  text?: string;
  iconPath: ImageSourcePropType;
  onPress?: () => void;
  showSwitchIcon?: boolean;
}

const ROUTE_MAP: Record<string, string> = {
  home: "HomeScreen",
  trips: "BookingScreen",
  chat: "", // not implemented yet
  profile: "ProfileScreen",
};

const DEFAULT_ACTIVE_SCREEN = "HomeScreen";

function getActiveRouteName(state?: NavigationState): string | undefined {
  if (!state) return undefined;
  const route = state.routes[state.index ?? 0] as any;
  if (route?.state) return getActiveRouteName(route.state);
  return route?.name;
}

const BottomNav: React.FC<BottomNavProps> = ({ items }) => {
  const navigation = useNavigation();
  const navState = useNavigationState((s) => s);
  const fromState = getActiveRouteName(navState);

  const activeRouteName = (fromState || DEFAULT_ACTIVE_SCREEN).toLowerCase();

  const handleNavigation = (routeKey: string) => {
    const screenName = ROUTE_MAP[routeKey] ?? routeKey;
    if (!screenName) return;
    navigation.navigate(screenName as never);
  };

  return (
    <View style={styles.bottomNavContainer}>
      {items.map((item, index) => {
        const screenName = (ROUTE_MAP[item.route] ?? item.route) || "";
        const isActive =
          screenName &&
          activeRouteName === screenName.toLowerCase();

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
}) => (
  <TouchableOpacity style={styles.singleBarContainer} onPress={onPress}>
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
);

const MainNavBar: React.FC<MainNavBarProps> = ({
  variant,
  bottomNavItems = [],
  text = "",
  iconPath,
  onPress = () => {},
  showSwitchIcon = false,
}) => {
  const effectiveOnPress = (variant === 1 && typeof (window as any).mainNavBarOnPress === "function")
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
        />
      );
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  bottomNavContainer: {
    width: "95%",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: "4%",
    borderRadius: 23,
    position: "absolute",
    bottom: 0,
  },
  navItem: {
    width: "25%",
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    fontSize: 10,
    fontFamily: "NunitoSans_600SemiBold",
    marginTop: 2,
    textAlign: "center",
  },
  singleBarContainer: {
    width: "95%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    alignItems: "center",
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: "4%",
    paddingHorizontal: "5%",
    borderRadius: 23,
    position: "absolute",
    bottom: 0,
  },
  singleBarContent: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    width: "100%",
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