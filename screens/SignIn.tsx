import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from "react-native";
import AppColors from "../design-system/colors";

const SignIn: React.FC = () => {
   return (
    <SafeAreaView style={styles.container}>
        <View>
        <Text style={styles.header1}>Hello, There!</Text>
        <Text style={styles.header2}>Let's get you started with</Text>
        <Text style={styles.header3}>Already been here?</Text>
        <View style={styles.buttonView}>
        <TouchableOpacity activeOpacity={0.95} style={styles.button}>
            <Image source={require('.././assets/Google-Logo--Streamline-Ultimate.svg.png')} style={{width: 20, height: 20, margin:'2.5%'}} />
            <Text style={styles.textButton}>Sign-in with Google</Text>
        </TouchableOpacity>
        </View>
        <Text style={styles.header4}>New Around Here?</Text>
        <View style={styles.buttonView}>
        <TouchableOpacity activeOpacity={0.95} style={styles.button}>
        <Image source={require('.././assets/Google-Logo--Streamline-Ultimate.svg.png')} style={{width: 20, height: 20, margin:'2.5%'}} />
            <Text style={styles.textButton}>Sign-up with Google</Text>
        </TouchableOpacity>
        </View>
        <View style={styles.beepImage}>
        <Image source={require('.././assets/beep-beep-ramp.png')} style={{height:200, width:200}}/>

        </View>


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
    paddingTop: '33%',
  },
  header1:{
    color:AppColors.secondaryDarkGreen,
    fontWeight: '600',
    fontSize: 25.31,
    paddingBottom: '4%',
    paddingLeft: '6%'
  },
  header2:{
    color:AppColors.basicBlack,
    fontWeight: '600',
    fontSize: 20.31,
    paddingLeft: '6%'
  },
  header3:{
    color: AppColors.basicBlack,
    fontWeight:'600',
    fontSize:20.31,
    paddingTop: '30%',
    paddingLeft: '6%'
  },
  header4:{
    color: AppColors.basicBlack,
    fontWeight:'600',
    fontSize:20.31,
    paddingTop: '10%',
    paddingLeft: '6%'
  },
  button: {
    flexDirection: 'row', 
    height: 45, 
    backgroundColor: AppColors.secondaryDarkGreen,
    alignItems: 'center',
    justifyContent: 'center',
    elevation:3,
    borderRadius: 8,
},
textButton:{
    color:AppColors.primaryLightGreen,
    fontSize:20
},
buttonView:{
    padding:'7%'
},
beepImage:{
    flexDirection:'row',
    justifyContent:'center',
}
});

// Custom Map Style
// const customMapStyle = [
// ];

export default SignIn;
