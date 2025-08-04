import React, { useEffect, useState } from "react";
import { View, Text, Image, Alert, TouchableOpacity, ActivityIndicator } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from "@react-native-firebase/auth";
import LottieView from 'lottie-react-native';
import { AuthScreenProps } from "./AuthScreen.types";
import styles from "./AuthScreen.styles";
import { useApi } from "../../utils/ApiUtil";

const AuthScreen: React.FC<AuthScreenProps> = ({ navigation }) => {
  const { apiUtil } = useApi();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const checkExistingAuth = async () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        console.log("AuthScreen: User already authenticated, checking backend");
        try {
          await currentUser.getIdToken(true);
          await apiUtil.get("/user/details");
          navigation.replace("HomeScreen");
        } catch (err: any) {
          if (err.response?.status === 404) {
            console.log("AuthScreen: User not found in backend, signing out");
            await auth.signOut();
            await GoogleSignin.signOut();
          } else {
            console.log("AuthScreen: Backend check failed, but keeping auth:", err.response?.status);
          }
        }
      }
    };
    checkExistingAuth();
  }, [navigation, apiUtil]);

  const handleGoogleSignIn = async () => {
    if (isSigningIn) {
      return;
    }

    setIsSigningIn(true);
    
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      
      if (!idToken) {
        Alert.alert("Sign-In Failed", "Unable to complete sign-in. Please try again.");
        return;
      }
      
      const googleCredential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(getAuth(), googleCredential);
      
      try {
        await apiUtil.get("/user/details");
        navigation.navigate("HomeScreen");
      } catch (err: any) {
        if (err.response?.status === 404 && err.response?.data?.newUser) {
          navigation.navigate("SignUpScreen", {
            newUser: err.response.data.newUser,
          });
        } else if (err.response?.status === 400) {
          Alert.alert("Error", err.response?.data?.message || "Unknown error");
        } else if (err.response?.status === 404) {
          Alert.alert("Sign-Up Required", "User not found. Please sign up.");
        } else {
          Alert.alert("Sign-In Failed", err.message || "An unknown error occurred");
        }
      }
    } catch (error: any) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      Alert.alert("Sign-In Failed", message);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hello!</Text>
      <Text style={styles.subtext}>Let's get you started with:</Text>
      <LottieView
        source={require("../../assets/artboard.json")}
        autoPlay
        loop
        style={{ width: 200, height: 200, alignSelf: 'center', marginTop: -50 }}
      />
      <View>
        <Text style={styles.label}>Authentication</Text>
        <TouchableOpacity 
          style={[styles.button, isSigningIn && styles.buttonDisabled]} 
          onPress={handleGoogleSignIn}
          disabled={isSigningIn}
          activeOpacity={isSigningIn ? 1 : 0.7}
        >
          <View style={styles.googleIcon}>
            {isSigningIn ? (
              <ActivityIndicator size="small" color="#4285F4" />
            ) : (
              <Image
                source={require("../../assets/google.png")}
                style={{ width: 20, height: 20, resizeMode: "contain" }}
              />
            )}
          </View>
          <Text style={[styles.text, isSigningIn && styles.textDisabled]}>
            {isSigningIn ? "Signing In..." : "Sign In with Google"}
          </Text>
        </TouchableOpacity>
      </View>
      <Image source={require("../../assets/ramp.png")} style={styles.image} />
    </View>
  );
};

export default AuthScreen;
