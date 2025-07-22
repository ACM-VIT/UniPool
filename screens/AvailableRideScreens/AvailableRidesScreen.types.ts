// Types for Available Ride Screens

export type Ride = {
  id: string;
  from: string;
  to: string;
  time: string;
  date: string;
  price: string;
  seats: number;
  driver: {
    name: string;
    rating: number;
    phone: string;
  };
  vehicle: {
    make: string;
    model: string;
    color: string;
    plate: string;
  };
};

export type AvailableRideScreenSelectedProps = {
  navigation: any;
  route: { params: { ride: Ride } };
};
