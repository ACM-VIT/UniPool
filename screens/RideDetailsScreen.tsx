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
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [isHost, setIsHost] = React.useState<boolean>(false);
  const { apiUtil } = require('../utils/ApiUtil').useApi();
  const navigation = useNavigation();
  const route = useRoute();
  // Accept rideId from navigation params
  const rideId = route.params && (route.params as any).rideId;


  React.useEffect(() => {
    async function fetchRideDetails() {
      try {
        // Validate rideId: must be a non-empty string and look like a UUID
        if (!rideId || typeof rideId !== 'string' || !/^[0-9a-fA-F-]{36}$/.test(rideId)) {
          setRequestsError("Invalid or missing ride ID. Please go back and try again.");
          return;
        }
        console.log('Fetching ride details for ID:', rideId);
        const userResponse = await apiUtil.get('/user/details');
        setCurrentUser(userResponse);
        const rideResponse = await apiUtil.get(`/ride/fetch/${rideId}`);
        setRideDetails(rideResponse);
        const bookingsResponse = await apiUtil.get(`/booking/list`);
        console.log("bookingsResponse", bookingsResponse);
        setRequests(Array.isArray(bookingsResponse) ? bookingsResponse : []);
        setRequestsError(null);
      } catch (err: any) {
        console.error('Error fetching ride details:', err);
        setRequestsError(err.message || "Failed to fetch ride details");
      } finally {
        setRequestsLoading(false);
      }
    }
    fetchRideDetails();
  }, [rideId]);
  const bookingId = rideId || "demo-booking-id";

  function formatTime(timeStr: string) {
    if (!timeStr) return "";
    const isoMatch = timeStr.match(/^(\d{4}-\d{2}-\d{2}T)(\d{2}):(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[2]}${isoMatch[3]}Hrs`;
    }
    if (/\d{4}Hrs/.test(timeStr)) return timeStr;
    if (/\d{4} ?hrs?/i.test(timeStr)) return timeStr.replace(/ ?hrs?/i, "Hrs");
    if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr + "Hrs";
    return timeStr;
  }

  const displayRide = rideDetails;
  const rawDate = displayRide?.date || displayRide?.ride_date || displayRide?.start_time || null;
  let formattedDate = "";
  if (rawDate) {
    const dateObj = new Date(rawDate);
    if (!isNaN(dateObj.getTime())) {
      formattedDate = `${dateObj.getDate()} ${dateObj.toLocaleString("default", { month: "long" })}, ${dateObj.getFullYear()}`;
    } else if (typeof rawDate === "string" && rawDate.length > 0) {
      formattedDate = rawDate;
    }
  }

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
          origin={displayRide?.origin || displayRide?.start_location || "VIT Vellore"}
          destination={displayRide?.destination || displayRide?.end_location || "Chennai Airport"}
          time={formatTime(displayRide?.time || displayRide?.start_time || "1700 hrs")}
          price={displayRide?.price || displayRide?.total_price || 500}
          seatsAvailable={displayRide?.seatsAvailable || `${displayRide?.booked_seats || 1}/${displayRide?.total_seats || 2}`}
          isSelected={true}
          variant={displayRide?.variant || "inprogress"}
        />
      </View>
      <Text style={styles.requestsHeader}>{isHost ? "Requests" : "Passengers"}</Text>
      {requestsLoading ? (
        <Text style={{ color: AppColors.basicBlack, marginLeft: 16 }}>Loading {isHost ? "requests" : "passengers"}...</Text>
      ) : requestsError ? (
        <Text style={{ color: 'red', marginLeft: 16 }}>{requestsError}</Text>
      ) : requests.length === 0 ? (
        <Text style={{ color: AppColors.basicBlack, marginLeft: 16 }}>
          {isHost ? "No requests found." : "No confirmed passengers yet."}
        </Text>
      ) : (
        requests.map((req, idx) => (
          <View style={styles.requestCard} key={req.id || idx}>
            {isHost ? (
              showSlide === null ? (
                <View style={styles.requestCardBlack}>
                  <Text style={styles.requestNameLargeBlack}>
                    {req.passenger?.name || req.passenger_name || req.name || "User"}
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
                  {error && <Text style={{ color: 'red', marginTop: 8 }}>{error}</Text>}
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
                  {error && <Text style={{ color: 'red', marginTop: 8 }}>{error}</Text>}
                </View>
              )
            ) : (
              <View style={styles.passengerCardView}>
                <Text style={styles.passengerNameText}>
                  {(() => {
                    const passengerName = req.passenger?.name || req.passenger_name || req.name || "User";
                    const isCurrentUser = req.passenger_id === currentUser?.id;
                    const isHost = req.is_host;
                    
                    if (isCurrentUser && isHost) {
                      return `${passengerName} (You - Host)`;
                    } else if (isCurrentUser) {
                      return `${passengerName} (You)`;
                    } else if (isHost) {
                      return `${passengerName} (Host)`;
                    } else {
                      return passengerName;
                    }
                  })()}
                </Text>
                <View style={styles.confirmedBadge}>
                  <Text style={styles.confirmedText}>Confirmed</Text>
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
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 18,
    marginHorizontal: 0,
    marginBottom: 16,
    elevation: 0,
  },
  requestNameLargeBlack: {
    color: AppColors.basicWhite,
    fontSize: 24,
    fontFamily: 'NunitoSans_700Bold',
    flex: 1,
  },
  requestActionsRowBlack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
    marginLeft: 16,
  },
  rejectButtonBlack: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
  },
  actionIconBlack: {
    width: 40,
    height: 40,
    marginBottom: 2,
    resizeMode: 'contain',
  },
  actionLabelBlack: {
    color: AppColors.basicWhite,
    fontSize: 14,
    fontFamily: 'NunitoSans_400Regular',
    marginTop: 2,
    textAlign: 'center',
  },
  acceptButtonBlack: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
  },
  actionIconAccept: {
    width: 40,
    height: 40,
    marginBottom: 2,
    resizeMode: 'contain',
  },
  acceptLabelBlack: {
    color: '#C6FF00',
    fontSize: 15,
    fontFamily: 'NunitoSans_700Bold',
    marginTop: 2,
    textAlign: 'center',
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
  },
  requestNameLarge: {
    color: AppColors.basicWhite,
    fontSize: 24,
    fontFamily: 'NunitoSans_700Bold',
    flex: 1,
  },
  requestActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  actionIconLarge: {
    width: 32,
    height: 32,
    marginBottom: 2,
    resizeMode: 'contain',
  },
  actionLabelSmall: {
    color: AppColors.basicWhite,
    fontSize: 13,
    fontFamily: 'NunitoSans_400Regular',
    marginTop: 2,
    textAlign: 'center',
  },
  acceptLabelLarge: {
    color: '#C6FF00',
    fontSize: 18,
    fontFamily: 'NunitoSans_700Bold',
    marginLeft: 8,
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
  brandInfo: {
    marginLeft: 0,
    marginRight: 8,
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
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 20,
    color: AppColors.secondaryDarkGreen,
  },
  rideCard: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 8,
  },
  rideInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  locationText: {
    color: AppColors.primaryLightGreen,
    fontSize: 18,
    fontFamily: "NunitoSans_700Bold",
  },
  timeText: {
    color: AppColors.primaryLightGreen,
    fontSize: 16,
    fontFamily: "NunitoSans_400Regular",
  },
  priceText: {
    color: AppColors.primaryLightGreen,
    fontSize: 16,
    fontFamily: "NunitoSans_400Regular",
  },
  seatsRow: {
    marginTop: 8,
    marginBottom: 8,
  },
  seatsText: {
    color: AppColors.primaryLightGreen,
    fontSize: 16,
    fontFamily: "NunitoSans_400Regular",
  },
  vehicleImageContainer: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 80,
    height: 80,
  },
  vehicleImage: {
    width: "100%",
    height: "100%",
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
  requestName: {
    color: AppColors.basicBlack,
    fontSize: 22,
    fontFamily: "NunitoSans_700Bold",
    marginRight: 16,
  },
  requestActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  rejectButton: {
    alignItems: "center",
    marginRight: 0,
    justifyContent: "center",
    width: 60,
  },
  acceptButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
  },
  actionIcon: {
    width: 24,
    height: 24,
    marginBottom: 2,
    resizeMode: 'contain',
  },
  actionLabel: {
    color: AppColors.basicWhite,
    fontSize: 14,
    fontFamily: "NunitoSans_400Regular",
    marginTop: 2,
  },
  acceptLabel: {
    color: '#C6FF00',
    fontWeight: 'bold',
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: AppColors.secondaryDarkGreen,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 16,
  },
  navIcon: {
    width: 32,
    height: 32,
    backgroundColor: AppColors.primaryLightGreen,
    borderRadius: 8,
  },
});

export default RideDetailsScreen;
