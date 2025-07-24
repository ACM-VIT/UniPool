export const USE_TEST_LOCATION = true; // change to false for production
export const TEST_LOCATION: UserLocation = {
  latitude: 12.9165,
  longitude: 79.1325
};

export interface LocationResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
  name?: string;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface NearbyPlace {
  name: string;
  category: string;
  distance?: number;
  lat: number;
  lon: number;
}

export const POPULAR_LOCATIONS = {
  chennai: [
    "Chennai Central Railway Station",
    "Chennai Airport",
    "Anna Salai",
    "T Nagar",
    "Velachery",
    "Adyar",
    "Mylapore",
    "Egmore",
    "Tambaram",
    "Porur"
  ],
  bangalore: [
    "Kempegowda International Airport",
    "MG Road",
    "Brigade Road",
    "Electronic City",
    "Whitefield",
    "Koramangala",
    "Indiranagar",
    "Jayanagar",
    "Malleshwaram",
    "HSR Layout"
  ],
  hyderabad: [
    "Rajiv Gandhi International Airport",
    "HITEC City",
    "Gachibowli",
    "Madhapur",
    "Jubilee Hills",
    "Banjara Hills",
    "Secunderabad",
    "Begumpet",
    "Kondapur",
    "Kukatpally"
  ],
  vellore: [
    "VIT University",
    "Vellore Railway Station",
    "Vellore Bus Stand",
    "CMC Hospital",
    "Vellore Fort",
    "Katpadi",
    "Bagayam",
    "Gandhi Nagar",
    "Thimiri",
    "Walajapet"
  ],
  coimbatore: [
    "Coimbatore Airport",
    "Coimbatore Railway Station",
    "Gandhipuram",
    "RS Puram",
    "Peelamedu",
    "Saibaba Colony",
    "Race Course",
    "Town Hall",
    "Brookefields Mall",
    "Fun Mall"
  ],
  madurai: [
    "Madurai Airport",
    "Madurai Railway Station",
    "Meenakshi Temple",
    "Anna Bus Stand",
    "Periyar Bus Stand",
    "K Pudur",
    "Goripalayam",
    "Thiruparankundram",
    "Avaniyapuram",
    "Palanganatham"
  ],
  salem: [
    "Salem Railway Station",
    "Salem Bus Stand",
    "Attur",
    "Mettur",
    "Yercaud",
    "Sankari",
    "Vazhapadi",
    "Omalur",
    "Edappadi",
    "Rasipuram"
  ],
  pondicherry: [
    "Pondicherry Railway Station",
    "French Quarter",
    "White Town",
    "Auroville",
    "Paradise Beach",
    "Promenade Beach",
    "Bharathi Park",
    "Goubert Market",
    "Botanical Garden",
    "Chunnambar Boat House"
  ],
  default: [
    "Railway Station",
    "Bus Stand",
    "Airport",
    "City Center",
    "Shopping Mall",
    "Hospital",
    "University",
    "IT Park",
    "Government Office",
    "Market"
  ]
};

export const getEffectiveLocation = (userLocation?: UserLocation): UserLocation | undefined => {
  if (USE_TEST_LOCATION) {
    console.log('Using test location (VIT Vellore):', TEST_LOCATION);
    return TEST_LOCATION;
  }
  console.log('Using real user location:', userLocation);
  return userLocation;
};

