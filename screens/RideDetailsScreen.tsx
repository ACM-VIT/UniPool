import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Calendar from 'expo-calendar';
import { useApi } from "../utils/ApiUtil";
import AppColors from "../design_systems/colors";
import ChevronBack from '../components/ChevronBack/ChevronBack';
import SlideToCreate from '../components/SlideToCreate/SlideToCreate';
import BrandInfo from '../components/BrandInfo/BrandInfo';
import LoadingComponent from "../components/LoadingComponent";
import RideCard from "../components/RideCard";

const { width, height } = Dimensions.get("window");

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

const CommonLocationCoordinates = [
  { location: "Chennai", latitude: 12.989196, longitude: 80.178799 },
  { location: "Vellore", latitude: 12.968, longitude: 77.1559 },
  { location: "Bangalore", latitude: 13.1985, longitude: 77.6665 },
  { location: "Coimbatore", latitude: 11.0376, longitude: 77.0363 },
  { location: "Salem", latitude: 11.6641, longitude: 78.1579 },
  { location: "Madurai", latitude: 9.912, longitude: 78.1242 },
  { location: "Pondicherry", latitude: 11.9352, longitude: 79.8082 },
  { location: "Varanasi", latitude: 25.3176, longitude: 82.9739 },
  { location: "Kanpur", latitude: 26.4499, longitude: 80.3319 },
  { location: "Kolkata", latitude: 22.5726, longitude: 88.3639 },
  { location: "Bhopal", latitude: 23.2599, longitude: 77.4126 },
  { location: "VIT University", latitude: 12.9716, longitude: 79.1594 },
  { location: "Trivandrum", latitude: 8.5241, longitude: 76.9366 },
  { location: "Thiruvananthapuram", latitude: 8.5241, longitude: 76.9366 },
  { location: "Mumbai", latitude: 19.0760, longitude: 72.8777 },
  { location: "Delhi", latitude: 28.7041, longitude: 77.1025 },
  { location: "Pune", latitude: 18.5204, longitude: 73.8567 },
  { location: "Hyderabad", latitude: 17.3850, longitude: 78.4867 },
  { location: "Ahmedabad", latitude: 23.0225, longitude: 72.5714 },
  { location: "Lucknow", latitude: 26.8467, longitude: 80.9462 },
  { location: "Jaipur", latitude: 26.9124, longitude: 75.7873 },
  { location: "Indore", latitude: 22.7196, longitude: 75.8577 },
  { location: "Gwalior", latitude: 26.2183, longitude: 78.1828 },
  { location: "Agra", latitude: 27.1767, longitude: 78.0081 },
];

const correctCoordinatesForLocation = (locationName: string, currentLat?: number, currentLon?: number): { latitude: number; longitude: number } | null => {
  if (!currentLat || !currentLon) return null;
  
  const isInIndiaBounds = currentLat >= 6 && currentLat <= 37 && currentLon >= 68 && currentLon <= 97;
  
  if (isInIndiaBounds) {
    return { latitude: currentLat, longitude: currentLon };
  }
  
  const commonLocation = CommonLocationCoordinates.find(
    loc => loc.location.toLowerCase().includes(locationName.toLowerCase()) ||
           locationName.toLowerCase().includes(loc.location.toLowerCase())
  );
  
  if (commonLocation) {
    console.log(`Correcting coordinates for "${locationName}" from (${currentLat}, ${currentLon}) to (${commonLocation.latitude}, ${commonLocation.longitude})`);
    return {
      latitude: commonLocation.latitude,
      longitude: commonLocation.longitude
    };
  }
  
  return { latitude: currentLat, longitude: currentLon };
};

interface RideData {
  id?: string;
  ride_id?: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_seats: number;
  booked_seats: number;
  total_price: number;
  is_ongoing: boolean;
  is_same_gender: number;
  host_user_id?: string;
  host_user_name?: string;
  host_user_yob?: number;
  start_latitude?: number;
  start_longitude?: number;
  end_latitude?: number;
  end_longitude?: number;
  vehicle_type?: "scooter" | "van" | "car" | "suv";
}

interface RideDetailsScreenProps {
  route: {
    params: {
      rideId: string;
    };
  };
  navigation: any;
}

