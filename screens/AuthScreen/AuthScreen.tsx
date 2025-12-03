import React, { useEffect, useState } from "react";
import { View, Text, Image, Alert, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { getAuth, GoogleAuthProvider, AppleAuthProvider, signInWithCredential } from "@react-native-firebase/auth";
let appleAuth: any = null;
if (Platform.OS === 'ios') {
  appleAuth = require("@invertase/react-native-apple-authentication").appleAuth;
}
import LottieView from 'lottie-react-native';
import Svg, { Path } from 'react-native-svg';
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

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios' || !appleAuth) {
      Alert.alert("Error", "Apple Sign In is only available on iOS");
      return;
    }
    
    try {
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
      });
  
      if (!appleAuthRequestResponse.identityToken) {
        throw new Error('Apple Sign-In failed - no identify token returned');
      }
  
      const { identityToken, nonce } = appleAuthRequestResponse;
      const appleCredential = AppleAuthProvider.credential(identityToken, nonce);
  
      await signInWithCredential(getAuth(), appleCredential);
      
      try {
        await apiUtil.get("/user/details");
        navigation.navigate("HomeScreen");
      } catch (err: any) {
        if (err.response?.status === 404 && err.response?.data?.newUser) {
          navigation.navigate("SignUpScreen", { newUser: err.response.data.newUser });
        } else if (err.response?.status === 400) {
          Alert.alert("Error", err.response?.data?.message || "Unknown error");
        } else if (err.response?.status === 404) {
          Alert.alert("Sign-Up Required", "User not found. Please sign up.");
        } else {
          Alert.alert("Sign-In Failed", err.message || "An unknown error occurred");
        }
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      Alert.alert("Apple Sign-In Failed", message);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hello!</Text>
      <Text style={styles.subtext}>Welcome to UniPool</Text>
      
      <View style={styles.lottieContainer}>
        <LottieView
          source={require("../../assets/artboard.json")}
          autoPlay
          loop
          style={styles.lottieAnimation}
        />
        <View style={styles.watermarkHide} />
      </View>
      
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
        
        {Platform.OS === 'ios' && (
          <TouchableOpacity 
            style={[styles.button, isSigningIn && styles.buttonDisabled, { marginTop: 10 }]} 
            onPress={handleAppleSignIn} 
            disabled={isSigningIn}>
              <View style={styles.googleIcon}>
                <Svg width={20} height={20} viewBox="0 0 384 512" fill="#FFFFFF">
                  <Path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                </Svg>
              </View>
              <Text style={styles.text}>Sign In with Apple</Text>
          </TouchableOpacity>
        )}
      </View>
      <Image source={require("../../assets/ramp.png")} style={styles.image} />
    </View>
  );
};

export default AuthScreen;