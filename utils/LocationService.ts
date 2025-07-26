function debounce<
  T extends (...args: any[]) => Promise<any>
>(func: T, wait = 300): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: number | undefined
  let lastArgs: Parameters<T>
  let pending: Promise<ReturnType<T>> | null = null

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    lastArgs = args
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
    if (!pending) {
      pending = new Promise<ReturnType<T>>(resolve => {
        timeoutId = window.setTimeout(async () => {
          const result = await func(...lastArgs)
          resolve(result)
          pending = null
        }, wait)
      })
    }
    return pending
  }
}

const searchCache = new Map<string, LocationResult[]>()
const nearbyPlacesCache = new Map<string, NearbyPlace[]>()
const popularLocationsCache = new Map<string, string[]>()

export const USE_TEST_LOCATION = true // change to false for production
export const TEST_LOCATION: UserLocation = {
  latitude: 12.9165,
  longitude: 79.1325
}

export interface LocationResult {
  display_name: string
  lat: string
  lon: string
  place_id: string
  name?: string
}

export interface UserLocation {
  latitude: number
  longitude: number
}

export interface NearbyPlace {
  name: string
  category: string
  distance?: number
  lat: number
  lon: number
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
    "Katpadi Junction",
    "Vellore Bus Stand",
    "CMC Hospital",
    "Vellore Fort",
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
}

// -----------------------------------------------------------------------------
// helper: pick test vs real
// -----------------------------------------------------------------------------

export const getEffectiveLocation = (
  userLocation?: UserLocation
): UserLocation | undefined => {
  if (USE_TEST_LOCATION) {
    console.log("Using test location (VIT Vellore):", TEST_LOCATION)
    return TEST_LOCATION
  }
  console.log("Using real user location:", userLocation)
  return userLocation
}

// -----------------------------------------------------------------------------
// getNearbyPopularPlaces (with caching)
// -----------------------------------------------------------------------------

