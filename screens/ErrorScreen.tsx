import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from "react-native";
import AppColors from "../design_systems/colors";

const win = Dimensions.get("window");

const ErrorScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.imageContainer}>
        <Image
          style={styles.imageStyle}
          source={require("../assets/Traffic-Cone.png")}
        />
        <Text style={styles.headerText}>
          Yikes! Traffic's a bit tangled here.
        </Text>
        <Text style={styles.subText}>
          Redirect yourself to the main route and keep moving forward!
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    backgroundColor: AppColors.primaryLightGreen,
    color: AppColors.secondaryDarkGreen,
  },
  imageContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    paddingTop: 50, // Increased padding
    paddingBottom: 5, // Increased padding
  },
  imageStyle: {
    width: win.width * 0.70, // Slightly increased size
    height: win.width * 0.70, // Slightly increased size
    resizeMode: "contain",
  },
  headerText: {
    color: "#263B33",
    textAlign: "center",
    fontFamily: "Nunito Sans",
    fontSize: 27, // Updated font size
    fontWeight: "600",
    maxWidth: win.width * 0.9,
    marginTop: 50, // Increased gap
    marginBottom: 24,
  },
  subText: {
    color: "#263B33",
    textAlign: "center",
    fontFamily: "Nunito Sans",
    fontSize: 27, // Updated font size
    fontWeight: "600",
    maxWidth: win.width * 0.9,
    paddingHorizontal: 30,
  },
});

export default ErrorScreen;