interface UserResponse {
  user: {
    id: string;
    name: string;
    email?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface RideResponse extends RideData {
  host_user_id?: string;
  host_id?: string;
  is_user_host?: boolean;
  host?: {
    id: string;
    name: string;
    email?: string;
    profile_picture_url?: string;
  };
  bookings?: Array<{
    id: string;
    passenger_id: string;
    request_status: string;
    booking_created_at?: string;
    created_at?: string;
    passenger_name?: string;
    passenger_email?: string;  
    passenger_profile_picture_url?: string;
    passenger_contact_number?: string;
  }>;
  [key: string]: any;
}

const RideDetailsScreen: React.FC<any> = ({ route, navigation }) => {
  const { rideId } = route.params;
  const { apiUtil } = useApi();
  
  // State management
  const [rideData, setRideData] = useState<RideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Passenger booking state
  const [userBookingStatus, setUserBookingStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [userBooking, setUserBooking] = useState<any>(null);
  
  // Host management state
  const [showSlide, setShowSlide] = useState<null | "accept" | "reject" | "remove">(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Map related state
  const [location, setLocation] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [estimatedDuration, setEstimatedDuration] = useState<string>('Estimating...');
  
  // Action state
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Utility functions from AvailableRideScreenSelected
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

  const getAgeText = (userYOB: number | null | undefined): string => {
    if (userYOB && userYOB > 0) {
      return `YOB: ${userYOB}`;
    }
    return `YOB: 2004`;
  };

  const getVehicleIcon = (totalSeats: number) => {
    if (totalSeats <= 2) {
      return require("../assets/motorcycle.png");
    } else if (totalSeats <= 4) {
      return require("../assets/racer.png");
    } else if (totalSeats <= 6) {
      return require("../assets/wagon.png");
    } else {
      return require("../assets/foodvan.png");
    }
  };

  const isValidCoordinate = (lat: number | null | undefined, lon: number | null | undefined): boolean => {
    return lat !== null && lat !== undefined && lon !== null && lon !== undefined && 
           !isNaN(lat) && !isNaN(lon) && 
           lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 &&
           lat !== 0 && lon !== 0;
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
    if (!distance || distance <= 0 || isNaN(distance)) {
      return '2 hours 30 minutes';
    }
    
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

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      getUserLocation();
      setHasPermission(true);
    } else {
      setHasPermission(false);
    }
  };

  const getUserLocation = async () => {
    try {
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = coords;
      setLocation({ latitude, longitude });
    } catch (error) {
      console.error("Error fetching location:", error);
    }
  };

  useEffect(() => {
    const fetchRideDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const userInfo = await apiUtil.get<UserResponse>("/user/details");
        const userId = userInfo?.user?.id || null;
        setCurrentUserId(userId);

        const completeRideData = await apiUtil.get<RideResponse>(`/ride/details/${rideId}`);
        setRideData(completeRideData);
        
        const isUserHost = completeRideData.is_user_host || false;
        setIsHost(isUserHost);
        
        if (isUserHost) {
          setCurrentUser({
            id: completeRideData.host?.id || userId,
            name: completeRideData.host?.name || completeRideData.host_user_name,
            email: completeRideData.host?.email || '',
            profile_picture_url: completeRideData.host?.profile_picture_url || '',
          });
        }

        if (isUserHost && completeRideData.bookings) {
          const transformedBookings = completeRideData.bookings.map((booking: any) => ({
            id: booking.id,
            passenger_id: booking.passenger_id,
            request_status: booking.request_status,
            created_at: booking.booking_created_at || booking.created_at,
            passenger: {
              id: booking.passenger_id,
              name: booking.passenger_name,
              email: booking.passenger_email,
              profile_picture_url: booking.passenger_profile_picture_url,
              contact_number: booking.passenger_contact_number,
            },
          }));
          setRequests(transformedBookings);
        } else if (!isUserHost && completeRideData.bookings && userId) {
          // For passengers, find their own booking and set user booking status
          const transformedBookings = completeRideData.bookings.map((booking: any) => ({
            id: booking.id,
            passenger_id: booking.passenger_id,
            request_status: booking.request_status,
            created_at: booking.booking_created_at || booking.created_at,
            passenger: {
              id: booking.passenger_id,
              name: booking.passenger_name,
              email: booking.passenger_email,
              profile_picture_url: booking.passenger_profile_picture_url,
              contact_number: booking.passenger_contact_number,
            },
          }));
          setRequests(transformedBookings);
          
          const currentUserBooking = transformedBookings.find(booking => booking.passenger_id === userId);
          if (currentUserBooking) {
            setUserBooking(currentUserBooking);
            setUserBookingStatus(currentUserBooking.request_status as 'pending' | 'accepted' | 'rejected');
            console.log(`Current user booking status: ${currentUserBooking.request_status}`);
          } else {
            setUserBookingStatus('none');
            setUserBooking(null);
          }
        } else if (!isUserHost) {
          setUserBookingStatus('none');
          setUserBooking(null);
        }
        
        console.log("Ride details:", completeRideData);
        console.log("Current user ID:", userId);
        console.log("Is host:", isUserHost);
        console.log("User booking status:", userBookingStatus);
        console.log("User booking:", userBooking);
        console.log("Bookings found:", completeRideData.bookings);
        console.log("Coordinates:", {
          start_lat: completeRideData.start_latitude,
          start_lon: completeRideData.start_longitude,
          end_lat: completeRideData.end_latitude,
          end_lon: completeRideData.end_longitude
        });
        
      } catch (err: any) {
        console.error("Error fetching ride details:", err);
        
        // Handle user not found error gracefully - redirect to signup without showing error modal
        if (err.status === 404 && err.message && err.message.includes("User not found")) {
          console.log("User not found, redirecting to signup");
          navigation.navigate('Signup' as never);
          return;
        }
        
        setError(err.message || "Failed to fetch ride details");
      } finally {
        setLoading(false);
        setRequestsLoading(false);
      }
    };

    fetchRideDetails();
    requestLocationPermission();
  }, [rideId, apiUtil]);

  useEffect(() => {
    if (rideData) {
      setEstimatedDuration('2 hours 30 minutes');
      
      // Correct coordinates if they're wrong for known locations
      const correctedStartCoords = correctCoordinatesForLocation(
        rideData.start_location, 
        rideData.start_latitude, 
        rideData.start_longitude
      );
      const correctedEndCoords = correctCoordinatesForLocation(
        rideData.end_location, 
        rideData.end_latitude, 
        rideData.end_longitude
      );
      
      console.log('Original coordinates:', {
        start: { lat: rideData.start_latitude, lon: rideData.start_longitude },
        end: { lat: rideData.end_latitude, lon: rideData.end_longitude }
      });
      console.log('Corrected coordinates:', {
        start: correctedStartCoords,
        end: correctedEndCoords
      });
      
      if (correctedStartCoords && correctedEndCoords) {
        const distance = calculateDistance(
          correctedStartCoords.latitude,
          correctedStartCoords.longitude,
          correctedEndCoords.latitude,
          correctedEndCoords.longitude
        );
        
        const duration = calculateEstimatedDuration(distance);
        setEstimatedDuration(duration);
        
        const dynamicRoute = generateRouteCoordinates(
          correctedStartCoords.latitude,
          correctedStartCoords.longitude,
          correctedEndCoords.latitude,
          correctedEndCoords.longitude
        );
        setRouteCoordinates(dynamicRoute);
        
        // Update rideData with corrected coordinates for map display
        setRideData(prev => prev ? {
          ...prev,
          start_latitude: correctedStartCoords.latitude,
          start_longitude: correctedStartCoords.longitude,
          end_latitude: correctedEndCoords.latitude,
          end_longitude: correctedEndCoords.longitude
        } : null);
      } else {
        console.log('Invalid or missing coordinates, using fallback duration');
      }
    }
  }, [rideData?.id]); // Use rideData.id as dependency to avoid infinite loops

  const handleCancelRide = async () => {
    if (isActionLoading) return;

    if (isHost) {
      Alert.alert(
        "Delete Ride",
        "Are you sure you want to permanently delete this ride? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Delete", 
            style: "destructive",
            onPress: async () => {
              setIsActionLoading(true);
              try {
                console.log(`Attempting to delete ride: ${rideId}`);
                
                try {
                  const deleteResponse = await apiUtil.delete(`/ride/delete/${rideId}`);
                  console.log("Delete ride response:", deleteResponse);
                  
                  Alert.alert("Success", "Ride deleted successfully", [
                    { 
                      text: "OK", 
                      onPress: () => navigation.goBack() 
                    }
                  ]);
                } catch (deleteError: any) {
                  console.log("Delete ride error details:", deleteError);
                  
                  // If it's just an empty response error, treat as success since backend likely processed it
                  if (deleteError.message?.includes("Empty response") || deleteError.message?.includes("JSON Parse Error")) {
                    console.log("Got empty response from delete ride - treating as success");
                    Alert.alert("Success", "Ride deleted successfully", [
                      { 
                        text: "OK", 
                        onPress: () => navigation.goBack() 
                      }
                    ]);
                  } else {
                    throw deleteError;
                  }
                }
              } catch (error: any) {
                console.error("Delete ride error:", error);
                
                // Provide more specific error messages based on the error
                let errorMessage = "Failed to delete ride";
                if (error.message && error.message.includes("accepted bookings")) {
                  errorMessage = "Cannot delete ride with accepted participants. Please remove all participants first.";
                } else if (error.status === 403) {
                  errorMessage = "You don't have permission to delete this ride.";
                } else if (error.status === 404) {
                  errorMessage = "This ride was not found. It may have already been deleted.";
                } else if (error.status === 400) {
                  errorMessage = error.message || "Invalid request. Please check the ride details.";
                } else if (error.status === 500) {
                  errorMessage = "Server error occurred while deleting the ride. Please try again.";
                }
                
                Alert.alert("Error", errorMessage);
              } finally {
                setIsActionLoading(false); 
              }
            }
          }
        ]
      );
    } else {
      let alertTitle = "Cancel Booking";
      let alertMessage = "Are you sure you want to cancel your booking for this ride?";
      
      if (userBookingStatus === 'pending') {
        alertTitle = "Cancel Booking Request";
        alertMessage = "Are you sure you want to cancel your pending booking request for this ride?";
      } else if (userBookingStatus === 'accepted') {
        alertTitle = "Cancel Confirmed Booking";
        alertMessage = "Are you sure you want to cancel your confirmed booking for this ride? The host will be notified.";
      } else if (userBookingStatus === 'rejected') {
        alertTitle = "Remove Rejected Booking";
        alertMessage = "Remove this rejected booking from your view?";
      }
      
      Alert.alert(
        alertTitle,
        alertMessage,
        [
          { text: "No", style: "cancel" },
          { 
            text: "Yes", 
            style: "destructive",
            onPress: async () => {
              setIsActionLoading(true);
              try {
                if (userBooking) {
                  console.log(`Attempting to cancel user booking: ${userBooking.id}`);
                  
                  try {
                    const deleteResponse = await apiUtil.delete(`/booking/delete/${userBooking.id}`);
                    console.log("Cancel booking response:", deleteResponse);
                    
                    Alert.alert("Success", "Your booking has been cancelled successfully.", [
                      { 
                        text: "OK", 
                        onPress: () => navigation.goBack() 
                      }
                    ]);
                  } catch (deleteError: any) {
                    console.log("Cancel booking error details:", deleteError);
                    
                    // If it's just an empty response error, treat as success since backend likely processed it
                    if (deleteError.message?.includes("Empty response") || deleteError.message?.includes("JSON Parse Error")) {
                      console.log("Got empty response from cancel booking - treating as success");
                      Alert.alert("Success", "Your booking has been cancelled successfully.", [
                        { 
                          text: "OK", 
                          onPress: () => navigation.goBack() 
                        }
                      ]);
                    } else {
                      throw deleteError;
                    }
                  }
                } else {
                  Alert.alert("Error", "No booking found to cancel");
                }
              } catch (error: any) {
                console.error("Error cancelling booking:", error);
                Alert.alert("Error", error.message || "Failed to cancel booking");
              } finally {
                setIsActionLoading(false); 
              }
            }
          }
        ]
      );
    }
  };

  const handleAddToCalendar = async () => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          "Permission Required", 
          "Calendar access is required to add events. Please enable calendar permissions in your device settings to use this feature.",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Open Settings", 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      console.log('Available calendars:', calendars.map(cal => ({ 
        id: cal.id, 
        title: cal.title, 
        source: cal.source.name, 
        isPrimary: cal.isPrimary,
        allowsModifications: cal.allowsModifications 
      })));
      
      let defaultCalendar = calendars.find(cal => cal.isPrimary && cal.allowsModifications);
      
      if (!defaultCalendar) {
        defaultCalendar = calendars.find(cal => 
          cal.source.name === 'Default' && cal.allowsModifications
        );
      }
      
      if (!defaultCalendar) {
        defaultCalendar = calendars.find(cal => 
          cal.allowsModifications && cal.source.type === Calendar.CalendarType.LOCAL
        );
      }
      
      if (!defaultCalendar) {
        defaultCalendar = calendars.find(cal => cal.allowsModifications);
      }

      if (!defaultCalendar) {
        Alert.alert(
          "Calendar Error", 
          "No writable calendar found on your device. Please ensure you have a calendar app installed and configured.",
          [{ text: "OK" }]
        );
        return;
      }

      console.log('Using calendar:', {
        id: defaultCalendar.id,
        title: defaultCalendar.title,
        source: defaultCalendar.source.name
      });

      const startDate = new Date(rideData!.start_time);
      if (isNaN(startDate.getTime())) {
        Alert.alert("Error", "Invalid ride time format. Cannot add to calendar.");
        return;
      }
      
      const endDate = new Date(startDate);
      if (estimatedDuration.includes('hour')) {
        const hours = parseInt(estimatedDuration.split(' ')[0]) || 1;
        const minutesMatch = estimatedDuration.match(/(\d+)\s*minute/);
        const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
        endDate.setHours(endDate.getHours() + hours);
        endDate.setMinutes(endDate.getMinutes() + minutes);
      } else if (estimatedDuration.includes('minute')) {
        const minutes = parseInt(estimatedDuration.split(' ')[0]) || 60;
        endDate.setMinutes(endDate.getMinutes() + minutes);
      } else {
        endDate.setHours(endDate.getHours() + 2);
      }
        
      const availableSeats = rideData!.total_seats - rideData!.booked_seats;

      const eventDetails = {
        title: `🚗 ${rideData!.start_location} → ${rideData!.end_location}`,
        startDate: startDate,
        endDate: endDate,
        location: rideData!.start_location,
        notes: `🎯 UniPool Ride Details

📍 Pickup: ${rideData!.start_location}
🏁 Destination: ${rideData!.end_location}
👤 Host: ${rideData!.host_user_name || 'Host'}
💰 Price: ₹${rideData!.total_price} per person
🪑 Seats: ${availableSeats}/${rideData!.total_seats} available

🆔 Ride ID: ${rideId}

📱 Open UniPool app for more details and updates.`,
        timeZone: 'Asia/Kolkata',
        alarms: [
          { relativeOffset: -60 },
          { relativeOffset: -15 }
        ]
      };

      console.log('Creating event with details:', {
        title: eventDetails.title,
        startDate: eventDetails.startDate.toISOString(),
        endDate: eventDetails.endDate.toISOString(),
        calendarId: defaultCalendar.id
      });

      const eventId = await Calendar.createEventAsync(defaultCalendar.id, eventDetails);

      if (eventId) {
        Alert.alert(
          "✅ Added to Calendar", 
          `Your ride has been added to "${defaultCalendar.title}" calendar.\n\nReminders are set for:\n• 1 hour before departure\n• 15 minutes before departure`,
          [
            { text: "View in Calendar", onPress: () => {
                if (Platform.OS === "ios") {
                  Linking.openURL(`calshow:${startDate.getTime() / 1000}`);
                } else {
                  Linking.openURL("content://com.android.calendar/time/" + startDate.getTime());
                }
              }
            },
            { text: "Great!" }
          ]
        );
      } else {
        Alert.alert("Error", "Failed to create calendar event. Please try again.");
      }
    } catch (error: any) {
      console.error("Calendar error:", error);
      
      let errorMessage = "Failed to add event to calendar. Please try again.";
      if (error.message?.includes('permission')) {
        errorMessage = "Calendar permission denied. Please enable calendar access in your device settings.";
      } else if (error.message?.includes('not found')) {
        errorMessage = "No calendar app found on your device.";
      } else if (error.message?.includes('denied')) {
        errorMessage = "Calendar access was denied. Please enable calendar permissions in Settings.";
      }
      
      Alert.alert("Error", errorMessage);
    }
  };

  const handleAcceptBooking = async (bookingId: string) => {
    setIsActionLoading(true);
    setBookingError(null);
    try {
      console.log(`Attempting to accept booking: ${bookingId}`);
      
      try {
        const acceptResponse = await apiUtil.put(`/bookings/accept/${bookingId}`, {});
        console.log("Accept response:", acceptResponse);
      } catch (acceptError: any) {
        console.log("Accept error details:", acceptError);
        
        if (acceptError.message?.includes("Empty response") || acceptError.message?.includes("JSON Parse Error")) {
          console.log("Got empty response from accept - will check if acceptance was successful by fetching updated data");
        } else {
          throw acceptError;
        }
      }
      
      console.log("Fetching updated ride data to verify acceptance...");
      const completeRideData = await apiUtil.get<RideResponse>(`/ride/details/${rideId}`);
      if (completeRideData && completeRideData.bookings) {
        const transformedBookings = completeRideData.bookings.map((booking: any) => ({
          id: booking.id,
          passenger_id: booking.passenger_id,
          request_status: booking.request_status,
          created_at: booking.booking_created_at || booking.created_at,
          passenger: {
            id: booking.passenger_id,
            name: booking.passenger_name,
            email: booking.passenger_email,
            profile_picture_url: booking.passenger_profile_picture_url,
            contact_number: booking.passenger_contact_number,
          },
        }));
        
        // Check if the booking was actually accepted
        const acceptedBooking = transformedBookings.find((booking: any) => 
          booking.id === bookingId && booking.request_status === 'accepted'
        );
        
        if (acceptedBooking) {
          console.log("Booking successfully accepted - updating UI");
          setRequests(transformedBookings);
          setRideData(prev => prev ? { ...prev, booked_seats: completeRideData.booked_seats } : null);
        } else {
          console.error("Booking was not accepted - status may not have changed");
          setBookingError("Failed to accept booking - status unchanged");
        }
      } else {
        console.error("Failed to fetch updated ride data after acceptance");
        setBookingError("Unable to verify booking acceptance - please refresh");
      }
    } catch (error: any) {
      console.error("Error in handleAcceptBooking:", error);
      setBookingError(error.message || "Failed to accept booking");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    setIsActionLoading(true);
    setBookingError(null);
    try {
      console.log(`Attempting to reject booking: ${bookingId}`);
      
      try {
        const rejectResponse = await apiUtil.put(`/bookings/reject/${bookingId}`, {});
        console.log("Reject response:", rejectResponse);
      } catch (rejectError: any) {
        console.log("Reject error details:", rejectError);
        
        // If it's just an empty response error, continue and check if rejection was successful
        if (rejectError.message?.includes("Empty response") || rejectError.message?.includes("JSON Parse Error")) {
          console.log("Got empty response from reject - will check if rejection was successful by fetching updated data");
        } else {
          throw rejectError;
        }
      }
      
      console.log("Fetching updated ride data to verify rejection...");
      const completeRideData = await apiUtil.get<RideResponse>(`/ride/details/${rideId}`);
      if (completeRideData && completeRideData.bookings) {
        const transformedBookings = completeRideData.bookings.map((booking: any) => ({
          id: booking.id,
          passenger_id: booking.passenger_id,
          request_status: booking.request_status,
          created_at: booking.booking_created_at || booking.created_at,
          passenger: {
            id: booking.passenger_id,
            name: booking.passenger_name,
            email: booking.passenger_email,
            profile_picture_url: booking.passenger_profile_picture_url,
            contact_number: booking.passenger_contact_number,
          },
        }));
        
        // Check if the booking was actually rejected
        const rejectedBooking = transformedBookings.find((booking: any) => 
          booking.id === bookingId && booking.request_status === 'rejected'
        );
        
        if (rejectedBooking) {
          console.log("Booking successfully rejected - updating UI");
          setRequests(transformedBookings);
        } else {
          console.error("Booking was not rejected - status may not have changed");
          setBookingError("Failed to reject booking - status unchanged");
        }
      } else {
        console.error("Failed to fetch updated ride data after rejection");
        setBookingError("Unable to verify booking rejection - please refresh");
      }
    } catch (error: any) {
      console.error("Error in handleRejectBooking:", error);
      setBookingError(error.message || "Failed to reject booking");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRemovePassenger = async (bookingId: string) => {
    setIsActionLoading(true);
    setBookingError(null);
    try {
      console.log(`Attempting to delete booking: ${bookingId}`);
      
      try {
        const deleteResponse = await apiUtil.delete(`/booking/delete/${bookingId}`);
        console.log("Delete response:", deleteResponse);
      } catch (deleteError: any) {
        console.log("Delete error details:", deleteError);
        
        // If it's just an empty response error, we'll continue and check if the deletion was successful
        // by fetching the updated ride data. The backend might have successfully deleted but returned empty response.
        if (deleteError.message?.includes("Empty response") || deleteError.message?.includes("JSON Parse Error")) {
          console.log("Got empty response from delete - will check if deletion was successful by fetching updated data");
        } else {
          // For other errors, rethrow them
          throw deleteError;
        }
      }
      
      // Always fetch updated ride data to see the current state
      console.log("Fetching updated ride data to verify deletion...");
      const completeRideData = await apiUtil.get<RideResponse>(`/ride/details/${rideId}`);
      
      if (completeRideData && completeRideData.bookings) {
        const transformedBookings = completeRideData.bookings.map((booking: any) => ({
          id: booking.id,
          passenger_id: booking.passenger_id,
          request_status: booking.request_status,
          created_at: booking.booking_created_at || booking.created_at,
          passenger: {
            id: booking.passenger_id,
            name: booking.passenger_name,
            email: booking.passenger_email,
            profile_picture_url: booking.passenger_profile_picture_url,
            contact_number: booking.passenger_contact_number,
          },
        }));
        
        // Check if the booking was actually deleted by seeing if it's still in the list
        const bookingStillExists = transformedBookings.some((booking: any) => booking.id === bookingId);
        
        if (bookingStillExists) {
          console.error("Booking still exists after delete request - deletion may have failed");
          setBookingError("Failed to remove passenger - booking still exists");
        } else {
          console.log("Booking successfully removed - updating UI");
          setRequests(transformedBookings);
          setRideData(prev => prev ? { ...prev, booked_seats: completeRideData.booked_seats } : null);
        }
      } else {
        console.error("Failed to fetch updated ride data after deletion");
        setBookingError("Unable to verify passenger removal - please refresh");
      }
    } catch (error: any) {
      console.error("Error in handleRemovePassenger:", error);
      setBookingError(error.message || "Failed to remove passenger");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return <LoadingComponent />;
  }

  // Error state
  if (error || !rideData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <BrandInfo />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || "Ride not found"}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // HOST VIEW - Ride Management  
  if (isHost) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <BrandInfo />
        </View>

        <View style={styles.navigationRow}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronBack />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ride Management</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* Use RideCard component like in RideDetailsScreen */}
          <View style={styles.rideCardContainer}>
            <RideCard
              id={rideData.id || rideId}
              origin={rideData.start_location}
              destination={rideData.end_location}
              time={formatTime(rideData.start_time)}
              date={formatDate(rideData.start_time)}
              price={rideData.total_price}
              seatsAvailable={`${rideData.total_seats - rideData.booked_seats}/${rideData.total_seats}`}
              isSelected={true}
              variant={rideData.is_ongoing ? "inprogress" : "upcoming"}
            />
          </View>

          {/* Booking Management Section */}
          <Text style={styles.requestsHeader}>Ride Management</Text>
          
          {requestsLoading ? (
            <View style={styles.inlineLoadingContainer}>
              <LoadingComponent />
            </View>
          ) : bookingError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{bookingError}</Text>
            </View>
          ) : requests.length === 0 ? (
            <Text style={styles.emptyText}>No bookings found.</Text>
          ) : (
            requests.map((req, idx) => {
              const passengerName = req.passenger?.name || "Unknown User";
              const isCurrentUser = req.passenger_id === currentUserId;
              const isHostPassenger = rideData?.host_user_id === req.passenger_id;
              const isHostBooking = req.id === "host-booking";
              const canRemove = !isHostBooking && !isCurrentUser;

              let displayName = passengerName;
              if (isCurrentUser && isHostPassenger) {
                displayName = `${passengerName} (Host)`;
              } else if (isCurrentUser) {
                displayName = `${passengerName} (You)`;
              } else if (isHostPassenger) {
                displayName = `${passengerName} (Host)`;
              }

              if (showSlide && selectedRequest?.id === req.id) {
                return (
                  <View key={req.id || idx} style={styles.sliderOnlyContainer}>
                    <SlideToCreate
                      text={
                        isActionLoading
                          ? showSlide === "accept"
                            ? "Accepting..."
                            : showSlide === "reject"
                            ? "Rejecting..."
                            : `Removing ${passengerName}...`
                          : showSlide === "accept"
                          ? "Slide to accept user"
                          : showSlide === "reject"
                          ? "Slide to reject user"
                          : `Slide to remove ${passengerName}`
                      }
                      onSlideComplete={async () => {
                        const bookingId = req.id || req.booking_id;
                        if (showSlide === "accept") {
                          await handleAcceptBooking(bookingId);
                        } else if (showSlide === "reject") {
                          await handleRejectBooking(bookingId);
                        } else if (showSlide === "remove") {
                          if (!isHostBooking) {
                            await handleRemovePassenger(bookingId);
                          }
                        }
                        setShowSlide(null);
                        setSelectedRequest(null);
                      }}
                      disabled={isActionLoading}
                      sliderIcon={showSlide === "reject" ? require("../assets/red-slider.png") : require("../assets/slide.png")}
                      backgroundColor={showSlide === "accept" ? AppColors.secondaryDarkGreen : "#FF3B30"}
                      sliderButtonColor={AppColors.basicWhite}
                      textColor={AppColors.basicWhite}
                      borderColor={showSlide === "accept" ? AppColors.secondaryDarkGreen : "#FF3B30"}
                    />
                    {bookingError ? <Text style={styles.inlineErrorText}>{bookingError}</Text> : null}
                  </View>
                );
              }

              if (req.request_status === "pending") {
                return (
                  <View key={req.id || idx} style={styles.pendingRequestCard}>
                    <Text style={styles.pendingRequestName}>{displayName}</Text>
                    <View style={styles.pendingRequestActions}>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => {
                          setSelectedRequest(req);
                          setShowSlide("reject");
                        }}
                      >
                        <Image source={require("../assets/cross.png")} style={styles.actionIcon} />
                        <Text style={styles.rejectLabel}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => {
                          setSelectedRequest(req);
                          setShowSlide("accept");
                        }}
                      >
                        <Image source={require("../assets/check.png")} style={styles.actionIconAccept} />
                        <Text style={styles.acceptLabel}>Accept</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }

              // Accepted passenger
              return (
                <View
                  key={req.id || idx}
                  style={[styles.confirmedPassengerCard, isHostBooking && styles.hostPassengerCard]}
                >
                  <View style={styles.passengerInfo}>
                    <Text style={[styles.passengerName, isHostBooking && styles.hostPassengerName]}>{displayName}</Text>
                    <View style={[styles.statusBadge, isHostBooking && styles.hostStatusBadge]}>
                      <Text style={styles.passengerStatusText}>
                        {req.request_status === "pending" ? "Pending" : "Accepted"}
                      </Text>
                    </View>
                  </View>

                  {canRemove && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => {
                        setSelectedRequest(req);
                        setShowSlide("remove");
                      }}
                    >
                      <Image source={require("../assets/cross.png")} style={styles.removeIcon} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.bottomContainer}>
          <SlideToCreate
            onSlideComplete={handleCancelRide}
            text={isActionLoading ? "Deleting..." : "Slide to delete ride"}
            disabled={isActionLoading}
            sliderIcon={require("../assets/slide.png")}
          />
        </View>
      </SafeAreaView>
    );
  }

  // NON-HOST VIEW - Ride Details (similar to AvailableRideScreenSelected)
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BrandInfo />
      </View>

      <View style={styles.navigationRow}>
        <View style={styles.navigationLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronBack />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Show fallback UI for pending and rejected bookings */}
      {(userBookingStatus === 'pending' || userBookingStatus === 'rejected') ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
          <Image 
            source={require("../assets/sad.png")} 
            style={{ width: 200, height: 200, marginBottom: 20 }}
            resizeMode="contain"
          />
          <Text style={{
            fontSize: 24,
            fontFamily: "NunitoSans_700Bold",
            color: AppColors.basicBlack,
            textAlign: "center",
            marginBottom: 10
          }}>
            {userBookingStatus === 'pending' ? 'Request Pending' : 'Request Rejected'}
          </Text>
          <Text style={{
            fontSize: 16,
            fontFamily: "NunitoSans_400Regular",
            color: AppColors.basicBlack,
            textAlign: "center",
            marginBottom: 30
          }}>
            {userBookingStatus === 'pending' 
              ? 'Waiting for host confirmation. You\'ll be notified once the host responds.'
              : 'Unfortunately, your booking request was not accepted by the host.'
            }
          </Text>
          <View style={{ flexDirection: "row", gap: 15 }}>
            <TouchableOpacity
              style={{
                backgroundColor: AppColors.secondaryDarkGreen,
                paddingHorizontal: 25,
                paddingVertical: 12,
                borderRadius: 25,
                elevation: 2,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
              }}
              onPress={() => navigation.navigate("HomeScreen")}
            >
              <Text style={{
                color: "white",
                fontSize: 16,
                fontFamily: "NunitoSans_600SemiBold"
              }}>
                Find Rides
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: AppColors.primaryLightGreen,
                paddingHorizontal: 25,
                paddingVertical: 12,
                borderRadius: 25,
                borderWidth: 2,
                borderColor: AppColors.secondaryDarkGreen,
              }}
              onPress={handleCancelRide}
              disabled={isActionLoading}
            >
              <Text style={{
                color: AppColors.secondaryDarkGreen,
                fontSize: 16,
                fontFamily: "NunitoSans_600SemiBold"
              }}>
                {isActionLoading 
                  ? "Removing..." 
                  : userBookingStatus === 'pending'
                  ? "Cancel Request"
                  : "Remove Booking"
                }
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {/* {userBookingStatus === 'accepted' && (
            <View style={styles.acceptedStatusBanner}>
              <Image source={require('../assets/check.png')} style={styles.statusBannerIcon} />
              <View style={styles.statusBannerContent}>
                <Text style={styles.statusBannerTitle}>Booking Confirmed!</Text>
                <Text style={styles.statusBannerText}>Your seat is reserved. See you on the ride!</Text>
              </View>
            </View>
          )} */}

          <View style={styles.mainContent}>
            <View style={styles.combinedContainer}>
              <View style={styles.rideCard}>
                <View style={styles.routeSection}>
                  <View style={styles.routeDetails}>
                    <View style={styles.locationContainer}>
                      <View style={styles.startLocationRow}>
                        <View style={styles.startDot} />
                        <Text style={styles.locationText}>{rideData.start_location}</Text>
                      </View>
                      
                      <View style={styles.dottedPath}>
                        <View style={styles.dottedLine} />
                      </View>
                      
                      <View style={styles.endLocationRow}>
                        <Image source={require('../assets/navigation-2.png')} style={styles.endLocationIcon} />
                        <Text style={styles.locationText}>{rideData.end_location}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.scooterContainer}>
                    <Image source={getVehicleIcon(rideData.total_seats)} style={styles.scooterImage} resizeMode="contain" />
                  </View>
                </View>
                
                <View style={styles.infoRow}>
                  <View style={styles.seatsInfo}>
                    <Image source={require('../assets/sofa.png')} style={styles.seatIcon} />
                    <Text style={styles.seatsText}>{getSeatsText(rideData.total_seats, rideData.booked_seats)}</Text>
                  </View>
                  <View style={styles.priceInfo}>
                    <Text style={styles.priceText}>{getPriceText(rideData.total_price)}</Text>
                  </View>
                </View>
                
                <Text style={styles.creatorText}>
                  Ride Created by {rideData.host_user_name || 'Host'} on {formatDate(rideData.start_time)}
                </Text>
                <Text style={styles.yobText}>{getAgeText(rideData.host_user_yob)}</Text>
                
                <View style={styles.dateTimeContainer}>
                  <View style={styles.dateTimeBox}>
                    <Image source={require('../assets/calendar.png')} style={styles.calendarIcon} />
                    <Text style={styles.dateTimeText}>{formatDate(rideData.start_time)}</Text>
                  </View>
                  <View style={styles.dateTimeBox}>
                    <Image source={require('../assets/clock.png')} style={styles.clockIcon} />
                    <Text style={styles.dateTimeText}>{formatTime(rideData.start_time)}</Text>
                  </View>
                </View>
                
                <Text style={styles.estimatedTripText}>Estimated Trip Length: {estimatedDuration}</Text>
              </View>

              <View style={styles.mapSection}>
                {isValidCoordinate(rideData.start_latitude, rideData.start_longitude) && 
                 isValidCoordinate(rideData.end_latitude, rideData.end_longitude) ? (
                  <MapView
                    provider={PROVIDER_GOOGLE}
                    style={styles.mapView}
                    initialRegion={{
                      latitude: (rideData.start_latitude! + rideData.end_latitude!) / 2,
                      longitude: (rideData.start_longitude! + rideData.end_longitude!) / 2,
                      latitudeDelta: Math.abs(rideData.end_latitude! - rideData.start_latitude!) * 1.5 + 0.5,
                      longitudeDelta: Math.abs(rideData.end_longitude! - rideData.start_longitude!) * 1.5 + 0.5,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}
                    showsUserLocation={false}
                    showsMyLocationButton={false}
                    toolbarEnabled={false}
                    customMapStyle={customMapStyle}
                  >
                    <Marker
                      coordinate={{ latitude: rideData.start_latitude!, longitude: rideData.start_longitude! }}
                      title={rideData.start_location}
                      pinColor={AppColors.primaryLightGreen || "#B5D750"}
                    />
                    
                    <Marker
                      coordinate={{ latitude: rideData.end_latitude!, longitude: rideData.end_longitude! }}
                      title={rideData.end_location}
                      pinColor={AppColors.secondaryDarkGreen || "#273B33"}
                    />
                    
                    {routeCoordinates.length > 0 && (
                      <Polyline
                        coordinates={routeCoordinates}
                        strokeColor={AppColors.secondaryDarkGreen || "#273B33"}
                        strokeWidth={3}
                        lineDashPattern={[0]}
                        lineJoin="round"
                        lineCap="round"
                      />
                    )}
                  </MapView>
                ) : (
                  <View style={styles.mapPlaceholder}>
                    <Image source={require('../assets/location-pin.png')} style={styles.mapPlaceholderIcon} />
                    <Text style={styles.mapPlaceholderTitle}>Route Map</Text>
                    <Text style={styles.loadingText}>{rideData.start_location} → {rideData.end_location}</Text>
                    <Text style={styles.mapPlaceholderSubtext}>Map coordinates not available</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.bottomActionsContainer}>
            <SlideToCreate
              onSlideComplete={handleCancelRide}
              text={
                isActionLoading 
                  ? "Cancelling..." 
                  : "Slide to cancel booking"
              }
              disabled={isActionLoading}
              sliderIcon={require("../assets/slide.png")}
            />
            
            <TouchableOpacity 
              style={styles.calendarButton}
              onPress={handleAddToCalendar}
            >
              <Image source={require('../assets/calendar.png')} style={styles.calendarButtonIcon} />
              <Text style={styles.calendarButtonText}>Add to calendar</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'NunitoSans_600SemiBold',
    color: AppColors.basicBlack,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'NunitoSans_400Regular',
  },
  retryButton: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: AppColors.basicWhite,
    fontSize: 16,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  rideCardContainer: {
    marginBottom: 20,
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
    padding: 20,
  },
  mapPlaceholderIcon: {
    width: 24,
    height: 24,
    tintColor: AppColors.secondaryDarkGreen,
    marginBottom: 8,
  },
  mapPlaceholderTitle: {
    color: AppColors.secondaryDarkGreen,
    fontSize: 16,
    fontFamily: 'NunitoSans_600SemiBold',
    marginBottom: 4,
  },
  mapPlaceholderSubtext: {
    color: '#666666',
    fontSize: 12,
    fontFamily: 'NunitoSans_400Regular',
    textAlign: 'center',
  },
  loadingText: {
    color: AppColors.basicBlack,
    fontSize: 14,
    fontFamily: 'NunitoSans_400Regular',
    textAlign: 'center',
    marginBottom: 4,
  },
  bottomContainer: {
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  bottomActionsContainer: {
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: -5,
  },
  calendarButtonIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    tintColor: AppColors.primaryLightGreen,
  },
  calendarButtonText: {
    color: AppColors.primaryLightGreen,
    fontSize: 16,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  // Booking management styles
  requestsHeader: {
    fontSize: 18,
    fontFamily: "NunitoSans_700Bold",
    color: AppColors.basicBlack,
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  inlineLoadingContainer: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 16,
  },
  emptyText: {
    color: AppColors.basicBlack,
    fontSize: 16,
    fontFamily: "NunitoSans_400Regular",
    marginLeft: 16,
  },
  pendingRequestCard: {
    backgroundColor: AppColors.basicBlack,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pendingRequestName: {
    color: AppColors.basicWhite,
    fontSize: 16,
    fontFamily: "NunitoSans_600SemiBold",
    flex: 1,
    marginRight: 16,
  },
  pendingRequestActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  rejectButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  acceptButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  actionIcon: {
    width: 24,
    height: 24,
    marginBottom: 2,
    resizeMode: "contain",
  },
  actionIconAccept: {
    width: 24,
    height: 24,
    marginBottom: 2,
    resizeMode: "contain",
  },
  rejectLabel: {
    color: AppColors.basicWhite,
    fontSize: 11,
    fontFamily: "NunitoSans_400Regular",
    textAlign: "center",
  },
  acceptLabel: {
    color: "#C6FF00",
    fontSize: 11,
    fontFamily: "NunitoSans_600SemiBold",
    textAlign: "center",
  },
  integratedSliderContainer: {
    flex: 1,
    marginTop: 8,
  },
  inlineErrorText: {
    color: "red",
    fontSize: 12,
    fontFamily: "NunitoSans_400Regular",
    textAlign: "center",
    marginTop: 8,
  },
  confirmedPassengerCard: {
    backgroundColor: AppColors.basicWhite,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hostPassengerCard: {
    backgroundColor: AppColors.primaryLightGreen,
    borderWidth: 2,
    borderColor: AppColors.secondaryDarkGreen,
    elevation: 3,
    shadowOpacity: 0.15,
  },
  passengerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginRight: 12,
  },
  passengerName: {
    color: AppColors.basicBlack,
    fontSize: 16,
    fontFamily: "NunitoSans_600SemiBold",
    flex: 1,
  },
  hostPassengerName: {
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_700Bold",
  },
  statusBadge: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hostStatusBadge: {
    backgroundColor: AppColors.basicBlack,
  },
  passengerStatusText: {
    color: AppColors.basicWhite,
    fontSize: 11,
    fontFamily: "NunitoSans_600SemiBold",
  },
  removeButton: {
    backgroundColor: "#FF3B30",
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  removeIcon: {
    width: 14,
    height: 14,
    tintColor: "#fff",
  },
  sliderOnlyContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  acceptedStatusBanner: {
    backgroundColor: '#D4EDDA',
    borderColor: '#C3E6CB',
    borderWidth: 1,
    borderRadius: 8,
    margin: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBannerIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    tintColor: AppColors.basicBlack,
  },
  statusBannerContent: {
    flex: 1,
  },
  statusBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'NunitoSans_600SemiBold',
    color: AppColors.basicBlack,
    marginBottom: 4,
  },
  statusBannerText: {
    fontSize: 14,
    fontFamily: 'NunitoSans_400Regular',
    color: AppColors.basicBlack + 'CC',
    lineHeight: 20,
  },
});

export default RideDetailsScreen;