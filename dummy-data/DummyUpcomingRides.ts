// dummy_rides.ts

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
  
  export const dummy_upcoming_rides: RideData[] = [
    {
      "id": "ride1",
      "start_location": "VIT Vellore",
      "end_location": "Chennai Airport",
      "start_time": "2025-04-10T17:00:00Z",
      "total_seats": 2,
      "booked_seats": 1,
      "total_price": 500,
      "is_ongoing": 1,
      "is_same_gender": 0,
      "vehicle_type": "scooter"
    },
    {
      "id": "ride2",
      "start_location": "VIT Vellore",
      "end_location": "Chennai Airport",
      "start_time": "2025-04-10T17:00:00Z",
      "total_seats": 8,
      "booked_seats": 3,
      "total_price": 500,
      "is_ongoing": 1,
      "is_same_gender": 1,
      "vehicle_type": "van"
    },
    {
      "id": "ride3",
      "start_location": "VIT Vellore",
      "end_location": "Chennai Airport",
      "start_time": "2025-04-10T17:00:00Z",
      "total_seats": 4,
      "booked_seats": 2,
      "total_price": 500,
      "is_ongoing": 1,
      "is_same_gender": 0,
      "vehicle_type": "car"
    },
    {
      "id": "ride4",
      "start_location": "VIT Vellore",
      "end_location": "Chennai Airport",
      "start_time": "2025-04-10T17:00:00Z",
      "total_seats": 6,
      "booked_seats": 0,
      "total_price": 500,
      "is_ongoing": 0,
      "is_same_gender": 1,
      "vehicle_type": "suv"
    }
  ];