import React from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    SafeAreaView,
    Dimensions
} from "react-native";
import AppColors from "../design-system/colors";


const win = Dimensions.get('window');

const ErrorScreen: React.FC = () => {
    return(
        <SafeAreaView style={styles.container}>
           <View style={styles.imageContainer}>
        <Image style={styles.imageStyle} source={require('../assets/Traffic-Cone.png')} />
        <Text style={styles.textStyle}>Yikes! Traffic's a bit tangled here. </Text>
        <Text style={styles.textStyle}>Redirect yourself to the{'\n'}main route and keep moving forward!</Text>

    </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        height: "100%",
        backgroundColor: AppColors.primaryLightGreen,
        color: AppColors.secondaryDarkGreen,
      },
    imageContainer: {
        justifyContent:'center',
        //paddingTop:'80%',
        alignItems: 'center',
        flex: 1,
    },
    imageStyle: {
        width: win.width * 0.6,
        height: win.width * 0.6, 
        resizeMode: 'contain', 
    },
    textStyle:{
        paddingTop:'4%',
        paddingLeft:'15%',
        paddingRight:'15%',
        lineHeight:31,
        fontSize:22,
        textAlign:'center'
    }
});


export default ErrorScreen;
=======
import React from "react";
import { View, Text, StyleSheet, Image, Dimensions } from "react-native";
import AppColors from "../design-system/colors";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const ErrorScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Image source={require("../assets/cone.png")} style={styles.cone} />
      <Text style={styles.message}>Yikes! Traffic's a bit tangled here.</Text>
      <Text style={styles.subtext}>
        Redirect yourself to the main route and keep moving forward!
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  cone: {
    width: screenWidth * 0.75,
    height: screenHeight * 0.35,
    position: "absolute",
    top: screenHeight * 0.2,
    left: screenWidth * 0.14,
  },
  message: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: "50%",
    textAlign: "center",
  },
  subtext: {
    textAlign: "center",
    fontSize: 22,
    paddingTop: "5%",
  },
});

export default ErrorScreen;
