import React from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    TextInput
} from "react-native";
import AppColors from "../design-system/colors";

const Additional: React.FC = () => {
    return (
     <SafeAreaView style={styles.container}>
         <View>
         <Text style={styles.header1}>Just Finishing</Text>
         <Text style={styles.header2}>To make it easier for us to find, you a ride please provide us with the following information as well:</Text>

         <Text style={styles.header3}>Contact Number</Text>
         <View>
            <TouchableOpacity></TouchableOpacity>
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
     paddingTop: '15%',
   },
   header1:{
     color:AppColors.secondaryDarkGreen,
     fontWeight: '500',
     fontSize: 20.31,
     padding: '6%'
   },
   header2:{
     color:AppColors.secondaryDarkGreen,
     fontWeight: '500',
     fontSize: 21.31,
     padding: '2%',
     paddingLeft:'6%'
   },
   header3:{
     color: AppColors.basicBlack,
     fontWeight:'600',
     fontSize:20.31,
     paddingTop: '15%',
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
 export default Additional;
