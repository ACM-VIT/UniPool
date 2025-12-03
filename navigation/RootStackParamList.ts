export type RootStackParamList = {
  AuthScreen: undefined;
  SignUpScreen: { newUser: any };
  SignInScreen: undefined;
  SplashScreen: undefined;
  ErrorScreen: undefined;
  RideCreatedScreen: undefined;
  RideRequestedScreen: undefined;
  BookingScreen: undefined;
  HomeScreen: undefined;
  ProfileScreen: undefined;
  BookingsScreen: undefined;
  PersonalInformationScreen: undefined;
  PassengersHistoryScreen: undefined;
  CreateRide: undefined;
  AvailableRidesScreen: { 
    fromLocation: string; 
    toLocation: string;
    fromCoordinates?: { latitude: number; longitude: number };
    toCoordinates?: { latitude: number; longitude: number };
  };
  AvailableRidesSelectedScreen: undefined;
  DefaultAddressScreen: undefined;
  NotificationsScreen: undefined;
  AccountSettingsScreen: undefined;
  PassengerInfoScreen: undefined;
  ChatMessages: {
    chatId: string;
    chatTitle: string;
    chatSubtitle: string;
    isGroupChat: boolean;
  };
  AvailableRidesListScreen: undefined;
  TripsListScreen: undefined;
  RideDetailsScreen: { ride: any };
  PrivacyPolicyScreen: undefined;
  TermsOfServiceScreen: undefined;
};
