import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import GoogleAuthButton from "../components/GoogleAuthBox";

const AuthScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hello, There!</Text>
      <Text style={styles.subtext}>Let’s get you started with</Text>

      <Text style={styles.label}>Already been here?</Text>
      <GoogleAuthButton label="Sign-in with Google" onPress={() => {}} />

      <Text style={styles.label}>New around here?</Text>
      <GoogleAuthButton label="Sign-up with Google" onPress={() => {}} />

      <Image source={require("../assets/barrier.png")} style={styles.image} />
    </View>
  );
};

export default AuthScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#c3e841",
    padding: 20,
    justifyContent: "center",
  },
  greeting: {
    fontSize: 18,
    fontWeight: "bold",
    color: "green",
    marginBottom: 5,
  },
  subtext: {
    marginBottom: 20,
  },
  label: {
    marginTop: 10,
    marginBottom: 5,
  },
  image: {
    width: 80,
    height: 80,
    alignSelf: "center",
    marginTop: 30,
  },
});
