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

  const fetchLocation = async (retryCount = 0) => {
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
        
        const isLandmark = (text: string | null): boolean => {
          if (!text) return false;
          const landmarkKeywords = [
            'Institute', 'University', 'College', 'Hospital', 'Mall', 'Airport', 
            'Station', 'Park', 'Temple', 'Church', 'Mosque', 'School', 'Market',
            'Complex', 'Center', 'Centre', 'Plaza', 'Tower', 'Building', 'Campus'
          ];
          return landmarkKeywords.some(keyword => text.includes(keyword));
        };
        
        if (first.name && first.name !== first.city && first.name !== first.district && isLandmark(first.name)) {
          locStr = first.name;
        } else if (first.name && first.name !== first.city && first.name !== first.district) {
          locStr = first.name;
        } else if (first.district && first.district !== first.city) {
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
      }

      setLastUpdated(Date.now());
    } catch (e) {
      console.error("Location fetch error:", e);
      if (retryCount < 1) {
        console.log("Retrying location fetch with lower accuracy...");
        setTimeout(() => fetchLocation(retryCount + 1), 2000);
        return;
      }
      setError("Failed to get location");
      if (!locationText || locationText === "Fetching location...") {
        setLocationText("Failed to get location");
      }
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
