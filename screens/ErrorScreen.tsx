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
        <Text style={styles.textStyle}>
          Yikes! Traffic's a bit tangled here.{" "}
        </Text>
        <Text style={styles.textStyle}>
          Redirect yourself to the{"\n"}main route and keep moving forward!
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
  },
  imageStyle: {
    width: win.width * 0.6,
    height: win.width * 0.6,
    resizeMode: "contain",
  },
  textStyle: {
    paddingTop: "4%",
    paddingLeft: "15%",
    paddingRight: "15%",
    lineHeight: 31,
    fontSize: 22,
    textAlign: "center",
  },
});

export default ErrorScreen;
