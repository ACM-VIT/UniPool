export interface RideData {
  id: string;
  start_location: string;
  end_location: string;
  start_time: string;
  total_seats: number;
  booked_seats: number;
  total_price: number;
  is_ongoing: number;
  is_same_gender: number;
  vehicle_type: "scooter" | "van" | "car" | "suv";
}

export const upcomingRides: RideData[] = [
  {
    id: "ride_upcoming_01",
    start_location: "VIT Vellore",
    end_location: "Chennai Airport",
    start_time: "2025-04-20T07:30",
    total_seats: 4,
    booked_seats: 2,
    total_price: 350,
    is_ongoing: 0,
    is_same_gender: 0,
    vehicle_type: "car",
  },
  {
    id: "ride_upcoming_02",
    start_location: "Katpadi",
    end_location: "VIT Vellore",
    start_time: "2025-04-21T18:45",
    total_seats: 2,
    booked_seats: 1,
    total_price: 120,
    is_ongoing: 0,
    is_same_gender: 1,
    vehicle_type: "scooter",
  },
  {
    id: "ride_upcoming_03",
    start_location: "Katpadi",
    end_location: "VIT Vellore",
    start_time: "2025-04-21T18:45",
    total_seats: 2,
    booked_seats: 1,
    total_price: 120,
    is_ongoing: 0,
    is_same_gender: 1,
    vehicle_type: "scooter",
  },
  {
    id: "ride_upcoming_04",
    start_location: "Katpadi",
    end_location: "VIT Vellore",
    start_time: "2025-04-21T18:45",
    total_seats: 2,
    booked_seats: 1,
    total_price: 120,
    is_ongoing: 0,
    is_same_gender: 1,
    vehicle_type: "scooter",
  },
];

export const inProgressRides: RideData[] = [
  {
    id: "ride_inprogress_01",
    start_location: "VIT Vellore",
    end_location: "Bangalore",
    start_time: "2025-04-17T15:00",
    total_seats: 4,
    booked_seats: 4,
    total_price: 500,
    is_ongoing: 1,
    is_same_gender: 0,
    vehicle_type: "car",
  },
  {
    id: "ride_inprogress_02",
    start_location: "Katpadi",
    end_location: "Vellore Town",
    start_time: "2025-04-17T16:15",
    total_seats: 2,
    booked_seats: 2,
    total_price: 80,
    is_ongoing: 1,
    is_same_gender: 1,
    vehicle_type: "scooter",
  },
  {
    id: "ride_inprogress_03",
    start_location: "Katpadi",
    end_location: "Vellore Town",
    start_time: "2025-04-17T16:15",
    total_seats: 2,
    booked_seats: 2,
    total_price: 80,
    is_ongoing: 1,
    is_same_gender: 1,
    vehicle_type: "scooter",
  },
  {
    id: "ride_inprogress_04",
    start_location: "Katpadi",
    end_location: "Vellore Town",
    start_time: "2025-04-17T16:15",
    total_seats: 2,
    booked_seats: 2,
    total_price: 80,
    is_ongoing: 1,
    is_same_gender: 1,
    vehicle_type: "scooter",
  },
];
