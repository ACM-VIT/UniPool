import React, { useState, useEffect, useCallback, useRef } from "react";
import { ScrollView, View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Share } from 'react-native';
// const shareIcon = require('../assets/megaphone.png');
// `TripPreviewMap` owns the non-interactive A→B map composition that
// used to live inline here as a `<MapView>` + `<Marker>` + `<Polyline>`
// block. Same component drives the trip preview on
// AvailableRideScreenSelected. Removing `react-native-maps` from this
// file's imports because nothing else on the screen uses it.
import TripPreviewMap from '../components/TripPreviewMap';
import Svg, { Circle as SvgCircle, Path as SvgPath } from "react-native-svg";
import { useFocusEffect, useRouter } from "expo-router";
import { useApi } from "../utils/ApiUtil";
import { useUser } from "../contexts/UserContext";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";
import ChevronBack from '../components/ChevronBack/ChevronBack';
import HomeBack from '../components/HomeBack';
import SlideToCreate from '../components/SlideToCreate/SlideToCreate';
import BrandInfo from '../components/BrandInfo/BrandInfo';
import LoadingComponent from "../components/LoadingComponent";
import RideCard from "../components/RideCard";
import BrandedAlert from "../components/BrandedAlert";
import ShareRideSheet from "../components/ShareRideSheet";
import PassengerProfileSheet, { PassengerProfile } from "../components/PassengerProfileSheet";
import RouteStack from "../components/RouteStack";
import { appHref, useDecodedLocalSearchParams } from "../navigation/routes";
import { useTabletContentStyle, useTabletScrollContentStyle } from "../utils/responsive";
import { hasSeatsLeft, seatsAvailableLabel } from "../utils/seatMath";
import { displayRideLocation } from "../utils/LocationService";
import { describeBookingRequestError } from "../utils/bookingRequestError";
import { DOWNLOAD_URL, rideShareUrl } from "../config/share";

/**
 * Small lime "open profile" eye icon. Stroke-only so it sits in the
 * same visual family as check.png / cross.png (both pure line-art).
 * A filled pupil reads too heavy next to the thin strokes — the eye
 * jumped out as the "loudest" icon in the trio, which inverted the
 * intended hierarchy (View should feel like a secondary affordance).
 */
const EyeGlyph: React.FC = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <SvgPath
      d="M12 5c-5 0-9 4-10 7 1 3 5 7 10 7s9-4 10-7c-1-3-5-7-10-7z"
      stroke="#B5D750"
      strokeWidth={2.2}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <SvgCircle
      cx={12}
      cy={12}
      r={2.5}
      stroke="#B5D750"
      strokeWidth={2.2}
      fill="none"
    />
  </Svg>
);

/**
 * Speech-bubble glyph matching EyeGlyph's line-art weight. Lives
 * next to View / Reject / Accept on a pending-requester row as the
 * "DM this person" affordance — the only way for the host to ping
 * a requester before accepting them, since pending passengers
 * aren't in the ride group chat yet.
 */
const ChatBubbleGlyph: React.FC = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <SvgPath
      d="M4 7c0-1.6 1.4-3 3-3h10c1.6 0 3 1.4 3 3v8c0 1.6-1.4 3-3 3h-5l-4 3v-3H7c-1.6 0-3-1.4-3-3V7z"
      stroke="#B5D750"
      strokeWidth={2.2}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const { width, height } = Dimensions.get("window");
const DEBUG_RIDE_DETAILS =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_DEBUG_RIDE_DETAILS === "1";

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

const correctCoordinatesForLocation = (locationName?: string | null, currentLat?: number, currentLon?: number): { latitude: number; longitude: number } | null => {
  if (!currentLat || !currentLon) return null;
  
  const isInIndiaBounds = currentLat >= 6 && currentLat <= 37 && currentLon >= 68 && currentLon <= 97;
  
  if (isInIndiaBounds) {
    return { latitude: currentLat, longitude: currentLon };
  }

  const normalizedLocationName = locationName?.trim();
  if (!normalizedLocationName) {
    return { latitude: currentLat, longitude: currentLon };
  }
  
  const commonLocation = CommonLocationCoordinates.find(
    loc => loc.location.toLowerCase().includes(normalizedLocationName.toLowerCase()) ||
           normalizedLocationName.toLowerCase().includes(loc.location.toLowerCase())
  );
  
  if (commonLocation) {
    if (DEBUG_RIDE_DETAILS) {
      console.log(`Correcting coordinates for "${normalizedLocationName}" from (${currentLat}, ${currentLon}) to (${commonLocation.latitude}, ${commonLocation.longitude})`);
    }
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
    passenger_upi_vpa?: string;
    passenger_is_verified?: boolean;
    passenger_institute_name?: string;
  }>;
  [key: string]: any;
}

type ViewerState =
  | "host"
  | "confirmed_passenger"
  | "pending_passenger"
  | "rejected_passenger"
  | "available"
  | "full"
  | "past";

