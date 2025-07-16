import React from "react";
import { View, Text, Image, Alert, TouchableOpacity } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import auth from "@react-native-firebase/auth";
import { AuthScreenProps } from "./AuthScreen.types";
import styles from "./AuthScreen.styles";
import { useApi } from "../../utils/ApiUtil";


const AuthScreen: React.FC<AuthScreenProps> = ({ navigation }) => {
  const { apiUtil } = useApi();
  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error("No ID token from Google");

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(googleCredential);

      try {
        await apiUtil.get("/user/details");
        navigation.navigate("BookingScreen");
      } catch (err: any) {
        if (typeof err.message === "string" && err.message.includes("400")) {
          navigation.navigate("SignUpScreen");
        } else {
          throw err;
        }
      }
    } catch (error) {
      const errorMessage =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message)
          : "An unknown error occurred";
      Alert.alert("Sign-In Failed", errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hello!</Text>
      <Text style={styles.subtext}>Let's get you started with.</Text>


      <View>
        <Text style={styles.label}>Authentication</Text>
        <TouchableOpacity style={styles.button} onPress={handleGoogleSignIn}>
          <View style={styles.googleIcon}>
            <Image source={require("../../assets/google.png")} style={{ width: 20, height: 20, resizeMode: 'contain' }} />
          </View>
          <Text style={styles.text}>Sign In with Google</Text>
        </TouchableOpacity>
      </View>

      <Image source={require("../../assets/ramp.png")} style={styles.image} />
    </View>
  );
};

export default AuthScreen;
