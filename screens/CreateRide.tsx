import React, { useState, useRef, useEffect, useMemo } from "react";
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity, TextInput, Animated, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import AppColors from "../design_systems/colors";
import { useThemeColors } from "../contexts/ThemeContext";
import SlideToCreate from "../components/SlideToCreate/SlideToCreate";
import { useApi } from "../utils/ApiUtil";
import { useAuthGate } from "../contexts/AuthGate";
import { useUser } from "../contexts/UserContext";
import { RideDetailsSelector } from "../components/RideDetailsSelector";
import MatchingRidesSuggestion from "../components/MatchingRidesSuggestion";
import BrandedAlert from "../components/BrandedAlert";
import { haptic } from "../components/haptics";
import SheetShell from "../components/SheetShell";
import { sheetUi } from "../components/SheetShell.styles";
import { appHref, useDecodedLocalSearchParams } from "../navigation/routes";
import { useTabletContentStyle } from "../utils/responsive";
import {
  MAX_TOTAL_SEATS,
  MIN_TOTAL_SEATS,
  perSeatFare,
} from "../utils/seatMath";

const { width, height } = Dimensions.get("window");
const DEBUG_CREATE_RIDE =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_DEBUG_CREATE_RIDE === "1";

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
  const { navigate, back } = useRouter();
  const tabletContentStyle = useTabletContentStyle();
  const { apiUtil } = useApi();
  const { requireAuth } = useAuthGate();
  // Theme-aware canvas + title text. Module-scope styles still bake
  // the lime canvas (light) at module load; inline override below
  // swaps to the active palette so the form sits on the right
  // backdrop in either mode.
  const themeColors = useThemeColors();

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
      if (DEBUG_CREATE_RIDE) console.log("[CreateRide] User location already available, skipping fetch");
      return;
    }
    try {
      if (DEBUG_CREATE_RIDE) console.log("[CreateRide] Attempting to get user location...");
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          const location = {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          };
          setUserLocation(location);
        }
      } catch {
        // Fresh balanced lookup below is still the source of truth.
      }

      const { coords } = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = coords;
      const location = { latitude, longitude };
      if (DEBUG_CREATE_RIDE) console.log("[CreateRide] User location fetched successfully:", location);
      setUserLocation(location);
    } catch (error) {
      console.error("[CreateRide] Error fetching user location:", error);
      if (DEBUG_CREATE_RIDE) console.log("[CreateRide] Using fallback location");
      setUserLocation({ latitude: 13.0827, longitude: 80.2707 });
    }
  };

  useEffect(() => {
    if (DEBUG_CREATE_RIDE) console.log("[CreateRide] Component mounted, requesting location permission...");
    requestLocationPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (DEBUG_CREATE_RIDE) console.log("[CreateRide] User location changed:", userLocation);
    if (userLocation) {
      if (DEBUG_CREATE_RIDE) console.log("[CreateRide] Valid user location available:", userLocation.latitude, userLocation.longitude);
    } else {
      if (DEBUG_CREATE_RIDE) console.log("[CreateRide] No user location available yet");
    }
  }, [userLocation]);
  // total_seats now COUNTS THE HOST. A 4-seat carpool = host + 3
  // passengers; 5-seat = host + 4 passengers; etc. See
  // utils/seatMath.ts for the canonical contract. Default 4 because
  // most rides are sedan-sized — a single host + three passenger
  // friends is the common case.
  const [totalSeats, setTotalSeats] = useState<number>(4);
  const [fromLocation, setFromLocation] = useState<string>(routeParams.fromLocation ?? "");
  const [toLocation, setToLocation] = useState<string>(routeParams.toLocation ?? "");
  const [fromCoordinates, setFromCoordinates] = useState<{ latitude: number; longitude: number } | null>(routeParams.fromCoordinates ?? null);
  const [toCoordinates, setToCoordinates] = useState<{ latitude: number; longitude: number } | null>(routeParams.toCoordinates ?? null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [costPerPerson, setCostPerPerson] = useState<number>(100);
  const [isEditingCost, setIsEditingCost] = useState<boolean>(false);
  const [customCost, setCustomCost] = useState<string>("");
  const costInputRef = useRef<TextInput>(null);

  // Three ways to enter the trip fare:
  //   "per_seat" — original behaviour, host types the per-seat amount
  //                directly. Total = fare × seats.
  //   "total"    — host types the TOTAL trip cost; the app divides
  //                by seats and shows the per-seat preview. Useful
  //                when the host knows the cab metre / petrol cost
  //                upfront and doesn't want to do the arithmetic.
  //   "custom"   — per-seat amounts vary (e.g. one rider only goes
  //                half the route). Host enters an amount for each
  //                seat, app sums + averages. The average is what
  //                gets sent to /ride/create (backend stores a
  //                single per-seat price for search/match); the host
  //                still knows what to collect from each rider.
  const [splitMode, setSplitMode] = useState<"per_seat" | "total" | "custom">("per_seat");
  const [totalFare, setTotalFare] = useState<number>(300);
  // Total-mode tap-to-edit state, mirroring per-seat's costPerPerson
  // pair. Without these, the central ₹ amount in Total mode was a
  // dead pill — host could only nudge via the +/− buttons.
  const [isEditingTotal, setIsEditingTotal] = useState<boolean>(false);
  const [customTotal, setCustomTotal] = useState<string>("");
  const totalInputRef = useRef<TextInput>(null);
  // Seat fares: one entry per SEAT IN THE CAR (host included).
  // Length always stays in sync with totalSeats via the effect
  // below; default 4 matches the totalSeats default of 4 (host + 3
  // passengers). seatFares[0] is the host's own contribution row.
  const [seatFares, setSeatFares] = useState<number[]>([100, 100, 100, 100]);
  const [editingSeatIndex, setEditingSeatIndex] = useState<number | null>(null);
  const [seatFareDraft, setSeatFareDraft] = useState<string>("");
  const seatFareInputRef = useRef<TextInput>(null);

  // Bottom-sheet visibility for the fare editor. The fare details
  // (three split modes + steppers + per-seat list) live in a sheet
  // so the main screen stays a single non-scrolling viewport.
  const [showFareSheet, setShowFareSheet] = useState<boolean>(false);

  // Horizontal shake applied to the slider when the user tries to
  // submit while a blocker is active. Replaces the inline warning
  // pill — the shake is the warning.
  const sliderShake = useRef(new Animated.Value(0)).current;
  const shakeSlider = () => {
    sliderShake.setValue(0);
    Animated.sequence([
      Animated.timing(sliderShake, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(sliderShake, { toValue: 10, duration: 55, useNativeDriver: true }),
      Animated.timing(sliderShake, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(sliderShake, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(sliderShake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  // Viewer's gender — drives whether the "Women only" toggle is even
  // shown. We only surface the option to female users, and the
  // backend independently enforces the same rule on /ride/create so
  // a maliciously crafted client can't bypass the UI gate.
  // Reads from the shared `UserContext` — the /user/details fetch
  // happens once at app boot, not separately on this screen.
  const { user: viewerUser } = useUser();
  const viewerGender = (viewerUser?.gender || "").toLowerCase() || null;
  const [isWomenOnly, setIsWomenOnly] = useState<boolean>(false);

  // Keep the per-seat array length in sync with the seat count. When
  // the host bumps seats up, the new slots inherit the current
  // average so the totals don't lurch. When they drop seats, we trim
  // from the end.
  useEffect(() => {
    setSeatFares((prev) => {
      if (prev.length === totalSeats) return prev;
      if (prev.length < totalSeats) {
        const avg = prev.length
          ? Math.round(prev.reduce((a, b) => a + b, 0) / prev.length)
          : costPerPerson;
        return [
          ...prev,
          ...Array.from({ length: totalSeats - prev.length }, () => avg),
        ];
      }
      return prev.slice(0, totalSeats);
    });
  }, [totalSeats, costPerPerson]);

  // Effective per-PERSON price submitted to /ride/create. Under the
  // new contract (utils/seatMath) every person in the car — host
  // included — pays an equal fair share, so total_fare / total_seats
  // is the canonical per-person amount. Stored as `total_price` on
  // the booking; the backend treats it as the per-passenger price,
  // which equals the per-person price since the split is even.
  //
  // For "custom" mode (unequal split) we average across every seat
  // including the host so the listing surfaces a sane "typical
  // share" — the individual breakdown is the host's record-keeping,
  // not something we serialise.
  //
  // ₹25 floor matches the +/- stepper's increment so the host can
  // never accidentally post a free ride.
  const effectivePerSeat = useMemo(() => {
    if (splitMode === "total") {
      return Math.max(25, perSeatFare(totalFare, totalSeats));
    }
    if (splitMode === "custom") {
      const sum = seatFares.reduce((a, b) => a + b, 0);
      return Math.max(25, perSeatFare(sum, totalSeats));
    }
    return costPerPerson;
  }, [splitMode, costPerPerson, totalFare, seatFares, totalSeats]);

  // Total trip cost displayed under each mode. Single source of truth
  // so the "Total" preview stays consistent across modes.
  const displayTotal = useMemo(() => {
    if (splitMode === "total") return totalFare;
    if (splitMode === "custom") return seatFares.reduce((a, b) => a + b, 0);
    return costPerPerson * totalSeats;
  }, [splitMode, costPerPerson, totalFare, seatFares, totalSeats]);

  // Pre-flight blocker — surfaces as an inline note above the slider
  // so users know WHAT they need to fix before the slide will do
  // anything. Replaces the silent "disabled slider" state.
  const blockingReason = useMemo(() => {
    if (!fromLocation || !toLocation) return "Pick a pickup and a drop-off to continue.";
    if (fromLocation === toLocation) return "Pickup and drop-off can't be the same place.";
    if (rideDateTime.getTime() < Date.now() - 60_000) return "Pick a date and time in the future.";
    return null;
  }, [fromLocation, toLocation, rideDateTime]);

  // Animation states
  const [currentVehicleImage, setCurrentVehicleImage] = useState(() => require("../assets/Taxi.png"));
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
    if (DEBUG_CREATE_RIDE) console.log("Submitted ride details:", details);
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
    // LocationPermissionScreen owns notification permission prompts.
    try {
      const rideData = {
        start_location: fromLocation,
        end_location: toLocation,
        start_time: rideDateTime.toISOString(),
        total_seats: totalSeats,
        booked_seats: 0,
        // Backend stores the effective per-seat fare for every split mode.
        total_price: effectivePerSeat,
        is_ongoing: 0,
        // Server enforces the same gender gate; keep the client defensive.
        is_same_gender: isWomenOnly && viewerGender === "female" ? 1 : 0,
        start_latitude: fromCoordinates?.latitude || null,
        start_longitude: fromCoordinates?.longitude || null,
        end_latitude: toCoordinates?.latitude || null,
        end_longitude: toCoordinates?.longitude || null,
      };
      if (DEBUG_CREATE_RIDE) console.log("Creating ride with data:", rideData);

      const response = await apiUtil.post<CreateRideResponse, typeof rideData>(
        "/ride/create",
        rideData
      );
      if (DEBUG_CREATE_RIDE) console.log("Ride created successfully:", response);
      // Success screen uses rideId to open the host management view.
      navigate(appHref("RideCreatedScreen", { rideId: response?.id } as any));
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

  // Vehicle illustration by total seat count, including the host:
  //
  //   2 people    → motorcycle (host + pillion)
  //   3-4 people  → taxi / racer (sedan-ish)
  //   5-7 people  → wagon (Innova / SUV)
  //   8-10        → foodvan (small van)
  //   11-19       → bus
  //   20          → UFO joke fallback. MAX_TOTAL_SEATS caps the
  //                  stepper at 20, so the UFO is the last frame
  //                  the host can land on if they crank it all the
  //                  way up. Keep the band inclusive of 20.
  const getPassengerImage = (count?: number) => {
    const currentCount = count !== undefined ? count : totalSeats;
    if (currentCount <= 2) return require("../assets/motorcycle.png");
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
    // Initial vehicle illustration matches the default totalSeats=4
    // (host + 3 passengers → sedan).
    setCurrentVehicleImage(getPassengerImage(4));
  }, []);

  // Stepper bounds mirror utils/seatMath and backend helpers.
  const increaseSeats = () => {
    if (totalSeats < MAX_TOTAL_SEATS) {
      const newCount = totalSeats + 1;
      setTotalSeats(newCount);
      animateVehicleChange(newCount);
    }
  };

  const decreaseSeats = () => {
    if (totalSeats > MIN_TOTAL_SEATS) {
      const newCount = totalSeats - 1;
      setTotalSeats(newCount);
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

  // Total-mode stepper handlers. Step of 25 matches the per-seat
  // stepper rhythm; clamp range mirrors the backend's per-seat
  // validation scaled by max seats (25 × 20).
  const totalMin = 25 * Math.max(1, totalSeats);
  const totalMax = 10000 * Math.max(1, totalSeats);
  const increaseTotal = () =>
    setTotalFare((c) => Math.min(totalMax, c + 25 * Math.max(1, totalSeats)));
  const decreaseTotal = () =>
    setTotalFare((c) => Math.max(totalMin, c - 25 * Math.max(1, totalSeats)));

  // Tap-to-edit mirrors Per seat mode and clamps to the stepper range.
  const handleTotalPress = () => {
    setCustomTotal(totalFare.toString());
    setIsEditingTotal(true);
    setTimeout(() => totalInputRef.current?.focus(), 100);
  };
  const handleTotalChange = (text: string) =>
    /^\d*$/.test(text) && setCustomTotal(text);
  const handleTotalSubmit = () => {
    let v = parseInt(customTotal, 10);
    if (isNaN(v)) v = totalFare;
    v = Math.min(totalMax, Math.max(totalMin, v));
    setTotalFare(v);
    setIsEditingTotal(false);
  };

  // Custom-mode per-seat editing. Tapping a row opens an inline
  // numeric input (one at a time) so the host can punch in an exact
  // amount without juggling steppers for every seat.
  const openSeatEditor = (idx: number) => {
    setSeatFareDraft(String(seatFares[idx] ?? 100));
    setEditingSeatIndex(idx);
    setTimeout(() => seatFareInputRef.current?.focus(), 100);
  };
  const commitSeatEditor = () => {
    if (editingSeatIndex == null) return;
    let v = parseInt(seatFareDraft, 10);
    if (isNaN(v)) v = seatFares[editingSeatIndex] ?? 100;
    v = Math.min(10000, Math.max(25, v));
    setSeatFares((prev) => {
      const next = prev.slice();
      next[editingSeatIndex] = v;
      return next;
    });
    setEditingSeatIndex(null);
  };
  const bumpSeat = (idx: number, delta: number) => {
    setSeatFares((prev) => {
      const next = prev.slice();
      next[idx] = Math.min(10000, Math.max(25, (next[idx] ?? 100) + delta));
      return next;
    });
  };

  // Seed each split mode from the current effective fare when switching modes.
  const switchSplitMode = (next: "per_seat" | "total" | "custom") => {
    if (next === splitMode) return;
    if (next === "total") {
      setTotalFare(costPerPerson * totalSeats);
    } else if (next === "custom") {
      setSeatFares(Array.from({ length: totalSeats }, () => costPerPerson));
    } else if (next === "per_seat") {
      setCostPerPerson(effectivePerSeat);
    }
    setSplitMode(next);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }, tabletContentStyle]} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.headerRowWithTitle}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => back()}
        >
          <Image
            source={require("../assets/arrow-square-left.png")}
            style={[styles.backIcon, { tintColor: themeColors.textPrimary }]}
          />
        </TouchableOpacity>
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>Create a Ride</Text>
      </View>

      {/* Main form: route, fare summary, seats, vehicle, and submit slider. */}
      <View style={styles.mainContent}>
        {/* Suggests existing matching rides before the host posts a duplicate. */}
        <MatchingRidesSuggestion
          fromCoords={fromCoordinates}
          toCoords={toCoordinates}
          date={rideDateTime}
        />
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

        {/* Tappable fare summary card; full editor opens in the sheet below. */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowFareSheet(true)}
          style={[styles.fareSummaryCard, { backgroundColor: themeColors.navFill }]}
        >
          <View style={styles.fareSummaryTopRow}>
            <View style={styles.fareSummaryCol}>
              <Text
                style={[
                  styles.fareSummaryColLabel,
                  themeColors.mode === "dark" && { color: themeColors.textOnDark, opacity: 0.65 },
                ]}
              >
                Per seat
              </Text>
              <Text style={styles.fareSummaryColValue}>
                ₹{effectivePerSeat}
              </Text>
            </View>
            <View
              style={[
                styles.fareSummaryDivider,
                themeColors.mode === "dark" && { backgroundColor: themeColors.textOnDark, opacity: 0.12 },
              ]}
            />
            <View style={styles.fareSummaryCol}>
              <Text
                style={[
                  styles.fareSummaryColLabel,
                  themeColors.mode === "dark" && { color: themeColors.textOnDark, opacity: 0.65 },
                ]}
              >
                Trip total
              </Text>
              <Text style={styles.fareSummaryColValue}>
                ₹{displayTotal}
              </Text>
            </View>
            <Text
              style={[
                styles.fareSummaryChevron,
                themeColors.mode === "dark" && { color: themeColors.textOnDark, opacity: 0.45 },
              ]}
            >
              ›
            </Text>
          </View>
          <View
            style={[
              styles.fareSummaryFooter,
              themeColors.mode === "dark" && { borderTopColor: "rgba(237,236,231,0.10)" },
            ]}
          >
            <Text
              style={[
                styles.fareSummaryFooterText,
                themeColors.mode === "dark" && { color: themeColors.textOnDark, opacity: 0.65 },
              ]}
            >
              {splitMode === "per_seat"
                ? `Per-seat fare · ${totalSeats} seat${totalSeats === 1 ? "" : "s"}`
                : splitMode === "total"
                ? `Split equally · ${totalSeats} seat${totalSeats === 1 ? "" : "s"}`
                : `Unequal split · ${totalSeats} seat${totalSeats === 1 ? "" : "s"}`}
            </Text>
            <Text
              style={[
                styles.fareSummaryEditHint,
                themeColors.mode === "dark" && { color: themeColors.textOnDark, opacity: 0.4 },
              ]}
            >
              Tap to edit
            </Text>
          </View>
        </TouchableOpacity>

        <Text style={[styles.label, { color: themeColors.textPrimary }]}>
          Total seats{" "}
          <Text style={[styles.labelHint, { color: themeColors.textSecondary }]}>(including you)</Text>
        </Text>
        <View style={[styles.stepperCard, { backgroundColor: themeColors.navFill }]}>
          <TouchableOpacity
            onPress={decreaseSeats}
            style={[
              styles.stepperBtn,
              themeColors.mode === "dark" && {
                backgroundColor: "rgba(237,236,231,0.10)",
              },
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.stepperBtnText,
                themeColors.mode === "dark" && { color: themeColors.textOnDark },
              ]}
            >
              −
            </Text>
          </TouchableOpacity>
          <View style={styles.stepperValueWrap}>
            <Text style={styles.stepperValue}>{totalSeats}</Text>
            <Text
              style={[
                styles.stepperUnit,
                themeColors.mode === "dark" && { color: themeColors.textOnDark, opacity: 0.55 },
              ]}
            >
              {totalSeats === 1 ? "seat" : "seats"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={increaseSeats}
            style={[
              styles.stepperBtn,
              themeColors.mode === "dark" && {
                backgroundColor: "rgba(237,236,231,0.10)",
              },
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.stepperBtnText,
                themeColors.mode === "dark" && { color: themeColors.textOnDark },
              ]}
            >
              +
            </Text>
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
      </View>

      {/* Docked submit slider stays at thumb reach near the bottom edge. */}
      <Animated.View
        style={[
          styles.bottomDock,
          { backgroundColor: themeColors.background, borderTopColor: themeColors.inkSubtle },
          { transform: [{ translateX: sliderShake }] },
        ]}
      >
        <SlideToCreate
          onSlideComplete={() => {
            if (blockingReason) {
              shakeSlider();
              haptic("error");
              BrandedAlert.alert("Can't post yet", blockingReason);
              return;
            }
            handleCreateRide();
          }}
          isLoading={isCreating}
          disabled={isCreating}
          text="Slide to create ride"
          loadingText="Creating ride..."
          sliderIcon={require("../assets/slide.png")}
          emojiIcon={require("../assets/happy-emoji.png")}
        />
      </Animated.View>

      <SheetShell
        visible={showFareSheet}
        onDismiss={() => setShowFareSheet(false)}
      >
        <Text
          style={[
            sheetUi.sheetTitle,
            { marginBottom: 4 },
            themeColors.mode === "dark" && { color: themeColors.textPrimary },
          ]}
        >
          Fare
        </Text>
        <Text
          style={[
            sheetUi.sheetBody,
            themeColors.mode === "dark" && { color: themeColors.textSecondary, opacity: 1 },
          ]}
        >
          Pick how you want to set the price.
        </Text>

        <View style={styles.sheetModeChipRow}>
          {([
            { key: "per_seat", label: "Per seat" },
            { key: "total", label: "Total" },
            { key: "custom", label: "Unequal" },
          ] as const).map((opt) => {
            const active = splitMode === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.sheetModeChip,
                  active && styles.sheetModeChipActive,
                  themeColors.mode === "dark" && {
                    borderColor: themeColors.inkLine,
                    backgroundColor: active ? themeColors.primary : "transparent",
                  },
                ]}
                onPress={() => switchSplitMode(opt.key)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.sheetModeChipText,
                    active && styles.sheetModeChipTextActive,
                    themeColors.mode === "dark" && {
                      color: active ? themeColors.textOnAccent : themeColors.textPrimary,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Fixed height prevents the fare sheet from resizing between modes. */}
        <View style={styles.sheetModeBody}>
        {splitMode === "per_seat" && (
          <>
            <View style={[styles.stepperCard, { backgroundColor: themeColors.navFill }]}>
              <TouchableOpacity
                onPress={decreaseCost}
                style={[
                  styles.stepperBtn,
                  themeColors.mode === "dark" && {
                    backgroundColor: "rgba(237,236,231,0.10)",
                  },
                ]}
                disabled={isEditingCost}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.stepperBtnText,
                    themeColors.mode === "dark" && { color: themeColors.textOnDark },
                  ]}
                >
                  −
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stepperValueWrap}
                onPress={handleCostPress}
                activeOpacity={0.7}
                disabled={isEditingCost}
              >
                <Text
                  style={[
                    styles.stepperCurrency,
                    themeColors.mode === "dark" && { color: themeColors.textOnDark, opacity: 0.65 },
                  ]}
                >
                  ₹
                </Text>
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
                style={[
                  styles.stepperBtn,
                  themeColors.mode === "dark" && {
                    backgroundColor: "rgba(237,236,231,0.10)",
                  },
                ]}
                disabled={isEditingCost}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.stepperBtnText,
                    themeColors.mode === "dark" && { color: themeColors.textOnDark },
                  ]}
                >
                  +
                </Text>
              </TouchableOpacity>
            </View>
            <Text
              style={[
                styles.fieldHint,
                themeColors.mode === "dark" && { color: themeColors.textOnDark, opacity: 0.55 },
              ]}
            >
              What each rider pays you · ₹{displayTotal} total for {totalSeats}{" "}
              seat{totalSeats === 1 ? "" : "s"}.
            </Text>
          </>
        )}

        {splitMode === "total" && (
          <>
            <View style={[styles.stepperCard, { backgroundColor: themeColors.navFill }]}>
              <TouchableOpacity
                onPress={decreaseTotal}
                style={[
                  styles.stepperBtn,
                  themeColors.mode === "dark" && {
                    backgroundColor: "rgba(237,236,231,0.10)",
                  },
                ]}
                disabled={isEditingTotal}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.stepperBtnText,
                    themeColors.mode === "dark" && { color: themeColors.textOnDark },
                  ]}
                >
                  −
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stepperValueWrap}
                onPress={handleTotalPress}
                activeOpacity={0.7}
                disabled={isEditingTotal}
              >
                <Text
                  style={[
                    styles.stepperCurrency,
                    themeColors.mode === "dark" && { color: themeColors.textOnDark, opacity: 0.65 },
                  ]}
                >
                  ₹
                </Text>
                {isEditingTotal ? (
                  <TextInput
                    ref={totalInputRef}
                    style={styles.stepperValueInput}
                    value={customTotal}
                    onChangeText={handleTotalChange}
                    onBlur={handleTotalSubmit}
                    onSubmitEditing={handleTotalSubmit}
                    keyboardType="numeric"
                    maxLength={6}
                    selectTextOnFocus
                    returnKeyType="done"
                    autoFocus
                  />
                ) : (
                  <Text style={styles.stepperValue}>{totalFare}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={increaseTotal}
                style={[
                  styles.stepperBtn,
                  themeColors.mode === "dark" && {
                    backgroundColor: "rgba(237,236,231,0.10)",
                  },
                ]}
                disabled={isEditingTotal}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.stepperBtnText,
                    themeColors.mode === "dark" && { color: themeColors.textOnDark },
                  ]}
                >
                  +
                </Text>
              </TouchableOpacity>
            </View>
            <Text
              style={[
                styles.fieldHint,
                themeColors.mode === "dark" && { color: themeColors.textOnDark, opacity: 0.55 },
              ]}
            >
              Split equally across {totalSeats}{" "}
              seat{totalSeats === 1 ? "" : "s"} · ₹{effectivePerSeat} each.
            </Text>
          </>
        )}

        {splitMode === "custom" && (
          <>
            <ScrollView
              style={styles.customSeatScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[
                styles.customSeatList,
                themeColors.mode === "dark" && {
                  backgroundColor: themeColors.surfaceElevated,
                  borderWidth: 1,
                  borderColor: themeColors.inkSoft,
                },
              ]}>
                {seatFares.map((amount, idx) => {
                  const isEditing = editingSeatIndex === idx;
                  const seatKey = idx === 0 ? "seat-host" : `seat-${idx}`;
                  return (
                    <View key={seatKey} style={styles.customSeatRow}>
                      <View style={styles.customSeatLabelWrap}>
                        {/* First seat is the host's own contribution. */}
                        <Text style={styles.customSeatNumber}>
                          {idx === 0 ? "You" : `Seat ${idx}`}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => bumpSeat(idx, -25)}
                        style={[
                          styles.customSeatStepBtn,
                          themeColors.mode === "dark" && {
                            backgroundColor: "rgba(237,236,231,0.10)",
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.customSeatStepText,
                            themeColors.mode === "dark" && {
                              color: themeColors.textOnDark,
                            },
                          ]}
                        >
                          −
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.customSeatValueWrap}
                        onPress={() => openSeatEditor(idx)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.customSeatCurrency}>₹</Text>
                        {isEditing ? (
                          <TextInput
                            ref={seatFareInputRef}
                            style={styles.customSeatValueInput}
                            value={seatFareDraft}
                            onChangeText={(t) =>
                              /^\d*$/.test(t) && setSeatFareDraft(t)
                            }
                            onBlur={commitSeatEditor}
                            onSubmitEditing={commitSeatEditor}
                            keyboardType="numeric"
                            maxLength={5}
                            selectTextOnFocus
                            returnKeyType="done"
                            autoFocus
                          />
                        ) : (
                          <Text style={styles.customSeatValue}>{amount}</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => bumpSeat(idx, 25)}
                        style={[
                          styles.customSeatStepBtn,
                          themeColors.mode === "dark" && {
                            backgroundColor: "rgba(237,236,231,0.10)",
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.customSeatStepText,
                            themeColors.mode === "dark" && {
                              color: themeColors.textOnDark,
                            },
                          ]}
                        >
                          +
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            <Text
              style={[
                styles.fieldHint,
                themeColors.mode === "dark" && { color: themeColors.textOnDark, opacity: 0.55 },
              ]}
            >
              Total ₹{displayTotal} · average ₹{effectivePerSeat}/seat.
            </Text>
          </>
        )}
        </View>

        <TouchableOpacity
          style={[
            styles.sheetDoneBtn,
            themeColors.mode === "dark" && { backgroundColor: themeColors.primary },
          ]}
          activeOpacity={0.85}
          onPress={() => setShowFareSheet(false)}
        >
          <Text
            style={[
              styles.sheetDoneBtnText,
              themeColors.mode === "dark" && { color: themeColors.textOnAccent },
            ]}
          >
            Done
          </Text>
        </TouchableOpacity>
      </SheetShell>
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
    fontSize: 14,
    color: AppColors.secondaryDarkGreen,
    opacity: 0.75,
    fontFamily: "NunitoSans_700Bold",
    letterSpacing: -0.1,
  },
  // Inline parenthetical hint inside a section label.
  labelHint: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12.5,
    opacity: 0.75,
  },
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
  womenOnlyPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    width: "100%",
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  womenOnlyPillActive: {
    borderColor: AppColors.primaryLightGreen,
  },
  womenOnlyPillTitle: {
    color: AppColors.basicWhite,
    fontSize: 14.5,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: -0.1,
  },
  // Custom switch keeps thumb sizing consistent across iOS and Android.
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

  // Fare summary card with per-seat and total values.
  fareSummaryCard: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginTop: "5%",
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  fareSummaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  fareSummaryCol: {
    flex: 1,
  },
  fareSummaryColLabel: {
    color: AppColors.primaryLightGreen,
    opacity: 0.7,
    fontSize: 12,
    fontFamily: "NunitoSans_700Bold",
    letterSpacing: 0.05,
    marginBottom: 4,
  },
  fareSummaryColValue: {
    color: AppColors.basicWhite,
    fontSize: 26,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: -0.5,
  },
  fareSummaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: AppColors.primaryLightGreen,
    opacity: 0.18,
    marginHorizontal: 14,
  },
  fareSummaryChevron: {
    marginLeft: 10,
    color: AppColors.primaryLightGreen,
    opacity: 0.55,
    fontSize: 24,
    fontFamily: "NunitoSans_400Regular",
    lineHeight: 24,
  },
  fareSummaryFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(181,215,80,0.15)",
  },
  fareSummaryFooterText: {
    color: AppColors.primaryLightGreen,
    opacity: 0.7,
    fontSize: 12,
    fontFamily: "NunitoSans_700Bold",
    letterSpacing: 0.05,
  },
  fareSummaryEditHint: {
    color: AppColors.primaryLightGreen,
    opacity: 0.45,
    fontSize: 11,
    fontFamily: "NunitoSans_700Bold",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },

  // Mode chip row inside the fare editor.
  sheetModeChipRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  sheetModeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(38,59,51,0.20)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  sheetModeChipActive: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderColor: AppColors.secondaryDarkGreen,
  },
  sheetModeChipText: {
    color: AppColors.secondaryDarkGreen,
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 13,
    letterSpacing: 0.1,
  },
  sheetModeChipTextActive: {
    color: AppColors.primaryLightGreen,
  },
  // Fixed-height container for mode-specific fare controls.
  sheetModeBody: {
    height: 240,
  },
  // Internal scroll for the unequal-mode per-seat list.
  customSeatScroll: {
    maxHeight: 210,
  },
  sheetDoneBtn: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.secondaryDarkGreen,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  sheetDoneBtnText: {
    color: AppColors.primaryLightGreen,
    fontSize: 15,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: 0.3,
  },

  // Unequal split list: one editable row per seat.
  customSeatList: {
    backgroundColor: AppColors.secondaryDarkGreen,
    borderRadius: 18,
    paddingVertical: 4,
    paddingHorizontal: 4,
    shadowColor: AppColors.basicBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  customSeatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  customSeatLabelWrap: {
    flex: 1,
  },
  customSeatNumber: {
    color: AppColors.basicWhite,
    fontSize: 14,
    fontFamily: "NunitoSans_700Bold",
    letterSpacing: -0.1,
  },
  customSeatStepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.primaryLightGreen,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  customSeatStepText: {
    color: AppColors.secondaryDarkGreen,
    fontSize: 18,
    fontFamily: "NunitoSans_800ExtraBold",
    lineHeight: 22,
  },
  customSeatValueWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    minWidth: 90,
    paddingHorizontal: 6,
  },
  customSeatCurrency: {
    color: AppColors.primaryLightGreen,
    opacity: 0.65,
    fontSize: 13,
    fontFamily: "NunitoSans_700Bold",
    marginRight: 2,
  },
  customSeatValue: {
    color: AppColors.basicWhite,
    fontSize: 20,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: -0.3,
  },
  customSeatValueInput: {
    color: AppColors.basicWhite,
    fontSize: 20,
    fontFamily: "NunitoSans_800ExtraBold",
    letterSpacing: -0.3,
    backgroundColor: "transparent",
    padding: 0,
    margin: 0,
    minWidth: 60,
    textAlign: "center",
  },

  // Fixed bottom dock for the create slider.
  bottomDock: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: AppColors.primaryLightGreen,
    borderTopWidth: 1,
    borderTopColor: "rgba(38,59,51,0.08)",
  },
});

export default CreateRide;
