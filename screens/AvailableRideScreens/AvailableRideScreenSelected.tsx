import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation } from '@react-navigation/native';
import ChevronBack from '../../components/ChevronBack/ChevronBack';
import SlideToCreate from '../../components/SlideToCreate/SlideToCreate';
import BrandInfo from '../../components/BrandInfo/BrandInfo';
import AppColors from '../../design_systems/colors';

type RootStackParamList = {
  AvailableRideScreen: undefined;
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
  // Default ride data
  const defaultRide = {
    id: '1',
    from: 'VIT Vellore',
    to: 'Chennai Airport',
    time: '1700 hrs',
    date: '03 January, 2025',
    price: '₹500 pp',
    seats: 1,
    driver: {
      name: 'Yash Raj Singh',
      rating: 4.5,
      phone: '+91 9876543210',
    },
    vehicle: {
      make: 'Scooter',
      model: 'Honda',
      color: 'Orange',
      plate: 'TN-01-AB-1234',
    },
  };

  const ride = route?.params?.ride || defaultRide;

  const handleRequestRide = () => {
    console.log('Requesting ride:', ride.id);
    // Navigate to booking or request confirmation
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
          <ChevronBack style={styles.backButton} />
        </View>
        <TouchableOpacity style={styles.createRideBtn}>
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
                <Text style={styles.locationText}>VIT Vellore</Text>
              </View>
              
              {/* Dotted Line */}
              <View style={styles.dottedLineVertical}>
                <Image source={require('../../assets/dotted_line_green.png')} style={styles.verticalDottedLine} resizeMode="repeat" />
              </View>
              
              {/* End Location */}
              <View style={styles.locationRow}>
                <Image source={require('../../assets/navigation-2.png')} style={styles.endLocationIcon} />
                <Text style={styles.locationText}>Chennai Airport</Text>
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
                <Text style={styles.seatsText}>1/2 seat available</Text>
              </View>
              <View style={styles.priceContainer}>
                <Image source={require('../../assets/wallet.png')} style={styles.walletIcon} />
                <Text style={styles.priceText}>₹ 500 pp</Text>
              </View>
            </View>
            
            {/* Creator Info */}
            <Text style={styles.creatorText}>Ride Created by Yash Raj Singh on 01 January, 2025</Text>
            <Text style={styles.yobText}>YOB: 2004</Text>
            
            {/* Date and Time Row */}
            <View style={styles.dateTimeRow}>
              <View style={styles.dateContainer}>
                <Image source={require('../../assets/calendar.png')} style={styles.calendarIcon} />
                <Text style={styles.dateText}>03 January, 2025</Text>
              </View>
              <View style={styles.timeContainer}>
                <Image source={require('../../assets/clock.png')} style={styles.clockIcon} />
                <Text style={styles.timeText}>1700 hrs</Text>
              </View>
            </View>
            
            {/* Trip Length */}
            <Text style={styles.tripLengthText}>Estimated Trip Length: 2 hours 45 minutes</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.bottomContainer}>
        <SlideToCreate
          onSlideComplete={handleRequestRide}
          text="Slide to request ride"
          disabled={false}
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
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  navigationRow: {
    backgroundColor: AppColors.primaryLightGreen,
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createRideBtnText: {
    color: AppColors.primaryLightGreen,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'NunitoSans_600SemiBold',
  },
  scrollContainer: {
    flex: 1,
  },
  rideCard: {
    margin: 20,
    borderRadius: 16,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    padding: 20,
    backgroundColor: AppColors.secondaryDarkGreen,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    marginBottom: 8,
  },
  startLocationIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    tintColor: AppColors.primaryLightGreen,
  },
  endLocationIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    tintColor: AppColors.primaryLightGreen,
  },
  locationText: {
    color: AppColors.primaryLightGreen,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'NunitoSans_600SemiBold',
  },
  dottedLineVertical: {
    width: 20,
    height: 60,
    marginLeft: 10,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalDottedLine: {
    width: 2,
    height: 60,
    tintColor: AppColors.primaryLightGreen,
  },
  motorcycleImage: {
    width: 120,
    height: 140,
    marginLeft: 8,
  },
  rideDetailsSection: {
    borderTopWidth: 1,
    borderTopColor: AppColors.primaryLightGreen + '30',
    paddingTop: 16,
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
    width: 16,
    height: 16,
    marginRight: 6,
    tintColor: AppColors.primaryLightGreen,
  },
  walletIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    tintColor: AppColors.primaryLightGreen,
  },
  seatsText: {
    color: AppColors.primaryLightGreen,
    fontSize: 14,
    fontFamily: 'NunitoSans_400Regular',
  },
  priceText: {
    color: AppColors.primaryLightGreen,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'NunitoSans_600SemiBold',
  },
  creatorText: {
    color: AppColors.primaryLightGreen,
    fontSize: 14,
    fontFamily: 'NunitoSans_400Regular',
    marginBottom: 4,
  },
  yobText: {
    color: AppColors.primaryLightGreen,
    fontSize: 14,
    fontFamily: 'NunitoSans_400Regular',
    marginBottom: 12,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primaryLightGreen + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primaryLightGreen + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
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
  dateText: {
    color: AppColors.primaryLightGreen,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'NunitoSans_600SemiBold',
  },
  timeText: {
    color: AppColors.primaryLightGreen,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'NunitoSans_600SemiBold',
  },
  tripLengthText: {
    color: AppColors.primaryLightGreen,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'NunitoSans_600SemiBold',
  },
  bottomContainer: {
    backgroundColor: AppColors.primaryLightGreen,
    padding: 20,
    paddingBottom: 32,
  },
});

export default AvailableRideScreenSelected;
