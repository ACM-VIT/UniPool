import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { AuthScreenProps } from "./AuthScreen.types";
import styles from "./AuthScreen.styles";

const AuthScreen: React.FC<AuthScreenProps> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hello!</Text>
      <Text style={styles.subtext}>Let's get you started with.</Text>

      <Text style={styles.label}>Already been here?</Text>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.text}>Login and Pick Up the Pace!</Text>
      </TouchableOpacity>

      <Text style={styles.label}>New around here?</Text>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.text}>Sign Up to Start Your Journey!</Text>
      </TouchableOpacity>

      <Image source={require("../../assets/ramp.png")} style={styles.image} />
    </View>
  );
};

export default AuthScreen;
