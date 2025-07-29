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
  AvailableRidesScreen: { fromLocation: string; toLocation: string };
  AvailableRidesSelectedScreen: undefined;
  DefaultAddressScreen: undefined;
  AccountSettingsScreen: undefined;
  // Chat Screens
  PassengerInfoScreen: undefined;
  ChatConversationScreen: {
    chatId: string;
    chatTitle: string;
    chatSubtitle: string;
    messages: Array<{
      id: string;
      text: string;
      sender: 'me' | 'other';
    }>;
  };
  TripsListScreen: undefined;
};
