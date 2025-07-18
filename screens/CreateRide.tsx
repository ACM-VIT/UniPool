import { useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  Animated,
  PanResponder,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AppColors from "../design_systems/colors";
import RideDetailsSelector from "../components/RideDetailsSelector";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useApi } from "../utils/ApiUtil";

const { width, height } = Dimensions.get("window");

interface CreateRideResponse {
  id: string;
  host_user_id: string;
  host_user_name: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_seats: number;
  booked_seats: number;
  total_price: number;
  is_ongoing: number;
  is_same_gender: number;
}

const CreateRide: React.FC = () => {
  const navigation = useNavigation();
  const { apiUtil } = useApi();
  const [time, setTime] = useState(new Date());
  const [mode, setMode] = useState<"time">("time");
  const [show, setShow] = useState(false);
  const [passengerCount, setPassengerCount] = useState(3);
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCreating, setIsCreating] = useState(false);
  
  // Slide to unlock functionality
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [slideCompleted, setSlideCompleted] = useState(false);
  const slideWidth = width - 80; // Total slide width
  const sliderWidth = 60; // Width of the slider circle
  const maxSlideDistance = slideWidth - sliderWidth;

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      slideAnim.setOffset((slideAnim as any)._value);
    },
    onPanResponderMove: (evt, gestureState) => {
      const newValue = Math.max(0, Math.min(maxSlideDistance, gestureState.dx));
      slideAnim.setValue(newValue);
    },
    onPanResponderRelease: (evt, gestureState) => {
      slideAnim.flattenOffset();
      
      if (gestureState.dx > maxSlideDistance * 0.7) {
        // Slide completed
        Animated.timing(slideAnim, {
          toValue: maxSlideDistance,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          setSlideCompleted(true);
          handleCreateRide();
        });
      } else {
        // Slide back to start
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
    },
  });

  const handleCreateRide = async () => {
    if (!fromLocation || !toLocation) {
      Alert.alert("Missing Information", "Please select both from and to locations");
      return;
    }

    if (fromLocation === toLocation) {
      Alert.alert("Invalid Route", "From and To locations cannot be the same");
      return;
    }

    setIsCreating(true);
    
    try {
      // Combine selected date with selected time
      const rideDateTime = new Date(selectedDate);
      rideDateTime.setHours(time.getHours());
      rideDateTime.setMinutes(time.getMinutes());

      // Create the ride data payload
      const rideData = {
        start_location: fromLocation,
        end_location: toLocation,
        start_time: rideDateTime.toISOString(),
        total_seats: passengerCount,
        booked_seats: 0, // New ride starts with 0 booked seats
        total_price: Math.max(25, Math.min(10000, passengerCount * 100)), // Simple price calculation
        is_ongoing: 0, // New ride is not ongoing initially
        is_same_gender: 0, // Default to any gender
      };

      console.log("Creating ride with data:", rideData);

      // Send POST request to backend
      const response = await apiUtil.post<CreateRideResponse, typeof rideData>("/ride/create", rideData);
      
      console.log("Ride created successfully:", response);
      
      // Navigate to RideCreatedScreen
      navigation.navigate("RideCreatedScreen" as never);
      
    } catch (error) {
      console.error("Error creating ride:", error);
      
      let errorMessage = "Failed to create ride. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      Alert.alert("Error", errorMessage);
      
      // Reset slide animation on error
      setSlideCompleted(false);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } finally {
      setIsCreating(false);
    }
  };

  const onChange = (event: any, selectedTime?: Date) => {
    if (selectedTime) {
      setTime(selectedTime);
    }
    setShow(false);
  };

  const showTimepicker = () => {
    setShow(true);
    setMode("time");
  };

  const handleRideSubmit = (details: {
    from: string;
    to: string;
    date: Date;
  }) => {
    console.log("Submitted ride details:", details);
    setFromLocation(details.from);
    setToLocation(details.to);
    setSelectedDate(details.date);
  };

  const increasePassengers = () => {
    if (passengerCount < 20) {
      setPassengerCount((prev) => prev + 1);
    }
  };

  const decreasePassengers = () => {
    if (passengerCount > 1) {
      setPassengerCount((prev) => prev - 1);
    }
  };

  const getPassengerImage = () => {
    if (passengerCount == 1 || passengerCount == 2) {
      return require("../assets/motorcycle.png");
    } else if (passengerCount == 3) {
      return require("../assets/Taxi.png");
    } else if (passengerCount == 4) {
      return require("../assets/racer.png");
    } else if (passengerCount > 4 && passengerCount < 8) {
      return require("../assets/wagon.png");
    } else if (passengerCount >= 8 && passengerCount < 11) {
      return require("../assets/foodvan.png");
    } else if (passengerCount >= 11 && passengerCount < 20) {
      return require("../assets/Bus.png");
    } else if (passengerCount == 20) {
      return require("../assets/UFO.png");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Image 
            source={require("../assets/arrow-square-left.png")} 
            style={styles.backIcon} 
          />
        </TouchableOpacity>
        
      </View>
      
      <View style={styles.mainContent}>
        <Text style={styles.title}>Create a Ride</Text>

        <View style={styles.section}>
          <RideDetailsSelector 
            onSubmit={handleRideSubmit} 
            onLocationSelectionChange={() => {}}
            fromLocation={fromLocation}
            toLocation={toLocation}
          />
        </View>

        <Text style={styles.label}>When will the voyage begin?</Text>
        <TouchableOpacity onPress={showTimepicker} style={styles.buttonTime}>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {time.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }).split(':')[0]}
            </Text>
            <Text style={styles.timeColon}>:</Text>
            <Text style={styles.timeText}>
              {time.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }).split(':')[1]}
            </Text>
          </View>
        </TouchableOpacity>
        {show && (
          <DateTimePicker
            testID="dateTimePicker"
            value={time}
            mode={mode}
            is24Hour={true}
            onChange={onChange}
          />
        )}

        <Text style={styles.label}>Number of Passengers</Text>
        <View style={styles.counterContainer}>
          <TouchableOpacity
            onPress={decreasePassengers}
            style={styles.counterButton}
          >
            <Text style={styles.counterText}>−</Text>
          </TouchableOpacity>
          <View style={styles.counterValueContainer}>
            <Text style={styles.counterValue}>{passengerCount}</Text>
          </View>
          <TouchableOpacity
            onPress={increasePassengers}
            style={styles.counterButton}
          >
            <Text style={styles.counterText}>+</Text>
          </TouchableOpacity>
        </View>

        <Image style={styles.passengerImage} source={getPassengerImage()} />

        <View style={styles.slideContainer}>
          <Animated.View 
            style={[
              styles.slideTrack,
              {
                transform: [{ translateX: slideCompleted ? maxSlideDistance : slideAnim }],
              }
            ]}
          >
            <View style={styles.slideIconContainer}>
              <Image 
                source={require("../assets/arrow-square-left.png")} 
                style={styles.slideIcon} 
              />
            </View>
            <Text style={styles.slideText}>
              {isCreating ? "Creating ride..." : "Slide to create ride"}
            </Text>
            {isCreating ? (
              <ActivityIndicator size="small" color={AppColors.secondaryDarkGreen} />
            ) : (
              <Image 
                source={require("../assets/smiling-emoji.png")} 
                style={styles.emojiIcon} 
              />
            )}
          </Animated.View>
          <View 
            style={[
              styles.slideButtonArea,
              isCreating && styles.slideButtonDisabled
            ]}
            {...(isCreating ? {} : panResponder.panHandlers)}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    backgroundColor: AppColors.primaryLightGreen,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    padding: 5,
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: AppColors.basicBlack,
  },
  headerTitle: {
    flex: 1,
    textAlign: "right",
    fontSize: 24,
    fontWeight: "600",
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    paddingBottom: 15,
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_600SemiBold",
  },
  section: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: "2.5%",
  },
  label: {
    paddingTop: "6%",
    paddingBottom: "3%",
    fontWeight: "500",
    fontSize: 18,
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_500Medium",
  },
  buttonTime: {
    backgroundColor: AppColors.basicBlack,
    width: "100%",
    paddingVertical: 12,
    borderRadius: 15,
    alignItems: "center",
    alignSelf: "center",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    color: AppColors.basicWhite,
    fontSize: 30,
    fontWeight: "bold",
    fontFamily: "NunitoSans_600SemiBold",
  },
  timeColon: {
    color: AppColors.primaryLightGreen,
    fontSize: 30,
    fontFamily: "NunitoSans_600SemiBold",
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.basicBlack,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    width: "40%",
    alignSelf: "center",
  },
  counterButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  counterText: {
    color: AppColors.primaryLightGreen,
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: "NunitoSans_700Bold",
  },
  counterValueContainer: {
    backgroundColor: AppColors.basicBlack,
    paddingVertical: 5,
    paddingHorizontal: 15,
  },
  counterValue: {
    color: AppColors.basicWhite,
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "NunitoSans_700Bold",
  },
  passengerImage: {
    width: 150,
    height: 150,
    alignSelf: "center",
    resizeMode: "contain",
  },
  slideContainer: {
    backgroundColor: AppColors.primaryLightGreen,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: AppColors.secondaryDarkGreen,
    marginTop: 20,
    marginBottom: 20,
    height: 60,
    position: "relative",
    justifyContent: "center",
    overflow: "hidden",
  },
  slideTrack: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    height: "100%",
    position: "absolute",
    left: 0,
    right: 0,
  },
  slideIconContainer: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 22,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  slideButtonArea: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    zIndex: 10,
  },
  slideButtonDisabled: {
    opacity: 0.5,
  },
  slideIcon: {
    width: 24,
    height: 24,
    tintColor: AppColors.primaryLightGreen,
  },
  slideText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.secondaryDarkGreen,
    textAlign: "center",
    flex: 1,
    marginHorizontal: 10,
    fontFamily: "NunitoSans_600SemiBold",
  },
  emojiIcon: {
    width: 24,
    height: 24,
  },
});

export default CreateRide;