export const getNearbyPopularPlaces = async (
  userLocation: UserLocation,
  radius = 25,
  categories = ['amenity=hospital', 'amenity=university', 'aeroway=aerodrome', 'railway=station', 'amenity=bus_station', 'shop=mall', 'tourism=attraction'],
  overallTimeoutMs = 2000
): Promise<NearbyPlace[]> => {
  const effectiveLocation = getEffectiveLocation(userLocation);
  if (!effectiveLocation?.latitude || !effectiveLocation?.longitude) return [];

  console.log('Starting API calls for location:', effectiveLocation);

  try {
    const places: NearbyPlace[] = [];
    
    const priorityCategories = ['amenity=university', 'railway=station', 'amenity=hospital'];
    
    const overallController = new AbortController();
    const overallTimeoutId = setTimeout(() => {
      console.log('Overall API timeout reached, aborting all requests...');
      overallController.abort();
    }, overallTimeoutMs);
    
    for (const category of priorityCategories) {
      if (overallController.signal.aborted) {
        console.log('Skipping remaining categories due to timeout');
        break;
      }
      
      try {
        console.log(`Searching for category: ${category}`);
        
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&${category}&limit=2&lat=${effectiveLocation.latitude}&lon=${effectiveLocation.longitude}&bounded=1&viewbox=${effectiveLocation.longitude - 0.2},${effectiveLocation.latitude + 0.2},${effectiveLocation.longitude + 0.2},${effectiveLocation.latitude - 0.2}`,
          {
            headers: {
              'User-Agent': 'Unipool-App/1.0'
            },
            signal: overallController.signal
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log(`📍 ${category} results:`, data?.length || 0);
          
          const categoryPlaces = data.map((item: any) => ({
            name: item.name || item.display_name.split(',')[0],
            category: getCategoryName(category),
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            distance: calculateDistance(
              effectiveLocation.latitude,
              effectiveLocation.longitude,
              parseFloat(item.lat),
              parseFloat(item.lon)
            )
          })).filter((place: NearbyPlace) => place.name && place.distance! <= radius);

          places.push(...categoryPlaces);
        } else {
          console.warn(`API response not OK for ${category}:`, response.status);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (categoryError) {
        if (categoryError instanceof Error && categoryError.name === 'AbortError') {
          console.log(`${category} request timed out`);
        } else {
          console.warn(`Error fetching ${category}:`, categoryError);
        }
        if (overallController.signal.aborted) break;
      }
    }

    clearTimeout(overallTimeoutId);

    const uniquePlaces = places.filter((place, index, self) => 
      index === self.findIndex(p => p.name.toLowerCase() === place.name.toLowerCase())
    );

    const sortedPlaces = uniquePlaces.sort((a, b) => (a.distance || 0) - (b.distance || 0)).slice(0, 10);
    console.log('Final nearby places:', sortedPlaces);
    
    return sortedPlaces;
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    return [];
  }
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const getCategoryName = (category: string): string => {
  const categoryMap: { [key: string]: string } = {
    'amenity=hospital': 'Hospital',
    'amenity=university': 'University',
    'aeroway=aerodrome': 'Airport',
    'railway=station': 'Railway Station',
    'amenity=bus_station': 'Bus Station',
    'shop=mall': 'Shopping Mall',
    'tourism=attraction': 'Tourist Attraction'
  };
  return categoryMap[category] || 'Location';
};

export const getNearestCity = async (userLocation: UserLocation): Promise<string> => {
  const effectiveLocation = getEffectiveLocation(userLocation);
  if (!effectiveLocation) return 'default';

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${effectiveLocation.latitude}&lon=${effectiveLocation.longitude}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Unipool-App/1.0'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      const address = data.address;
      
      const city = address?.city || 
                  address?.town || 
                  address?.village || 
                  address?.state_district || 
                  address?.county ||
                  'Unknown';
      
      return city.toLowerCase();
    }
  } catch (error) {
    console.error('Error getting nearest city:', error);
  }
  
  return 'default';
};

export const searchLocations = async (
  query: string, 
  region = "India", 
  limit = 10
): Promise<LocationResult[]> => {
  if (!query || query.length < 2) return [];
  
  try {
    console.log('Searching for:', query);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Search API timeout, aborting...');
      controller.abort();
    }, 5000);
    
    const encodedQuery = encodeURIComponent(`${query}, ${region}`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=${limit}&addressdetails=1&countrycodes=in`,
      {
        headers: {
          'User-Agent': 'Unipool-App/1.0'
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Search results found:', data?.length || 0);
    
    return data.map((item: any) => ({
      display_name: item.display_name,
      lat: item.lat,
      lon: item.lon,
      place_id: item.place_id,
      name: item.name || item.display_name.split(',')[0]
    }));
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('Search request timed out');
    } else {
      console.error('Location search error:', error);
    }
    return [];
  }
};

export const searchLocationsWithFallback = async (
  query: string, 
  region = "India", 
  limit = 10
): Promise<LocationResult[]> => {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  
  const localResults: LocationResult[] = [];
  
  Object.entries(POPULAR_LOCATIONS).forEach(([cityKey, locations]) => {
    if (cityKey === 'default') return;
    
    locations.forEach(location => {
      if (location.toLowerCase().includes(lowerQuery)) {
        const cityCoords = getCityCoordinates(cityKey);
        localResults.push({
          display_name: `${location}, ${cityKey.charAt(0).toUpperCase() + cityKey.slice(1)}, India`,
          lat: cityCoords.lat.toString(),
          lon: cityCoords.lon.toString(),
          place_id: `local_${cityKey}_${location.replace(/\s+/g, '_')}`,
          name: location
        });
      }
    });
    
    if (cityKey.includes(lowerQuery) || lowerQuery.includes(cityKey)) {
      const cityCoords = getCityCoordinates(cityKey);
      localResults.push({
        display_name: `${cityKey.charAt(0).toUpperCase() + cityKey.slice(1)}, India`,
        lat: cityCoords.lat.toString(),
        lon: cityCoords.lon.toString(),
        place_id: `local_city_${cityKey}`,
        name: cityKey.charAt(0).toUpperCase() + cityKey.slice(1)
      });
    }
  });
  
  if (localResults.length > 0) {
    console.log('Found local results:', localResults.length);
    return localResults.slice(0, limit);
  }
  
  console.log('No local results, trying API search...');
  try {
    const apiResults = await searchLocations(query, region, limit);
    if (apiResults.length > 0) {
      return apiResults;
    }
  } catch (error) {
    console.log('API search failed, using fallback locations');
  }
  
  const fallbackLocations = getPopularLocationsFallback(query);
  return fallbackLocations.slice(0, 4).map((location, index) => ({
    display_name: `${location}, India`,
    lat: "12.9716",
    lon: "77.5946",
    place_id: `fallback_${index}`,
    name: location
  }));
};

const getRandomPopularLocations = (locations: string[], count = 4): string[] => {
  if (locations.length <= count) return locations;
  
  const shuffled = [...locations].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const getCityCoordinates = (cityKey: string): { lat: number; lon: number } => {
  const cityCoords: { [key: string]: { lat: number; lon: number } } = {
    chennai: { lat: 13.0827, lon: 80.2707 },
    bangalore: { lat: 12.9716, lon: 77.5946 },
    hyderabad: { lat: 17.3850, lon: 78.4867 },
    vellore: { lat: 12.9165, lon: 79.1325 },
    coimbatore: { lat: 11.0168, lon: 76.9558 },
    madurai: { lat: 9.9252, lon: 78.1198 },
    salem: { lat: 11.6643, lon: 78.1460 },
    pondicherry: { lat: 11.9416, lon: 79.8083 }
  };
  
  return cityCoords[cityKey] || { lat: 12.9716, lon: 77.5946 };
};

export const getPopularLocations = async (
  searchQuery: string, 
  userLocation?: UserLocation
): Promise<string[]> => {
  console.log('getPopularLocations called with:', { searchQuery, userLocation });
  
  const effectiveLocation = getEffectiveLocation(userLocation);
  console.log('Effective location:', effectiveLocation);
  
  if (effectiveLocation && effectiveLocation.latitude && effectiveLocation.longitude) {
    try {
      console.log('Fetching nearby places...');
      
      const nearbyPlacesPromise = getNearbyPopularPlaces(effectiveLocation, 25, undefined, 2000);
      const timeoutPromise = new Promise<NearbyPlace[]>((resolve) => {
        setTimeout(() => {
          console.log('API timeout, using fallback...');
          resolve([]);
        }, 2000);
      });
      
      const nearbyPlaces = await Promise.race([nearbyPlacesPromise, timeoutPromise]);
      console.log('Found nearby places:', nearbyPlaces);
      
      if (nearbyPlaces.length > 0) {
        const placeNames = nearbyPlaces.map(place => place.name);
        console.log('Returning place names:', placeNames);
        return placeNames;
      }
      
      console.log('No nearby places found, getting nearest city...');
      
      if (USE_TEST_LOCATION) {
        console.log('Using test mode - returning Vellore locations');
        return getRandomPopularLocations(POPULAR_LOCATIONS.vellore, 4);
      }
      
      const nearestCity = await getNearestCity(effectiveLocation);
      console.log('Nearest city:', nearestCity);
      
      if (nearestCity !== 'default' && POPULAR_LOCATIONS[nearestCity as keyof typeof POPULAR_LOCATIONS]) {
        const cityLocations = POPULAR_LOCATIONS[nearestCity as keyof typeof POPULAR_LOCATIONS];
        console.log('Returning city locations:', cityLocations);
        return getRandomPopularLocations(cityLocations, 4);
      }
    } catch (error) {
      console.error('Error getting location-based popular places:', error);
    }
  }
  
  console.log('Using fallback logic for query:', searchQuery);
  const query = searchQuery.toLowerCase();
  
  if (query.includes('chennai')) return getRandomPopularLocations(POPULAR_LOCATIONS.chennai, 4);
  if (query.includes('bangalore') || query.includes('bengaluru')) return getRandomPopularLocations(POPULAR_LOCATIONS.bangalore, 4);
  if (query.includes('hyderabad')) return getRandomPopularLocations(POPULAR_LOCATIONS.hyderabad, 4);
  if (query.includes('vellore')) return getRandomPopularLocations(POPULAR_LOCATIONS.vellore, 4);
  if (query.includes('coimbatore')) return getRandomPopularLocations(POPULAR_LOCATIONS.coimbatore, 4);
  if (query.includes('madurai')) return getRandomPopularLocations(POPULAR_LOCATIONS.madurai, 4);
  if (query.includes('salem')) return getRandomPopularLocations(POPULAR_LOCATIONS.salem, 4);
  if (query.includes('pondicherry') || query.includes('puducherry')) return getRandomPopularLocations(POPULAR_LOCATIONS.pondicherry, 4);
  
  console.log('🔄 Returning default locations');
  return getRandomPopularLocations(POPULAR_LOCATIONS.default, 4);
};

export const getPopularLocationsFallback = (searchQuery: string): string[] => {
  const query = searchQuery.toLowerCase();
  
  if (query.includes('chennai')) return getRandomPopularLocations(POPULAR_LOCATIONS.chennai, 4);
  if (query.includes('bangalore') || query.includes('bengaluru')) return getRandomPopularLocations(POPULAR_LOCATIONS.bangalore, 4);
  if (query.includes('hyderabad')) return getRandomPopularLocations(POPULAR_LOCATIONS.hyderabad, 4);
  if (query.includes('vellore')) return getRandomPopularLocations(POPULAR_LOCATIONS.vellore, 4);
  if (query.includes('coimbatore')) return getRandomPopularLocations(POPULAR_LOCATIONS.coimbatore, 4);
  if (query.includes('madurai')) return getRandomPopularLocations(POPULAR_LOCATIONS.madurai, 4);
  if (query.includes('salem')) return getRandomPopularLocations(POPULAR_LOCATIONS.salem, 4);
  if (query.includes('pondicherry') || query.includes('puducherry')) return getRandomPopularLocations(POPULAR_LOCATIONS.pondicherry, 4);
  
  return getRandomPopularLocations(POPULAR_LOCATIONS.default, 4);
};

export const getPopularLocationsByCity = (cityName: string): string[] => {
  const city = cityName.toLowerCase();
  
  if (POPULAR_LOCATIONS[city as keyof typeof POPULAR_LOCATIONS]) {
    return getRandomPopularLocations(POPULAR_LOCATIONS[city as keyof typeof POPULAR_LOCATIONS], 4);
  }
  
  return getRandomPopularLocations(POPULAR_LOCATIONS.default, 4);
};

export const formatLocationName = (locationResult: LocationResult): string => {
  return locationResult.name || locationResult.display_name.split(',')[0];
};

export const isLocationInIndia = (locationResult: LocationResult): boolean => {
  return locationResult.display_name.toLowerCase().includes('india');
};

export default {
  searchLocations,
  searchLocationsWithFallback,
  getPopularLocations,
  getPopularLocationsFallback,
  getPopularLocationsByCity,
  getNearbyPopularPlaces,
  getNearestCity,
  getEffectiveLocation,
  formatLocationName,
  isLocationInIndia,
  POPULAR_LOCATIONS,
  USE_TEST_LOCATION,
  TEST_LOCATION
};
