import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Platform,
  KeyboardAvoidingView,
  Image,
  Alert,
  ImageBackground,
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
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleProfileCompletion = async () => {
    if (hasSubmitted || loading) return;

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(contactNumber)) {
      Alert.alert("Invalid Phone Number", "Please enter a valid 10-digit phone number (numbers only, no spaces or symbols).");
      return;
    }

    try {
      setLoading(true);
      setHasSubmitted(true);
      const yobNum = parseInt(yob, 10);
      await apiUtil.post("/user", {
        contact_number: contactNumber,
        gender,
        yob: yobNum,
      });
      navigation.navigate("BookingScreen");
    } catch (error) {
      setHasSubmitted(false);
      const errorMessage =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message)
          : "An unknown error occurred";
      Alert.alert("Profile Completion Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contactNumber.trim() && yob.trim() && gender && !hasSubmitted && !loading) {
      const timer = setTimeout(() => {
        handleProfileCompletion();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [contactNumber, yob, gender, hasSubmitted, loading]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.contentContainer}>
          <HeaderText>Just finishing</HeaderText>
          <HeaderText>
            To make it easier for us to find you a ride please provide us with the
            following information as well:
          </HeaderText>
          <HeaderText>Contact Number</HeaderText>
          <CustomInput
            placeholder="Do not prefix with 0"
            value={contactNumber}
            onChangeText={setContactNumber}
            keyboardType="numeric"
          />
          <HeaderText>Year of Birth</HeaderText>
          <CustomInput
            placeholder="YYYY"
            value={yob}
            onChangeText={setYob}
            keyboardType="numeric"
          />
          <HeaderText>Gender</HeaderText>
          <View style={styles.genderContainer}>
            <GenderSelector value={gender} onChange={setGender} />
          </View>
          {loading && (
            <HeaderText>Completing your profile...</HeaderText>
          )}
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
