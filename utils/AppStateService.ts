import ApiUtil from "./ApiUtil";
import type { TripCard } from "../components/ActiveTripCard";

export type HomeRide = {
  ride_id: string;
  host_user_id: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_seats: number;
  booked_seats: number;
  total_price: number;
  is_ongoing: number;
  is_same_gender: number;
  passenger_id?: string;
  viewer_state?:
    | "host"
    | "confirmed_passenger"
    | "pending_passenger"
    | "rejected_passenger"
    | "available"
    | "full"
    | "past";
  request_status?: string;
};

export type NearbyRideSummary = {
  id: string;
  // Included so the home-map can hide the viewer's own rides from
  // the pin set (an unauthenticated `/rides/nearby` can't filter
  // server-side without bloating its cache key with auth identity).
  host_user_id: string;
  start_location: string;
  end_location: string;
  start_latitude: number;
  start_longitude: number;
  end_latitude: number;
  end_longitude: number;
  start_time: string;
  total_seats: number;
  booked_seats: number;
  total_price: number;
};

export type PendingRatingRide = {
  ride_id: string;
  start_location: string;
  end_location: string;
  start_time: string;
  pending_count: number;
};

export type AppStateResponse = {
  server_time: string;
  authenticated: boolean;
  user?: Record<string, unknown>;
  home: {
    user_rides: HomeRide[];
    active_trip_card: TripCard | null;
    pending_ratings: PendingRatingRide[];
    nearby?: {
      rides: NearbyRideSummary[];
      radius: number;
      count: number;
    };
  };
  errors?: Record<string, string>;
};

export const getAppState = (
  apiUtil: ApiUtil,
  location?: { latitude: number; longitude: number } | null,
) => {
  const params = new URLSearchParams();
  params.set("surface", "home");

  if (location) {
    params.set("lat", location.latitude.toFixed(4));
    params.set("lng", location.longitude.toFixed(4));
    params.set("radius", "5000");
    params.set("limit", "30");
  }

  return apiUtil.get<AppStateResponse>(`/app/state?${params.toString()}`);
};
