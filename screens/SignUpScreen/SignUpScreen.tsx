import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Platform,
  KeyboardAvoidingView,
  Image,
  Alert,
  TouchableOpacity,
  Text,
} from "react-native";
import { SignUpScreenProps } from "./SignUpScreen.types";
import HeaderText from "../../components/HeaderText";
import CustomInput from "../../components/CustomInput";
import GenderSelector from "../../components/GenderSelector";
import { useApi } from "../../utils/ApiUtil";
import styles from "./SignUpScreen.styles";

const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation, route }) => {
  const { apiUtil } = useApi();
  const newUser = route?.params?.newUser;

  const [contactNumber, setContactNumber] = useState("");
  const [yob, setYob] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!contactNumber.trim()) {
      Alert.alert("Missing Information", "Please enter your contact number.");
      return false;
    }
    
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(contactNumber)) {
      Alert.alert("Invalid Phone Number", "Please enter a valid 10-digit phone number (numbers only, no spaces or symbols).");
      return false;
    }

    if (!yob.trim()) {
      Alert.alert("Missing Information", "Please enter your year of birth.");
      return false;
    }

    const yobNum = parseInt(yob, 10);
    const currentYear = new Date().getFullYear();
    if (yobNum < 1900 || yobNum > currentYear || isNaN(yobNum)) {
      Alert.alert("Invalid Year of Birth", "Please enter a valid year of birth.");
      return false;
    }

    if (!gender) {
      Alert.alert("Missing Information", "Please select your gender.");
      return false;
    }

    return true;
  };

  const handleProfileCompletion = async () => {
    if (!validateForm() || loading) return;

    try {
      setLoading(true);
      console.log("Completing profile with data:", { contactNumber, yob, gender });
      
      const yobNum = parseInt(yob, 10);
      
      // Complete the user profile
      const response = await apiUtil.post("/user", {
        contact_number: contactNumber,
        gender,
        yob: yobNum,
      });
      
      console.log("Profile completion successful:", response);
      console.log("Navigating to HomeScreen");
      
      // Navigate to HomeScreen after successful profile completion
      navigation.reset({
        index: 0,
        routes: [{ name: 'HomeScreen' }],
      });
      
    } catch (error: any) {
      console.error("Profile completion error:", error);
      setLoading(false);
      
      // Handle specific error cases
      if (error?.message === "AUTHENTICATION_REDIRECT") {
        console.log("Authentication redirect during signup - user may need to sign in again");
        Alert.alert(
          "Authentication Issue", 
          "Please try signing in again.", 
          [
            {
              text: "OK",
              onPress: () => navigation.reset({
                index: 0,
                routes: [{ name: 'AuthScreen' }],
              })
            }
          ]
        );
        return;
      }
      
      // Handle user already exists error
      if (error?.response?.status === 409 || 
          (error?.response?.data?.message && error.response.data.message.includes("already exists"))) {
        console.log("User already exists, navigating to HomeScreen");
        navigation.reset({
          index: 0,
          routes: [{ name: 'HomeScreen' }],
        });
        return;
      }
      
      // Handle other errors
      const errorMessage = error?.response?.data?.message || 
        error?.message || 
        "An unknown error occurred while completing your profile";
      
      Alert.alert("Profile Completion Failed", errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.contentContainer}>
          <HeaderText>Complete Your Profile</HeaderText>
          <HeaderText>
            To make it easier for us to find you a ride, please provide us with the
            following information:
          </HeaderText>
          <HeaderText>Contact Number</HeaderText>
          <CustomInput
            placeholder="Do not prefix with 0"
            value={contactNumber}
            onChangeText={setContactNumber}
            keyboardType="numeric"
            maxLength={10}
          />
          <HeaderText>Year of Birth</HeaderText>
          <CustomInput
            placeholder="YYYY"
            value={yob}
            onChangeText={setYob}
            keyboardType="numeric"
            maxLength={4}
          />
          <HeaderText>Gender</HeaderText>
          <View style={styles.genderContainer}>
            <GenderSelector value={gender} onChange={setGender} />
          </View>

          <TouchableOpacity
            style={[
              styles.completeButton,
              (!contactNumber.trim() || !yob.trim() || !gender || loading) && styles.completeButtonDisabled
            ]}
            onPress={handleProfileCompletion}
            disabled={!contactNumber.trim() || !yob.trim() || !gender || loading}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.completeButtonText,
              (!contactNumber.trim() || !yob.trim() || !gender || loading) && styles.completeButtonTextDisabled
            ]}>
              {loading ? "Completing Profile..." : "Complete Profile"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <Image
        source={require("../../assets/Warning2.png")}
        style={styles.bottomIcon}
        resizeMode="contain"
      />
    </SafeAreaView>
  );
};

export default SignUpScreen;
