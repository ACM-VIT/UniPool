import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import PreviousTripsCompressed from "./components/PreviousTripsCompressed";
import { rideData } from "./dummy-data/DummyTrips";
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

    let fontSize = 24;
    let paddingVertical = 6;

    if (!fontsLoaded) {
        return <Text>Font loading error</Text>;
    } else {
        return (
            <View style={styles.container}>
                <PreviousTripsCompressed trip={rideData[0]} />
                <StatusBar style="auto" />
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
