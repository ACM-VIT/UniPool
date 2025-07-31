import React, { useState } from "react";
import { View, Image } from "react-native";
import { RideCreateScreenProps } from "./RideRequestedScreen.types";
import styles from "./RideRequestedScreen.styles";

const RideRequestedScreen: React.FC<RideCreateScreenProps> = () => {
  const [navBarVariant, setNavBarVariant] = useState<0 | 1 | 2>(0);
  return (
    <View style={styles.container}>
      <Image source={require("../../assets/request.png")} style={styles.create} />
    </View>
  );
};

export default RideRequestedScreen;