export const getNearbyPopularPlaces = async (
  userLocation: UserLocation,
  radius = 25,
  categories = [
    "amenity=hospital",
    "amenity=university",
    "aeroway=aerodrome",
    "railway=station",
    "amenity=bus_station",
    "shop=mall",
    "tourism=attraction"
  ],
  overallTimeoutMs = 2000
): Promise<NearbyPlace[]> => {
  const effectiveLocation = getEffectiveLocation(userLocation)
  if (!effectiveLocation?.latitude || !effectiveLocation?.longitude) return []

  const cacheKey = `${effectiveLocation.latitude},${effectiveLocation.longitude}`
  if (nearbyPlacesCache.has(cacheKey)) {
    console.log("→ Returning cached nearby places for:", cacheKey)
    return nearbyPlacesCache.get(cacheKey)!
  }

  console.log("Starting API calls for location:", effectiveLocation)

  try {
    const places: NearbyPlace[] = []
    const priorityCategories = [
      "amenity=university",
      "railway=station",
      "amenity=hospital"
    ]

    const overallController = new AbortController()
    const overallTimeoutId = setTimeout(() => {
      console.log(
        "Overall API timeout reached, aborting all requests…"
      )
      overallController.abort()
    }, overallTimeoutMs)

    for (const category of priorityCategories) {
      if (overallController.signal.aborted) {
        console.log("Skipping remaining categories due to timeout")
        break
      }
      try {
        console.log(`Searching for category: ${category}`)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&${category}&limit=2&lat=${effectiveLocation.latitude}&lon=${effectiveLocation.longitude}&bounded=1&viewbox=${
            effectiveLocation.longitude - 0.2
          },${effectiveLocation.latitude + 0.2},${
            effectiveLocation.longitude + 0.2
          },${effectiveLocation.latitude - 0.2}`,
          {
            headers: {
              "User-Agent": "Unipool-App/1.0"
            },
            signal: overallController.signal
          }
        )

        if (response.ok) {
          const data = await response.json()
          console.log(`📍 ${category} results:`, data?.length || 0)

          const categoryPlaces = (data as any[]).map(item => ({
            name:
              item.name || item.display_name.split(",")[0],
            category: getCategoryName(category),
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            distance: calculateDistance(
              effectiveLocation.latitude,
              effectiveLocation.longitude,
              parseFloat(item.lat),
              parseFloat(item.lon)
            )
          }))
          .filter(
            (place: NearbyPlace) =>
              place.name && place.distance! <= radius
          )

          places.push(...categoryPlaces)
        } else {
          console.warn(
            `API response not OK for ${category}:`,
            response.status
          )
        }

        // tiny pause to avoid hammering the API
        await new Promise(r => setTimeout(r, 100))
      } catch (err: any) {
        if (err.name === "AbortError") {
          console.log(`${category} request timed out`)
        } else {
          console.warn(`Error fetching ${category}:`, err)
        }
        if (overallController.signal.aborted) break
      }
    }

    clearTimeout(overallTimeoutId)

    const uniquePlaces = places.filter(
      (p, i, a) =>
        i ===
        a.findIndex(
          pp =>
            pp.name.toLowerCase() === p.name.toLowerCase()
        )
    )

    const sortedPlaces = uniquePlaces
      .sort((a, b) => (a.distance! - b.distance!))
      .slice(0, 10)

    console.log("Final nearby places:", sortedPlaces)

    // cache for next time
    nearbyPlacesCache.set(cacheKey, sortedPlaces)
    return sortedPlaces
  } catch (error) {
    console.error("❌ Error fetching nearby places:", error)
    return []
  }
}

// -----------------------------------------------------------------------------
// distance + category name helpers (unchanged)
// -----------------------------------------------------------------------------

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371 // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const getCategoryName = (category: string): string => {
  const categoryMap: Record<string, string> = {
    "amenity=hospital": "Hospital",
    "amenity=university": "University",
    "aeroway=aerodrome": "Airport",
    "railway=station": "Railway Station",
    "amenity=bus_station": "Bus Station",
    "shop=mall": "Shopping Mall",
    "tourism=attraction": "Tourist Attraction"
  }
  return categoryMap[category] || "Location"
}

// -----------------------------------------------------------------------------
// getNearestCity (unchanged)
// -----------------------------------------------------------------------------

export const getNearestCity = async (
  userLocation: UserLocation
): Promise<string> => {
  const effectiveLocation = getEffectiveLocation(userLocation)
  if (!effectiveLocation) return "default"

  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${effectiveLocation.latitude}&lon=${effectiveLocation.longitude}&zoom=10&addressdetails=1`,
      {
        headers: { "User-Agent": "Unipool-App/1.0" }
      }
    )
    if (!resp.ok) throw new Error(resp.statusText)
    const data = await resp.json()
    const address = data.address || {}
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.state_district ||
      address.county ||
      "Unknown"
    return city.toLowerCase()
  } catch (err) {
    console.error("❌ Error getting nearest city:", err)
    return "default"
  }
}

// -----------------------------------------------------------------------------
// searchLocations (with caching) + debounced wrapper
// -----------------------------------------------------------------------------

export const searchLocations = async (
  query: string,
  region = "India",
  limit = 10
): Promise<LocationResult[]> => {
  if (!query || query.length < 2) return []

  const encodedQuery = encodeURIComponent(`${query}, ${region}`)

  // check cache
  if (searchCache.has(encodedQuery)) {
    console.log("→ Returning cached search for:", query)
    return searchCache.get(encodedQuery)!
  }

  console.log("🔍 Searching for:", query)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    console.log("⏱️ Search API timeout, aborting…")
    controller.abort()
  }, 5000)

  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=${limit}&addressdetails=1&countrycodes=in`,
      {
        headers: { "User-Agent": "Unipool-App/1.0" },
        signal: controller.signal
      }
    )
    clearTimeout(timeoutId)
    if (!resp.ok)
      throw new Error(`HTTP error! status: ${resp.status}`)
    const data = (await resp.json()) as any[]
    console.log("📍 Search results found:", data.length)

    const results: LocationResult[] = data.map(item => ({
      display_name: item.display_name,
      lat: item.lat,
      lon: item.lon,
      place_id: item.place_id,
      name: item.name || item.display_name.split(",")[0]
    }))

    // cache it
    searchCache.set(encodedQuery, results)
    return results
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.log("⏱️ Search request timed out")
    } else {
      console.error("❌ Location search error:", err)
    }
    return []
  }
}

// debounced version (300 ms)
export const debouncedSearchLocations = debounce(
  searchLocations,
  300
)

// -----------------------------------------------------------------------------
// searchLocationsWithFallback (unchanged, uses searchLocations cache)
// -----------------------------------------------------------------------------

export const searchLocationsWithFallback = async (
  query: string,
  region = "India",
  limit = 10
): Promise<LocationResult[]> => {
  if (!query || query.length < 2) return []

  const lowerQuery = query.toLowerCase()
  const localResults: LocationResult[] = []

  // local partial matches from POPULAR_LOCATIONS
  Object.entries(POPULAR_LOCATIONS).forEach(([cityKey, locations]) => {
    if (cityKey === "default") return

    locations.forEach(location => {
      if (location.toLowerCase().includes(lowerQuery)) {
        const { lat, lon } = getCityCoordinates(cityKey)
        localResults.push({
          display_name: `${location}, ${
            cityKey[0].toUpperCase() + cityKey.slice(1)
          }, India`,
          lat: lat.toString(),
          lon: lon.toString(),
          place_id: `local_${cityKey}_${location.replace(
            /\s+/g,
            "_"
          )}`,
          name: location
        })
      }
    })

    if (
      cityKey.includes(lowerQuery) ||
      lowerQuery.includes(cityKey)
    ) {
      const { lat, lon } = getCityCoordinates(cityKey)
      localResults.push({
        display_name: `${
          cityKey[0].toUpperCase() + cityKey.slice(1)
        }, India`,
        lat: lat.toString(),
        lon: lon.toString(),
        place_id: `local_city_${cityKey}`,
        name: cityKey[0].toUpperCase() + cityKey.slice(1)
      })
    }
  })

  if (localResults.length > 0) {
    console.log("→ Found local results:", localResults.length)
    return localResults.slice(0, limit)
  }

  console.log("→ No local results, trying API search…")
  try {
    const apiResults = await searchLocations(
      query,
      region,
      limit
    )
    if (apiResults.length > 0) return apiResults
  } catch {
    console.log("⚠️ API search failed, using fallback locations")
  }

  // fallback popular
  const fallback = getPopularLocationsFallback(query)
  return fallback.slice(0, 4).map((loc, i) => ({
    display_name: `${loc}, India`,
    lat: "12.9716",
    lon: "77.5946",
    place_id: `fallback_${i}`,
    name: loc
  }))
}

// debounced version
export const debouncedSearchLocationsWithFallback = debounce(
  searchLocationsWithFallback,
  300
)

// -----------------------------------------------------------------------------
// small helpers for fallback (unchanged)
// -----------------------------------------------------------------------------

const getRandomPopularLocations = (
  locations: string[],
  count = 4
): string[] => {
  if (locations.length <= count) return locations
  return [...locations]
    .sort(() => 0.5 - Math.random())
    .slice(0, count)
}

const getCityCoordinates = (
  cityKey: string
): { lat: number; lon: number } => {
  const cityCoords: Record<string, { lat: number; lon: number }> = {
    chennai: { lat: 13.0827, lon: 80.2707 },
    bangalore: { lat: 12.9716, lon: 77.5946 },
    hyderabad: { lat: 17.385, lon: 78.4867 },
    vellore: { lat: 12.9165, lon: 79.1325 },
    coimbatore: { lat: 11.0168, lon: 76.9558 },
    madurai: { lat: 9.9252, lon: 78.1198 },
    salem: { lat: 11.6643, lon: 78.146 },
    pondicherry: { lat: 11.9416, lon: 79.8083 }
  }
  return (
    cityCoords[cityKey] || {
      lat: 12.9716,
      lon: 77.5946
    }
  )
}

// -----------------------------------------------------------------------------
// getPopularLocations (with caching)
// -----------------------------------------------------------------------------

export const getPopularLocations = async (
  searchQuery: string,
  userLocation?: UserLocation
): Promise<string[]> => {
  console.log("getPopularLocations:", {
    searchQuery,
    userLocation
  })

  const effectiveLocation = getEffectiveLocation(userLocation)
  if (
    !effectiveLocation ||
    !effectiveLocation.latitude ||
    !effectiveLocation.longitude
  ) {
    console.log("→ No valid location, fallback to default")
    return getRandomPopularLocations(
      POPULAR_LOCATIONS.default,
      4
    )
  }

  // cache key = lat,long + query
  const cacheKey = `${effectiveLocation.latitude},${effectiveLocation.longitude}_${searchQuery}`
  if (popularLocationsCache.has(cacheKey)) {
    console.log(
      "→ Returning cached popular locations for:",
      cacheKey
    )
    return popularLocationsCache.get(cacheKey)!
  }

  try {
    // try nearby first
    console.log("→ Fetching nearby places…")
    const nearbyPromise = getNearbyPopularPlaces(
      effectiveLocation,
      25,
      undefined,
      2000
    )
    const timeoutPromise = new Promise<NearbyPlace[]>(res =>
      setTimeout(() => {
        console.log("⏱️ Nearby API timeout, using fallback")
        res([])
      }, 2000)
    )

    const nearbyPlaces = await Promise.race([
      nearbyPromise,
      timeoutPromise
    ])
    console.log("→ Nearby places:", nearbyPlaces)

    if (nearbyPlaces.length > 0) {
      const names = nearbyPlaces.map(p => p.name)
      popularLocationsCache.set(cacheKey, names)
      console.log("✅ Returning nearby names:", names)
      return names
    }

    // no nearby: fallback to city list
    if (USE_TEST_LOCATION) {
      console.log("→ Test mode: returning Vellore list")
      const list = getRandomPopularLocations(
        POPULAR_LOCATIONS.vellore,
        4
      )
      popularLocationsCache.set(cacheKey, list)
      return list
    }

    const nearestCity = await getNearestCity(effectiveLocation)
    console.log("→ Nearest city:", nearestCity)

    if (
      nearestCity !== "default" &&
      POPULAR_LOCATIONS[nearestCity as keyof typeof POPULAR_LOCATIONS]
    ) {
      const cityList =
        POPULAR_LOCATIONS[
          nearestCity as keyof typeof POPULAR_LOCATIONS
        ]
      const pick = getRandomPopularLocations(cityList, 4)
      popularLocationsCache.set(cacheKey, pick)
      console.log("✅ Returning city list:", pick)
      return pick
    }
  } catch (err) {
    console.error(
      "❌ Error getting location-based popular places:",
      err
    )
  }

  // final string‑based fallback
  console.log("→ String fallback for query:", searchQuery)
  const q = searchQuery.toLowerCase()
  let fallbackList: string[] = []
  if (q.includes("chennai"))
    fallbackList = getRandomPopularLocations(
      POPULAR_LOCATIONS.chennai,
      4
    )
  else if (q.includes("bangalore") || q.includes("bengaluru"))
    fallbackList = getRandomPopularLocations(
      POPULAR_LOCATIONS.bangalore,
      4
    )
  else if (q.includes("hyderabad"))
    fallbackList = getRandomPopularLocations(
      POPULAR_LOCATIONS.hyderabad,
      4
    )
  else if (q.includes("vellore"))
    fallbackList = getRandomPopularLocations(
      POPULAR_LOCATIONS.vellore,
      4
    )
  else if (q.includes("coimbatore"))
    fallbackList = getRandomPopularLocations(
      POPULAR_LOCATIONS.coimbatore,
      4
    )
  else if (q.includes("madurai"))
    fallbackList = getRandomPopularLocations(
      POPULAR_LOCATIONS.madurai,
      4
    )
  else if (q.includes("salem"))
    fallbackList = getRandomPopularLocations(
      POPULAR_LOCATIONS.salem,
      4
    )
  else if (q.includes("pondicherry") || q.includes("puducherry"))
    fallbackList = getRandomPopularLocations(
      POPULAR_LOCATIONS.pondicherry,
      4
    )
  else
    fallbackList = getRandomPopularLocations(
      POPULAR_LOCATIONS.default,
      4
    )

  popularLocationsCache.set(
    `${effectiveLocation.latitude},${effectiveLocation.longitude}_${searchQuery}`,
    fallbackList
  )
  console.log("🔄 Returning default fallback list:", fallbackList)
  return fallbackList
}

// -----------------------------------------------------------------------------
// simple key‑based fallback (unchanged)
// -----------------------------------------------------------------------------

export const getPopularLocationsFallback = (
  searchQuery: string
): string[] => {
  const q = searchQuery.toLowerCase()
  if (q.includes("chennai"))
    return getRandomPopularLocations(
      POPULAR_LOCATIONS.chennai,
      4
    )
  if (q.includes("bangalore") || q.includes("bengaluru"))
    return getRandomPopularLocations(
      POPULAR_LOCATIONS.bangalore,
      4
    )
  if (q.includes("hyderabad"))
    return getRandomPopularLocations(
      POPULAR_LOCATIONS.hyderabad,
      4
    )
  if (q.includes("vellore"))
    return getRandomPopularLocations(
      POPULAR_LOCATIONS.vellore,
      4
    )
  if (q.includes("coimbatore"))
    return getRandomPopularLocations(
      POPULAR_LOCATIONS.coimbatore,
      4
    )
  if (q.includes("madurai"))
    return getRandomPopularLocations(
      POPULAR_LOCATIONS.madurai,
      4
    )
  if (q.includes("salem"))
    return getRandomPopularLocations(
      POPULAR_LOCATIONS.salem,
      4
    )
  if (q.includes("pondicherry") || q.includes("puducherry"))
    return getRandomPopularLocations(
      POPULAR_LOCATIONS.pondicherry,
      4
    )
  return getRandomPopularLocations(
    POPULAR_LOCATIONS.default,
    4
  )
}

// -----------------------------------------------------------------------------
// by‑city lookup + format helpers (unchanged)
// -----------------------------------------------------------------------------

export const getPopularLocationsByCity = (
  cityName: string
): string[] => {
  const city = cityName.toLowerCase()
  if (
    POPULAR_LOCATIONS[
      city as keyof typeof POPULAR_LOCATIONS
    ]
  ) {
    return getRandomPopularLocations(
      POPULAR_LOCATIONS[
        city as keyof typeof POPULAR_LOCATIONS
      ],
      4
    )
  }
  return getRandomPopularLocations(
    POPULAR_LOCATIONS.default,
    4
  )
}

export const formatLocationName = (
  locationResult: LocationResult
): string => {
  return (
    locationResult.name ||
    locationResult.display_name.split(",")[0]
  )
}

export const isLocationInIndia = (
  locationResult: LocationResult
): boolean => {
  return locationResult.display_name
    .toLowerCase()
    .includes("india")
}

// -----------------------------------------------------------------------------
// default export
// -----------------------------------------------------------------------------

export default {
  searchLocations,
  debouncedSearchLocations,
  searchLocationsWithFallback,
  debouncedSearchLocationsWithFallback,
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
}
