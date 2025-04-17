import React from "react";
import { View, Image, Text } from "react-native";
import { SignInScreenProps } from "./SignInScreen.types";
import styles from "./SignInScreen.styles";
import GoogleAuthButton from "../../components/GoogleAuthBox";

const SignInScreen: React.FC<SignInScreenProps> = ({ navigation }) => {
  const handleGoogleSignIn = () => {
    console.log("Sign In with Google pressed");
  };

  return (
    <View style={styles.container}>
      <Image source={require("../../assets/UFO.png")} style={styles.create} />

      <View style={styles.textContainer}>
        <Text style={styles.title}>Unipool</Text>
        <Text style={styles.subtitle}>Let's get started</Text>
      </View>

      <GoogleAuthButton
        label="Sign up with Google"
        onPress={handleGoogleSignIn}
      />
    </View>
  );
};

export default SignInScreen;
