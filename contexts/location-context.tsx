import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import * as Location from "expo-location";

type Coords = { latitude: number; longitude: number };

type LocationContextValue = {
  loading: boolean;
  error: string | null;
  coords: Coords | null;
  locationText: string;
  pincode: string;
  lastUpdated: number | null;
  refreshLocation: () => Promise<void>;
};

const LocationContext = createContext<LocationContextValue>({
  loading: true,
  error: null,
  coords: null,
  locationText: "Fetching location...",
  pincode: "",
  lastUpdated: null,
  refreshLocation: async () => {},
});

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locationText, setLocationText] = useState("Fetching location...");
  const [pincode, setPincode] = useState("");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetchedOnceRef = useRef(false);
  const backgroundRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLocation = async (retryCount = 0, isBackgroundRetry = false) => {
    try {
      if (!isBackgroundRetry) {
        setLoading(true);
        setError(null);
      }

      // Only READ current permission — never prompt here. The dedicated
      // LocationPermissionScreen owns the request UX. Prompting from the
      // provider would fire the iOS dialog over the onboarding carousel.
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Permission not granted");
        setLocationText("Tap to enable location");
        if (!isBackgroundRetry) {
          setLoading(false);
        }
        return;
      }

      let loc;
      try {
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      } catch (locationError) {
        console.warn("Balanced accuracy location failed, trying high accuracy for landmarks:", locationError);
        if (retryCount < 1) {
          loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
        } else {
          throw locationError;
        }
      }

      const { latitude, longitude } = loc.coords;
      setCoords({ latitude, longitude });

      const geocode = await Location.reverseGeocodeAsync(loc.coords);
      if (geocode?.length) {
        const first = geocode[0];
        
        let locStr = "";
        
        // Priority order: district -> subregion -> city -> region
        // Avoid overly specific street names or landmarks
        if (first.district && first.district !== first.city) {
          locStr = first.district;
        } else if (first.subregion && first.subregion !== first.city) {
          locStr = first.subregion;
        } else if (first.city) {
          locStr = first.city;
        } else if (first.region) {
          locStr = first.region;
        }
        
        if (first.postalCode === "632014") {
          locStr = "VIT University";
        }
        
        setLocationText(locStr || "Location found");
        setPincode(first.postalCode || "");
        setError(null);
      }

      setLastUpdated(Date.now());
    } catch (e) {
      console.error("Location fetch error:", e);
      if (retryCount < 1) {
        console.log("Retrying location fetch with lower accuracy...");
        setTimeout(() => fetchLocation(retryCount + 1, isBackgroundRetry), 2000);
        return;
      }
      
      setError("Failed to get location");
      if (!isBackgroundRetry && (!locationText || locationText === "Fetching location...")) {
        setLocationText("Failed to get location");
      }
      
      if (!isBackgroundRetry || retryCount < 4) {
        const retryDelay = isBackgroundRetry ? 30000 : 15000;
        backgroundRetryTimeoutRef.current = setTimeout(() => {
          console.log("Background retry attempt for location...");
          fetchLocation(0, true);
        }, retryDelay);
      }
    } finally {
      if (!isBackgroundRetry) {
        setLoading(false);
      }
    }
  };

  // Latest snapshot of whether we currently believe we have coords —
  // used by the AppState listener below to decide if a re-fetch is
  // warranted on foreground. Ref so the listener callback (registered
  // once) stays current without re-subscribing on every coords change.
  const hasCoordsRef = useRef(false);
  useEffect(() => {
    hasCoordsRef.current = coords !== null;
  }, [coords]);

  useEffect(() => {
    if (!fetchedOnceRef.current) {
      fetchedOnceRef.current = true;
      void fetchLocation();
    }

    // Re-fetch when the app returns to the foreground IF the user has
    // since granted permission (e.g. they tapped "Allow" on the
    // LocationPermissionScreen, OR they enabled location externally
    // from system Settings and came back). Without this, the very
    // first read happens at app-boot — usually BEFORE the user has
    // granted permission — and BrandInfo's "Tap to enable location"
    // stays stuck forever because the provider never re-checks.
    const onAppStateChange = async (next: AppStateStatus) => {
      if (next !== "active") return;
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") return;
        // Permission is granted. If we don't have coords yet (cold-
        // start case), fetch now. If we already do, leave it — the
        // user can pull-to-refresh via `refreshLocation` if needed.
        if (!hasCoordsRef.current) {
          void fetchLocation();
        }
      } catch (e) {
        console.warn("AppState location recheck failed", e);
      }
    };
    const sub = AppState.addEventListener("change", onAppStateChange);

    return () => {
      sub.remove();
      if (backgroundRetryTimeoutRef.current) {
        clearTimeout(backgroundRetryTimeoutRef.current);
      }
    };
  }, []);

  const refreshLocation = async () => {
    if (backgroundRetryTimeoutRef.current) {
      clearTimeout(backgroundRetryTimeoutRef.current);
      backgroundRetryTimeoutRef.current = null;
    }
    await fetchLocation();
  };

  return (
    <LocationContext.Provider
      value={{
        loading,
        error,
        coords,
        locationText,
        pincode,
        lastUpdated,
        refreshLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationInfo = () => useContext(LocationContext);
