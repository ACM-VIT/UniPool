import React, { useState, useRef, useEffect } from "react";
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
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AppColors from "../design_systems/colors";
import RideDetailsSelector from "../components/RideDetailsSelector";
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

  // This now holds the full Date+Time from your selector
  const [rideDateTime, setRideDateTime] = useState<Date>(new Date());
  const [passengerCount, setPassengerCount] = useState<number>(3);
  const [fromLocation, setFromLocation] = useState<string>("");
  const [toLocation, setToLocation] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [costPerPerson, setCostPerPerson] = useState<number>(100);
  const [isEditingCost, setIsEditingCost] = useState<boolean>(false);
  const [customCost, setCustomCost] = useState<string>("");
  const costInputRef = useRef<TextInput>(null);

  // Animation states
  const [currentVehicleImage, setCurrentVehicleImage] = useState(require("../assets/Taxi.png"));
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(1)).current;
  const counterAnimation = useRef(new Animated.Value(0)).current;
  const [isAnimating, setIsAnimating] = useState(false);

  const handleRideSubmit = (details: {
    from: string;
    to: string;
    date: Date;
  }) => {
    console.log("Submitted ride details:", details);
    setFromLocation(details.from);
    setToLocation(details.to);
    setRideDateTime(details.date);
  };

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

      const response = await apiUtil.post<CreateRideResponse, typeof rideData>(
        "/ride/create",
        rideData
      );
      console.log("Ride created successfully:", response);
      navigation.navigate("RideCreatedScreen" as never);
    } catch (error: any) {
      console.error("Error creating ride:", error);
      let errorMessage = "Failed to create ride. Please try again.";
      if (error.response?.data) {
        const d = error.response.data;
        errorMessage =
          typeof d === "string"
            ? JSON.parse(d).error ?? d
            : d.error ?? errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  // Vehicle image chooser
  const getPassengerImage = (count?: number) => {
    const currentCount = count !== undefined ? count : passengerCount;
    if (currentCount < 3) return require("../assets/motorcycle.png");
    if (currentCount === 3) return require("../assets/Taxi.png");
    if (currentCount === 4) return require("../assets/racer.png");
    if (currentCount < 8) return require("../assets/wagon.png");
    if (currentCount < 11) return require("../assets/foodvan.png");
    if (currentCount < 20) return require("../assets/Bus.png");
    return require("../assets/UFO.png");
  };

  const animateVehicleChange = (newCount: number) => {
    if (isAnimating) return;
    
    const newVehicleImage = getPassengerImage(newCount);

    if (newVehicleImage !== currentVehicleImage) {
      setIsAnimating(true);

      const isNewUFO = newVehicleImage === require("../assets/UFO.png");
      const isCurrentUFO = currentVehicleImage === require("../assets/UFO.png");
      
      if (isNewUFO) {
        Animated.sequence([
          Animated.timing(fadeAnimation, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnimation, {
            toValue: -50, 
            duration: 0,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setCurrentVehicleImage(newVehicleImage);
          
          Animated.parallel([
            Animated.timing(fadeAnimation, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnimation, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setIsAnimating(false);
          });
        });
      } else if (isCurrentUFO) {
        Animated.parallel([
          Animated.timing(fadeAnimation, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnimation, {
            toValue: -50,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setCurrentVehicleImage(newVehicleImage);
          slideAnimation.setValue(width);
          
          Animated.parallel([
            Animated.timing(fadeAnimation, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnimation, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setIsAnimating(false);
          });
        });
      } else {
        Animated.timing(slideAnimation, {
          toValue: -width,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setCurrentVehicleImage(newVehicleImage);

          slideAnimation.setValue(width);

          Animated.timing(slideAnimation, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setIsAnimating(false);
          });
        });
      }
    }

    counterAnimation.setValue(0);
    Animated.sequence([
      Animated.timing(counterAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(counterAnimation, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    setCurrentVehicleImage(getPassengerImage(3));
  }, []);

  const increasePassengers = () => {
    if (passengerCount < 20) {
      const newCount = passengerCount + 1;
      setPassengerCount(newCount);
      animateVehicleChange(newCount);
    }
  };

  const decreasePassengers = () => {
    if (passengerCount > 1) {
      const newCount = passengerCount - 1;
      setPassengerCount(newCount);
      animateVehicleChange(newCount);
    }
  };

  const increaseCost = () =>
    costPerPerson < 10000 && setCostPerPerson((c) => c + 25);
  const decreaseCost = () =>
    costPerPerson > 25 && setCostPerPerson((c) => c - 25);

  const handleCostPress = () => {
    setCustomCost(costPerPerson.toString());
    setIsEditingCost(true);
    setTimeout(() => costInputRef.current?.focus(), 100);
  };
  const handleCostChange = (text: string) =>
    /^\d*$/.test(text) && setCustomCost(text);
  const handleCostSubmit = () => {
    let v = parseInt(customCost, 10);
    if (isNaN(v)) v = costPerPerson;
    v = Math.min(10000, Math.max(25, v));
    setCostPerPerson(v);
    setIsEditingCost(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRowWithTitle}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image
            source={require("../assets/arrow-square-left.png")}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.title}>Create a Ride</Text>
      </View>

      <View style={styles.mainContent}>
        {/* ← Your built‑in selector handles both date & time */}
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

        <Animated.View
          style={[
            styles.vehicleImageContainer,
            {
              opacity: fadeAnimation,
              transform: [
                { 
                  translateX: currentVehicleImage === require("../assets/UFO.png") ? 0 : slideAnimation 
                },
                { 
                  translateY: currentVehicleImage === require("../assets/UFO.png") ? slideAnimation : 0 
                },
                { scale: counterAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.1]
                })}
              ]
            }
          ]}
        >
          <Image
            style={styles.passengerImage}
            source={currentVehicleImage}
          />
        </Animated.View>

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
  headerRowWithTitle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 12,
  },
  backButton: {
    padding: 5,
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: AppColors.basicBlack,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
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
    backgroundColor: "transparent",
    padding: 0,
    margin: 0,
    width: 80,
    textAlign: "center",
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
  vehicleImageContainer: {
    alignSelf: "center",
    overflow: "hidden",
  },
});

export default CreateRide;
