import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get("window");

import { useNavigation } from '@react-navigation/native';
import ChevronBack from '../../components/ChevronBack/ChevronBack';
import SlideToCreate from '../../components/SlideToCreate/SlideToCreate';
import BrandInfo from '../../components/BrandInfo/BrandInfo';
import AppColors from '../../design_systems/colors';
import { useApi } from '../../utils/ApiUtil';

const customMapStyle = [
  {
    featureType: "all",
    elementType: "geometry",
    stylers: [
      {
        color: "#f8f8f8"
      }
    ]
  },
  {
    featureType: "all",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#273B33"
      }
    ]
  },
  {
    featureType: "all",
    elementType: "labels.text.stroke",
    stylers: [
      {
        color: "#ffffff"
      },
      {
        weight: 2
      }
    ]
  },
  {
    featureType: "all",
    elementType: "labels.icon",
    stylers: [
      {
        visibility: "simplified"
      }
    ]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [
      {
        color: "#ffffff"
      }
    ]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#e0e0e0"
      },
      {
        weight: 0.5
      }
    ]
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [
      {
        color: "#ffffff"
      }
    ]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#B5D750"
      },
      {
        weight: 2
      }
    ]
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [
      {
        color: "#ffffff"
      }
    ]
  },
  {
    featureType: "road.arterial",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#e0e0e0"
      },
      {
        weight: 1
      }
    ]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [
      {
        color: "#b3d9ff"
      }
    ]
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [
      {
        color: "#f8f8f8"
      }
    ]
  },
  {
    featureType: "landscape.natural",
    elementType: "geometry",
    stylers: [
      {
        color: "#e8f5e8"
      }
    ]
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [
      {
        color: "#f0f0f0"
      }
    ]
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [
      {
        color: "#B5D750"
      },
      {
        lightness: 20
      }
    ]
  },
  {
    featureType: "poi.business",
    elementType: "geometry",
    stylers: [
      {
        color: "#f5f5f5"
      }
    ]
  },
  {
    featureType: "poi.attraction",
    elementType: "geometry",
    stylers: [
      {
        color: "#B5D750"
      },
      {
        lightness: 40
      }
    ]
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [
      {
        color: "#273B33"
      }
    ]
  },
  {
    featureType: "transit.line",
    elementType: "geometry",
    stylers: [
      {
        color: "#B5D750"
      }
    ]
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#d0d0d0"
      },
      {
        weight: 0.3
      }
    ]
  },
  {
    featureType: "administrative.country",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#273B33"
      },
      {
        weight: 1
      }
    ]
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#273B33"
      }
    ]
  }
];

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
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [estimatedDuration, setEstimatedDuration] = useState<string>('Estimating...');

  const rideData = route?.params?.ride;
  console.log("Received ride data:", rideData);

  if (rideData) {
    console.log("Ride coordinates:", {
      start_latitude: rideData.start_latitude,
      start_longitude: rideData.start_longitude,
      end_latitude: rideData.end_latitude,
      end_longitude: rideData.end_longitude,
    });
    console.log("Ride host info:", {
      host_user_name: rideData.host_user_name,
      host_user_yob: rideData.host_user_yob,
    });
  }

  const ride = rideData || {
    id: '1',
    start_location: 'VIT Vellore',
    end_location: 'Chennai Airport',
    start_time: '2025-01-03T17:00:00Z',
    total_price: 500,
    total_seats: 2,
    booked_seats: 1,
    host_user_name: 'Yash Raj Singh',
    host_user_yob: 2004,
    is_same_gender: 0,
    start_latitude: 12.9698,
    start_longitude: 79.1559,
    end_latitude: 13.0827,
    end_longitude: 80.2707,
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
    return `${availableSeats}/${totalSeats} seat available`;
  };

  const getPriceText = (price: number): string => {
    return `₹ ${price} pp`;
  };

  const isValidCoordinate = (lat: number | null | undefined, lon: number | null | undefined): boolean => {
    return lat !== null && lat !== undefined && lon !== null && lon !== undefined && 
           !isNaN(lat) && !isNaN(lon) && 
           lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const generateRouteCoordinates = (startLat: number, startLon: number, endLat: number, endLon: number) => {
    const numPoints = 15;
    const coordinates = [];
    
    const midLat = (startLat + endLat) / 2;
    const midLon = (startLon + endLon) / 2;
    
    const distance = calculateDistance(startLat, startLon, endLat, endLon);
    const arcHeight = distance * 0.15;
    
    const deltaLat = endLat - startLat;
    const deltaLon = endLon - startLon;
    const perpLat = -deltaLon * arcHeight / distance;
    const perpLon = deltaLat * arcHeight / distance;
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;

      const curveFactor = 4 * t * (1 - t);

      const lat = startLat + t * deltaLat + curveFactor * perpLat;
      const lon = startLon + t * deltaLon + curveFactor * perpLon;
      
      coordinates.push({ latitude: lat, longitude: lon });
    }
    
    return coordinates;
  };

  const calculateEstimatedDuration = (distance: number): string => {
    const avgSpeed = 60;
    const durationHours = distance / avgSpeed;
    const hours = Math.floor(durationHours);
    const minutes = Math.round((durationHours - hours) * 60);
    
    if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };

  const getAgeText = (userYOB: number | null | undefined): string => {
    if (userYOB && userYOB > 0) {
      const currentYear = new Date().getFullYear();
      const age = currentYear - userYOB;
      return `YOB: ${userYOB}`;
    }
    return `YOB: 2004`;
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

  useEffect(() => {
    if (isValidCoordinate(ride.start_latitude, ride.start_longitude) && 
        isValidCoordinate(ride.end_latitude, ride.end_longitude)) {
      
      console.log('Using dynamic coordinates for ride:', {
        start: { lat: ride.start_latitude, lon: ride.start_longitude },
        end: { lat: ride.end_latitude, lon: ride.end_longitude }
      });
      
      const distance = calculateDistance(
        ride.start_latitude!,
        ride.start_longitude!,
        ride.end_latitude!,
        ride.end_longitude!
      );
      
      const duration = calculateEstimatedDuration(distance);
      setEstimatedDuration(`${duration}`);
      
      const dynamicRoute = generateRouteCoordinates(
        ride.start_latitude!,
        ride.start_longitude!,
        ride.end_latitude!,
        ride.end_longitude!
      );
      setRouteCoordinates(dynamicRoute);
    } else {
      console.log('Using fallback coordinates - dynamic coordinates not available');
      setEstimatedDuration('2 hours 45 minutes');
      setRouteCoordinates([
        { latitude: 12.9698, longitude: 79.1559 },
        { latitude: 12.9716, longitude: 79.1644 },
        { latitude: 13.0827, longitude: 80.2707 },
      ]);
    }
  }, [ride]);

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
      <View style={styles.header}>
        <BrandInfo />
      </View>

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

      <View style={styles.mainContent}>
        <View style={styles.combinedContainer}>
          <View style={styles.rideCard}>
            <View style={styles.routeSection}>
              <View style={styles.routeDetails}>
                <View style={styles.locationContainer}>
                  <View style={styles.startLocationRow}>
                    <View style={styles.startDot} />
                    <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">{ride.start_location}</Text>
                  </View>
                  
                  <View style={styles.dottedPath}>
                    <View style={styles.dottedLine} />
                  </View>
                  
                  <View style={styles.endLocationRow}>
                    <Image source={require('../../assets/navigation-2.png')} style={styles.endLocationIcon} />
                    <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">{ride.end_location}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.scooterContainer}>
                <Image source={require('../../assets/Beep Beep Motorcycle.png')} style={styles.scooterImage} resizeMode="contain" />
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.seatsInfo}>
                <Image source={require('../../assets/sofa.png')} style={styles.seatIcon} />
                <Text style={styles.seatsText}>{getSeatsText(ride.total_seats, ride.booked_seats)}</Text>
              </View>
              <View style={styles.priceInfo}>
                <Text style={styles.priceText}>{getPriceText(ride.total_price)}</Text>
              </View>
            </View>
            
            <Text style={styles.creatorText} numberOfLines={1} ellipsizeMode="tail">Ride Created by {ride.host_user_name || 'Yash Raj Singh'} on {formatDate(ride.start_time)}</Text>
            <Text style={styles.yobText}>{getAgeText(ride.host_user_yob)}</Text>
            
            <View style={styles.dateTimeContainer}>
              <View style={styles.dateTimeBox}>
                <Image source={require('../../assets/calendar.png')} style={styles.calendarIcon} />
                <Text style={styles.dateTimeText}>{formatDate(ride.start_time)}</Text>
              </View>
              <View style={styles.dateTimeBox}>
                <Image source={require('../../assets/clock.png')} style={styles.clockIcon} />
                <Text style={styles.dateTimeText}>{formatTime(ride.start_time)}</Text>
              </View>
            </View>
            
            <Text style={styles.estimatedTripText}>Estimated Trip Length: {estimatedDuration}</Text>
          </View>

          <View style={styles.mapSection}>
            {hasPermission && isValidCoordinate(ride.start_latitude, ride.start_longitude) && 
             isValidCoordinate(ride.end_latitude, ride.end_longitude) ? (
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.mapView}
                initialRegion={{
                  latitude: (ride.start_latitude! + ride.end_latitude!) / 2,
                  longitude: (ride.start_longitude! + ride.end_longitude!) / 2,
                  latitudeDelta: Math.abs(ride.end_latitude! - ride.start_latitude!) * 1.5 + 0.5,
                  longitudeDelta: Math.abs(ride.end_longitude! - ride.start_longitude!) * 1.5 + 0.5,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                showsUserLocation={false}
                showsMyLocationButton={false}
                toolbarEnabled={false}
                customMapStyle={customMapStyle}
                onMapReady={() => console.log("Ride details map ready")}
              >
                <Marker
                  coordinate={{ latitude: ride.start_latitude!, longitude: ride.start_longitude! }}
                  title={ride.start_location}
                  pinColor={AppColors.primaryLightGreen || "#B5D750"}
                />
                
                <Marker
                  coordinate={{ latitude: ride.end_latitude!, longitude: ride.end_longitude! }}
                  title={ride.end_location}
                  pinColor={AppColors.secondaryDarkGreen || "#273B33"}
                />
                
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor={AppColors.secondaryDarkGreen || "#273B33"}
                  strokeWidth={3}
                  lineDashPattern={[0]}
                  lineJoin="round"
                  lineCap="round"
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
  },
  navigationRow: {
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navigationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 1,
    marginTop: 7,
  },
  createRideBtn: {
    backgroundColor: AppColors.basicBlack,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  createRideBtnText: {
    color: AppColors.basicWhite,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'NunitoSans_400Regular',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  combinedContainer: {
    flex: 1,
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  rideCard: {
    backgroundColor: AppColors.secondaryDarkGreen,
    padding: 20,
  },
  routeSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  routeDetails: {
    flex: 1,
    paddingRight: 15,
  },
  locationContainer: {
    flex: 1,
  },
  startLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  startDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: AppColors.primaryLightGreen,
    marginRight: 12,
  },
  dottedPath: {
    marginLeft: 6,
    marginVertical: 8,
  },
  dottedLine: {
    width: 2,
    height: 30,
    backgroundColor: AppColors.primaryLightGreen,
    opacity: 0.5,
    marginBottom: -15,
  },
  endLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  endLocationIcon: {
    width: 18,
    height: 18,
    marginRight: 12,
    tintColor: AppColors.basicWhite,
  },
  locationText: {
    color: AppColors.basicWhite,
    fontSize: 18,
    fontFamily: 'NunitoSans_400Regular',
    flex: 1,
  },
  scooterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    right: -40,
  },
  scooterImage: {
    width: 120,
    height: 120,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seatsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  seatIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    tintColor: AppColors.basicWhite,
  },
  seatsText: {
    color: AppColors.basicWhite,
    fontSize: 14,
    fontFamily: 'NunitoSans_400Regular',
  },
  priceText: {
    color: AppColors.basicWhite,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'NunitoSans_400Regular',
  },
  creatorText: {
    color: AppColors.basicWhite,
    fontSize: 14,
    fontFamily: 'NunitoSans_400Regular',
    marginBottom: 4,
  },
  yobText: {
    color: AppColors.basicWhite,
    fontSize: 14,
    fontFamily: 'NunitoSans_400Regular',
    marginBottom: 16,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dateTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  calendarIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    tintColor: AppColors.primaryLightGreen,
  },
  clockIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    tintColor: AppColors.primaryLightGreen,
  },
  dateTimeText: {
    color: AppColors.primaryLightGreen,
    fontSize: 14,
    fontFamily: 'NunitoSans_400Regular',
  },
  estimatedTripText: {
    color: AppColors.basicWhite,
    fontSize: 14,
    fontFamily: 'NunitoSans_400Regular',
  },
  mapSection: {
    flex: 1,
    minHeight: 200,
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
    backgroundColor: '#f0f0f0',
  },
  loadingText: {
    color: AppColors.basicBlack,
    fontSize: 16,
    fontFamily: 'NunitoSans_400Regular',
  },
  startMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  startMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: AppColors.primaryLightGreen,
  },
  endMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  endMarkerIcon: {
    width: 20,
    height: 20,
    tintColor: AppColors.primaryLightGreen,
  },
  bottomContainer: {
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
});

export default AvailableRideScreenSelected;