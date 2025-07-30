import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get("window");

import { useNavigation } from '@react-navigation/native';
import ChevronBack from '../../components/ChevronBack/ChevronBack';
import SlideToCreate from '../../components/SlideToCreate/SlideToCreate';
import BrandInfo from '../../components/BrandInfo/BrandInfo';
import AppColors from '../../design_systems/colors';

type RootStackParamList = {
  AvailableRideScreen: undefined;
  AvailableRidesSelectedScreen: {
    ride?: {
      id: string;
      from: string;
      to: string;
      time: string;
      date: string;
      price: string;
      seats: number;
      driver: {
        name: string;
        rating: number;
        phone: string;
      };
      vehicle: {
        make: string;
        model: string;
        color: string;
        plate: string;
      };
    };
  };
};

type AvailableRideScreenSelectedProps = {
  navigation?: any;
  route?: any;
};

const AvailableRideScreenSelected: React.FC<AvailableRideScreenSelectedProps> = ({ navigation, route }) => {
  const [location, setLocation] = useState<any>(null);
  const [initialRegion, setInitialRegion] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState(false);

  // Default ride data
  const defaultRide = {
    id: '1',
    from: 'VIT Vellore',
    to: 'Chennai Airport',
    time: '1700 hrs',
    date: '03 January, 2025',
    price: '₹500 pp',
    seats: 1,
    driver: {
      name: 'Yash Raj Singh',
      rating: 4.5,
      phone: '+91 9876543210',
    },
    vehicle: {
      make: 'Scooter',
      model: 'Honda',
      color: 'Orange',
      plate: 'TN-01-AB-1234',
    },
  };

  const ride = route?.params?.ride || defaultRide;

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      getUserLocation();
      setHasPermission(true);
    } else {
      setHasPermission(false);
      console.log("Location permission denied");
    }
  };

  const getUserLocation = async () => {
    try {
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = coords;
      setLocation({ latitude, longitude });
      setInitialRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error("Error fetching location:", error);
    }
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Sample coordinates for VIT Vellore to Chennai Airport route
  const routeCoordinates = [
    { latitude: 12.9698, longitude: 79.1559 }, // VIT Vellore
    { latitude: 12.9716, longitude: 79.1644 },
    { latitude: 13.0827, longitude: 80.2707 }, // Chennai Airport
  ];

  const handleRequestRide = () => {
    console.log('Requesting ride:', ride.id);
    // Navigate to booking or request confirmation
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with BrandInfo */}
      <View style={styles.header}>
        <BrandInfo />
      </View>

      {/* Navigation Row */}
      <View style={styles.navigationRow}>
        <View style={styles.navigationLeft}>
          <ChevronBack style={styles.backButton} />
        </View>
        <TouchableOpacity style={styles.createRideBtn}>
          <Text style={styles.createRideBtnText}>Create Ride</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Ride Card */}
        <View style={styles.rideCard}>
          {/* Main Content */}
          <View style={styles.cardContent}>
            {/* Left Side - Route */}
            <View style={styles.leftSection}>
              {/* Start Location */}
              <View style={styles.locationRow}>
                <Image source={require('../../assets/location-pin.png')} style={styles.startLocationIcon} />
                <Text style={styles.locationText}>VIT Vellore</Text>
              </View>
              
              {/* Dotted Line */}
              <View style={styles.dottedLineVertical}>
                <Image source={require('../../assets/dotted_line_green.png')} style={styles.verticalDottedLine} resizeMode="repeat" />
              </View>
              
              {/* End Location */}
              <View style={styles.locationRow}>
                <Image source={require('../../assets/navigation-2.png')} style={styles.endLocationIcon} />
                <Text style={styles.locationText}>Chennai Airport</Text>
              </View>
            </View>
            
            {/* Right Side - Vehicle */}
            <View style={styles.rightSection}>
              <Image source={require('../../assets/Beep Beep Motorcycle.png')} style={styles.motorcycleImage} resizeMode="contain" />
            </View>
          </View>
          
          {/* Bottom Section - Ride Details */}
          <View style={styles.rideDetailsSection}>
            {/* Seats and Price Row */}
            <View style={styles.seatsAndPriceRow}>
              <View style={styles.seatsContainer}>
                <Image source={require('../../assets/sofa.png')} style={styles.seatIcon} />
                <Text style={styles.seatsText}>1/2 seat available</Text>
              </View>
              <View style={styles.priceContainer}>
                <Image source={require('../../assets/wallet.png')} style={styles.walletIcon} />
                <Text style={styles.priceText}>₹ 500 pp</Text>
              </View>
            </View>
            
            {/* Creator Info */}
            <Text style={styles.creatorText}>Ride Created by Yash Raj Singh on 01 January, 2025</Text>
            <Text style={styles.yobText}>YOB: 2004</Text>
            
            {/* Date and Time Row */}
            <View style={styles.dateTimeRow}>
              <View style={styles.dateContainer}>
                <Image source={require('../../assets/calendar.png')} style={styles.calendarIcon} />
                <Text style={styles.dateText}>03 January, 2025</Text>
              </View>
              <View style={styles.timeContainer}>
                <Image source={require('../../assets/clock.png')} style={styles.clockIcon} />
                <Text style={styles.timeText}>1700 hrs</Text>
              </View>
            </View>
            
            {/* Trip Length */}
            <Text style={styles.tripLengthText}>Estimated Trip Length: 2 hours 45 minutes</Text>
            
            {/* Map Section - Below Trip Length */}
            <View style={styles.mapSection}>
              {hasPermission && initialRegion ? (
                <MapView
                  style={styles.mapView}
                  initialRegion={{
                    latitude: 12.9698,
                    longitude: 79.1559,
                    latitudeDelta: 1.5,
                    longitudeDelta: 1.5,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                >
                  {/* Start Marker - VIT Vellore */}
                  <Marker
                    coordinate={{ latitude: 12.9698, longitude: 79.1559 }}
                    title="VIT Vellore"
                  >
                    <View style={styles.startMarker}>
                      <Text style={styles.markerText}>|</Text>
                    </View>
                  </Marker>
                  
                  {/* End Marker - Chennai Airport */}
                  <Marker
                    coordinate={{ latitude: 13.0827, longitude: 80.2707 }}
                    title="Chennai Airport"
                  >
                    <View style={styles.endMarker}>
                      <Image source={require('../../assets/navigation-2.png')} style={styles.endMarkerIcon} />
                    </View>
                  </Marker>
                  
                  {/* Route Polyline */}
                  <Polyline
                    coordinates={routeCoordinates}
                    strokeColor={AppColors.primaryLightGreen}
                    strokeWidth={3}
                    lineDashPattern={[5, 5]}
                  />
                </MapView>
              ) : (
                <View style={styles.mapPlaceholder}>
                  <Text style={styles.loadingText}>Loading map...</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.bottomContainer}>
        <SlideToCreate
          onSlideComplete={handleRequestRide}
          text="Slide to request ride"
          disabled={false}
          sliderIcon={require("../../assets/slide.png")}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
  },
  header: {
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  navigationRow: {
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navigationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 0,
  },
  createRideBtn: {
    backgroundColor: AppColors.basicBlack,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  createRideBtnText: {
    color: AppColors.basicWhite,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'NunitoSans_600SemiBold',
  },
  scrollContainer: {
    flex: 1,
  },
  rideCard: {
    marginHorizontal: 28,
    marginBottom: 28,
    borderRadius: 20,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    padding: 28,
    backgroundColor: AppColors.secondaryDarkGreen,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  leftSection: {
    flex: 1,
    paddingRight: 28,
  },
  rightSection: {
    flex: 0,
    width: 140,
    overflow: 'hidden',
    marginRight: -28,
    marginTop: -28,
    marginBottom: -28,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  startLocationIcon: {
    width: 26,
    height: 26,
    marginRight: 10,
    tintColor: AppColors.primaryLightGreen,
  },
  startLocationLine: {
    color: AppColors.primaryLightGreen,
    fontSize: 28,
    fontWeight: '700',
    marginRight: 10,
    fontFamily: 'NunitoSans_700',
  },
  endLocationIcon: {
    width: 26,
    height: 26,
    marginRight: 10,
    tintColor: AppColors.basicWhite,
  },
  locationText: {
    color: AppColors.basicWhite,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'NunitoSans_700',
  },
  dottedLineVertical: {
    width: 24,
    height: 80,
    marginLeft: 12,
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalDottedLine: {
    width: 3,
    height: 80,
    tintColor: AppColors.primaryLightGreen,
  },
    motorcycleImage: {
      width: 140,
      height: 160,
      marginLeft: 10,
    },
  rideDetailsSection: {
    paddingTop: 20,
  },
  seatsAndPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    tintColor: AppColors.basicWhite,
  },
  walletIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    tintColor: AppColors.basicWhite,
  },
  seatsText: {
    color: AppColors.basicWhite,
    fontSize: 16,
    fontFamily: 'NunitoSans_400Regular',
  },
  priceText: {
    color: AppColors.basicWhite,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'NunitoSans_600SemiBold',
  },
  creatorText: {
    color: AppColors.basicWhite,
    fontSize: 16,
    fontFamily: 'NunitoSans_400Regular',
    marginBottom: 6,
  },
  yobText: {
    color: AppColors.basicWhite,
    fontSize: 16,
    fontFamily: 'NunitoSans_400Regular',
    marginBottom: 16,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  calendarIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    tintColor: AppColors.primaryLightGreen,
  },
  clockIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    tintColor: AppColors.primaryLightGreen,
  },
  dateText: {
    color: AppColors.primaryLightGreen,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'NunitoSans_700Bold',
  },
  timeText: {
    color: AppColors.primaryLightGreen,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'NunitoSans_700Bold',
  },
  tripLengthText: {
    color: AppColors.basicWhite,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'NunitoSans_700Bold',
    marginBottom: 16,
  },
  bottomContainer: {
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 28,
  },
  mapSection: {
    height: 200,
    overflow: 'hidden',
    marginTop: 0,
    marginBottom: -28,
    marginLeft: -28,
    marginRight: -28,
  },
  mapView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.primaryLightGreen + '20',
  },
  loadingText: {
    color: AppColors.basicWhite,
    fontSize: 16,
    fontFamily: 'NunitoSans_400Regular',
  },
  startMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  endMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: {
    color: AppColors.primaryLightGreen,
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'NunitoSans_700',
  },
  endMarkerIcon: {
    width: 20,
    height: 20,
    tintColor: AppColors.basicWhite,
  },
});

export default AvailableRideScreenSelected;
