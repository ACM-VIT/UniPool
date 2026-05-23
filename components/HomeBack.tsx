import React from "react";
import { TouchableOpacity, Image, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { useRouter } from "expo-router";
import { appHref } from "../navigation/routes";

type Props = {
  /** Optional override. Defaults to router.replace("HomeScreen") so
   *  the stack-trip the user came from (RideCreated / RideRequested
   *  → RideDetails) doesn't linger behind the home screen. */
  onPress?: () => void;
  /** Mirrors ChevronBack's `style` prop so the call site can pass
   *  the same wrapper styles (e.g. styles.backButton's marginRight)
   *  the chevron uses, keeping the icon vertically + horizontally
   *  aligned in the header row regardless of which glyph is shown. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Header glyph used in place of ChevronBack when the previous screen
 * in the stack is a form the user already submitted (ride create,
 * ride request). Tapping "back" there would just dump them on the
 * form again, which reads as a navigation bug. Home glyph + replace
 * to HomeScreen instead.
 *
 * Same chrome dimensions / hitSlop / accessibility treatment as
 * ChevronBack so they're visually interchangeable in the
 * navigationRow.
 */
const HomeBack: React.FC<Props> = ({ onPress, style }) => {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    // Replace rather than navigate — the previous screen
    // (RideCreated / RideRequested interstitial) and the form
    // before it shouldn't linger in the back stack from Home.
    router.replace(appHref("HomeScreen"));
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel="Go home"
    >
      <Image
        source={require("../assets/home-icon.png")}
        style={styles.icon}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  icon: {
    // 22×22 instead of ChevronBack's 24×24 — the home glyph has a
    // chunkier filled-shape silhouette than the chevron's thin
    // arrow, so visually it reads as heavier at the same pixel
    // dimensions. Pulling it down 2pt brings the optical weight
    // back in line with the title typography.
    width: 22,
    height: 22,
    // home-icon.png is a black silhouette by default — tint to the
    // forest brand so it sits at the same visual weight as the
    // ChevronBack arrow it's replacing.
    tintColor: "#263B33",
  },
});

export default HomeBack;
