import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { SignUpScreenProps } from "./SignUpScreen.types";

import HeaderText from "../../components/HeaderText";
import CustomInput from "../../components/CustomInput";
import GenderSelector from "../../components/GenderSelector";
import { useApi } from "../../utils/ApiUtil";
import GoogleAuthButton from "../../components/GoogleAuthBox";
import styles, { spacing } from "./SignUpScreen.styles";


const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const { apiUtil } = useApi();
  const [contactNumber, setContactNumber] = useState("");
  const [yob, setYob] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);
      const yobNum = parseInt(yob, 10);
      await apiUtil.post("/user", {
        contact_number: contactNumber,
        gender,
        yob: yobNum,
      });
      navigation.navigate("BookingScreen");
    } catch (error) {
      const errorMessage =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message)
          : "An unknown error occurred";
      Alert.alert("Sign-Up Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <HeaderText size={18}>Just finishing</HeaderText>

        <HeaderText size={18} paddingTop={spacing.medium}>
          To make it easier for us to find you a ride please provide us with the
          following information as well:
        </HeaderText>

        <HeaderText paddingTop={spacing.medium}>Contact Number</HeaderText>
        <CustomInput
          placeholder="Do not prefix with 0"
          value={contactNumber}
          onChangeText={setContactNumber}
          keyboardType="numeric"
        />

        <HeaderText paddingTop={spacing.medium}>Year of Birth</HeaderText>
        <CustomInput
          placeholder="YYYY"
          value={yob}
          onChangeText={setYob}
          keyboardType="numeric"
        />

        <HeaderText paddingTop={spacing.medium}>Gender</HeaderText>
        <View style={styles.genderContainer}>
          <GenderSelector value={gender} onChange={setGender} />
        </View>

        <GoogleAuthButton
          label={loading ? "Signing up..." : "Sign up with Google"}
          onPress={handleGoogleSignUp}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignUpScreen;
