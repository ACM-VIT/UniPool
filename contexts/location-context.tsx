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

  const fetchLocation = async () => {
    try {
      setLoading(true);
      setError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Permission denied");
        setLocationText("Permission denied");
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      setCoords({ latitude, longitude });

      const geocode = await Location.reverseGeocodeAsync(loc.coords);
      if (geocode?.length) {
        const first = geocode[0];
        const locRaw = first.city || first.region || first.country || "";
        const locStr = (locRaw || "").split(",")[0].trim();
        setLocationText(locStr || "");
        setPincode(first.postalCode || "");
      }

      setLastUpdated(Date.now());
    } catch (e) {
      setError("Failed to get location");
      if (!locationText) setLocationText("Failed to get location");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!fetchedOnceRef.current) {
      fetchedOnceRef.current = true;
      void fetchLocation();
    }
  }, []);

  const refreshLocation = async () => {
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
