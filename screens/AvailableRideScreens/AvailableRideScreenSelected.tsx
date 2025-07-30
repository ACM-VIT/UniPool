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
import { useApi } from '../../utils/ApiUtil';

interface RideRequestResponse {
  success?: boolean;
  id?: string;
  booking_id?: string;
  message?: string;
  status?: string;
}

interface RideRequestPayload {
  ride_id: string;
  request_status: string;
}

type RootStackParamList = {
  AvailableRidesScreen: undefined;
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
  const nav = useNavigation();
  const { apiUtil } = useApi();
  const [location, setLocation] = useState<any>(null);
  const [initialRegion, setInitialRegion] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const rideData = route?.params?.ride;
  console.log("Received ride data:", rideData);

  const ride = rideData || {
    id: '1',
    start_location: 'VIT Vellore',
    end_location: 'Chennai Airport',
    start_time: '2025-01-03T17:00:00Z',
    total_price: 500,
    total_seats: 2,
    booked_seats: 1,
    host_user_name: 'Yash Raj Singh',
    is_same_gender: 0,
  };

  const formatTime = (timeString: string): string => {
    try {
      const date = new Date(timeString);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}${minutes} hrs`;
    } catch (error) {
      return '1700 hrs';
    }
  };

  const formatDate = (timeString: string): string => {
    try {
      const date = new Date(timeString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = date.toLocaleString('en-US', { month: 'long' });
      const year = date.getFullYear();
      return `${day} ${month}, ${year}`;
    } catch (error) {
      return '03 January, 2025';
    }
  };

  const getSeatsText = (totalSeats: number, bookedSeats: number): string => {
    const availableSeats = totalSeats - bookedSeats;
    return `${availableSeats}/${totalSeats} seat${availableSeats !== 1 ? 's' : ''} available`;
  };

  const getPriceText = (price: number): string => {
    return `₹ ${price} pp`;
  };

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

  const routeCoordinates = [
    { latitude: 12.9698, longitude: 79.1559 },
    { latitude: 12.9716, longitude: 79.1644 },
    { latitude: 13.0827, longitude: 80.2707 },
  ];

  const handleRequestRide = async () => {
    if (isRequesting) return;
    
    setIsRequesting(true);
    
    try {
      const requestPayload: RideRequestPayload = {
        ride_id: ride.id,
        request_status: "pending",
      };

      console.log('Requesting ride with payload:', requestPayload);

      const response = await apiUtil.post('/bookings/request', requestPayload) as RideRequestResponse;
      
      console.log('Ride request response:', response);

      if (response && (response.success || response.id || response.booking_id)) {
        (nav as any).navigate('RideRequestedScreen', {
          rideId: ride.id,
          bookingId: response.id || response.booking_id,
          rideDetails: {
            from: ride.start_location,
            to: ride.end_location,
            time: formatTime(ride.start_time),
            price: ride.total_price,
            driver: ride.host_user_name,
          }
        });
      } else {
        throw new Error(response?.message || 'Failed to request ride');
      }
    } catch (error: any) {
      console.error('Error requesting ride:', error);
      
      let errorMessage = 'Failed to request ride. Please try again.';
      
      if (error?.response?.status === 400) {
        errorMessage = error?.response?.data?.message || 'Invalid request. Please check ride availability.';
      } else if (error?.response?.status === 401) {
        errorMessage = 'Please log in to request a ride.';
      } else if (error?.response?.status === 409) {
        errorMessage = 'You have already requested this ride or the ride is full.';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      console.error('Ride request error:', errorMessage);
    } finally {
      setIsRequesting(false);
    }
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
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => (nav as any).navigate('AvailableRidesScreen')}
          >
            <ChevronBack />
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={styles.createRideBtn}
          onPress={() => (nav as any).navigate('CreateRide')}
        >
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
                <Text style={styles.locationText}>{ride.start_location}</Text>
              </View>
              
              {/* Dotted Line */}
              <View style={styles.dottedLineVertical}>
                <Image source={require('../../assets/dotted_line_green.png')} style={styles.verticalDottedLine} resizeMode="repeat" />
              </View>
              
              {/* End Location */}
              <View style={styles.locationRow}>
                <Image source={require('../../assets/navigation-2.png')} style={styles.endLocationIcon} />
                <Text style={styles.locationText}>{ride.end_location}</Text>
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
                <Text style={styles.seatsText}>{getSeatsText(ride.total_seats, ride.booked_seats)}</Text>
              </View>
              <View style={styles.priceContainer}>
                <Image source={require('../../assets/wallet.png')} style={styles.walletIcon} />
                <Text style={styles.priceText}>{getPriceText(ride.total_price)}</Text>
              </View>
            </View>
            
            {/* Creator Info */}
            <Text style={styles.creatorText}>Ride Created by {ride.host_user_name || 'Unknown User'} on {formatDate(ride.start_time)}</Text>
            <Text style={styles.yobText}>YOB: 2004</Text>
            
            {/* Date and Time Row */}
            <View style={styles.dateTimeRow}>
              <View style={styles.dateContainer}>
                <Image source={require('../../assets/calendar.png')} style={styles.calendarIcon} />
                <Text style={styles.dateText}>{formatDate(ride.start_time)}</Text>
              </View>
              <View style={styles.timeContainer}>
                <Image source={require('../../assets/clock.png')} style={styles.clockIcon} />
                <Text style={styles.timeText}>{formatTime(ride.start_time)}</Text>
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
                  {/* Start Marker - From Location */}
                  <Marker
                    coordinate={{ latitude: 12.9698, longitude: 79.1559 }}
                    title={ride.start_location}
                  >
                    <View style={styles.startMarker}>
                      <Text style={styles.markerText}>|</Text>
                    </View>
                  </Marker>
                  
                  {/* End Marker - To Location */}
                  <Marker
                    coordinate={{ latitude: 13.0827, longitude: 80.2707 }}
                    title={ride.end_location}
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
          text={isRequesting ? "Requesting..." : "Slide to request ride"}
          disabled={isRequesting}
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
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    padding: 20,
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
    marginBottom: 20,
  },
  leftSection: {
    flex: 1,
    paddingRight: 20,
  },
  rightSection: {
    flex: 0,
    width: 120,
    overflow: 'hidden',
    marginRight: -20,
    marginTop: -20,
    marginBottom: -20,
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
    resizeMode: 'contain',
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
    fontFamily: 'NunitoSans_600SemiBold',
  },
  dottedLineVertical: {
    width: 24,
    height: 60,
    marginLeft: 1,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    resizeMode: 'contain',
  },
  verticalDottedLine: {
    width: 2,
    height: 90,
    tintColor: AppColors.primaryLightGreen,
    resizeMode: 'repeat',
  },
    motorcycleImage: {
      width: 155,
      height: 165,
      marginLeft: -18,
      marginTop: 10,
    },
  rideDetailsSection: {
  },
  seatsAndPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    resizeMode: 'contain',
  },
  walletIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    tintColor: AppColors.basicWhite,
    resizeMode: 'contain',
  },
  seatsText: {
    color: AppColors.basicWhite,
    fontSize: 16,
    fontFamily: 'NunitoSans_400Regular',
  },
  priceText: {
    color: AppColors.basicWhite,
    fontSize: 18,
    fontWeight: '100',
    fontFamily: 'NunitoSans_600SemiBold',
  },
  creatorText: {
    color: AppColors.basicWhite,
    fontSize: 16,
    fontFamily: 'NunitoSans_400Regular',
    marginBottom: 4,
  },
  yobText: {
    color: AppColors.basicWhite,
    fontSize: 16,
    fontFamily: 'NunitoSans_400Regular',
    marginBottom: 12,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 36,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    resizeMode: 'contain',
  },
  clockIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    tintColor: AppColors.primaryLightGreen,
    resizeMode: 'contain',
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
    marginBottom: 12,
  },
  bottomContainer: {
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 28,
  },
  mapSection: {
    height: 180,
    overflow: 'hidden',
    marginTop: 0,
    marginBottom: -20,
    marginLeft: -20,
    marginRight: -20,
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
