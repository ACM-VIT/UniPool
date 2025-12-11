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
import * as Location from "expo-location";
import { useNavigation } from "@react-navigation/native";
import AppColors from "../design_systems/colors";
import SlideToCreate from "../components/SlideToCreate";
import { useApi } from "../utils/ApiUtil";
import { RideDetailsSelector } from "../components/RideDetailsSelector";

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

  const [rideDateTime, setRideDateTime] = useState<Date>(new Date());
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | undefined>(undefined);
  const [hasPermission, setHasPermission] = useState(false);

  const requestLocationPermission = async () => {
    try {
      console.log("[CreateRide] Requesting location permission...");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        console.log("[CreateRide] Location permission granted");
        setHasPermission(true);
        await getUserLocation();
      } else {
        setHasPermission(false);
        console.warn("[CreateRide] Location permission denied, using fallback");
        setUserLocation({ latitude: 13.0827, longitude: 80.2707 });
      }
    } catch (error) {
      console.error("[CreateRide] Error requesting location permission:", error);
      setUserLocation({ latitude: 13.0827, longitude: 80.2707 });
    }
  };

  const getUserLocation = async () => {
    if (userLocation) {
      console.log("[CreateRide] User location already available, skipping fetch");
      return;
    }
    try {
      console.log("[CreateRide] Attempting to get user location...");
      const { coords } = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = coords;
      const location = { latitude, longitude };
      console.log("[CreateRide] User location fetched successfully:", location);
      setUserLocation(location);
    } catch (error) {
      console.error("[CreateRide] Error fetching user location:", error);
      console.log("[CreateRide] Using fallback location");
      setUserLocation({ latitude: 13.0827, longitude: 80.2707 });
    }
  };

  useEffect(() => {
    console.log("[CreateRide] Component mounted, requesting location permission...");
    requestLocationPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log("[CreateRide] User location changed:", userLocation);
    if (userLocation) {
      console.log("[CreateRide] Valid user location available:", userLocation.latitude, userLocation.longitude);
    } else {
      console.log("[CreateRide] No user location available yet");
    }
  }, [userLocation]);
  const [passengerCount, setPassengerCount] = useState<number>(3);
  const [fromLocation, setFromLocation] = useState<string>("");
  const [toLocation, setToLocation] = useState<string>("");
  const [fromCoordinates, setFromCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [toCoordinates, setToCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
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
    fromCoordinates?: { latitude: number; longitude: number };
    toCoordinates?: { latitude: number; longitude: number };
  }) => {
    console.log("Submitted ride details:", details);
    setFromLocation(details.from);
    setToLocation(details.to);
    setRideDateTime(details.date);
    setFromCoordinates(details.fromCoordinates || null);
    setToCoordinates(details.toCoordinates || null);
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
        start_latitude: fromCoordinates?.latitude || null,
        start_longitude: fromCoordinates?.longitude || null,
        end_latitude: toCoordinates?.latitude || null,
        end_longitude: toCoordinates?.longitude || null,
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
            userLocation={userLocation}
          />
        </View>

        <Text style={styles.label}>Pick the cost per person </Text>
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

        <Text style={styles.passengersLabel}>Number of Passengers</Text>
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

        <View>
          <SlideToCreate
            onSlideComplete={handleCreateRide}
            isLoading={isCreating}
            disabled={!fromLocation || !toLocation || isCreating}
            text="Slide to create ride"
            loadingText="Creating ride..."
            sliderIcon={require("../assets/slide.png")}
            emojiIcon={require("../assets/happy-emoji.png")}
          />
          {(!fromLocation || !toLocation) && !isCreating && (
            <Text style={styles.hintText}>Please select From and To locations to proceed</Text>
          )}
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
  headerRowWithTitle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: width * 0.05,
    paddingTop: height * 0.012,
    paddingBottom: height * 0.012,
    gap: width * 0.03,
  },
  backButton: {
    padding: width * 0.012,
  },
  backIcon: {
    width: width * 0.06,
    height: width * 0.06,
    tintColor: AppColors.basicBlack,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: width * 0.05,
    paddingTop: height * 0.006,
  },
  title: {
    fontSize: width * 0.05,
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
    paddingTop: "5%",
    paddingBottom: "2%",
    fontWeight: "500",
    fontSize: width * 0.045,
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_500Medium",
  },
  passengersLabel: {
    paddingTop: "8%",
    paddingBottom: "2%",
    fontWeight: "500",
    fontSize: width * 0.045,
    color: AppColors.basicBlack,
    fontFamily: "NunitoSans_500Medium",
  },
  costContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.basicBlack,
    borderRadius: width * 0.04,
    paddingHorizontal: width * 0.025,
    paddingVertical: height * 0.007,
    width: "100%",
    alignSelf: "center",
  },
  costButton: {
    paddingHorizontal: width * 0.05,
    paddingVertical: height * 0.01,
  },
  costButtonText: {
    color: AppColors.primaryLightGreen,
    fontSize: width * 0.075,
    fontWeight: "bold",
    fontFamily: "NunitoSans_700Bold",
  },
  costValueContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColors.basicBlack,
    paddingVertical: height * 0.006,
    paddingHorizontal: width * 0.04,
  },
  currencySymbol: {
    color: AppColors.primaryLightGreen,
    fontSize: width * 0.088,
    fontWeight: "bold",
    fontFamily: "NunitoSans_700Bold",
    marginRight: width * 0.012,
  },
  costValue: {
    color: AppColors.basicWhite,
    fontSize: width * 0.088,
    fontWeight: "bold",
    fontFamily: "NunitoSans_700Bold",
  },
  costValueInput: {
    color: AppColors.basicWhite,
    fontSize: width * 0.088,
    fontWeight: "bold",
    fontFamily: "NunitoSans_700Bold",
    backgroundColor: "transparent",
    padding: 0,
    margin: 0,
    width: width * 0.2,
    textAlign: "center",
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.basicBlack,
    borderRadius: width * 0.04,
    paddingHorizontal: width * 0.025,
    paddingVertical: height * 0.006,
    width: "50%",
    alignSelf: "center",
  },
  counterButton: {
    paddingHorizontal: width * 0.03,
    paddingVertical: height * 0.006,
  },
  counterText: {
    color: AppColors.primaryLightGreen,
    fontSize: width * 0.055,
    fontWeight: "bold",
    fontFamily: "NunitoSans_700Bold",
  },
  counterValueContainer: {
    backgroundColor: AppColors.basicBlack,
    paddingVertical: height * 0.006,
    paddingHorizontal: width * 0.04,
  },
  counterValue: {
    color: AppColors.basicWhite,
    fontSize: width * 0.05,
    fontWeight: "bold",
    fontFamily: "NunitoSans_700Bold",
  },
  passengerImage: {
    width: width * 0.42,
    height: width * 0.42,
    alignSelf: "center",
    resizeMode: "contain",
    marginBottom: height * -0.025,
  },
  vehicleImageContainer: {
    alignSelf: "center",
    overflow: "hidden",
    paddingBottom: 0,
  },
  hintText: {
    textAlign: "center",
    color: "#555555",
    fontSize: width * 0.033,
    fontFamily: "NunitoSans_400Regular",
    marginTop: height * -0.02,
    marginBottom: height * 0.012,
  },
});

export default CreateRide;
