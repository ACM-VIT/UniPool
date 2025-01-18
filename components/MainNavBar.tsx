import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    ImageSourcePropType,
    Dimensions
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AppColors from "../design-system/colors";

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
}

// Main component props
interface MainNavBarProps {
    variant: 0 | 1 | 2;
    bottomNavItems?: NavItem[];
    text?: string;
    iconPath: ImageSourcePropType;
    onPress?: () => void;
}

// Bottom Navigation Bar Component
const BottomNav: React.FC<BottomNavProps> = ({ items }) => (
    <View style={styles.bottomNavContainer}>
        {items.map((item, index) => (
            <TouchableOpacity
                key={index}
                style={styles.navItem}
                onPress={() => {
                    console.log(`Navigating to ${item.route}`);
                }}
            >
                <Image
                    source={item.iconPath}
                    style={[
                        styles.icon,
                        { tintColor: item.isActive ? AppColors.basicWhite : AppColors.primaryLightGreen },
                    ]}
                    resizeMode="contain"
                />
            </TouchableOpacity>
        ))}
    </View>
);

// Single Bar Component (Search/Details)
const SingleBar: React.FC<SingleBarProps> = ({ text, iconPath, onPress }) => (
    <TouchableOpacity style={styles.singleBarContainer} onPress={onPress}>
        <Text style={styles.singleBarText}>{text}</Text>
        <Image
            source={iconPath}
            style={[styles.icon, { tintColor: AppColors.primaryLightGreen }]}
            resizeMode="contain"
        />
    </TouchableOpacity>
);

// Main NavBar Component
const MainNavBar: React.FC<MainNavBarProps> = ({
    variant,
    bottomNavItems = [],
    text = "",
    iconPath,
    onPress = () => {},
}) => {
    switch (variant) {
        case 0:
            return <BottomNav items={bottomNavItems} />;
        case 1:
        case 2:
            return (
                <SingleBar text={text} iconPath={iconPath} onPress={onPress} />
            );
        default:
            return null;
    }
};

const styles = StyleSheet.create({
    bottomNavContainer: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        backgroundColor: AppColors.secondaryDarkGreen,
        paddingVertical: "4%",
        borderRadius: 15,
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
        borderRadius: 15
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
});

export default MainNavBar;
