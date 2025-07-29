import { useState, useRef } from "react";

import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AppColors from "../design_systems/colors";
import RideDetailsSelector from "../components/RideDetailsSelector";
import DateTimePicker from "@react-native-community/datetimepicker";
import SlideToCreate from "../components/SlideToCreate";
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
  const [costPerPerson, setCostPerPerson] = useState(100);
  const [isEditingCost, setIsEditingCost] = useState(false);
  const [customCost, setCustomCost] = useState("");
  const costInputRef = useRef<TextInput>(null);

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
      const rideDateTime = new Date(selectedDate);
      rideDateTime.setHours(time.getHours());
      rideDateTime.setMinutes(time.getMinutes());

      const rideData = {
        start_location: fromLocation,
        end_location: toLocation,
        start_time: rideDateTime.toISOString(),
        total_seats: passengerCount,
        booked_seats: 0,
        total_price: costPerPerson,
        is_ongoing: 0,
        is_same_gender: 0,
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
    } finally {
      setIsCreating(false);
    }
  };

  const onChange = (event: any, selectedTime?: Date) => {
    if (selectedTime) {
      setTime(selectedTime);
      const updatedDate = new Date(selectedDate);
      updatedDate.setHours(selectedTime.getHours());
      updatedDate.setMinutes(selectedTime.getMinutes());
      updatedDate.setSeconds(selectedTime.getSeconds());
      setSelectedDate(updatedDate);
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


  const increaseCost = () => {
    if (costPerPerson < 10000) {
      setCostPerPerson((prev) => prev + 25);
    }
  };

  const decreaseCost = () => {
    if (costPerPerson > 25) {
      setCostPerPerson((prev) => prev - 25);
    }
  };

  const handleCostPress = () => {
    setCustomCost(costPerPerson.toString());
    setIsEditingCost(true);
    setTimeout(() => {
      costInputRef.current?.focus();
    }, 100);
  };

  const handleCostChange = (text: string) => {
    if (/^\d*$/.test(text)) {
      setCustomCost(text);
    }
  };

  const handleCostSubmit = () => {
    let value = parseInt(customCost, 10);
    if (isNaN(value)) value = costPerPerson;
    if (value < 25) value = 25;
    if (value > 10000) value = 10000;
    setCostPerPerson(value);
    setIsEditingCost(false);
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

        <Text style={styles.label}>Pick the cost per person</Text>
        <View style={styles.costContainer}>
          <TouchableOpacity
            onPress={decreaseCost}
            style={styles.costButton}
            disabled={isEditingCost}
          >
            <Text style={styles.costButtonText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.costValueContainer}
            onPress={handleCostPress}
            activeOpacity={0.7}
            disabled={isEditingCost}
          >
            <Text style={styles.currencySymbol}>₹</Text>
            {isEditingCost ? (
              <TextInput
                ref={costInputRef}
                style={styles.costValueInput}
                value={customCost}
                onChangeText={handleCostChange}
                onBlur={handleCostSubmit}
                onSubmitEditing={handleCostSubmit}
                keyboardType="numeric"
                maxLength={5}
                selectTextOnFocus
                returnKeyType="done"
                autoFocus
              />
            ) : (
              <Text style={styles.costValue}>{costPerPerson}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={increaseCost}
            style={styles.costButton}
            disabled={isEditingCost}
          >
            <Text style={styles.costButtonText}>+</Text>
          </TouchableOpacity>
        </View>

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

            <SlideToCreate
              onSlideComplete={handleCreateRide}
              isLoading={isCreating}
              text="Slide to create ride"
              loadingText="Creating ride..."
              sliderIcon={require("../assets/slide.png")}
              emojiIcon={require("../assets/happy-emoji.png")}
            />
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
  costContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.basicBlack,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: "100%",
    alignSelf: "center",
  },
  costButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  costButtonText: {
    color: AppColors.primaryLightGreen,
    fontSize: 30,
    fontWeight: "bold",
    fontFamily: "NunitoSans_700Bold",
  },
  costValueContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColors.basicBlack,
    paddingVertical: 5,
    paddingHorizontal: 15,
  },
  currencySymbol: {
    color: AppColors.primaryLightGreen,
    fontSize: 35,
    fontWeight: "bold",
    fontFamily: "NunitoSans_700Bold",
    marginRight: 5,
  },
  costValue: {
    color: AppColors.basicWhite,
    fontSize: 35,
    fontWeight: "bold",
    fontFamily: "NunitoSans_700Bold",
  },
  costValueInput: {
    color: AppColors.basicWhite,
    fontSize: 35,
    fontWeight: "bold",
    fontFamily: "NunitoSans_700Bold",
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
    width: 80,
    textAlign: 'center',
  },
  buttonTime: {
    backgroundColor: AppColors.basicBlack,
    width: "100%",
    paddingVertical: 6,
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
    fontSize: 40,
    fontWeight: "bold",
    fontFamily: "NunitoSans_500Regular",
  },
  timeColon: {
    color: AppColors.primaryLightGreen,
    fontSize: 40,
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
    width: "50%",
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
    width: 170,
    height: 170,
    alignSelf: "center",
    resizeMode: "contain",
  },
});

export default CreateRide;