const RideDetailsScreen: React.FC = () => {
  const colors = useThemeColors();
  const { navigate, replace, back } = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const tabletScrollContentStyle = useTabletScrollContentStyle();
  const routeParams = useDecodedLocalSearchParams<{
    rideId?: string;
    expectedViewerState?: ViewerState;
    // True when the opening flow should return home instead of back to a form.
    backToHome?: boolean | string;
  }>();
  const { rideId } = routeParams;
  // `backToHome` arrives as a string via URL params; normalise to
  // a real boolean so the conditional is unambiguous.
  const backToHome =
    routeParams.backToHome === true || routeParams.backToHome === "true";
  const { apiUtil } = useApi();
  const { user: contextUser } = useUser();
  const hasFocusedOnceRef = useRef(false);
  
  // State management
  const [rideData, setRideData] = useState<RideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Server-computed UI state — the single source of truth. `isHost`
  // and `userBookingStatus` below are now thin derivations of this
  // so the existing JSX keeps working without conditional rewrites.
  const [viewerState, setViewerState] = useState<ViewerState | null>(
    routeParams.expectedViewerState ?? null,
  );
  const [viewerActions, setViewerActions] = useState<{
    can_request_seat?: boolean;
    can_cancel_booking?: boolean;
    can_cancel_ride?: boolean;
    can_accept_passengers?: boolean;
    can_open_chat?: boolean;
    can_rate?: boolean;
  }>({});

  const [isHost, setIsHost] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  // Booking actions update optimistically and dismiss their sheet immediately.
  // Passenger profile sheet — opens when the host taps any passenger
  // row in the management list. Holds the passenger payload as state
  // so the sheet's accept/reject/remove handlers know who they're
  // acting on without prop drilling.
  const [profileSheetPassenger, setProfileSheetPassenger] =
    useState<PassengerProfile | null>(null);

  // Passenger booking state — derived from viewer_state. Kept as
  // separate state variables only so the existing render conditionals
  // continue to compile; we never compute them from raw fields anymore.
  const [userBookingStatus, setUserBookingStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>(
    routeParams.expectedViewerState === "pending_passenger"
      ? "pending"
      : routeParams.expectedViewerState === "confirmed_passenger"
      ? "accepted"
      : routeParams.expectedViewerState === "rejected_passenger"
      ? "rejected"
      : "none",
  );
  const [userBooking, setUserBooking] = useState<any>(null);
  
  // Host management state
  const [showSlide, setShowSlide] = useState<null | "accept" | "reject" | "remove">(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Map related state
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
  return `${hours}${minutes}hrs`;
    } catch (error) {
      return '1700 hrs';
    }
  };

  const formatTimeDisplay = (timeString: string): string => {
    try {
      const date = new Date(timeString);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes} hrs`;
    } catch (error) {
      return timeString;
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

  // Discounts the host's seat from total_seats so the display reads
  // as "passenger seats available / passenger capacity". See
  // utils/seatMath for the canonical contract.
  const getSeatsText = (totalSeats: number, bookedSeats: number): string => {
    return `${seatsAvailableLabel(totalSeats, bookedSeats)} seats available`;
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

  /**
   * Returns true if the ride is over. A ride is considered over if
   * the current time is more than 24 hours after the ride start time.
   */
  const isRideOver = (startTime?: string | null): boolean => {
    if (!startTime) return false;
    const start = new Date(startTime);
    if (isNaN(start.getTime())) return false;
    const oneDayMs = 24 * 60 * 60 * 1000;
    return Date.now() > (start.getTime() + oneDayMs);
  };

  useEffect(() => {
    const fetchRideDetails = async () => {
      setLoading(true);
      setError(null);

      if (!rideId) {
        setRideData(null);
        setError("Ride details are missing. Please reopen this trip from Your trips.");
        setLoading(false);
        setRequestsLoading(false);
        return;
      }
      
      try {
        const userIdPromise = contextUser?.id
          ? Promise.resolve(contextUser.id)
          : apiUtil
              .get<UserResponse>("/user/details?summary=1")
              .then((response) => response?.user?.id ?? null);
        const rideDetailsPromise = apiUtil.get<RideResponse>(`/ride/details/${rideId}`);

        const [userId, completeRideData] = await Promise.all([
          userIdPromise,
          rideDetailsPromise,
        ]);
        setCurrentUserId(userId);
        setRideData(completeRideData);

        // ----- Server-computed state -----
        // Read viewer_state + actions directly. Everything else
        // below (isHost, userBookingStatus, userBooking) is just a
        // derivation of these two fields so the existing render
        // conditionals keep working without rewrites.
        const vs = (completeRideData as any).viewer_state as ViewerState | undefined;
        const vAct = (completeRideData as any).actions || {};
        const vBookingId = (completeRideData as any).viewer_booking_id as string | undefined;
        if (vs) setViewerState(vs);
        setViewerActions(vAct);

        const isUserHost =
          vs === 'host' ||
          // Fallback for pre-migration backends.
          completeRideData.is_user_host ||
          false;
        setIsHost(isUserHost);

        if (isUserHost) {
          setCurrentUser({
            id: completeRideData.host?.id || userId,
            name: completeRideData.host?.name || completeRideData.host_user_name,
            email: completeRideData.host?.email || '',
            profile_picture_url: completeRideData.host?.profile_picture_url || '',
          });
        }

        // Bookings list (used by the host's "Requests" pane).
        if (completeRideData.bookings) {
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

        // Derive passenger-side state from viewer_state. The viewer
        // booking ID came down with the response so we don't need to
        // scan the bookings array — O(1) instead of O(N).
        if (vs === 'pending_passenger') {
          setUserBookingStatus('pending');
        } else if (vs === 'confirmed_passenger') {
          setUserBookingStatus('accepted');
        } else if (vs === 'rejected_passenger') {
          setUserBookingStatus('rejected');
        } else {
          setUserBookingStatus('none');
        }

        if (vBookingId) {
          // Hydrate userBooking from the bookings list (already
          // loaded above) so cancel handlers have everything they
          // need without an extra round-trip.
          const found = completeRideData.bookings?.find(
            (b: any) => b.id === vBookingId,
          );
          setUserBooking(
            found
              ? {
                  id: found.id,
                  passenger_id: found.passenger_id,
                  request_status: found.request_status,
                  created_at: found.booking_created_at || found.created_at,
                  passenger: {
                    id: found.passenger_id,
                    name: found.passenger_name,
                    email: found.passenger_email,
                    profile_picture_url: found.passenger_profile_picture_url,
                    contact_number: found.passenger_contact_number,
                    upi_vpa: found.passenger_upi_vpa,
                    is_verified: found.passenger_is_verified,
                    institute_name: found.passenger_institute_name,
                  },
                }
              : null,
          );
        } else {
          setUserBooking(null);
        }
        
        if (DEBUG_RIDE_DETAILS) {
          console.log("Ride details:", completeRideData);
          console.log("Current user ID:", userId);
          console.log("Viewer state:", vs);
          console.log("Is host:", isUserHost);
          console.log("Bookings found:", completeRideData.bookings);
          console.log("Coordinates:", {
            start_lat: completeRideData.start_latitude,
            start_lon: completeRideData.start_longitude,
            end_lat: completeRideData.end_latitude,
            end_lon: completeRideData.end_longitude
          });
        }
        
      } catch (err: any) {
        console.error("Error fetching ride details:", err);
        
        // Handle user not found error gracefully - redirect to signup without showing error modal
        if (err.status === 404 && err.message && err.message.includes("User not found")) {
          if (DEBUG_RIDE_DETAILS) console.log("User not found, redirecting to signup");
          navigate(appHref("SignUpScreen"));
          return;
        }
        
        setError(err.message || "Failed to fetch ride details");
      } finally {
        setLoading(false);
        setRequestsLoading(false);
      }
    };

    fetchRideDetails();
  }, [rideId, apiUtil, navigate, refreshTick, contextUser?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return undefined;
      }
      setRefreshTick((tick) => tick + 1);
      return undefined;
    }, []),
  );

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
      
      if (DEBUG_RIDE_DETAILS) {
        console.log('Original coordinates:', {
          start: { lat: rideData.start_latitude, lon: rideData.start_longitude },
          end: { lat: rideData.end_latitude, lon: rideData.end_longitude }
        });
        console.log('Corrected coordinates:', {
          start: correctedStartCoords,
          end: correctedEndCoords
        });
      }
      
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
        if (DEBUG_RIDE_DETAILS) console.log('Invalid or missing coordinates, using fallback duration');
      }
    }
  }, [rideData?.id]); // Use rideData.id as dependency to avoid infinite loops

  // Open the ride's group chat. Used by the "Open trip chat"
  // button on both the host's Ride Management screen and the
  // accepted-passenger Ride Details screen. Keeps the navigation
  // shape identical to PassengerProfileSheet's onMessage handler
  // for accepted passengers — single source of truth for the
  // chatTitle convention ("Trip to <short-dest>").
  const openRideChat = () => {
    if (!rideData) return;
    const shortDest = (
      (rideData.end_location || "").split(",")[0] || ""
    ).trim();
    navigate(
      appHref("ChatMessages", {
        chatId: rideData.id || rideId || "",
        chatTitle: shortDest ? `Trip to ${shortDest}` : "Trip",
        userId: currentUserId || undefined,
        isGroupChat: true,
        hostUserId: rideData.host_user_id,
      } as any),
    );
  };

  // Open the host -> requester DM. Mirrors the pending-passenger
  // branch of PassengerProfileSheet's onMessage. Used by the
  // chat-bubble icon on a pending requester's row so the host can
  // ping them without going through the profile sheet first.
  const openRequesterDM = (req: any) => {
    if (!rideData || !currentUserId) return;
    const passengerName = req.passenger?.name || "Requester";
    const sorted = [currentUserId, req.passenger_id].sort();
    const dmRoomId = `dm_${sorted[0]}_${sorted[1]}`;
    navigate(
      appHref("ChatMessages", {
        chatId: dmRoomId,
        chatTitle: passengerName,
        userId: currentUserId,
        isGroupChat: false,
        otherUserId: req.passenger_id,
        pendingHostInquiry: true,
        viewerIsHost: true,
        pendingRideId: rideData.id,
        pendingHostName: passengerName,
        pendingRideStartLocation: rideData.start_location,
        pendingRideEndLocation: rideData.end_location,
        pendingRideStartTime: rideData.start_time,
        hostPendingRequestBookingId: req.id,
      } as any),
    );
  };

  // Request a seat from the deep-link / share-link entry point.
  // RideDetailsScreen is the landing target for shared ride URLs;
  // when a viewer arrives without an existing booking, the bottom
  // slider should let them ask to join, not cancel a booking that
  // doesn't exist. Mirrors AvailableRideScreenSelected's
  // handleRequestRide — same POST, same optimistic flip, same hop
  // to the RideRequestedScreen interstitial.
  const handleRequestRide = async () => {
    if (isActionLoading || !rideData) return;
    setIsActionLoading(true);
    try {
      const resp: any = await apiUtil.postSilent("/bookings/request", {
        ride_id: rideData.id || rideId,
        request_status: "pending",
      });
      const bookingId = resp?.id || resp?.booking_id || null;
      // Flip local state so the next render lands on the "Waiting
      // on the host" fallback UI without a refetch round-trip.
      setViewerState("pending_passenger");
      setUserBookingStatus("pending");
      replace(
        appHref("RideRequestedScreen", {
          rideId: rideData.id || rideId,
          bookingId,
          rideDetails: {
            from: rideData.start_location,
            to: rideData.end_location,
            time: rideData.start_time,
            price: rideData.total_price,
            driver: rideData.host_user_name,
          },
          hostUserId: rideData.host_user_id,
          hostUserName: rideData.host_user_name,
        } as any),
      );
    } catch (err: any) {
      const requestError = describeBookingRequestError(err);
      if (requestError.blockState === "full" || requestError.blockState === "past") {
        setViewerState(requestError.blockState);
        setViewerActions((actions) => ({ ...actions, can_request_seat: false }));
      } else if (requestError.blockState === "pending_passenger") {
        setViewerState("pending_passenger");
        setUserBookingStatus("pending");
      }
      setRefreshTick((tick) => tick + 1);
      BrandedAlert.alert("Couldn't request", requestError.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelRide = async () => {
    if (isActionLoading) return;

    if (isHost) {
      BrandedAlert.alert(
        "Delete this ride?",
        "Riders who booked will be notified. This can't be undone.",
        [
          { text: "Keep ride", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              setIsActionLoading(true);
              try {
                if (DEBUG_RIDE_DETAILS) console.log(`Attempting to delete ride: ${rideId}`);
                
                try {
                  const deleteResponse = await apiUtil.delete(`/ride/delete/${rideId}`);
                  if (DEBUG_RIDE_DETAILS) console.log("Delete ride response:", deleteResponse);
                  
                  BrandedAlert.alert("Ride deleted", "It's no longer visible to anyone.", [
                    {
                      text: "OK",
                      onPress: () => back()
                    }
                  ]);
                } catch (deleteError: any) {
                  if (DEBUG_RIDE_DETAILS) console.log("Delete ride error details:", deleteError);
                  
                  // If it's just an empty response error, treat as success since backend likely processed it
                  if (deleteError.message?.includes("Empty response") || deleteError.message?.includes("JSON Parse Error")) {
                    if (DEBUG_RIDE_DETAILS) console.log("Got empty response from delete ride - treating as success");
                    BrandedAlert.alert("Ride deleted", "It's no longer visible to anyone.", [
                      {
                        text: "OK",
                        onPress: () => back()
                      }
                    ]);
                  } else {
                    throw deleteError;
                  }
                }
              } catch (error: any) {
                console.error("Delete ride error:", error);
                
                let errorMessage = "Couldn't delete the ride. Try again?";
                if (error.message && error.message.includes("accepted bookings")) {
                  errorMessage = "You've already accepted riders. Remove them first, then delete.";
                } else if (error.status === 403) {
                  errorMessage = "Only the host can delete this ride.";
                } else if (error.status === 404) {
                  errorMessage = "This ride is already gone.";
                } else if (error.status === 400) {
                  errorMessage = error.message || "Something's off with this request.";
                } else if (error.status === 500) {
                  errorMessage = "Our server hiccupped. Give it a moment and try again.";
                }

                BrandedAlert.alert("Couldn't delete the ride", errorMessage);
              } finally {
                setIsActionLoading(false); 
              }
            }
          }
        ]
      );
    } else {
      let alertTitle = "Cancel your booking?";
      let alertMessage = "You'll give up your seat on this ride.";

      if (userBookingStatus === 'pending') {
        alertTitle = "Cancel your request?";
        alertMessage = "Your seat request will be withdrawn.";
      } else if (userBookingStatus === 'accepted') {
        alertTitle = "Cancel your seat?";
        alertMessage = "The host will be notified. Repeat cancellations can affect your rating.";
      } else if (userBookingStatus === 'rejected') {
        alertTitle = "Remove this booking?";
        alertMessage = "It'll disappear from your trips.";
      }
      
      BrandedAlert.alert(
        alertTitle,
        alertMessage,
        [
          { text: "Keep it", style: "cancel" },
          {
            text: "Yes, cancel",
            style: "destructive",
            onPress: async () => {
              setIsActionLoading(true);
              try {
                if (userBooking) {
                  if (DEBUG_RIDE_DETAILS) console.log(`Attempting to cancel user booking: ${userBooking.id}`);
                  
                  try {
                    const deleteResponse = await apiUtil.delete(`/booking/delete/${userBooking.id}`);
                    if (DEBUG_RIDE_DETAILS) console.log("Cancel booking response:", deleteResponse);
                    
                    BrandedAlert.alert("Booking cancelled", "Your seat is no longer reserved.", [
                      {
                        text: "OK",
                        onPress: () => back()
                      }
                    ]);
                  } catch (deleteError: any) {
                    if (DEBUG_RIDE_DETAILS) console.log("Cancel booking error details:", deleteError);
                    
                    // If it's just an empty response error, treat as success since backend likely processed it
                    if (deleteError.message?.includes("Empty response") || deleteError.message?.includes("JSON Parse Error")) {
                      if (DEBUG_RIDE_DETAILS) console.log("Got empty response from cancel booking - treating as success");
                      BrandedAlert.alert("Booking cancelled", "Your seat is no longer reserved.", [
                        {
                          text: "OK",
                          onPress: () => back()
                        }
                      ]);
                    } else {
                      throw deleteError;
                    }
                  }
                } else {
                  BrandedAlert.alert("Nothing to cancel", "We couldn't find that booking.");
                }
              } catch (error: any) {
                console.error("Error cancelling booking:", error);
                BrandedAlert.alert("Couldn't cancel", error.message || "Try again in a moment.");
              } finally {
                setIsActionLoading(false);
              }
            }
          }
        ]
      );
    }
  };

  // Distinguishes network blips from real backend errors when a
  // booking action (accept / reject / remove) fails. The host's
  // mobile network drops a packet way more often than the backend
  // returns a real 4xx — flagging the network case as such (with
  // "try again") avoids the false "Couldn't accept" panic the
  // user reported, where the real failure was just a TCP timeout.
  const describeBookingActionError = (err: any, what: string): string => {
    const msg = String(err?.message ?? "");
    const status = err?.response?.status;
    // Fetch / RN errors that scream "no response from server":
    // - "Network request failed" (RN's default fetch error)
    // - "timeout", "aborted", "ECONN" — common transport-level
    //   failures across iOS / Android
    // - Empty status with non-empty message — the request didn't
    //   land
    if (
      !status &&
      /network|timeout|abort|ECONN|fetch failed/i.test(msg)
    ) {
      return `Connection hiccup — couldn't reach the server. Try again in a moment.`;
    }
    const serverMsg = err?.response?.data?.error || err?.response?.data?.message;
    if (serverMsg) return String(serverMsg);
    return msg || `Couldn't ${what}. Try again.`;
  };

  // Accept optimistically, then let the background refetch reconcile server truth.
  const handleAcceptBooking = (bookingId: string) => {
    // Pre-flight: don't optimistically accept past capacity, since
    // the server will reject and we'd flash a phantom acceptance
    // before rolling back.
    if (rideData && !hasSeatsLeft(rideData.total_seats, rideData.booked_seats)) {
      setBookingError("This ride is already full.");
      return;
    }

    const prevRequests = requests;
    const prevBookedSeats = rideData?.booked_seats ?? 0;

    setRequests(prev =>
      prev.map(r =>
        r.id === bookingId ? { ...r, request_status: "accepted" } : r,
      ),
    );
    setRideData(prev =>
      prev ? { ...prev, booked_seats: prev.booked_seats + 1 } : null,
    );
    setBookingError(null);

    // Fire-and-forget so the caller can dismiss synchronously; failures render inline.
    (async () => {
      try {
        await apiUtil.putSilent(`/bookings/accept/${bookingId}`, {});
        // Best-effort reconciliation in the background. If the server
        // truth diverges from our optimistic guess (e.g. another host
        // device accepted a different request in the same window),
        // the next refetch will correct it.
        setRefreshTick(tick => tick + 1);
      } catch (error: any) {
        // Treat empty-body success responses as success and let refetch reconcile.
        const empty =
          error?.message?.includes("Empty response") ||
          error?.message?.includes("JSON Parse Error");
        if (empty) {
          setRefreshTick(tick => tick + 1);
          return;
        }
        console.error("Accept failed, rolling back optimistic update:", error);
        setRequests(prevRequests);
        setRideData(prev =>
          prev ? { ...prev, booked_seats: prevBookedSeats } : null,
        );
        // Distinguish "request never made it" from "backend said no"
        // so the user sees an actionable message instead of a
        // generic "Couldn't accept". Network failures are the
        // common case on mobile + the one most likely to succeed
        // on a retry.
        const msg = describeBookingActionError(error, "accept the request");
        setBookingError(msg);
        // Force a fresh ride-details fetch so the local state
        // re-syncs with server truth — covers the case where the
        // PUT actually succeeded but the response failed to land
        // (passenger sees themselves as accepted on the next open
        // even though our optimistic flip was rolled back).
        setRefreshTick(tick => tick + 1);
      }
    })();
  };

  const handleShare = async () => {
    if (!rideData) return;
    const shareRideId = rideData.id || rideId;
    if (!shareRideId) {
      BrandedAlert.alert('Error', 'Could not share ride details.');
      return;
    }
    const deepLink = rideShareUrl(shareRideId);
    // Direct store URL for first-time recipients. Kept symmetric with
    // ShareRideSheet.shareMessage so both share surfaces read the same
    // in a recipient's inbox.
    const message = `I'm on a UniPool ride from ${displayRideLocation(rideData.start_location)} to ${displayRideLocation(rideData.end_location)} on ${formatDate(rideData.start_time)} at ${formatTimeDisplay(rideData.start_time)}.\n\nNew to UniPool?\n${DOWNLOAD_URL}\n\nHop in:\n${deepLink}`;
    try {
      await Share.share({
        message,
        title: 'Join my ride on UniPool!'
      });
    } catch (error) {
      BrandedAlert.alert('Error', 'Could not share ride details.');
    }
  };

  // Reject optimistically; rejected rows disappear from the host list.
  const handleRejectBooking = (bookingId: string) => {
    const prevRequests = requests;

    setRequests(prev =>
      prev.map(r =>
        r.id === bookingId ? { ...r, request_status: "rejected" } : r,
      ),
    );
    setBookingError(null);

    (async () => {
      try {
        await apiUtil.putSilent(`/bookings/reject/${bookingId}`, {});
        setRefreshTick(tick => tick + 1);
      } catch (error: any) {
        const empty =
          error?.message?.includes("Empty response") ||
          error?.message?.includes("JSON Parse Error");
        if (empty) {
          setRefreshTick(tick => tick + 1);
          return;
        }
        console.error("Reject failed, rolling back optimistic update:", error);
        setRequests(prevRequests);
        setBookingError(describeBookingActionError(error, "reject the request"));
        setRefreshTick(tick => tick + 1);
      }
    })();
  };

  // Optimistic remove. Drops the booking out of the list immediately
  // and (if the removed booking was an accepted seat) decrements
  // booked_seats so the seat count + capacity gate update in lockstep.
  // Rolls back the whole change on real failure.
  const handleRemovePassenger = (bookingId: string) => {
    const prevRequests = requests;
    const removed = requests.find(r => r.id === bookingId);
    const wasAccepted = removed?.request_status === "accepted";
    const prevBookedSeats = rideData?.booked_seats ?? 0;

    setRequests(prev => prev.filter(r => r.id !== bookingId));
    if (wasAccepted) {
      setRideData(prev =>
        prev
          ? { ...prev, booked_seats: Math.max(0, prev.booked_seats - 1) }
          : null,
      );
    }
    setBookingError(null);

    (async () => {
      try {
        await apiUtil.deleteSilent(`/booking/delete/${bookingId}`);
        setRefreshTick(tick => tick + 1);
      } catch (error: any) {
        const empty =
          error?.message?.includes("Empty response") ||
          error?.message?.includes("JSON Parse Error");
        if (empty) {
          setRefreshTick(tick => tick + 1);
          return;
        }
        console.error("Remove failed, rolling back optimistic update:", error);
        setRequests(prevRequests);
        if (wasAccepted) {
          setRideData(prev =>
            prev ? { ...prev, booked_seats: prevBookedSeats } : null,
          );
        }
        setBookingError(describeBookingActionError(error, "remove the passenger"));
        setRefreshTick(tick => tick + 1);
      }
    })();
  };

  if (loading) {
    return <LoadingComponent />;
  }

  if (error || !rideData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <BrandInfo />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textPrimary }]}>{error || "Ride not found"}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.navFill }]}
            onPress={() => back()}
          >
            <Text style={[styles.retryButtonText, colors.mode === "dark" && { color: colors.textOnDark }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isHost) {
  const rideOver = isRideOver(rideData?.start_time);
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <BrandInfo />
        </View>

        <View style={[styles.navigationRow, { backgroundColor: colors.background }]}>
          {backToHome ? (
            <HomeBack style={styles.backButton} />
          ) : (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => back()}
            >
              <ChevronBack />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Ride Management</Text>
          {/* Share pill — opens the QR + native share sheet. Anchored
              top-right of the management header so it reads as a
              persistent action on the host's ride rather than buried
              in a menu. */}
          <TouchableOpacity
            onPress={() => setShareSheetOpen(true)}
            style={{
              marginLeft: "auto",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: colors.navFill,
            }}
            activeOpacity={0.85}
          >
            <Text
              style={{
                color: colors.mode === "dark" ? colors.textOnDark : AppColors.primaryLightGreen,
                fontFamily: "NunitoSans_800ExtraBold",
                fontSize: 13,
                letterSpacing: 0.3,
              }}
            >
              Share
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mounted at the screen level so its z-index sits above the
            scrolling ride card content. */}
        <ShareRideSheet
          visible={shareSheetOpen}
          onClose={() => setShareSheetOpen(false)}
          rideId={rideData?.id || rideId || ""}
          startLocation={rideData?.start_location || ""}
          endLocation={rideData?.end_location || ""}
          startTime={rideData?.start_time || ""}
        />

        {/* Passenger profile sheet — opens when the host taps any
            passenger row. Forwards accept/reject/remove to the same
            optimistic handlers the per-row sliders use. The sheet
            closes synchronously on action; the API runs in the
            background. `actionLoading={null}` because the sheet has
            no spinner state any more — there's no API wait to spin
            over. */}
        <PassengerProfileSheet
          visible={profileSheetPassenger !== null}
          passenger={profileSheetPassenger}
          actionLoading={null}
          onClose={() => setProfileSheetPassenger(null)}
          onAccept={() => {
            const bookingId = profileSheetPassenger?.booking_id;
            if (!bookingId) return;
            setProfileSheetPassenger(null);
            handleAcceptBooking(bookingId);
          }}
          onReject={() => {
            const bookingId = profileSheetPassenger?.booking_id;
            if (!bookingId) return;
            setProfileSheetPassenger(null);
            handleRejectBooking(bookingId);
          }}
          onRemove={() => {
            const bookingId = profileSheetPassenger?.booking_id;
            if (!bookingId) return;
            setProfileSheetPassenger(null);
            handleRemovePassenger(bookingId);
          }}
          onMessage={() => {
            // Route into UniPool chat:
            //   - Pending requester  → 1:1 DM with the requester
            //     (uses the same dm_<sorted-uuids> convention).
            //   - Accepted passenger → the ride's group chat, since
            //     they're already in the trip and the group is the
            //     canonical surface.
            const p = profileSheetPassenger;
            if (!p || !rideData || !currentUserId) return;
            setProfileSheetPassenger(null);
            if (p.request_status === "accepted") {
              const shortDest = (
                (rideData.end_location || "").split(",")[0] || ""
              ).trim();
              navigate(
                appHref("ChatMessages", {
                  chatId: rideData.id || rideId || "",
                  chatTitle: shortDest ? `Trip to ${shortDest}` : "Trip",
                  userId: currentUserId,
                  isGroupChat: true,
                  hostUserId: rideData.host_user_id,
                } as any),
              );
              return;
            }
            // pending
            const sorted = [currentUserId, p.id].sort();
            const dmRoomId = `dm_${sorted[0]}_${sorted[1]}`;
            navigate(
              appHref("ChatMessages", {
                chatId: dmRoomId,
                chatTitle: p.name || "Requester",
                userId: currentUserId,
                isGroupChat: false,
                otherUserId: p.id,
                pendingHostInquiry: true,
                viewerIsHost: true,
                pendingRideId: rideData.id,
                pendingHostName: p.name,
                pendingRideStartLocation: rideData.start_location,
                pendingRideEndLocation: rideData.end_location,
                pendingRideStartTime: rideData.start_time,
                hostPendingRequestBookingId: p.booking_id,
              } as any),
            );
          }}
        />

        <ScrollView style={styles.scrollContainer} contentContainerStyle={[styles.scrollContent, tabletScrollContentStyle]}>
          <View style={styles.rideCardContainer}>
            <RideCard
              id={rideData.id || rideId || ""}
              origin={rideData.start_location}
              destination={rideData.end_location}
              time={formatTime(rideData.start_time)}
              date={formatDate(rideData.start_time)}
              price={rideData.total_price}
              seatsAvailable={seatsAvailableLabel(rideData.total_seats, rideData.booked_seats)}
              isSelected={true}
              variant={rideData.is_ongoing ? "inprogress" : "upcoming"}
              shareable
              startTimeIso={rideData.start_time}
            />
          </View>

          {/* Section header dropped — the screen-level navigation
              already shows "Ride Management" once. Painting it again
              as a giant uppercase label below the ride card was a
              redundant shout. */}

          {(() => {
            // Treat "only the host themselves in the requests list" as
            // the empty state for ride management. Net non-host
            // bookings = 0 means nobody has requested or been
            // accepted yet, so the right call-to-action is "share
            // the ride," not a stale "No bookings found." line.
            const nonHostRequests = (requests || []).filter(
              (r) =>
                r.id !== "host-booking" &&
                r.passenger_id !== rideData?.host_user_id,
            );
            const noOneJoinedYet =
              !requestsLoading && !bookingError && nonHostRequests.length === 0;
            if (noOneJoinedYet) {
              return (
                <View style={styles.shareEmptyWrap}>
                  <Text style={[styles.shareEmptyTitle, { color: colors.textPrimary }]}>
                    No one's joined yet
                  </Text>
                  <Text style={[styles.shareEmptyBody, colors.mode === "dark" && { color: colors.textSecondary, opacity: 1 }]}>
                    Share your ride so users can request a seat.
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.shareEmptyBtn,
                      // Light: forest pill + lime text (historical
                      // module-scope). Dark: lime brand splash + forest
                      // ink, same Accept-button pattern that powers
                      // every primary CTA across the app.
                      { backgroundColor: colors.mode === "dark" ? colors.primary : colors.navFill },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setShareSheetOpen(true)}
                  >
                    <Text style={[styles.shareEmptyBtnText, colors.mode === "dark" && { color: colors.textOnAccent }]}>Share ride</Text>
                  </TouchableOpacity>
                </View>
              );
            }
            return null;
          })()}

          {requestsLoading ? (
            <View style={styles.inlineLoadingContainer}>
              <LoadingComponent />
            </View>
          ) : bookingError ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.textPrimary }]}>{bookingError}</Text>
            </View>
          ) : requests.length === 0 ? (
            // Host-booking entry isn't injected yet — race during the
            // first fetch. Keep this branch dormant; the "noOneJoinedYet"
            // card above already speaks to the empty state once the
            // host entry lands.
            null
          ) : (
            // Rejected passenger rows are not actionable in host management.
            requests.flatMap((req) => {
              if (req.request_status === "rejected") return [];
              const passengerName = req.passenger?.name || "Unknown User";
              const isCurrentUser = req.passenger_id === currentUserId;
              const isHostPassenger = rideData?.host_user_id === req.passenger_id;
              const isHostBooking = req.id === "host-booking";
              const canRemove = !isHostBooking && !isCurrentUser;
              const requestKey =
                req.id ||
                req.booking_id ||
                req.passenger_id ||
                `${req.request_status}-${passengerName}`;

              let displayName = passengerName;
              if (isCurrentUser && isHostPassenger) {
                displayName = `${passengerName} (Host)`;
              } else if (isCurrentUser) {
                displayName = `${passengerName} (You)`;
              } else if (isHostPassenger) {
                displayName = `${passengerName} (Host)`;
              }

              if (showSlide && selectedRequest?.id === req.id && !rideOver) {
                // Same generic "user" copy as accept/reject — the
                // slider replaces *that row* in-place, so context is
                // already on screen. Putting the name on remove (but
                // not accept/reject) created an inconsistent feel.
                return (
                  <View key={requestKey} style={styles.sliderOnlyContainer}>
                    <SlideToCreate
                      // Optimistic handlers dismiss this slider synchronously.
                      text={
                        showSlide === "accept"
                          ? "Slide to accept user"
                          : showSlide === "reject"
                          ? "Slide to reject user"
                          : "Slide to remove user"
                      }
                      onSlideComplete={() => {
                        const bookingId = req.id || req.booking_id;
                        // Dismiss INSTANTLY — the optimistic handler
                        // already flipped the local row state before
                        // the API request leaves the device.
                        setShowSlide(null);
                        setSelectedRequest(null);
                        if (showSlide === "accept") {
                          handleAcceptBooking(bookingId);
                        } else if (showSlide === "reject") {
                          handleRejectBooking(bookingId);
                        } else if (showSlide === "remove" && !isHostBooking) {
                          handleRemovePassenger(bookingId);
                        }
                      }}
                      // Accept = forest track + forest thumb (the
                      // "safe" primary affordance). Reject / remove =
                      // white track + red text + red thumb (borderless;
                      // a red ring around the pill read as too loud
                      // next to a calm white surface). The red
                      // typography + thumb carry the danger cue on
                      // their own.
                      sliderIcon={showSlide === "accept" ? require("../assets/slide.png") : require("../assets/red-slider.png")}
                      backgroundColor={showSlide === "accept" ? colors.navFill : colors.surfaceElevated}
                      sliderButtonColor={showSlide === "accept" ? colors.navIconActive : colors.destructive}
                      textColor={showSlide === "accept" ? colors.navIconActive : colors.destructive}
                      borderColor={showSlide === "accept" ? colors.navFill : colors.surfaceElevated}
                      // Slot in as a same-size row replacement (no extra
                      // vertical margin, matching 16pt corner radius
                      // and 60pt height).
                      containerStyle={{ marginVertical: 0 }}
                      sliderStyle={{ borderRadius: 16 }}
                      // No holdAtEnd: the slider unmounts on slide-complete.
                    />
                    {bookingError ? <Text style={styles.inlineErrorText}>{bookingError}</Text> : null}
                  </View>
                );
              }

              // Build the PassengerProfile payload for this row — the
              // shape PassengerProfileSheet expects. Host row passes
              // through as well so the host can pay themselves (e.g.
              // when testing) or see their own state.
              const profilePayload: PassengerProfile = {
                id: req.passenger_id,
                name: passengerName,
                email: req.passenger?.email,
                profile_picture_url: req.passenger?.profile_picture_url,
                contact_number: req.passenger?.contact_number,
                upi_vpa: req.passenger?.upi_vpa,
                is_verified: req.passenger?.is_verified,
                institute_name: req.passenger?.institute_name,
                request_status: req.request_status,
                booking_id: req.id,
              };
              const openProfile = () => {
                if (!isHostBooking) setProfileSheetPassenger(profilePayload);
              };

              if (req.request_status === "pending") {
                return (
                  <View key={requestKey} style={[styles.pendingRequestCard, { backgroundColor: colors.navFill }]}>
                    {/* Name takes the flex space; right cluster carries
                        the actions: View opens the profile sheet,
                        Reject/Accept drop the row into the slider
                        below for confirmation. No avatar, no
                        "Tap to review" caption — the icon set on the
                        right is the affordance. */}
                    <Text style={styles.pendingRequestName} numberOfLines={1}>
                      {displayName}
                    </Text>
                    {!rideOver ? (
                      <View style={styles.rowActionsCluster}>
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={openProfile}
                          activeOpacity={0.7}
                        >
                          <EyeGlyph />
                          <Text style={styles.iconBtnLabel}>View</Text>
                        </TouchableOpacity>
                        {/* DM the requester directly. Pending
                            passengers aren't in the ride group chat,
                            so this is the only way to ask them a
                            question before deciding accept/reject —
                            and the user (correctly) wanted it
                            surfaced as a peer of the other row
                            actions, not buried in the profile sheet. */}
                        {!isHostBooking && !isCurrentUser ? (
                          <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => openRequesterDM(req)}
                            activeOpacity={0.7}
                            accessibilityLabel={`Direct message ${passengerName}`}
                          >
                            <ChatBubbleGlyph />
                            <Text style={styles.iconBtnLabel}>DM</Text>
                          </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => {
                            setSelectedRequest(req);
                            setShowSlide("reject");
                          }}
                          activeOpacity={0.7}
                        >
                          <Image source={require("../assets/cross.png")} style={styles.iconBtnImageReject} />
                          <Text style={styles.iconBtnLabelReject}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => {
                            setSelectedRequest(req);
                            setShowSlide("accept");
                          }}
                          activeOpacity={0.7}
                        >
                          <Image source={require("../assets/check.png")} style={styles.iconBtnImageAccept} />
                          <Text style={styles.iconBtnLabelAccept}>Accept</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={styles.rideOverInline}>Ride is over</Text>
                    )}
                  </View>
                );
              }

              // Accepted passenger row.
              // No avatar, no inverted lime card for the host, no big
              // lime "Accepted" badge. Every row uses the same calm
              // forest surface — status reads from the action set on
              // the right (host gets a quiet "Host" caption; everyone
              // else gets View + Remove icon-buttons).
              return (
                <View
                  key={requestKey}
                  style={[styles.confirmedPassengerCard, { backgroundColor: colors.navFill }]}
                >
                  <Text style={styles.passengerName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  {isHostBooking ? (
                    <Text style={styles.hostCaptionInline}>Host</Text>
                  ) : (
                    <View style={styles.rowActionsCluster}>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={openProfile}
                        activeOpacity={0.7}
                      >
                        <EyeGlyph />
                        <Text style={styles.iconBtnLabel}>View</Text>
                      </TouchableOpacity>
                      {!rideOver && canRemove ? (
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => {
                            setSelectedRequest(req);
                            setShowSlide("remove");
                          }}
                          activeOpacity={0.7}
                        >
                          <Image source={require("../assets/cross.png")} style={styles.iconBtnImageReject} />
                          <Text style={styles.iconBtnLabelReject}>Remove</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={[styles.bottomContainer, { backgroundColor: colors.background }]}>
          {/* Primary chat affordance for the host. Hidden while the
              ride has no accepted passengers — the group chat would
              be a room of one and "Open trip chat" reads like a
              dead-end action that opens an empty thread. Returns
              the moment a request is accepted. */}
          {requests.some((r) => r.request_status === "accepted") ? (
            <TouchableOpacity
              onPress={openRideChat}
              activeOpacity={0.85}
              style={[styles.tripChatPill, { backgroundColor: colors.navFill }]}
              accessibilityLabel="Open trip chat"
            >
              <ChatBubbleGlyph />
              <Text style={[styles.tripChatPillText, colors.mode === "dark" && { color: colors.textOnDark }]}>Open trip chat</Text>
            </TouchableOpacity>
          ) : null}
          {!rideOver ? (
            <SlideToCreate
              onSlideComplete={handleCancelRide}
              text={isActionLoading ? "Deleting..." : "Slide to delete ride"}
              disabled={isActionLoading}
              // Destructive treatment — coordinated with the reject /
              // remove-passenger sliders on this same screen. White
              // track, red text + red thumb. The red border read as
              // too shouty next to the white surface (it framed the
              // pill like a warning sign), so the borderColor is
              // matched to the background to render it invisible —
              // the red typography + thumb carry the danger signal
              // on their own.
              sliderIcon={require("../assets/red-slider.png")}
              backgroundColor={colors.surfaceElevated}
              borderColor={colors.surfaceElevated}
              sliderButtonColor={colors.destructive}
              textColor={colors.destructive}
            />
          ) : (
            <View style={[styles.rideOverBanner, { backgroundColor: colors.navFill }]}>
              <Text style={[styles.rideOverText, { color: colors.navIconInactive }]}>This ride is over</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // NON-HOST VIEW - Ride Details (similar to AvailableRideScreenSelected)
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <BrandInfo />
      </View>

      <View style={[styles.navigationRow, { backgroundColor: colors.background }]}>
        <View style={styles.navigationLeft}>
          {backToHome ? (
            <HomeBack style={styles.backButton} />
          ) : (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => back()}
            >
              <ChevronBack />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Booking Details</Text>
        {/* Share pill — visible to passengers too, not just hosts.
            Same sheet as the host-side button (QR + native share). */}
        <TouchableOpacity
          onPress={() => setShareSheetOpen(true)}
          style={{
            marginLeft: "auto",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: colors.navFill,
          }}
          activeOpacity={0.85}
        >
          <Text
            style={{
              color: colors.mode === "dark" ? colors.textOnDark : AppColors.primaryLightGreen,
              fontFamily: "NunitoSans_800ExtraBold",
              fontSize: 13,
              letterSpacing: 0.3,
            }}
          >
            Share
          </Text>
        </TouchableOpacity>
      </View>

      {/* ShareRideSheet for the passenger branch — same component
          the host branch uses. Mounted at screen level so its z-index
          sits above the scroll content. */}
      <ShareRideSheet
        visible={shareSheetOpen}
        onClose={() => setShareSheetOpen(false)}
        rideId={rideData?.id || rideId || ""}
        startLocation={rideData?.start_location || ""}
        endLocation={rideData?.end_location || ""}
        startTime={rideData?.start_time || ""}
      />

  {/* Show fallback UI for pending and rejected bookings (unless ride is over) */}
  {(!isRideOver(rideData.start_time) && (userBookingStatus === 'pending' || userBookingStatus === 'rejected')) ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
          <Image 
            source={require("../assets/sad.png")} 
            style={{ width: 200, height: 200, marginBottom: 20 }}
            resizeMode="contain"
          />
          <Text style={{
            fontSize: 26,
            fontFamily: "NunitoSans_800ExtraBold",
            color: colors.textPrimary,
            letterSpacing: -0.5,
            textAlign: "center",
            marginBottom: 10
          }}>
            {userBookingStatus === 'pending' ? 'Waiting on the host' : 'Request not accepted'}
          </Text>
          <Text style={{
            fontSize: 15,
            lineHeight: 22,
            fontFamily: "NunitoSans_400Regular",
            color: colors.textSecondary,
            textAlign: "center",
            marginBottom: 28,
            paddingHorizontal: 12,
          }}>
            {userBookingStatus === 'pending'
              ? `We'll ping you the moment ${rideData?.host_user_name?.split(' ')?.[0] || 'they'} respond${rideData?.host_user_name ? 's' : ''}. You can also message them directly while you wait.`
              : "The host went a different direction this time. Plenty of other rides to choose from."
            }
          </Text>

          {/* Pending: primary CTA is "Message host" because that's the
              only action the user can actually take to influence the
              outcome. Find rides + Cancel request sit below as a
              secondary row. Rejected: skip the message CTA — there's
              nothing useful to say once the host has declined. */}
          {userBookingStatus === 'pending' && (
            <TouchableOpacity
              activeOpacity={0.88}
              style={{
                alignSelf: "stretch",
                backgroundColor: colors.navFill,
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: "center",
                marginBottom: 14,
                shadowColor: AppColors.basicBlack,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.18,
                shadowRadius: 14,
                elevation: 3,
              }}
              onPress={() => {
                const hostUserId = rideData?.host_user_id;
                const hostName = rideData?.host_user_name;
                if (currentUserId && hostUserId) {
                  // Real 1:1 with the host — same DM convention as the
                  // chat list's pending rows.
                  const sorted = [currentUserId, hostUserId].sort();
                  const dmRoomId = `dm_${sorted[0]}_${sorted[1]}`;
                  navigate(appHref("ChatMessages", {
                    chatId: dmRoomId,
                    chatTitle: hostName || "Host",
                    chatSubtitle: `${displayRideLocation(rideData?.start_location)} → ${displayRideLocation(rideData?.end_location)}`,
                    userId: currentUserId,
                    isGroupChat: false,
                    otherUserId: hostUserId,
                    pendingHostInquiry: true,
                    pendingRideId: rideData?.id,
                    pendingHostName: hostName,
                  }));
                }
              }}
            >
              <Text style={{
                color: colors.mode === "dark" ? colors.textOnDark : AppColors.primaryLightGreen,
                fontSize: 16,
                fontFamily: "NunitoSans_800ExtraBold",
                letterSpacing: 0.2,
              }}>
                Message {rideData?.host_user_name?.split(' ')?.[0] || 'host'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ flexDirection: "row", gap: 12, alignSelf: "stretch" }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: userBookingStatus === 'pending'
                  ? "transparent"
                  : colors.navFill,
                borderWidth: userBookingStatus === 'pending' ? 1.5 : 0,
                borderColor: colors.textPrimary,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
                shadowColor: AppColors.basicBlack,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: userBookingStatus === 'pending' ? 0 : 0.18,
                shadowRadius: 12,
                elevation: userBookingStatus === 'pending' ? 0 : 2,
              }}
              onPress={() => navigate(appHref("HomeScreen"))}
            >
              <Text style={{
                color: userBookingStatus === 'pending'
                  ? colors.textPrimary
                  : (colors.mode === "dark" ? colors.textOnDark : AppColors.primaryLightGreen),
                fontSize: 15,
                fontFamily: "NunitoSans_800ExtraBold",
                letterSpacing: 0.2,
              }}>
                Find rides
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: colors.inkSoft,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
              }}
              onPress={handleCancelRide}
              disabled={isActionLoading}
            >
              <Text style={{
                color: colors.textPrimary,
                fontSize: 15,
                fontFamily: "NunitoSans_700Bold",
                letterSpacing: 0.2,
              }}>
                {isActionLoading
                  ? "Removing…"
                  : userBookingStatus === 'pending'
                  ? "Cancel request"
                  : "Remove"
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
            <View style={[
              styles.combinedContainer,
              { backgroundColor: colors.navFill },
              colors.mode === "dark" && { borderWidth: 1, borderColor: "rgba(237,236,231,0.08)" },
            ]}>
              <View style={[styles.rideCard, { backgroundColor: colors.navFill }]}>
                <View style={styles.routeSection}>
                  <View style={styles.routeDetails}>
                    <View style={styles.locationContainer}>
                      <RouteStack
                        tone="onForest"
                        start={rideData.start_location}
                        end={rideData.end_location}
                        textStyle={styles.locationText}
                      />
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
                    <Text style={styles.dateTimeText}>{formatTimeDisplay(rideData.start_time)}</Text>
                  </View>
                </View>
                
                <Text style={styles.estimatedTripText}>Estimated Trip Length: {estimatedDuration}</Text>
              </View>

              <View style={styles.mapSection}>
                {isValidCoordinate(rideData.start_latitude, rideData.start_longitude) &&
                 isValidCoordinate(rideData.end_latitude, rideData.end_longitude) ? (
                  // Modular trip preview — see components/TripPreviewMap.tsx.
                  // Owns the camera framing, start dot, end arrow, and
                  // dashed-red line that used to live inline as a
                  // react-native-maps MapView/Marker/Polyline block. Same
                  // OpenFreeMap tile stack the HomeScreen map uses now.
                  <TripPreviewMap
                    style={styles.mapView}
                    start={{
                      latitude: rideData.start_latitude!,
                      longitude: rideData.start_longitude!,
                    }}
                    end={{
                      latitude: rideData.end_latitude!,
                      longitude: rideData.end_longitude!,
                    }}
                    routePoints={routeCoordinates}
                  />
                ) : (
                  <View style={styles.mapPlaceholder}>
                    <Image source={require('../assets/location-pin.png')} style={styles.mapPlaceholderIcon} />
                    <Text style={styles.mapPlaceholderTitle}>Route Map</Text>
                    <Text style={styles.loadingText}>{displayRideLocation(rideData.start_location)} → {displayRideLocation(rideData.end_location)}</Text>
                    <Text style={styles.mapPlaceholderSubtext}>Map coordinates not available</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={[styles.bottomActionsContainer, { backgroundColor: colors.background }]}>
            {!isRideOver(rideData.start_time) ? (
              <>
                {/* Primary chat affordance. Gated on the server's
                    `can_open_chat` capability instead of a local
                    `userBookingStatus === 'accepted'` check so the
                    truth lives in one place (see
                    routes/rides/viewerState.go) — the same flag is
                    false for pending/rejected/available viewers. */}
                {viewerActions.can_open_chat ? (
                  <TouchableOpacity
                    onPress={openRideChat}
                    activeOpacity={0.85}
                    style={[styles.tripChatPill, { backgroundColor: colors.navFill }]}
                    accessibilityLabel="Open trip chat"
                  >
                    <ChatBubbleGlyph />
                    <Text style={[styles.tripChatPillText, colors.mode === "dark" && { color: colors.textOnDark }]}>Open trip chat</Text>
                  </TouchableOpacity>
                ) : null}
                {/* Slider is driven by the server's `viewer_actions`
                    booleans, not by client-side state derivation.
                    The capability set is mutually exclusive at the
                    source (see ResolveViewerState in the backend):
                      can_request_seat   → viewer is `available`
                      can_cancel_booking → confirmed/pending passenger
                    If neither is set (host, full ride for a non-
                    booker, past ride, etc.) the slider doesn't
                    render — the relevant info card upstream covers
                    those cases. */}
                {viewerActions.can_request_seat ? (
                  <SlideToCreate
                    onSlideComplete={handleRequestRide}
                    text={
                      isActionLoading
                        ? "Requesting..."
                        : "Slide to request booking"
                    }
                    disabled={isActionLoading}
                    sliderIcon={require("../assets/slide.png")}
                    backgroundColor={colors.navFill}
                    borderColor={colors.navFill}
                    sliderButtonColor={colors.primary}
                    textColor={colors.navIconInactive}
                  />
                ) : viewerActions.can_cancel_booking ? (
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
                ) : null}

              </>
            ) : (
              <View style={[styles.rideOverBanner, { backgroundColor: colors.navFill }]}>
                <Text style={[styles.rideOverText, { color: colors.navIconInactive }]}>This ride is over</Text>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Lime brand canvas — matches the rest of the app. Forest content
    // cards (rideCard, combinedContainer) float on top.
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
    // No `marginTop` override — the parent `navigationRow` is a
    // `alignItems: 'center'` flex row, so the chevron is supposed to
    // share a vertical center with the "Ride Management" title.
    // The earlier `marginTop: 7` was a manual nudge that pushed the
    // chevron ~7pt below the title baseline, leaving the row visibly
    // misaligned. `marginRight` bumped from 1pt to 10pt so the
    // chevron isn't kissing the title's first glyph.
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'NunitoSans_800ExtraBold',
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: AppColors.secondaryDarkGreen,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'NunitoSans_700Bold',
  },
  retryButton: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 2,
  },
  retryButtonText: {
    color: AppColors.primaryLightGreen,
    fontSize: 15,
    fontFamily: 'NunitoSans_800ExtraBold',
    letterSpacing: 0.2,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    // Breathing room above the fixed "Slide to delete ride" bar so
    // the last passenger row isn't visually pinned to the slider.
    paddingBottom: 16,
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
    // reduce reserved space so location text truncates less aggressively
    paddingRight: 48,
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
  flexShrink: 1,
  },
  scooterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    right: -24,
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
  /* Custom map marker visuals. Start dot is a small black token with a
     white halo so it sits clean against any tile colour; end arrow is
     a black navigation glyph anchored to its base so the tip points
     at the destination coordinate. */
  routeStartDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AppColors.basicWhite,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  routeStartDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AppColors.basicBlack,
  },
  routeEndArrowWrap: {
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingTop: 18,
    paddingBottom: 10,
  },
  bottomActionsContainer: {
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  // Open-trip-chat pill. Shared between the host's Ride Management
  // view and the passenger's Booking Details view so both surfaces
  // read as the same affordance. Sits in the light-green
  // bottomContainer / bottomActionsContainer rail above the
  // slide-to-* destructive action, with a subtle shadow to lift it
  // off the green canvas (the dark card above already has its own
  // shadow, so the pill needs its own elevation to read as a
  // separate, tappable surface rather than a sliver continuing the
  // card).
  tripChatPill: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
    // Elevation — matches the chat-card / sheet treatment elsewhere
    // in the app. Kept subtle (low opacity, short radius) so the
    // pill reads as raised rather than dropping a heavy shadow on
    // the already-busy light-green background.
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tripChatPillText: {
    color: AppColors.primaryLightGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 15,
    letterSpacing: 0.2,
  },
  // Booking management styles
  requestsHeader: {
    fontSize: 14,
    fontFamily: "NunitoSans_800ExtraBold",
    color: AppColors.secondaryDarkGreen,
    opacity: 0.75,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginLeft: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  inlineLoadingContainer: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 16,
  },
  emptyText: {
    color: AppColors.secondaryDarkGreen,
    opacity: 0.65,
    fontSize: 15,
    fontFamily: "NunitoSans_600SemiBold",
    marginHorizontal: 16,
  },
  pendingRequestCard: {
    // Forest card flush with the ride card above it — no extra
    // `marginHorizontal: 16`, which used to push these rows 16pt
    // farther inset than the ride card / share button / share-empty
    // card and broke vertical alignment. Now they all share the
    // ScrollView's `paddingHorizontal: 20`.
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  pendingRequestName: {
    flex: 1,
    color: AppColors.basicWhite,
    fontSize: 15.5,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: -0.2,
    marginRight: 8,
  },
  // Right-side icon-button cluster for pending and accepted passenger rows.
  rowActionsCluster: {
    flexDirection: "row",
    alignItems: "center",
    // Tightened from 14 to 10 so the pending row's 4 buttons
    // (View / DM / Reject / Accept) don't crowd the name on
    // narrow phones. Accepted-row's 2 buttons sit fine at this
    // spacing too.
    gap: 10,
  },
  iconBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  iconBtnImageReject: {
    width: 22,
    height: 22,
    marginBottom: 2,
    resizeMode: "contain",
    tintColor: "#FF6B5B",
  },
  iconBtnImageAccept: {
    width: 22,
    height: 22,
    marginBottom: 2,
    resizeMode: "contain",
    tintColor: AppColors.primaryLightGreen,
  },
  iconBtnLabel: {
    color: AppColors.primaryLightGreen,
    fontSize: 10.5,
    fontFamily: "NunitoSans_700Bold",
    letterSpacing: 0.2,
    opacity: 0.85,
  },
  iconBtnLabelAccept: {
    color: AppColors.primaryLightGreen,
    fontSize: 10.5,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: 0.2,
  },
  iconBtnLabelReject: {
    color: "#FF8A7A",
    fontSize: 10.5,
    fontFamily: "NunitoSans_700Bold",
    letterSpacing: 0.2,
  },
  hostCaptionInline: {
    color: AppColors.primaryLightGreen,
    fontSize: 12,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    opacity: 0.7,
  },
  rideOverInline: {
    color: AppColors.primaryLightGreen,
    fontSize: 12,
    fontFamily: "NunitoSans_700Bold",
    opacity: 0.7,
  },
  inlineErrorText: {
    color: "red",
    fontSize: 12,
    fontFamily: "NunitoSans_400Regular",
    textAlign: "center",
    marginTop: 8,
  },
  confirmedPassengerCard: {
    // Flush with the ride card above — same horizontal inset as
    // every other card on the screen (the ScrollView's
    // `paddingHorizontal: 20` handles outer spacing).
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    marginBottom: 10,
    elevation: 2,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  passengerName: {
    // No `marginLeft` — avatar was removed in the row redesign, so
    // the name should hug the same 16pt left padding as every other
    // row tile.
    color: AppColors.primaryLightGreen,
    fontSize: 15.5,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 8,
  },
  sliderOnlyContainer: {
    // No marginHorizontal — the parent ScrollView already pads 20pt
    // on each side. Matches the pendingRequestCard / accepted card
    // horizontal inset so the slider lands at the same edge.
    marginBottom: 10,
  },
  // Minimal "No one's joined yet" empty state — no card surface, no
  // shadow, no full-width button. Just calm centred text on the lime
  // canvas with a small Share pill. The blocky cream card felt heavy
  // for what is functionally "nothing here, share to get started."
  shareEmptyWrap: {
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 22,
    alignItems: "center",
  },
  shareEmptyTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.3,
    color: AppColors.secondaryDarkGreen,
    textAlign: "center",
  },
  shareEmptyBody: {
    marginTop: 4,
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 13,
    lineHeight: 19,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.65,
    textAlign: "center",
    letterSpacing: 0.05,
  },
  // Small inline pill — text-button scale, not a full-width CTA.
  shareEmptyBtn: {
    marginTop: 14,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: AppColors.secondaryDarkGreen,
  },
  shareEmptyBtnText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 13.5,
    color: AppColors.primaryLightGreen,
    letterSpacing: 0.3,
  },
  acceptedStatusBanner: {
    // "You're confirmed" banner — forest dark tile with lime title and
    // soft lime body. Matches the rest of the system (UpNextCard,
    // RideCard, confirmedPassengerCard).
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 14,
    margin: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 2,
  },
  statusBannerIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    tintColor: AppColors.primaryLightGreen,
  },
  statusBannerContent: {
    flex: 1,
  },
  statusBannerTitle: {
    fontSize: 16,
    fontFamily: 'NunitoSans_800ExtraBold',
    color: AppColors.primaryLightGreen,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  statusBannerText: {
    fontSize: 14,
    fontFamily: 'NunitoSans_600SemiBold',
    color: AppColors.basicWhite,
    opacity: 0.78,
    lineHeight: 20,
  },
  rideOverBanner: {
    // Forest "ride is over" banner — reads as a past-state tag without
    // any harsh white panel.
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: AppColors.secondaryDarkGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rideOverText: {
    color: AppColors.primaryLightGreen,
    fontSize: 14,
    fontFamily: 'NunitoSans_800ExtraBold',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});

export default RideDetailsScreen;
