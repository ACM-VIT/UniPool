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

const { width, height } = Dimensions.get("window");

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
}
interface MainNavBarProps {
  variant: 0 | 1 | 2;
  bottomNavItems?: NavItem[];
  text?: string;
  iconPath: ImageSourcePropType | any;
  onPress?: () => void;
  showSwitchIcon?: boolean;
}

type RouteMapValue = string | string[];

const ROUTE_MAP: Record<string, RouteMapValue> = {
  home: "HomeScreen",
  trips: "BookingScreen",
  chat: ["PassengerInfoScreen", "TripsListScreen"],
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
}) => {
  const insets = useSafeAreaInsets();
  
  return (
    <TouchableOpacity 
      style={[
        styles.singleBarContainer,
        Platform.OS === 'ios' && {
          paddingBottom: Math.max(insets.bottom, 20),
          marginBottom: 10,
        }
      ]} 
      onPress={onPress}
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
  );
};

const MainNavBar: React.FC<MainNavBarProps> = ({
  variant,
  bottomNavItems = [],
  text = "",
  iconPath,
  onPress = () => {},
  showSwitchIcon = false,
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
        />
      );
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  bottomNavContainer: {
    width: "95%",
    height: Platform.OS === 'ios' ? 80 : 70,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: Platform.OS === 'ios' ? "flex-start" : "center",
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: 0,
    paddingHorizontal: 0,
    paddingTop: Platform.OS === 'ios' ? 10 : 0,
    borderRadius: 23,
    position: "absolute",
    bottom: 15,
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
    height: Platform.OS === 'ios' ? 80 : 70,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    alignItems: Platform.OS === 'ios' ? "flex-start" : "center",
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: 0,
    paddingHorizontal: 0,
    paddingTop: Platform.OS === 'ios' ? 10 : 0,
    borderRadius: 23,
    position: "absolute",
    bottom: 15,
    alignSelf: "center",
  },
  singleBarContent: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    width: "100%",
    paddingTop: Platform.OS === 'ios' ? 5 : 0,
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
