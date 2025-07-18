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
import { useNavigation } from "@react-navigation/native";
import AppColors from "../design_systems/colors";

const { width, height } = Dimensions.get("window");

// Types for the navigation items
interface NavItem {
  iconPath: ImageSourcePropType;
  route: string;
  isActive?: boolean;
}

// Props for the bottom navigation bar
interface BottomNavProps {
  items: NavItem[];
}

// Props for the search/details bar
interface SingleBarProps {
  text: string;
  iconPath: ImageSourcePropType;
  onPress: () => void;
  showSwitchIcon?: boolean;
}

// Main component props
interface MainNavBarProps {
  variant: 0 | 1 | 2;
  bottomNavItems?: NavItem[];
  text?: string;
  iconPath: ImageSourcePropType;
  onPress?: () => void;
  showSwitchIcon?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ items }) => {
  const navigation = useNavigation();

  const handleNavigation = (route: string) => {
    switch (route) {
      case "home":
        navigation.navigate("HomeScreen" as never);
        break;
      case "trips":
        navigation.navigate("BookingScreen" as never);
        break;
      case "chat":
        console.log("Chat feature coming soon");
        break;
      case "profile":
        navigation.navigate("ProfileScreen" as never);
        break;
      default:
        console.log(`Navigating to ${route}`);
    }
  };

  return (
    <View style={styles.bottomNavContainer}>
      {items.map((item, index) => (
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
              tintColor: item.isActive
                ? AppColors.basicWhite
                : AppColors.primaryLightGreen,
            },
          ]}
          resizeMode="contain"
        />
      </TouchableOpacity>
    ))}
  </View>
);
}

// Single Bar Component (Search/Details)
const SingleBar: React.FC<SingleBarProps> = ({ text, iconPath, onPress, showSwitchIcon = false }) => (
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

// Main NavBar Component
const MainNavBar: React.FC<MainNavBarProps> = ({
  variant,
  bottomNavItems = [],
  text = "",
  iconPath,
  onPress = () => {},
  showSwitchIcon = false,
}) => {
  switch (variant) {
    case 0:
      return <BottomNav items={bottomNavItems} />;
    case 1:
    case 2:
      return <SingleBar text={text} iconPath={iconPath} onPress={onPress} showSwitchIcon={showSwitchIcon} />;
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
    borderRadius: 15,
    position: "absolute",
    bottom: 0,
  },
  navItem: {
    width: "25%",
    alignItems: "center",
    justifyContent: "center",
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
    borderRadius: 15,
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
    width: width * 0.06,
    height: height * 0.05,
  },
  switchIcon: {
    width: width * 0.05,
    height: height * 0.04,
  },
});

export default MainNavBar;
