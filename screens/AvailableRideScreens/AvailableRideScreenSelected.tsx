import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import ChevronBack from '../../components/ChevronBack/ChevronBack';
import SlideToCreate from '../../components/SlideToCreate/SlideToCreate';

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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ChevronBack style={styles.backButton} />
          <View>
            <Text style={styles.headerSubtext}>Vellore Institute of Technology</Text>
            <Text style={styles.headerTitle}>UniPool</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.createRideBtn}>
          <Text style={styles.createRideBtnText}>Create Ride</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Ride Card */}
        <View style={styles.rideCard}>
          {/* Route Section */}
          <View style={styles.routeSection}>
            <View style={styles.routeHeader}>
              <View style={styles.routeFrom}>
                <Image 
                  source={require('../../assets/location-pin.png')} 
                  style={[styles.locationIcon, { tintColor: '#ffffff' }]}
                  resizeMode="contain"
                />
                <Text style={styles.routeText}>{ride.from}</Text>
              </View>
              <View style={styles.dotIndicators}>
                <View style={[styles.dot, styles.dotOrange]} />
                <View style={[styles.dot, styles.dotWhite]} />
                <View style={[styles.dot, styles.dotOrange]} />
              </View>
            </View>

            <View style={styles.routeTo}>
              <CheckCircle size={16} color="#4ade80" />
              <Text style={styles.routeText}>{ride.to}</Text>
            </View>

            {/* Vehicle Illustration */}
            <View style={styles.vehicleContainer}>
              <Image 
                source={require('../../assets/motorcycle.png')} 
                style={styles.vehicleImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.rideInfo}>
              <View style={styles.seatsInfo}>
                <Image 
                  source={require('../../assets/user-icon.png')} 
                  style={[styles.locationIcon, { tintColor: '#ffffff' }]}
                  resizeMode="contain"
                />
                <Text style={styles.routeText}>{ride.seats}/2 seat available</Text>
              </View>
              <Text style={styles.priceText}>{ride.price}</Text>
            </View>
          </View>

          {/* Ride Details */}
          <View style={styles.rideDetails}>
            <Text style={styles.detailText}>
              <Text style={styles.boldText}>Ride Created by</Text> {ride.driver.name} on 01 January, 2025
            </Text>
            <Text style={styles.detailText}>
              <Text style={styles.boldText}>YOB:</Text> 2004
            </Text>

            <View style={styles.dateTimeContainer}>
              <View style={styles.dateBox}>
                <Image 
                  source={require('../../assets/calendar.png')} 
                  style={styles.dateTimeIcon}
                  resizeMode="contain"
                />
                <Text style={styles.dateTimeText}>{ride.date}</Text>
              </View>
              <View style={styles.timeBox}>
                <Image 
                  source={require('../../assets/clock.png')} 
                  style={styles.dateTimeIcon}
                  resizeMode="contain"
                />
                <Text style={styles.dateTimeText}>{ride.time}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.tripLengthText}>Estimated Trip Length: 2 hours 45 minutes</Text>

          {/* Map Section */}
          <View style={styles.mapContainer}>
            <View style={styles.mapPlaceholder}>
              {/* Map markers */}
              <View style={[styles.mapMarker, styles.startMarker]} />
              <View style={[styles.mapMarker, styles.endMarker]} />
              
              {/* Location labels */}
              <View style={[styles.mapLabel, styles.startLabel]}>
                <Text style={styles.mapLabelText}>New Delhi</Text>
              </View>
              <View style={[styles.mapLabel, styles.endLabel]}>
                <Text style={styles.mapLabelText}>Chennai</Text>
              </View>

              {/* Route markers */}
              <View style={[styles.routeMarker, styles.routeMarker1]} />
              <View style={[styles.routeMarker, styles.routeMarker2]} />
            </View>
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
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#84cc16',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 12,
  },
  headerSubtext: {
    fontSize: 10,
    color: '#166534',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#166534',
  },
  createRideBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createRideBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  rideCard: {
    margin: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  routeSection: {
    backgroundColor: '#0f766e',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeFrom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeTo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  routeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  dotIndicators: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOrange: {
    backgroundColor: '#fb923c',
  },
  dotWhite: {
    backgroundColor: '#ffffff',
  },
  vehicleContainer: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -32 }],
  },
  vehicleImage: {
    width: 80,
    height: 60,
    tintColor: '#fb923c', // Orange tint to match design
  },
  rideInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seatsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  rideDetails: {
    marginBottom: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  boldText: {
    fontWeight: '600',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  dateBox: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timeBox: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  dateTimeIcon: {
    width: 16,
    height: 16,
  },
  locationIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  tripLengthText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  mapContainer: {
    height: 240,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#e0f2fe',
    position: 'relative',
  },
  mapMarker: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  startMarker: {
    top: 16,
    left: 16,
    backgroundColor: '#ef4444',
  },
  endMarker: {
    bottom: 16,
    right: 16,
    backgroundColor: '#3b82f6',
  },
  mapLabel: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  startLabel: {
    top: 32,
    right: 32,
  },
  endLabel: {
    bottom: 48,
    left: 32,
  },
  mapLabelText: {
    fontSize: 10,
    color: '#374151',
  },
  routeMarker: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: '#2563eb',
    borderRadius: 4,
  },
  routeMarker1: {
    top: '33%',
    left: '25%',
  },
  routeMarker2: {
    top: '67%',
    right: '33%',
  },
  bottomContainer: {
    backgroundColor: '#84cc16',
    padding: 20,
    paddingBottom: 32,
  },
});

export default AvailableRideScreenSelected;
