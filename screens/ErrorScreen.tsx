import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import AppColors from "../design_systems/colors";
import { appHref } from "../navigation/routes";
import { useTabletContentStyle } from "../utils/responsive";

const win = Dimensions.get("window");

const ErrorScreen: React.FC = () => {
  const router = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(appHref("HomeScreen"));
  };

  return (
    <SafeAreaView style={[styles.container, tabletContentStyle]}>
      <View style={styles.heroPanel}>
        <Image
          style={styles.imageStyle}
          source={require("../assets/Traffic-Cone.png")}
        />
      </View>
      <View style={styles.body}>
        <Text style={styles.headerText}>Traffic's tangled.</Text>
        <Text style={styles.subText}>
          Something went sideways. Head back and give it another go.
        </Text>
        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.85}
          onPress={goBack}
        >
          <Text style={styles.ctaText}>Try again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    // Lime brand canvas at the top with the traffic cone; cream anchor
    // card at the bottom carries the message + CTA. Hero-on-brand /
    // anchor-on-cream layout — same system as AuthScreen.
    backgroundColor: AppColors.primaryLightGreen,
  },
  heroPanel: {
    flex: 1.1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 24,
  },
  body: {
    flex: 1,
    backgroundColor: AppColors.secondaryDarkGreen,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 32,
    alignItems: "center",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },
  imageStyle: {
    width: win.width * 0.55,
    height: win.width * 0.55,
    resizeMode: "contain",
  },
  headerText: {
    color: AppColors.basicWhite,
    textAlign: "center",
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 30,
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  subText: {
    color: AppColors.primaryLightGreen,
    opacity: 0.75,
    textAlign: "center",
    fontFamily: "NunitoSans_400Regular",
    fontSize: 16,
    lineHeight: 24,
    maxWidth: win.width * 0.78,
    marginBottom: 28,
  },
  cta: {
    // Lime CTA against the forest anchor card — inverse of the forest
    // CTAs that live on the lime canvas. One palette, two button
    // systems based on surface.
    backgroundColor: AppColors.primaryLightGreen,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 14,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 3,
  },
  ctaText: {
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 15,
    letterSpacing: 0.2,
  },
});

export default ErrorScreen;
