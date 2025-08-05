import React, { useEffect } from "react";
import { View, Image } from "react-native";
import { RideCreateScreenProps } from "./RideCreatedScreen.types";
import styles from "./RideCreatedScreen.styles";

const RideCreatedScreen: React.FC<RideCreateScreenProps & { setNavBarVariant?: (v: 0 | 1 | 2) => void }> = (props) => {
  const navigation = props.navigation;
  useEffect(() => {
    if (props.setNavBarVariant) {
      props.setNavBarVariant(0);
    }
    const timer = setTimeout(() => {
      if (navigation && typeof navigation.navigate === "function") {
        navigation.navigate("BookingScreen");
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [props.setNavBarVariant, navigation]);
  return (
    <View style={styles.container}>
      <Image source={require("../../assets/create.png")} style={styles.create} resizeMode="contain" />
    </View>
  );
};

export default RideCreatedScreen;
