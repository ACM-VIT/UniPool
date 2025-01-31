import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import PreviousTripsCompressed from "./components/PreviousTripsCompressed";
import { rideData } from "./dummy-data/DummyTrips";
import bottomNavItems from "./design-system/BottomNavigationItems";
import RideDetailsSelector from "./components/RideDetailsSelector";
import MainNavBar from "./components/MainNavBar";
import HomeScreen from "./screens/HomeScreen";
import {
  useFonts,
  NunitoSans_200ExtraLight,
  NunitoSans_200ExtraLight_Italic,
  NunitoSans_300Light,
  NunitoSans_300Light_Italic,
  NunitoSans_400Regular,
  NunitoSans_400Regular_Italic,
  NunitoSans_600SemiBold,
  NunitoSans_600SemiBold_Italic,
  NunitoSans_700Bold,
  NunitoSans_700Bold_Italic,
  NunitoSans_800ExtraBold,
  NunitoSans_800ExtraBold_Italic,
  NunitoSans_900Black,
  NunitoSans_900Black_Italic,
} from "@expo-google-fonts/nunito-sans";

export default () => {
  let [fontsLoaded] = useFonts({
    NunitoSans_200ExtraLight,
    NunitoSans_200ExtraLight_Italic,
    NunitoSans_300Light,
    NunitoSans_300Light_Italic,
    NunitoSans_400Regular,
    NunitoSans_400Regular_Italic,
    NunitoSans_600SemiBold,
    NunitoSans_600SemiBold_Italic,
    NunitoSans_700Bold,
    NunitoSans_700Bold_Italic,
    NunitoSans_800ExtraBold,
    NunitoSans_800ExtraBold_Italic,
    NunitoSans_900Black,
    NunitoSans_900Black_Italic,
  });

  if (!fontsLoaded) {
    return <Text>Font loading error</Text>;
  } else {
    return (
      <View style={styles.container}>
        {/* <PreviousTripsCompressed trip={rideData[0]} />
                <MainNavBar
                    variant={0}
                    bottomNavItems={bottomNavItems}
                    iconPath={require("./assets/wallet.png")}
                />
                <MainNavBar
                    variant={1}
                    text="Search Rides"
                    iconPath={require("./assets/cool-emoji.png")}
                    onPress={() => console.log("Search pressed")}
                />
                <MainNavBar
                    variant={2}
                    text="View Details"
                    iconPath={require("./assets/smiling-emoji.png")}
                    onPress={() => console.log("Details pressed")}
                /> */}
        <HomeScreen />
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
