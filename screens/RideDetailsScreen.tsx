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
    stylers: [{ color: "#f8f8f8" }]
  },
  {
    featureType: "all",
    elementType: "labels.text.fill",
    stylers: [{ color: "#273B33" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#B5D750" }, { weight: 2 }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#b3d9ff" }]
  },
  // Add other style properties as needed
];

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
        } else if (!isUserHost && completeRideData.bookings) {
          // For passengers, find their own booking
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
        }
        
        console.log("Ride details:", completeRideData);
        console.log("Current user ID:", userId);
        console.log("Is host:", isUserHost);
        
      } catch (err: any) {
        console.error("Error fetching ride details:", err);
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
    if (rideData && isValidCoordinate(rideData.start_latitude, rideData.start_longitude) && 
        isValidCoordinate(rideData.end_latitude, rideData.end_longitude)) {
      
      const distance = calculateDistance(
        rideData.start_latitude!,
        rideData.start_longitude!,
        rideData.end_latitude!,
        rideData.end_longitude!
      );
      
      const duration = calculateEstimatedDuration(distance);
      setEstimatedDuration(duration);
      
      const dynamicRoute = generateRouteCoordinates(
        rideData.start_latitude!,
        rideData.start_longitude!,
        rideData.end_latitude!,
        rideData.end_longitude!
      );
      setRouteCoordinates(dynamicRoute);
    }
  }, [rideData]);

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
                await apiUtil.delete(`/ride/delete/${rideId}`);
                Alert.alert("Success", "Ride deleted successfully", [
                  { 
                    text: "OK", 
                    onPress: () => navigation.goBack() 
                  }
                ]);
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
      Alert.alert(
        "Cancel Booking",
        "Are you sure you want to cancel your booking for this ride?",
        [
          { text: "No", style: "cancel" },
          { 
            text: "Yes", 
            style: "destructive",
            onPress: async () => {
              setIsActionLoading(true);
              try {
                const userBooking = requests.find(req => req.passenger_id === currentUserId);
                if (userBooking) {
                  await apiUtil.delete(`/booking/delete/${userBooking.id}`);
                  Alert.alert("Success", "Your booking has been cancelled successfully.", [
                    { 
                      text: "OK", 
                      onPress: () => navigation.goBack() 
                    }
                  ]);
                } else {
                  Alert.alert("Error", "No booking found to cancel");
                }
              } catch (error: any) {
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
      await apiUtil.put(`/bookings/accept/${bookingId}`, {});
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
        setRequests(transformedBookings);
        setRideData(prev => prev ? { ...prev, booked_seats: completeRideData.booked_seats } : null);
      }
    } catch (error: any) {
      setBookingError(error.message || "Failed to accept booking");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    setIsActionLoading(true);
    setBookingError(null);
    try {
      await apiUtil.put(`/bookings/reject/${bookingId}`, {});
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
        setRequests(transformedBookings);
      }
    } catch (error: any) {
      setBookingError(error.message || "Failed to reject booking");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRemovePassenger = async (bookingId: string) => {
    setIsActionLoading(true);
    setBookingError(null);
    try {
      await apiUtil.delete(`/booking/delete/${bookingId}`);
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
        setRequests(transformedBookings);
        setRideData(prev => prev ? { ...prev, booked_seats: completeRideData.booked_seats } : null);
      }
    } catch (error: any) {
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

              // Slide view for actions
              if (showSlide && selectedRequest?.id === req.id) {
                return (
                  <View key={req.id || idx} style={styles.pendingRequestCard}>
                    <Text style={styles.pendingRequestName}>
                      {isActionLoading
                        ? showSlide === "accept"
                          ? "Accepting..."
                          : showSlide === "reject"
                          ? "Rejecting..." 
                          : `Removing ${passengerName}...`
                        : displayName}
                    </Text>

                    <View style={styles.pendingRequestActions}>
                      {showSlide !== "accept" && (
                        <TouchableOpacity
                          style={styles.rejectButton}
                          onPress={() => {
                            if (showSlide === "remove") {
                              setShowSlide(null);
                              setSelectedRequest(null);
                              setBookingError(null);
                              return;
                            }
                            setSelectedRequest(req);
                            setShowSlide("reject");
                          }}
                        >
                          <Image source={require("../assets/cross.png")} style={styles.actionIcon} />
                          <Text style={styles.rejectLabel}>{showSlide === "remove" ? "Cancel" : "Reject"}</Text>
                        </TouchableOpacity>
                      )}

                      <View style={styles.acceptButton}>
                        <Image source={require("../assets/check.png")} style={styles.actionIconAccept} />
                        <Text style={styles.acceptLabel}>
                          {showSlide === "accept" ? "Accept" : showSlide === "reject" ? "Reject" : "Remove"}
                        </Text>

                        <View style={styles.integratedSliderContainer}>
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
                            sliderIcon={showSlide === "reject" ? require("../assets/red-slider.png") : require("../assets/slide.png")}
                            backgroundColor={AppColors.basicWhite}
                            sliderButtonColor={showSlide === "accept" ? AppColors.secondaryDarkGreen : "#FF3B30"}
                            textColor={showSlide === "accept" ? AppColors.secondaryDarkGreen : "#FF3B30"}
                            borderColor={AppColors.basicWhite}
                          />
                          {bookingError ? <Text style={styles.inlineErrorText}>{bookingError}</Text> : null}
                        </View>
                      </View>
                    </View>
                  </View>
                );
              }

              // Pending request
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
            {hasPermission && isValidCoordinate(rideData.start_latitude, rideData.start_longitude) && 
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

      <View style={styles.bottomActionsContainer}>
        <SlideToCreate
          onSlideComplete={handleCancelRide}
          text={isActionLoading ? "Cancelling..." : "Slide to cancel booking"}
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
  },
  loadingText: {
    color: AppColors.basicBlack,
    fontSize: 16,
    fontFamily: 'NunitoSans_400Regular',
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
    borderRadius: 25,
    marginTop: 12,
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
    width: 220,
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
});

export default RideDetailsScreen;