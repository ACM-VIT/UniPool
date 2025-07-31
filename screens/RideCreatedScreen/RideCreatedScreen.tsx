import React, { useEffect } from "react";
import { View, Image } from "react-native";
import { RideCreateScreenProps } from "./RideCreatedScreen.types";
import styles from "./RideCreatedScreen.styles";


const RideCreatedScreen: React.FC<RideCreateScreenProps & { setNavBarVariant?: (v: 0 | 1 | 2) => void }> = (props) => {
  useEffect(() => {
    if (props.setNavBarVariant) {
      props.setNavBarVariant(0);
    }
  }, [props.setNavBarVariant]);
  return (
    <View style={styles.container}>
      <Image source={require("../../assets/create.png")} style={styles.create} />
    </View>
  );
};

export default RideCreatedScreen;
