import React, { useState } from "react";
import { View, Image } from "react-native";
import { RideCreateScreenProps } from "./RideCreatedScreen.types";
import styles from "./RideCreatedScreen.styles";
import MainNavBar from "../../components/MainNavBar";
import bottomNavItems from "../../data/BottomNavigationItems";
const RideCreatedScreen: React.FC<RideCreateScreenProps> = () => {
  const [navBarVariant, setNavBarVariant] = useState<0 | 1 | 2>(0);
  return (
    <View style={styles.container}>
      <Image source={require("../../assets/create.png")} style={styles.create} />
      <View style={styles.navBarView}>
        <MainNavBar
          variant={navBarVariant}
          bottomNavItems={bottomNavItems}
          iconPath={require("../../assets/wallet.png")}
          text="View Details"
        />
      </View>
    </View>
  );
};

export default RideCreatedScreen;
