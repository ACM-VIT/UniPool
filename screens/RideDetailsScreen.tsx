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
  const navigation = useNavigation();
  const route = useRoute();
  const ride = (route.params && (route.params as any).ride) || {};

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

  const rawDate = ride?.date || ride?.ride_date || ride?.start_time || null;
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
      <View style={styles.header}>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
          backgroundColor: AppColors.primaryLightGreen,
        }}
      >
        <BrandInfo />
        </View>
      </View>
      <View style={styles.chevronRow}>
        <ChevronBack onPress={() => navigation.goBack()} style={{ marginRight: 8 }} />
        <Text style={styles.rideDetailsSubHeader}>Ride Details</Text>
      </View>
      {formattedDate ? (
        <Text style={styles.dateText}>{formattedDate}</Text>
      ) : null}
      <View style={{ margin: 16, marginBottom: 8 }}>
        <RideCard
          id={ride?.id || ride?.ride_id || ""}
          origin={ride?.origin || ride?.start_location || "VIT Vellore"}
          destination={ride?.destination || ride?.end_location || "Chennai Airport"}
          time={formatTime(ride?.time || ride?.start_time || "1700 hrs")}
          price={ride?.price || ride?.total_price || 500}
          seatsAvailable={ride?.seatsAvailable || `${ride?.booked_seats || 1}/${ride?.total_seats || 2}`}
          isSelected={true}
          variant={ride?.variant || "inprogress"}
        />
      </View>
      <Text style={styles.requestsHeader}>Requests</Text>
      <View style={styles.requestCard}>
        {showSlide === null ? (
          <View style={styles.requestCardBlack}>
            <Text style={styles.requestNameLargeBlack}>Pranav Singh</Text>
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
              text="Slide to accept user"
              onSlideComplete={() => { setShowSlide(null); /* handle accept logic here */ }}
              sliderIcon={require('../assets/slide.png')}
              backgroundColor="#fff"
              sliderButtonColor={AppColors.secondaryDarkGreen}
              textColor={AppColors.secondaryDarkGreen}
              borderColor="#fff"
            />
          </View>
        ) : (
          <View style={styles.slideContainer}>
            <SlideToCreate
              text="Slide to reject user"
              onSlideComplete={() => { setShowSlide(null); /* handle reject logic here */ }}
              sliderIcon={require('../assets/slide.png')}
              backgroundColor="#fff"
              sliderButtonColor="#FF3B30"
              textColor="#FF3B30"
              borderColor="#fff"
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
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
    fontFamily: "NunitoSans_700Bold",
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
    paddingVertical: 18,
    paddingHorizontal: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
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
