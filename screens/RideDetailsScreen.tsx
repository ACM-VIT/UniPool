import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, StatusBar } from "react-native";
import AppColors from "../design_systems/colors";
import RideCard from "../components/RideCard";
import BrandInfo from "../components/BrandInfo";
import ChevronBack from "../components/ChevronBack";
import SlideToCreate from "../components/SlideToCreate";
import { useNavigation, useRoute } from "@react-navigation/native";

const RideDetailsScreen: React.FC = () => {
  const [showSlide, setShowSlide] = React.useState<null | 'accept' | 'reject'>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [requests, setRequests] = React.useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = React.useState(true);
  const [requestsError, setRequestsError] = React.useState<string | null>(null);
  const [rideDetails, setRideDetails] = React.useState<any>(null);
  const [rideLoading, setRideLoading] = React.useState(true);
  const [rideError, setRideError] = React.useState<string | null>(null);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [userLoading, setUserLoading] = React.useState(true);
  const [isHost, setIsHost] = React.useState<boolean>(false);
  const { apiUtil } = require('../utils/ApiUtil').useApi();
  const navigation = useNavigation();
  const route = useRoute();
  
  const rideId = route.params && (route.params as any).rideId;

  const [retryKey, setRetryKey] = React.useState(0);

  React.useEffect(() => {
    async function fetchRideDetails() {
      try {
        if (!rideId || typeof rideId !== 'string' || !/^[0-9a-fA-F-]{36}$/.test(rideId)) {
          setRideError("Invalid or missing ride ID. Please go back and try again.");
          setRequestsError("Invalid or missing ride ID. Please go back and try again.");
          return;
        }

        console.log('Fetching ride details for ID:', rideId);
        
        try {
          const userResponse = await apiUtil.get('/user/details');
          if (userResponse) {
            setCurrentUser(userResponse);
          }
        } catch (err: any) {
          console.error('Error fetching user details:', err);
        } finally {
          setUserLoading(false);
        }

        try {
          const rideResponse = await apiUtil.get(`/ride/fetch/${rideId}`);
          if (rideResponse) {
            setRideDetails(rideResponse);
            // Check if user is host using the fresh response data  
            const userResponse = await apiUtil.get('/user/details');
            if (userResponse && rideResponse.host_id === userResponse.id) {
              setIsHost(true);
            }
          } else {
            setRideError("Ride not found");
          }
        } catch (err: any) {
          console.error('Error fetching ride details:', err);
          setRideError(err.message || "Failed to fetch ride details");
        } finally {
          setRideLoading(false);
        }

        try {
          const bookingsResponse = await apiUtil.get(`/booking/ride/${rideId}`);
          console.log("bookingsResponse", bookingsResponse);
          
          if (bookingsResponse && bookingsResponse.bookings && Array.isArray(bookingsResponse.bookings)) {
            const allBookings = bookingsResponse.bookings;
            
            const userResponse = await apiUtil.get('/user/details');
            const rideResponse = await apiUtil.get(`/ride/fetch/${rideId}`);
            
            let filteredBookings = allBookings;
            
            if (userResponse && rideResponse && rideResponse.host_id === userResponse.id) {
              const hostHasBooking = allBookings.some((booking: any) => booking.passenger_id === userResponse.id);
              if (!hostHasBooking) {
                const hostBooking = {
                  id: 'host-booking',
                  passenger_id: userResponse.id,
                  passenger_name: userResponse.name,
                  Passenger: { name: userResponse.name },
                  request_status: 'accepted'
                };
                filteredBookings = [hostBooking, ...allBookings];
              }
            }
            
            setRequests(filteredBookings);
          } else {
            setRequests([]);
          }
          setRequestsError(null);
        } catch (err: any) {
          console.error('Error fetching bookings:', err);
          setRequestsError(err.message || "Failed to fetch booking requests");
          setRequests([]);
        } finally {
          setRequestsLoading(false);
        }

      } catch (err: any) {
        console.error('Error in fetchRideDetails:', err);
        setRideError(err.message || "An unexpected error occurred");
        setRequestsError(err.message || "An unexpected error occurred");
        setRideLoading(false);
        setRequestsLoading(false);
        setUserLoading(false);
      }
    }
    
    fetchRideDetails();
  }, [rideId, retryKey]);

  function formatTime(timeStr: string) {
    if (!timeStr) return "";
    
    const isoMatch = timeStr.match(/^(\d{4}-\d{2}-\d{2}T)(\d{2}):(\d{2})/);
    if (isoMatch) {
      const dateTime = new Date(timeStr);
      if (!isNaN(dateTime.getTime())) {
        const localHours = dateTime.getHours().toString().padStart(2, '0');
        const localMinutes = dateTime.getMinutes().toString().padStart(2, '0');
        return `${localHours}${localMinutes}Hrs`;
      }
      return `${isoMatch[2]}${isoMatch[3]}Hrs`;
    }
    
    if (/\d{4}Hrs/.test(timeStr)) return timeStr;
    if (/\d{4} ?hrs?/i.test(timeStr)) return timeStr.replace(/ ?hrs?/i, "Hrs");
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      const [hours, minutes] = timeStr.split(':');
      return `${hours}${minutes}Hrs`;
    }
    
    return timeStr;
  }

  function formatDate(rawDate: string) {
    if (!rawDate) return "";
    
    const dateObj = new Date(rawDate);
    if (!isNaN(dateObj.getTime())) {
      const localDate = new Date(dateObj.getTime());
      return `${localDate.getDate()} ${localDate.toLocaleString("default", { month: "long" })}, ${localDate.getFullYear()}`;
    }
    
    if (typeof rawDate === "string" && rawDate.length > 0) {
      return rawDate;
    }
    
    return "";
  }

  if (rideLoading || userLoading) {
    return (
      <View style={styles.container}>
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            backgroundColor: AppColors.primaryLightGreen,
          }}
        >
          <BrandInfo />
        </View>
        <View style={styles.header} />
        <View style={styles.chevronRow}>
          <ChevronBack onPress={() => navigation.goBack()} style={{ marginRight: 8 }} />
          <Text style={styles.rideDetailsSubHeader}>Ride Details</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading ride details...</Text>
        </View>
      </View>
    );
  }

  if (rideError) {
    return (
      <View style={styles.container}>
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            backgroundColor: AppColors.primaryLightGreen,
          }}
        >
          <BrandInfo />
        </View>
        <View style={styles.header} />
        <View style={styles.chevronRow}>
          <ChevronBack onPress={() => navigation.goBack()} style={{ marginRight: 8 }} />
          <Text style={styles.rideDetailsSubHeader}>Ride Details</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{rideError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setRideError(null);
              setRideLoading(true);
              setRetryKey(prev => prev + 1);
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const displayRide = rideDetails;
  const rawDate = displayRide?.date || displayRide?.ride_date || displayRide?.start_time || null;
  const formattedDate = formatDate(rawDate);

  return (
    <View style={styles.container}>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: AppColors.primaryLightGreen,
        }}
      >
        <BrandInfo />
      </View>
      <View style={styles.header} />
      <View style={styles.chevronRow}>
        <ChevronBack onPress={() => navigation.goBack()} style={{ marginRight: 8 }} />
        <Text style={styles.rideDetailsSubHeader}>Ride Details</Text>
      </View>
      
      {formattedDate ? (
        <Text style={styles.dateText}>{formattedDate}</Text>
      ) : null}
      
      <View style={{ margin: 16, marginBottom: 8 }}>
        <RideCard
          id={displayRide?.id || displayRide?.ride_id || ""}
          origin={displayRide?.origin || displayRide?.start_location || ""}
          destination={displayRide?.destination || displayRide?.end_location || ""}
          time={formatTime(displayRide?.time || displayRide?.start_time || "")}
          price={displayRide?.price || displayRide?.total_price || 0}
          seatsAvailable={displayRide?.seatsAvailable || `${displayRide?.booked_seats || 0}/${displayRide?.total_seats || 0}`}
          isSelected={true}
          variant={displayRide?.variant || "inprogress"}
        />
      </View>
      
      <Text style={styles.requestsHeader}>
        {isHost ? "Ride Management" : "Passengers"}
      </Text>
      
      {requestsLoading ? (
        <Text style={styles.loadingText}>Loading {isHost ? "requests" : "passengers"}...</Text>
      ) : requestsError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{requestsError}</Text>
        </View>
      ) : requests.length === 0 ? (
        <Text style={styles.emptyText}>
          {isHost ? "No bookings found." : "No confirmed passengers yet."}
        </Text>
      ) : (
        requests.map((req, idx) => (
          <View style={styles.requestCard} key={req.id || idx}>
            {isHost && req.request_status === 'pending' ? (
              // Show pending requests with accept/reject buttons for hosts
              showSlide === null ? (
                <View style={styles.requestCardBlack}>
                  <Text style={styles.requestNameBlack}>
                    {req.passenger?.name || req.Passenger?.name || "User"}
                  </Text>
                  <View style={styles.requestActionsRowBlack}>
                    <TouchableOpacity style={styles.rejectButtonBlack} onPress={() => setShowSlide('reject')}>
                      <Image source={require('../assets/cross.png')} style={styles.actionIconBlack} />
                      <Text style={styles.actionLabelBlack}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.acceptButtonBlack} onPress={() => setShowSlide('accept')}>
                      <Image source={require('../assets/check.png')} style={styles.actionIconAccept} />
                      <Text style={styles.acceptLabelBlack}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : showSlide === 'accept' ? (
                <View style={styles.slideContainer}>
                  <SlideToCreate
                    text={loading ? "Accepting..." : "Slide to accept user"}
                    onSlideComplete={async () => {
                      setLoading(true);
                      setError(null);
                      try {
                        const bookingId = req.id || req.booking_id;
                        console.log('Accepting booking:', bookingId);
                        await apiUtil.put(`/bookings/accept/${bookingId}`, {});
                        
                        setRequests(prev => prev.filter(r => (r.id || r.booking_id) !== bookingId));
                        setShowSlide(null);
                      } catch (err: any) {
                        console.error('Error accepting request:', err);
                        setError(err.message || "Failed to accept request");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    sliderIcon={require('../assets/slide.png')}
                    backgroundColor="#fff"
                    sliderButtonColor={AppColors.secondaryDarkGreen}
                    textColor={AppColors.secondaryDarkGreen}
                    borderColor="#fff"
                  />
                  {error && <Text style={styles.errorText}>{error}</Text>}
                </View>
              ) : (
                <View style={styles.slideContainer}>
                  <SlideToCreate
                    text={loading ? "Rejecting..." : "Slide to reject user"}
                    onSlideComplete={async () => {
                      setLoading(true);
                      setError(null);
                      try {
                        const bookingId = req.id || req.booking_id;
                        console.log('Rejecting booking:', bookingId);
                        await apiUtil.patch(`/booking/update/${bookingId}`, { request_status: "rejected" });
                        
                        setRequests(prev => prev.filter(r => (r.id || r.booking_id) !== bookingId));
                        setShowSlide(null);
                      } catch (err: any) {
                        console.error('Error rejecting request:', err);
                        setError(err.message || "Failed to reject request");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    sliderIcon={require('../assets/slide.png')}
                    backgroundColor="#fff"
                    sliderButtonColor="#FF3B30"
                    textColor="#FF3B30"
                    borderColor="#fff"
                  />
                  {error && <Text style={styles.errorText}>{error}</Text>}
                </View>
              )
            ) : (
              <View style={styles.passengerCardView}>
                <Text style={styles.passengerNameText}>
                  {(() => {
                    const passengerName = req.passenger?.name || req.Passenger?.name || "User";
                    const isCurrentUser = req.passenger_id === currentUser?.id;
                    const isHostPassenger = rideDetails?.host_id === req.passenger_id;
                    
                    if (isCurrentUser && isHostPassenger) {
                      return `${passengerName} (You - Host)`;
                    } else if (isCurrentUser) {
                      return `${passengerName} (You)`;
                    } else if (isHostPassenger) {
                      return `${passengerName} (Host)`;
                    } else {
                      return passengerName;
                    }
                  })()}
                </Text>
                <View style={styles.confirmedBadge}>
                  <Text style={styles.confirmedText}>
                    {req.request_status === 'pending' ? 'Pending' : 'Confirmed'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  loadingText: {
    color: AppColors.basicBlack,
    fontSize: 16,
    fontFamily: 'NunitoSans_400Regular',
    textAlign: 'center',
    marginLeft: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    fontFamily: 'NunitoSans_400Regular',
    textAlign: 'center',
    marginBottom: 16,
    marginLeft: 16,
  },
  retryButton: {
    backgroundColor: AppColors.secondaryDarkGreen,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: AppColors.basicWhite,
    fontSize: 16,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  emptyText: {
    color: AppColors.basicBlack,
    fontSize: 16,
    fontFamily: 'NunitoSans_400Regular',
    marginLeft: 16,
  },
  passengerCardView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: AppColors.basicWhite,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 0,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  passengerNameText: {
    color: AppColors.basicBlack,
    fontSize: 18,
    fontFamily: 'NunitoSans_600SemiBold',
    flex: 1,
  },
  confirmedBadge: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  confirmedText: {
    color: AppColors.basicWhite,
    fontSize: 12,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  requestCardBlack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: AppColors.basicBlack,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginHorizontal: 0,
    marginBottom: 16,
    elevation: 0,
  },
  requestNameBlack: {
    color: AppColors.basicWhite,
    fontSize: 18,
    fontFamily: 'NunitoSans_600SemiBold',
    flex: 1,
  },
  requestActionsRowBlack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
    marginLeft: 16,
  },
  rejectButtonBlack: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  actionIconBlack: {
    width: 32,
    height: 32,
    marginBottom: 2,
    resizeMode: 'contain',
  },
  actionLabelBlack: {
    color: AppColors.basicWhite,
    fontSize: 12,
    fontFamily: 'NunitoSans_400Regular',
    marginTop: 2,
    textAlign: 'center',
  },
  acceptButtonBlack: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  actionIconAccept: {
    width: 32,
    height: 32,
    marginBottom: 2,
    resizeMode: 'contain',
  },
  acceptLabelBlack: {
    color: '#C6FF00',
    fontSize: 12,
    fontFamily: 'NunitoSans_600SemiBold',
    marginTop: 2,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLightGreen,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 16,
    fontFamily: "NunitoSans_700Bold",
    color: AppColors.basicBlack,
    marginLeft: 16,
    marginBottom: 4,
    textAlign: "left",
  },
  chevronRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 34,
    marginBottom: 8,
  },
  rideDetailsSubHeader: {
    fontSize: 20,
    fontFamily: "NunitoSans_400Regular",
    color: AppColors.basicBlack,
  },
  requestsHeader: {
    fontSize: 18,
    fontFamily: "NunitoSans_700Bold",
    color: AppColors.basicBlack,
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  requestCard: {
    borderRadius: 22,
    marginHorizontal: 16,
    paddingHorizontal: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
    elevation: 0,
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
});

export default RideDetailsScreen;