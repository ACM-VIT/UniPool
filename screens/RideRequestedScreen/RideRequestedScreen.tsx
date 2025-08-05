import React, { useState, useEffect } from "react";
import { View, Image } from "react-native";
import { RideCreateScreenProps } from "./RideRequestedScreen.types";
import styles from "./RideRequestedScreen.styles";

const RideRequestedScreen: React.FC<RideCreateScreenProps> = (props) => {
  const [navBarVariant, setNavBarVariant] = useState<0 | 1 | 2>(0);
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
      <Image 
        source={require("../../assets/request.png")} 
        style={styles.create}
        resizeMode="contain"
      />
    </View>
  );
};

export default RideRequestedScreen;
