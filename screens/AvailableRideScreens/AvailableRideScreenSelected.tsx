import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import TripPreviewMap from '../../components/TripPreviewMap';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

import ChevronBack from '../../components/ChevronBack/ChevronBack';
import SlideToCreate from '../../components/SlideToCreate/SlideToCreate';
import BrandInfo from '../../components/BrandInfo/BrandInfo';
import RouteStack from '../../components/RouteStack';
import AppColors from '../../design_systems/colors';
import { useApi } from '../../utils/ApiUtil';
import { useAuthGate } from '../../contexts/AuthGate';
import { useUser } from '../../contexts/UserContext';
import { appHref, useDecodedLocalSearchParams } from '../../navigation/routes';
import { useTabletContentStyle } from "../../utils/responsive";

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

const AvailableRideScreenSelected: React.FC = () => {
  const router = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const routeParams = useDecodedLocalSearchParams<{ ride?: any }>();
  const { apiUtil } = useApi();
  const { requireAuth } = useAuthGate();
  // For the edge case where someone lands on this screen with their
  // own ride (deep link, stale cached navigation, etc.). The home-map
  // filter already drops own rides from pins, but if we get here we
  // want to detect it up front and skip the "Slide to request" UI.
  const { user: viewerUser } = useUser();
  const [location, setLocation] = useState<any>(null);
  const [initialRegion, setInitialRegion] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [estimatedDuration, setEstimatedDuration] = useState<string>('Estimating...');
  // Server-computed UI state. May arrive via route params (when the
  // user comes from search results) or be fetched fresh from
  // /ride/details when they tap a map pin (the public /rides/nearby
  // endpoint doesn't emit viewer_state). Either way we render off
  // this single field instead of deriving from isHost / bookings.
  //
  // Seed "host" immediately if we can already prove ownership from
  // the route params (the nearby payload carries host_user_id and we
  // know the signed-in user's id). Without this, the slide-to-request
  // flashes for the few hundred ms it takes /ride/details to come
  // back, then snaps to the "You're hosting this ride" notice.
  const seededRide = routeParams?.ride as any;
  const seededIsOwn =
    !!viewerUser?.id &&
    !!seededRide?.host_user_id &&
    seededRide.host_user_id === viewerUser.id;
  const [viewerState, setViewerState] = useState<string | null>(
    seededRide?.viewer_state ?? (seededIsOwn ? "host" : null),
  );
  const [viewerActions, setViewerActions] = useState<{
    can_request_seat?: boolean;
    can_cancel_booking?: boolean;
    can_cancel_ride?: boolean;
    can_accept_passengers?: boolean;
    can_open_chat?: boolean;
  }>((routeParams?.ride as any)?.actions ?? {});
  // Verification + same-campus + name signals — populated by the
  // /ride/details fetch. Drives the host checkmark, "Same campus"
  // chip, and the "Hosted by …" line. The name is pulled from the
  // detail endpoint as well because the upstream entry points to
  // this screen are inconsistent: /ride/search passes the full host
  // name in route params, but /rides/nearby (cluster sheet path)
  // doesn't — so we re-fetch to guarantee a populated name.
  const [hostVerified, setHostVerified] = useState<boolean>(false);
  const [hostInstituteName, setHostInstituteName] = useState<string | null>(null);
  const [hostSameInstituteAsViewer, setHostSameInstituteAsViewer] = useState<boolean>(false);
  const [hostUserNameFetched, setHostUserNameFetched] = useState<string | null>(null);
  const [hostUserYobFetched, setHostUserYobFetched] = useState<number | null>(null);
  const [detailsRefreshTick, setDetailsRefreshTick] = useState(0);

  const [viewerBookingId, setViewerBookingId] = useState<string | null>(
    (routeParams?.ride as any)?.viewer_booking_id ?? null,
  );

  const rideData = routeParams?.ride;
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
    host_user_name: '',
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

  // Vehicle illustration picker — same buckets as RideCard /
  // CreateRide so a 4-seater shows the racer everywhere, an 8-seater
  // the foodvan, etc. Single source of truth for "what's this ride's
  // vehicle look like" lives across the app via this exact ladder.
  const getVehicleIcon = (maxSeats: number) => {
    if (maxSeats < 3) return require('../../assets/motorcycle.png');
    if (maxSeats === 3) return require('../../assets/Taxi.png');
    if (maxSeats === 4) return require('../../assets/racer.png');
    if (maxSeats < 8) return require('../../assets/wagon.png');
    if (maxSeats < 11) return require('../../assets/foodvan.png');
    if (maxSeats < 20) return require('../../assets/Bus.png');
    return require('../../assets/UFO.png');
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
    // READ ONLY — the native prompt belongs exclusively to
    // LocationPermissionScreen. Here we just check current state and
    // silently no-op if the user hasn't granted it yet.
    const { status } = await Location.getForegroundPermissionsAsync();
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

  useFocusEffect(
    useCallback(() => {
      setDetailsRefreshTick((tick) => tick + 1);
    }, []),
  );

  // Backfill viewer_state from /ride/details/:id when it wasn't
  // included in route params (e.g. map-pin taps from the public
  // /rides/nearby endpoint don't carry viewer context). The detail
  // endpoint always computes the freshest state so we trust it as
  // the source of truth.
  useEffect(() => {
    if (!ride?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const details = await apiUtil.getUncached<any>(`/ride/details/${ride.id}`);
        if (cancelled) return;
        if (details?.viewer_state) setViewerState(details.viewer_state);
        if (details?.actions) setViewerActions(details.actions);
        if (details?.viewer_booking_id) setViewerBookingId(details.viewer_booking_id);
        // Verified-host + same-campus + name surfaces. Always read
        // fresh — the params version of the ride row doesn't always
        // carry them (e.g. cluster-sheet path lacks host_user_name).
        setHostVerified(!!details?.host_is_verified);
        setHostInstituteName(details?.host_institute_name ?? null);
        setHostSameInstituteAsViewer(!!details?.host_same_institute_as_viewer);
        if (details?.host_user_name) setHostUserNameFetched(details.host_user_name);
        if (typeof details?.host_user_yob === 'number') setHostUserYobFetched(details.host_user_yob);
      } catch (err) {
        console.warn('viewer_state fetch failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiUtil, detailsRefreshTick, ride?.id]);

  // Pending / rejected viewers can't act here — there's no slide-to-
  // request CTA, and the screen would be the awkward "notice card"
  // layout. Redirect to RideDetailsScreen, which already has the
  // proper waiting-on-host fallback view used everywhere else
  // (RideCard taps, etc.). Keeps the two entry points consistent.
  useEffect(() => {
    if (!ride?.id) return;
    if (viewerState !== "pending_passenger" && viewerState !== "rejected_passenger") return;
    router.replace(appHref("RideDetailsScreen", { rideId: ride.id }));
  }, [viewerState, ride?.id, router]);

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

    // Guests have to sign in before requesting a seat — bring them back here
    // with the same ride params after sign-up completes.
    if (!requireAuth({ screen: "AvailableRidesSelectedScreen", params: routeParams as any }, "to book this ride")) {
      return;
    }

    setIsRequesting(true);
    // Notification permission is owned by the onboarding permissions
    // sheet now. No mid-action prompt here.

    try {
      const requestPayload: RideRequestPayload = {
        ride_id: ride.id,
        request_status: "pending",
      };

      console.log('Requesting ride with payload:', requestPayload);

      const response = await apiUtil.post('/bookings/request', requestPayload) as RideRequestResponse;
      
      console.log('Ride request response:', response);

      if (response && (response.success || response.id || response.booking_id)) {
        // Flip the local viewer state immediately so the user sees
        // the "Message host" affordance without waiting for a fetch
        // round-trip. The next /ride/details/:id call will confirm.
        setViewerState("pending_passenger");
        setViewerBookingId((response.id || response.booking_id) ?? null);

        router.navigate(appHref("RideRequestedScreen", {
          rideId: ride.id,
          bookingId: response.id || response.booking_id,
          rideDetails: {
            from: ride.start_location,
            to: ride.end_location,
            time: formatTime(ride.start_time),
            price: ride.total_price,
            driver: ride.host_user_name,
          },
          // Carry the chat hand-off so RideRequestedScreen can route
          // the user straight to the host's thread if they tap
          // "Message host" there.
          hostUserId: ride.host_user_id,
          hostUserName: ride.host_user_name,
        }));
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
    <View style={[styles.container, tabletContentStyle]}>
      <View style={styles.header}>
        <BrandInfo />
      </View>

      <View style={styles.navigationRow}>
        <View style={styles.navigationLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronBack />
          </TouchableOpacity>
          {/* Header title — was missing entirely before, leaving an
              orphan chevron in its own row. Sits next to the back
              control like the rest of the app's secondary screens
              (Booking Details, Ride Management, etc.). */}
          <Text style={styles.navigationTitle}>Ride details</Text>
        </View>
        {/* No right-side action — this screen is the *preview* for
            booking someone else's ride. Sharing lives on the card
            below (long-press) and on RideDetailsScreen. */}
      </View>

      <View style={styles.mainContent}>
        <View style={styles.combinedContainer}>
          <View style={styles.rideCard}>
            <View style={styles.routeSection}>
              <View style={styles.routeDetails}>
                <View style={styles.locationContainer}>
                  <RouteStack
                    tone="onForest"
                    start={ride.start_location}
                    end={ride.end_location}
                    textStyle={styles.locationText}
                  />
                </View>
              </View>
              
              <View style={styles.scooterContainer}>
                {/* Asset picked from the same ladder RideCard +
                    CreateRide use — match the ride's actual seat
                    capacity instead of always showing the Vespa. */}
                <Image
                  source={getVehicleIcon(ride.total_seats || 0)}
                  style={styles.scooterImage}
                  resizeMode="contain"
                />
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
            {(() => {
              const displayHostName = ride.host_user_name || hostUserNameFetched;
              if (!displayHostName) return null;
              return (
                <View style={styles.hostRow}>
                  <Text style={styles.creatorText} numberOfLines={1} ellipsizeMode="tail">
                    Hosted by {displayHostName}
                  </Text>
                  {hostVerified ? (
                    <View style={styles.verifiedDot}>
                      <Text style={styles.verifiedGlyph}>✓</Text>
                    </View>
                  ) : null}
                </View>
              );
            })()}
            {hostInstituteName ? (
              <View style={styles.instituteRow}>
                <Text style={styles.instituteText} numberOfLines={1} ellipsizeMode="tail">
                  {hostInstituteName}
                </Text>
                {hostSameInstituteAsViewer ? (
                  <View style={styles.sameCampusChip}>
                    <Text style={styles.sameCampusChipText}>SAME CAMPUS</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            {/* YOB — same source-merge pattern as the host name. */}
            <Text style={styles.yobText}>
              {getAgeText(ride.host_user_yob || hostUserYobFetched || undefined)}
            </Text>
            
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
              // Modular trip preview — same component used by
              // RideDetailsScreen. Owns the camera framing + start dot +
              // end arrow + dashed-red polyline. Runs on the OpenFreeMap
              // tile stack the HomeScreen map switched to.
              <TripPreviewMap
                style={styles.mapView}
                start={{
                  latitude: ride.start_latitude!,
                  longitude: ride.start_longitude!,
                }}
                end={{
                  latitude: ride.end_latitude!,
                  longitude: ride.end_longitude!,
                }}
                routePoints={routeCoordinates}
              />
            ) : (
              <View style={styles.mapPlaceholder}>
                <Text style={styles.loadingText}>Loading map...</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.bottomContainer}>
        {/* Bottom action zone — branches on the server-computed
            viewer_state instead of the old "isHost && hasBooking &&
            status === 'pending'" chain. One field in → one CTA out. */}
        {(() => {
          // Default to "available" while we wait for the fetch to
          // resolve — the slide is disabled so nothing actually
          // fires; this just stops the layout from being empty.
          const state = viewerState ?? "available";

          if (state === "host") {
            return (
              <View style={styles.viewerNoticeWrap}>
                <Text style={styles.viewerNoticeTitle}>You're hosting this ride</Text>
                <TouchableOpacity
                  style={styles.viewerNoticeBtn}
                  onPress={() => router.navigate(appHref("RideDetailsScreen", { rideId: ride.id }))}
                >
                  <Text style={styles.viewerNoticeBtnText}>Manage</Text>
                </TouchableOpacity>
              </View>
            );
          }
          if (state === "pending_passenger" || state === "rejected_passenger") {
            // The useEffect above redirects these viewers to
            // RideDetailsScreen. Render nothing in the bottom slot
            // while the navigation transition is in flight so the old
            // notice card doesn't flash on screen.
            return null;
          }
          if (state === "confirmed_passenger") {
            return (
              <View style={styles.viewerNoticeWrap}>
                <Text style={styles.viewerNoticeTitle}>Your seat is confirmed</Text>
                <TouchableOpacity
                  style={styles.viewerNoticeBtn}
                  onPress={() => router.navigate(appHref("RideDetailsScreen", { rideId: ride.id }))}
                >
                  <Text style={styles.viewerNoticeBtnText}>View booking</Text>
                </TouchableOpacity>
              </View>
            );
          }
          // (rejected_passenger handled above — falls through to the
          // redirect to RideDetailsScreen alongside pending.)
          if (state === "full") {
            return (
              <View style={styles.viewerNoticeWrap}>
                <Text style={styles.viewerNoticeTitle}>This ride is full</Text>
                <Text style={styles.viewerNoticeSub}>All seats have been taken.</Text>
              </View>
            );
          }
          if (state === "past") {
            return (
              <View style={styles.viewerNoticeWrap}>
                <Text style={styles.viewerNoticeTitle}>Trip completed</Text>
              </View>
            );
          }
          // available
          return (
            <SlideToCreate
              onSlideComplete={handleRequestRide}
              text={isRequesting ? "Requesting..." : "Slide to request ride"}
              disabled={isRequesting || viewerActions.can_request_seat === false}
              sliderIcon={require("../../assets/slide.png")}
            />
          );
        })()}
      </View>
    </View>
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
    gap: 10,
  },
  backButton: {
    marginRight: 1,
    marginTop: 7,
  },
  // Title that sits next to the back chevron on screens that don't
  // need a dedicated app bar. Matches the visual weight + colour of
  // RideDetailsScreen's `headerTitle` so the navigation chrome reads
  // consistently across the booking flow.
  navigationTitle: {
    fontSize: 18,
    fontFamily: 'NunitoSans_800ExtraBold',
    color: AppColors.secondaryDarkGreen,
    letterSpacing: -0.3,
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
    // Explicit lineHeight makes the Text box height predictable so
    // the row's `alignItems: 'center'` lines up the verified dot with
    // the text's optical center instead of with the default
    // platform-specific font metrics box. No vertical margin here —
    // the row owns the bottom spacing.
    lineHeight: 18,
    includeFontPadding: false,
  },
  // Host row — name + optional verified checkmark glyph. Sits in
  // the forest dark trip card, so the checkmark is lime. The text
  // owns its own line height, the dot is sized to match the text's
  // cap height (~16pt) so the badge feels like a punctuation mark
  // sitting next to the name rather than a clip-art element bolted on.
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  verifiedDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: AppColors.primaryLightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedGlyph: {
    color: AppColors.secondaryDarkGreen,
    fontFamily: 'NunitoSans_800ExtraBold',
    fontSize: 10,
    lineHeight: 12,
    includeFontPadding: false,
    textAlign: 'center',
  },
  // Institute label + optional Same-campus chip on a second line.
  instituteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  instituteText: {
    color: AppColors.primaryLightGreen,
    opacity: 0.75,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12.5,
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  sameCampusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: AppColors.primaryLightGreen,
  },
  sameCampusChipText: {
    color: AppColors.secondaryDarkGreen,
    fontFamily: 'NunitoSans_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.6,
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
  /* Custom map markers — black dot for start (white halo so it sits
     clean against any tile colour), black navigation glyph for end
     anchored to its base so the tip lands on the coordinate. Same
     idiom as the RideDetailsScreen map. */
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
  // States the user can't act on (pending / declined / full / past)
  // render a forest dark notice card here instead of the slide CTA.
  viewerNoticeWrap: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },
  viewerNoticeTitle: {
    flex: 1,
    color: AppColors.primaryLightGreen,
    fontSize: 15,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: -0.2,
  },
  viewerNoticeSub: {
    color: AppColors.basicWhite,
    fontSize: 12,
    fontFamily: "NunitoSans_600SemiBold",
    opacity: 0.7,
    marginTop: 2,
  },
  viewerNoticeBtn: {
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  viewerNoticeBtnText: {
    color: AppColors.secondaryDarkGreen,
    fontSize: 13,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: 0.2,
  },
});

export default AvailableRideScreenSelected;
