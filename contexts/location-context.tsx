import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
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

  useEffect(() => {
    if (!fetchedOnceRef.current) {
      fetchedOnceRef.current = true;
      void fetchLocation();
    }
    
    return () => {
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
