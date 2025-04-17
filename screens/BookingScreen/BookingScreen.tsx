import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
} from "react-native";
import { upcomingRides, inProgressRides } from "../../dummy-data/Bookings";
import RideCard from "../../components/RideCard";
import styles from "./BookingScreen.styles";
import AppColors from "../../design_systems/colors";
import { MapPin } from "lucide-react-native";

const window = Dimensions.get("window");

const BookingScreen: React.FC = () => {
  const [activeUpcomingPage, setActiveUpcomingPage] = useState(0);
  const [activeInProgressPage, setActiveInProgressPage] = useState(0);

  const handleUpcomingScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(scrollX / window.width);
    setActiveUpcomingPage(pageIndex);
  };

  const handleInProgressScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(scrollX / window.width);
    setActiveInProgressPage(pageIndex);
  };

  return (
    <View style={styles.container}>
      {/* <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MapPin size={20} color={AppColors.basicBlack} />
          <Text style={styles.headerText}>Vellore Institute of Technology</Text>
        </View>
        <Text style={styles.brandText}>UniPool</Text>
      </View> */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Upcoming Rides</Text>
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleUpcomingScroll}
            scrollEventThrottle={16}
          >
            {upcomingRides.map((ride) => (
              <View key={ride.id} style={styles.pageContainer}>
                <RideCard {...ride} />
              </View>
            ))}
          </ScrollView>

          <View style={styles.paginationContainer}>
            {upcomingRides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  activeUpcomingPage === index
                    ? styles.paginationDotActive
                    : {},
                ]}
              />
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Rides In-Progress</Text>
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleInProgressScroll}
            scrollEventThrottle={16}
          >
            {inProgressRides.map((ride) => (
              <View key={ride.id} style={styles.pageContainer}>
                <RideCard {...ride} isSelected={true} />
              </View>
            ))}
          </ScrollView>

          <View style={styles.paginationContainer}>
            {inProgressRides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  activeInProgressPage === index
                    ? styles.paginationDotActive
                    : {},
                ]}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <Image
        source={require("../../assets/airplane.png")}
        style={styles.airplaneIcon}
        resizeMode="contain"
      />
    </View>
  );
};

export default BookingScreen;
