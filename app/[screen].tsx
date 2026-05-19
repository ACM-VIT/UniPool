import React from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import AccountSettingsScreen from "../screens/AccountSettingsScreen";
import AuthScreen from "../screens/AuthScreen";
import { AvailableRideScreen, AvailableRideScreenSelected } from "../screens/AvailableRideScreens";
import BookingScreen from "../screens/BookingScreen";
import BookingsScreen from "../screens/BookingsScreen";
import { ChatConversationScreen, PassengerInfoScreen, TripsListScreen } from "../screens/ChatScreens";
import CreateRide from "../screens/CreateRide";
import DefaultAddressScreen from "../screens/DefaultAddressScreen";
import ErrorScreen from "../screens/ErrorScreen";
import HomeScreen from "../screens/HomeScreen";
import LocationPermissionScreen from "../screens/LocationPermissionScreen";
import NearbyRidesScreen from "../screens/NearbyRidesScreen/NearbyRidesScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import PassengersHistoryScreen from "../screens/PassengersHistoryScreen";
import PersonalInformationScreen from "../screens/PersonalInformationScreen";
import PrivacyPolicyScreen from "../screens/PrivacyPolicyScreen";
import ProfileScreen from "../screens/ProfileScreen";
import RideCreatedScreen from "../screens/RideCreatedScreen";
import RideDetailsScreen from "../screens/RideDetailsScreen";
import RideRequestedScreen from "../screens/RideRequestedScreen";
import SignInScreen from "../screens/SignInScreen";
import SignUpScreen from "../screens/SignUpScreen";
import SplashScreenComponent from "../screens/SplashScreen";
import TermsOfServiceScreen from "../screens/TermsOfServiceScreen";
import { useNavBarControls } from "../contexts/NavBarContext";
import { decodeRouteParams, useNavigation } from "../navigation/router-compat";

const NO_ANIMATION_ROUTES = new Set([
  "AvailableRidesSelectedScreen",
  "ChatMessages",
  "PassengerInfoScreen",
  "RideRequestedScreen",
  "TripsListScreen",
]);

export default function ScreenRoute() {
  const rawParams = useLocalSearchParams();
  const screen = Array.isArray(rawParams.screen)
    ? rawParams.screen[0]
    : rawParams.screen;
  const screenName = screen ?? "HomeScreen";
  const params = decodeRouteParams(rawParams);
  const navigation = useNavigation();
  const navBarControls = useNavBarControls();
  const route = {
    key: String(screenName),
    name: screenName,
    params,
  };
  const screenProps = { navigation, route };
  const navBarProps = { ...screenProps, ...navBarControls };
  const chatNavBarProps = {
    ...screenProps,
    setNavBarVariant: navBarControls.setNavBarVariant,
  };

  const renderScreen = () => {
    switch (screenName) {
      case "AccountSettingsScreen":
        return <AccountSettingsScreen />;
      case "AuthScreen":
        return <AuthScreen {...(screenProps as any)} />;
      case "AvailableRidesScreen":
        return <AvailableRideScreen {...(navBarProps as any)} />;
      case "AvailableRidesSelectedScreen":
        return <AvailableRideScreenSelected {...(screenProps as any)} />;
      case "BookingScreen":
        return <BookingScreen />;
      case "BookingsScreen":
        return <BookingsScreen />;
      case "ChatMessages":
        return <ChatConversationScreen {...(chatNavBarProps as any)} />;
      case "CreateRide":
        return <CreateRide />;
      case "DefaultAddressScreen":
        return <DefaultAddressScreen />;
      case "ErrorScreen":
        return <ErrorScreen />;
      case "HomeScreen":
        return <HomeScreen {...(navBarProps as any)} />;
      case "LocationPermissionScreen":
        return <LocationPermissionScreen {...(screenProps as any)} />;
      case "NearbyRidesScreen":
        return <NearbyRidesScreen />;
      case "NotificationsScreen":
        return <NotificationsScreen />;
      case "OnboardingScreen":
        return <OnboardingScreen {...(screenProps as any)} />;
      case "PassengerInfoScreen":
        return <PassengerInfoScreen {...(chatNavBarProps as any)} />;
      case "PassengersHistoryScreen":
        return <PassengersHistoryScreen />;
      case "PersonalInformationScreen":
        return <PersonalInformationScreen />;
      case "PrivacyPolicyScreen":
        return <PrivacyPolicyScreen />;
      case "ProfileScreen":
        return <ProfileScreen {...(screenProps as any)} />;
      case "RideCreatedScreen":
        return <RideCreatedScreen {...(chatNavBarProps as any)} />;
      case "RideDetailsScreen":
        return <RideDetailsScreen {...(screenProps as any)} />;
      case "RideRequestedScreen":
        return <RideRequestedScreen {...(chatNavBarProps as any)} />;
      case "SignInScreen":
        return <SignInScreen {...(screenProps as any)} />;
      case "SignUpScreen":
        return <SignUpScreen {...(screenProps as any)} />;
      case "SplashScreen":
        return <SplashScreenComponent />;
      case "TermsOfServiceScreen":
        return <TermsOfServiceScreen />;
      case "TripsListScreen":
        return <TripsListScreen {...(chatNavBarProps as any)} />;
      default:
        return <ErrorScreen />;
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: NO_ANIMATION_ROUTES.has(screenName) ? "none" : "default",
          presentation: screenName === "AuthScreen" ? "modal" : "card",
        }}
      />
      {renderScreen()}
    </>
  );
}
