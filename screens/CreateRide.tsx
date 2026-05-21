import React, { useState, useRef, useEffect } from "react";
import { View, Text, Image, StyleSheet, SafeAreaView, Dimensions, TouchableOpacity, TextInput, Animated } from "react-native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import AppColors from "../design_systems/colors";
import SlideToCreate from "../components/SlideToCreate";
import { useApi } from "../utils/ApiUtil";
import { useAuthGate } from "../contexts/AuthGate";
import { RideDetailsSelector } from "../components/RideDetailsSelector";
import BrandedAlert from "../components/BrandedAlert";
import { appHref, useDecodedLocalSearchParams } from "../navigation/routes";

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
  const router = useRouter();
  const { apiUtil } = useApi();
  const { requireAuth } = useAuthGate();

  // Hand-off from AvailableRideScreen's empty state — when nobody is
  // running this route, the user can tap "Post a ride" and we
  // pre-fill the form with what they were searching for. Params are
  // all optional; an empty route just gets the regular blank state.
  const routeParams = useDecodedLocalSearchParams<{
    fromLocation?: string;
    toLocation?: string;
    fromCoordinates?: { latitude: number; longitude: number };
    toCoordinates?: { latitude: number; longitude: number };
    date?: string;
  }>();

  const seededDate = (() => {
    if (!routeParams.date) return null;
    const d = new Date(routeParams.date);
    return isNaN(d.getTime()) ? null : d;
  })();

  const [rideDateTime, setRideDateTime] = useState<Date>(seededDate ?? new Date());
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | undefined>(undefined);
  const [hasPermission, setHasPermission] = useState(false);

  const requestLocationPermission = async () => {
    // READ ONLY — the native prompt is owned by LocationPermissionScreen.
    // If permission is already granted, hydrate the user's coords; if
    // not, drop in a sensible map fallback so the create-ride flow
    // still works without nagging the user with a second prompt.
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === "granted") {
        setHasPermission(true);
        await getUserLocation();
      } else {
        setHasPermission(false);
        setUserLocation({ latitude: 13.0827, longitude: 80.2707 });
      }
    } catch (error) {
      console.error("[CreateRide] Error reading location permission:", error);
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
  const [fromLocation, setFromLocation] = useState<string>(routeParams.fromLocation ?? "");
  const [toLocation, setToLocation] = useState<string>(routeParams.toLocation ?? "");
  const [fromCoordinates, setFromCoordinates] = useState<{ latitude: number; longitude: number } | null>(routeParams.fromCoordinates ?? null);
  const [toCoordinates, setToCoordinates] = useState<{ latitude: number; longitude: number } | null>(routeParams.toCoordinates ?? null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [costPerPerson, setCostPerPerson] = useState<number>(100);
  const [isEditingCost, setIsEditingCost] = useState<boolean>(false);
  const [customCost, setCustomCost] = useState<string>("");
  const costInputRef = useRef<TextInput>(null);

  // Viewer's gender — drives whether the "Women only" toggle is even
  // shown. We only surface the option to female users, and the
  // backend independently enforces the same rule on /ride/create so
  // a maliciously crafted client can't bypass the UI gate.
  const [viewerGender, setViewerGender] = useState<string | null>(null);
  const [isWomenOnly, setIsWomenOnly] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    apiUtil
      .get<{ user?: { gender?: string } }>("/user/details")
      .then((res) => {
        if (cancelled) return;
        setViewerGender((res?.user?.gender || "").toLowerCase() || null);
      })
      .catch(() => {
        // Silent — failing to fetch gender just means the toggle
        // stays hidden, which is the correct fail-safe default.
      });
    return () => {
      cancelled = true;
    };
  }, [apiUtil]);

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
      BrandedAlert.alert("One more detail", "Pick where you're starting and where you're going.");
      return;
    }
    if (fromLocation === toLocation) {
      BrandedAlert.alert("Same place?", "Your pickup and drop-off can't be identical.");
      return;
    }
    // 60-second grace so a user who picked "now" and slid within a
    // minute doesn't get bounced. Anything earlier than that is a
    // real past-date entry — backend rejects it too, but a friendly
    // pre-submit message beats a generic "couldn't post your ride"
    // error after a network round-trip.
    if (rideDateTime.getTime() < Date.now() - 60_000) {
      BrandedAlert.alert(
        "That time has passed",
        "Pick a date and time in the future. Anyone joining needs to see this ride before it leaves.",
      );
      return;
    }

    // Safety net — gate at submit. The entry-point CTAs (Home, search
    // empty state, etc.) already call requireAuth before navigating
    // here, but a guest could still land on this screen via deep link
    // or some unprotected path. If that happens, surface the AuthSheet
    // instead of letting the request fly out and 401 from the
    // "Authorization header not found" backend error.
    if (!requireAuth({ screen: "CreateRide" }, "to post a ride")) {
      return;
    }

    setIsCreating(true);
    // Notification permission is now asked once on the onboarding
    // permissions sheet (LocationPermissionScreen). No per-action
    // prompt here — the user either granted it then or chose not to.
    try {
      const rideData = {
        start_location: fromLocation,
        end_location: toLocation,
        start_time: rideDateTime.toISOString(),
        total_seats: passengerCount,
        booked_seats: 0,
        total_price: costPerPerson,
        is_ongoing: 0,
        // Only honor the toggle if the viewer is actually female —
        // server enforces the same check, this is defensive belt-and-
        // suspenders so a stale toggle state can't slip through.
        is_same_gender: isWomenOnly && viewerGender === "female" ? 1 : 0,
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
      // Carry the new ride's ID through the success interstitial so it
      // can drop the host on RideDetailsScreen (= the ride management
      // view), where the new share-ride affordance lives.
      router.navigate(appHref("RideCreatedScreen", { rideId: response?.id } as any));
    } catch (error: any) {
      console.error("Error creating ride:", error);
      let errorMessage = "Couldn't post your ride. Try again in a moment.";
      if (error.response?.data) {
        const d = error.response.data;
        errorMessage =
          typeof d === "string"
            ? JSON.parse(d).error ?? d
            : d.error ?? errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      BrandedAlert.alert("Couldn't post your ride", errorMessage);
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
          onPress={() => router.back()}
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
            initialDate={seededDate ?? undefined}
          />
        </View>

        <Text style={styles.label}>Per-seat fare</Text>
        <View style={styles.stepperCard}>
          <TouchableOpacity
            onPress={decreaseCost}
            style={styles.stepperBtn}
            disabled={isEditingCost}
            activeOpacity={0.7}
          >
            <Text style={styles.stepperBtnText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.stepperValueWrap}
            onPress={handleCostPress}
            activeOpacity={0.7}
            disabled={isEditingCost}
          >
            <Text style={styles.stepperCurrency}>₹</Text>
            {isEditingCost ? (
              <TextInput
                ref={costInputRef}
                style={styles.stepperValueInput}
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
              <Text style={styles.stepperValue}>{costPerPerson}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={increaseCost}
            style={styles.stepperBtn}
            disabled={isEditingCost}
            activeOpacity={0.7}
          >
            <Text style={styles.stepperBtnText}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.fieldHint}>Co-riders pay this each. Total trip cost = fare × seats.</Text>

        <Text style={styles.label}>Seats you're offering</Text>
        <View style={styles.stepperCard}>
          <TouchableOpacity
            onPress={decreasePassengers}
            style={styles.stepperBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.stepperBtnText}>−</Text>
          </TouchableOpacity>
          <View style={styles.stepperValueWrap}>
            <Text style={styles.stepperValue}>{passengerCount}</Text>
            <Text style={styles.stepperUnit}>
              {passengerCount === 1 ? "seat" : "seats"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={increasePassengers}
            style={styles.stepperBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.stepperBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Women-only toggle. Gated to viewer.gender === "female" — male
            and non-binary users never see it (server enforces the same
            rule on /ride/create). Lives between the seats stepper and
            the vehicle illustration so it sits inside the "trip
            details" rhythm rather than crowding the submit CTA. */}
        {viewerGender === "female" && (
          <TouchableOpacity
            style={[
              styles.womenOnlyCard,
              isWomenOnly && styles.womenOnlyCardActive,
            ]}
            onPress={() => setIsWomenOnly((v) => !v)}
            activeOpacity={0.85}
            accessibilityRole="switch"
            accessibilityState={{ checked: isWomenOnly }}
            accessibilityLabel="Reserve this ride for women passengers"
          >
            <View style={styles.womenOnlyTextWrap}>
              <Text style={styles.womenOnlyTitle}>Women only</Text>
              <Text style={styles.womenOnlyCaption}>
                Only female passengers can request to join.
              </Text>
            </View>
            <View
              style={[
                styles.womenOnlySwitch,
                isWomenOnly && styles.womenOnlySwitchOn,
              ]}
            >
              <View
                style={[
                  styles.womenOnlyKnob,
                  isWomenOnly && styles.womenOnlyKnobOn,
                ]}
              />
            </View>
          </TouchableOpacity>
        )}

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
          disabled={!fromLocation || !toLocation || isCreating}
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
    tintColor: AppColors.secondaryDarkGreen,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 5,
  },
  title: {
    fontSize: 24,
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: -0.5,
  },
  section: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: "2.5%",
  },
  label: {
    paddingTop: "5%",
    paddingBottom: "2.5%",
    fontSize: 13,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.75,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  // Forest dark stepper card on lime canvas — matches the rest of the
  // surface system (lime sheet, forest content cards, lime accents).
  stepperCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 8,
    width: "100%",
    alignSelf: "center",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.primaryLightGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnText: {
    color: AppColors.secondaryDarkGreen,
    fontSize: 24,
    fontFamily: "NunitoSans_800ExtraBold",
    lineHeight: 28,
  },
  stepperValueWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  stepperCurrency: {
    color: AppColors.primaryLightGreen,
    opacity: 0.65,
    fontSize: 18,
    fontFamily: "NunitoSans_700Bold",
    marginRight: 4,
  },
  stepperValue: {
    color: AppColors.basicWhite,
    fontSize: 30,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: -0.6,
  },
  stepperUnit: {
    marginLeft: 6,
    color: AppColors.primaryLightGreen,
    opacity: 0.65,
    fontSize: 13,
    fontFamily: "NunitoSans_600SemiBold",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  stepperValueInput: {
    color: AppColors.basicWhite,
    fontSize: 30,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: -0.6,
    backgroundColor: "transparent",
    padding: 0,
    margin: 0,
    width: 90,
    textAlign: "center",
  },
  fieldHint: {
    marginTop: 8,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.6,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "NunitoSans_600SemiBold",
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
  // Forest tile that sits in the same surface family as `stepperCard`
  // — matched radius / shadow / horizontal padding so the row reads as
  // part of the "trip details" cluster, not a new section. Active
  // state lifts the lime border to signal commitment without flipping
  // the whole tile to lime (which would over-shout next to the
  // forest steppers above).
  womenOnlyCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    width: "100%",
    marginTop: "5%",
    borderWidth: 1.5,
    borderColor: "transparent",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  womenOnlyCardActive: {
    borderColor: AppColors.primaryLightGreen,
  },
  womenOnlyTextWrap: {
    flex: 1,
    marginRight: 14,
  },
  womenOnlyTitle: {
    color: AppColors.basicWhite,
    fontSize: 15,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  womenOnlyCaption: {
    color: AppColors.primaryLightGreen,
    fontSize: 12,
    fontFamily: "NunitoSans_600SemiBold",
    opacity: 0.7,
    lineHeight: 16,
  },
  // Custom switch — RN's <Switch> renders inconsistently across
  // iOS/Android with hardcoded thumb sizes. Forest track when off,
  // lime track when on; small light knob slides 18pt horizontally
  // on toggle.
  womenOnlySwitch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(181,215,80,0.20)",
    padding: 3,
    justifyContent: "center",
  },
  womenOnlySwitchOn: {
    backgroundColor: AppColors.primaryLightGreen,
  },
  womenOnlyKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: AppColors.primaryLightGreen,
    opacity: 0.85,
  },
  womenOnlyKnobOn: {
    backgroundColor: AppColors.secondaryDarkGreen,
    opacity: 1,
    transform: [{ translateX: 18 }],
  },
});

export default CreateRide;
