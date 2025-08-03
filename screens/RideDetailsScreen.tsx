import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import AppColors from "../design_systems/colors";
import RideCard from "../components/RideCard";
import LoadingComponent from "../components/LoadingComponent";
import ChevronBack from "../components/ChevronBack";
import SlideToCreate from "../components/SlideToCreate";
import { useNavigation, useRoute } from "@react-navigation/native";
import BrandInfo from "../components/BrandInfo";

const RideDetailsScreen: React.FC = () => {
  const [showSlide, setShowSlide] = React.useState<null | "accept" | "reject" | "remove">(null);
  const [selectedRequest, setSelectedRequest] = React.useState<any>(null);
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
  const { apiUtil } = require("../utils/ApiUtil").useApi();
  const navigation = useNavigation();
  const route = useRoute();

  const rideId = route.params && (route.params as any).rideId;

  const [retryKey, setRetryKey] = React.useState(0);

  React.useEffect(() => {
    async function fetchRideDetails() {
      try {
        if (!rideId || typeof rideId !== "string" || !/^[0-9a-fA-F-]{36}$/.test(rideId)) {
          setRideError("Invalid or missing ride ID. Please go back and try again.");
          setRequestsError("Invalid or missing ride ID. Please go back and try again.");
          return;
        }

        console.log("Fetching complete ride details for ID:", rideId);

        try {
          const completeRideData = await apiUtil.get(`/ride/details/${rideId}`);
          console.log("Complete ride data received:", completeRideData);

          if (completeRideData) {
            setRideDetails({
              id: completeRideData.id,
              host_user_id: completeRideData.host_user_id,
              host_user_name: completeRideData.host_user_name,
              start_location: completeRideData.start_location,
              end_location: completeRideData.end_location,
              start_time: completeRideData.start_time,
              total_price: completeRideData.total_price,
              total_seats: completeRideData.total_seats,
              booked_seats: completeRideData.booked_seats,
              is_ongoing: completeRideData.is_ongoing,
              created_at: completeRideData.created_at,
            });

            if (completeRideData.is_user_host) {
              setCurrentUser({
                id: completeRideData.host.id,
                name: completeRideData.host.name,
                email: completeRideData.host.email,
                profile_picture_url: completeRideData.host.profile_picture_url,
              });
            }

            setIsHost(completeRideData.is_user_host);
            console.log("User is host:", completeRideData.is_user_host);

            const transformedBookings = (completeRideData.bookings || []).map((booking: any) => ({
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
            console.log("Transformed bookings:", transformedBookings);
          } else {
            setRideError("Ride not found");
          }
        } catch (err: any) {
          console.error("Error fetching complete ride details:", err);
          setRideError(err.message || "Failed to fetch ride details");
        } finally {
          setRideLoading(false);
          setUserLoading(false);
          setRequestsLoading(false);
        }
      } catch (err: any) {
        console.error("Error in fetchRideDetails:", err);
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
        const localHours = dateTime.getHours().toString().padStart(2, "0");
        const localMinutes = dateTime.getMinutes().toString().padStart(2, "0");
        return `${localHours}${localMinutes}Hrs`;
      }
      return `${isoMatch[2]}${isoMatch[3]}Hrs`;
    }

    if (/\d{4}Hrs/.test(timeStr)) return timeStr;
    if (/\d{4} ?hrs?/i.test(timeStr)) return timeStr.replace(/ ?hrs?/i, "Hrs");
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      const [hours, minutes] = timeStr.split(":");
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
        <LoadingComponent />
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
              setRetryKey((prev) => prev + 1);
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

      {formattedDate ? <Text style={styles.dateText}>{formattedDate}</Text> : null}

      <View style={{ margin: 16, marginBottom: 8 }}>
        <RideCard
          id={displayRide?.id || ""}
          origin={displayRide?.start_location || ""}
          destination={displayRide?.end_location || ""}
          time={formatTime(displayRide?.start_time || "")}
          price={displayRide?.total_price || 0}
          seatsAvailable={`${(displayRide?.total_seats || 0) - ((displayRide?.booked_seats || 0) + 1)}/${displayRide?.total_seats || 0}`}
          isSelected={true}
          variant={displayRide?.is_ongoing ? "inprogress" : "upcoming"}
        />
      </View>

      <Text style={styles.requestsHeader}>{isHost ? "Ride Management" : "Passengers"}</Text>

      {requestsLoading ? (
        <View style={styles.inlineLoadingContainer}>
          <LoadingComponent />
        </View>
      ) : requestsError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{requestsError}</Text>
        </View>
      ) : requests.length === 0 ? (
        <Text style={styles.emptyText}>{isHost ? "No bookings found." : "No confirmed passengers yet."}</Text>
      ) : (
        requests.map((req, idx) => {
          const passengerName =
            req.passenger?.name ||
            req.Passenger?.name ||
            (req.passenger_id === currentUser?.id ? currentUser?.name : null) ||
            "Unknown User";
          const isCurrentUser = req.passenger_id === currentUser?.id;
          const isHostPassenger =
            rideDetails?.host_user_id === req.passenger_id ||
            String(rideDetails?.host_user_id) === String(req.passenger_id);
          const isHostBooking = req.id === "host-booking";
          const canRemove = isHost && !isHostBooking && !isCurrentUser;

          let displayName = passengerName;
          if (isCurrentUser && isHostPassenger) {
            displayName = `${passengerName} (Host)`;
          } else if (isCurrentUser) {
            displayName = `${passengerName} (You)`;
          } else if (isHostPassenger) {
            displayName = `${passengerName} (Host)`;
          }

          if (req.passenger_id === currentUser?.id) {
            console.log("Current user passenger details:", {
              passengerName,
              isCurrentUser,
              isHostPassenger,
              rideHostId: rideDetails?.host_user_id,
              currentUserId: currentUser?.id,
              isEqual: rideDetails?.host_user_id === currentUser?.id,
              isEqualString: String(rideDetails?.host_user_id) === String(currentUser?.id),
            });
          }

          // Unified slide view styled exactly like pending accept/reject card
          if (showSlide && selectedRequest?.id === req.id) {
            return (
              <View key={req.id || idx} style={styles.pendingRequestCard}>
                <Text style={styles.pendingRequestName}>
                  {loading
                    ? showSlide === "accept"
                      ? "Accepting..."
                      : showSlide === "reject"
                      ? "Rejecting..."
                      : `Removing ${passengerName}...`
                    : displayName}
                </Text>

                {/* Action buttons to initiate sliding (consistent UI) */}
                <View style={styles.pendingRequestActions}>
                  {/* Left action mirrors reject style but used for remove or reject based on state */}
                  {showSlide !== "accept" && (
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => {
                        // If currently removing, tapping X simply cancels slide view
                        if (showSlide === "remove") {
                          setShowSlide(null);
                          setSelectedRequest(null);
                          setError(null);
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

                  {/* Right action mirrors accept style, reused for accept OR to actually slide-confirm remove */}
                  <View style={styles.acceptButton}>
                    <Image source={require("../assets/check.png")} style={styles.actionIconAccept} />
                    <Text style={styles.acceptLabel}>
                      {showSlide === "accept"
                        ? "Accept"
                        : showSlide === "reject"
                        ? "Reject"
                        : "Remove"}
                    </Text>

                    {/* The slider itself, visually integrated below the icon/label (no new visuals) */}
                    <View style={styles.integratedSliderContainer}>
                      <SlideToCreate
                        text={
                          loading
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
                          setLoading(true);
                          setError(null);
                          try {
                            const bookingId = req.id || req.booking_id;
                            let updatedBookings = [];
                            if (showSlide === "accept") {
                              console.log("Accepting booking:", bookingId);
                              await apiUtil.put(`/bookings/accept/${bookingId}`, {});
                              const bookingsResponse = await apiUtil.get(`/booking/ride/${rideId}`);
                              updatedBookings = bookingsResponse?.bookings || [];
                            } else if (showSlide === "reject") {
                              console.log("Rejecting booking:", bookingId);
                              await apiUtil.patch(`/booking/update/${bookingId}`, { request_status: "rejected" });
                              const bookingsResponse = await apiUtil.get(`/booking/ride/${rideId}`);
                              updatedBookings = bookingsResponse?.bookings || [];
                            } else if (showSlide === "remove") {
                              if (isHostBooking) {
                                throw new Error("Cannot remove host from their own ride");
                              }
                              console.log("Removing passenger from booking:", bookingId);
                              await apiUtil.delete(`/booking/delete/${bookingId}`);
                              const bookingsResponse = await apiUtil.get(`/booking/ride/${rideId}`);
                              updatedBookings = bookingsResponse?.bookings || [];
                            }
                            // Refresh complete ride data after action
                            const completeRideData = await apiUtil.get(`/ride/details/${rideId}`);
                            if (completeRideData) {
                              const transformedBookings = (completeRideData.bookings || []).map((booking: any) => ({
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
                              setRideDetails((prev: any) => ({
                                ...prev,
                                booked_seats: completeRideData.booked_seats,
                              }));
                            }
                            setShowSlide(null);
                            setSelectedRequest(null);
                          } catch (err: any) {
                            console.error(`Error ${showSlide}ing request:`, err);
                            setError(err.message || `Failed to ${showSlide} request`);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        sliderIcon={require("../assets/slide.png")}
                        backgroundColor={AppColors.basicWhite}
                        sliderButtonColor={showSlide === "accept" ? AppColors.secondaryDarkGreen : "#FF3B30"}
                        textColor={showSlide === "accept" ? AppColors.secondaryDarkGreen : "#FF3B30"}
                        borderColor={AppColors.basicWhite}
                      />
                      {error ? <Text style={styles.inlineErrorText}>{error}</Text> : null}
                    </View>
                  </View>
                </View>
              </View>
            );
          }

          // Pending request (unchanged look)
          if (isHost && req.request_status === "pending") {
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

          // Confirmed passenger row
          return (
            <View
              key={req.id || idx}
              style={[styles.confirmedPassengerCard, isHostBooking && styles.hostPassengerCard]}
            >
              <View style={styles.passengerInfo}>
                <Text style={[styles.passengerName, isHostBooking && styles.hostPassengerName]}>{displayName}</Text>
                <View style={[styles.statusBadge, isHostBooking && styles.hostStatusBadge]}>
                  <Text style={styles.statusText}>
                    {req.request_status === "pending" ? "Pending" : "Confirmed"}
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
    </View>
  );
};

const styles = StyleSheet.create({
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
  dateText: {
    fontSize: 16,
    fontFamily: "NunitoSans_700Bold",
    color: AppColors.basicBlack,
    marginLeft: 16,
    marginBottom: 4,
    textAlign: "left",
  },
  requestsHeader: {
    fontSize: 18,
    fontFamily: "NunitoSans_700Bold",
    color: AppColors.basicBlack,
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  inlineLoadingContainer: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 16,
  },
  loadingText: {
    color: AppColors.basicBlack,
    fontSize: 16,
    fontFamily: "NunitoSans_400Regular",
    textAlign: "center",
    marginLeft: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  errorText: {
    color: "red",
    fontSize: 16,
    fontFamily: "NunitoSans_400Regular",
    textAlign: "center",
    marginBottom: 16,
    marginLeft: 16,
  },
  inlineErrorText: {
    color: "red",
    fontSize: 12,
    fontFamily: "NunitoSans_400Regular",
    textAlign: "center",
    marginTop: 8,
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
    fontFamily: "NunitoSans_600SemiBold",
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
  // integrated slider to visually live under the accept/reject label
  integratedSliderContainer: {
    width: 220,
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
  statusText: {
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
  slideContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  cancelButton: {
    display: "none", // not used anymore; integrated cancel via the left action
  },
  cancelButtonText: {
    color: AppColors.basicWhite,
    fontSize: 14,
    fontFamily: "NunitoSans_600SemiBold",
    textAlign: "center",
  },
});

export default RideDetailsScreen;