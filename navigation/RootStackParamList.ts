export type RootStackParamList = {
  OnboardingScreen: undefined;
  LocationPermissionScreen: { returnTo?: { screen: keyof RootStackParamList; params?: any } } | undefined;
  AuthScreen: { returnTo?: { screen: keyof RootStackParamList; params?: any } } | undefined;
  SignUpScreen: { newUser?: any; returnTo?: { screen: keyof RootStackParamList; params?: any } } | undefined;
  SignInScreen: undefined;
  SplashScreen: undefined;
  ErrorScreen: undefined;
  RideCreatedScreen: undefined;
  RideRequestedScreen:
    | {
        rideId?: string;
        bookingId?: string;
        rideDetails?: any;
        hostUserId?: string;
        hostUserName?: string;
      }
    | undefined;
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
  AvailableRidesSelectedScreen: { ride?: any } | undefined;
  DefaultAddressScreen: undefined;
  NotificationsScreen: undefined;
  AccountSettingsScreen: undefined;
  PassengerInfoScreen: undefined;
  ChatMessages: {
    chatId?: string;
    chatRoom?: { id: string; title?: string; subtitle?: string };
    chatTitle?: string;
    chatSubtitle?: string;
    isGroupChat?: boolean;
    otherUserId?: string;
    hostUserId?: string;
    viewerRole?: string;
    pendingHostInquiry?: boolean;
    pendingRideId?: string;
    pendingHostName?: string;
  };
  TripsListScreen: undefined;
  RideDetailsScreen: { ride?: any; rideId?: string };
  NearbyRidesScreen: undefined;
  PrivacyPolicyScreen: undefined;
  TermsOfServiceScreen: undefined;
};
