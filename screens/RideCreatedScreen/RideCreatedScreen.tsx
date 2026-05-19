import React, { useEffect } from "react";
import { View, Image } from "react-native";
import { useRouter } from "expo-router";
import styles from "./RideCreatedScreen.styles";
import { appHref } from "../../navigation/routes";

const RideCreatedScreen: React.FC<{ setNavBarVariant?: (v: 0 | 1 | 2) => void }> = (props) => {
  const router = useRouter();
  useEffect(() => {
    if (props.setNavBarVariant) {
      props.setNavBarVariant(0);
    }
    const timer = setTimeout(() => {
      router.navigate(appHref("BookingScreen"));
    }, 3000);
    return () => clearTimeout(timer);
  }, [props.setNavBarVariant, router]);
  return (
    <View style={styles.container}>
      <Image source={require("../../assets/create.png")} style={styles.create} resizeMode="contain" />
    </View>
  );
};

export default RideCreatedScreen;
