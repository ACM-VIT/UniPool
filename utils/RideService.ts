import { Ride, User } from "../screens/ChatScreens/ChatScreen.types";
import ApiUtil from "./ApiUtil";

export default class RideService {
  static async getInvolvedRides(apiUtil: ApiUtil): Promise<Ride[]> {
    const response = await apiUtil.getUncached<{ rides: Ride[] }>(`/rides/involved`);
    return response.rides || [];
  }

  static async getAllPassengers(apiUtil: ApiUtil): Promise<User[]> {
    const response = await apiUtil.getUncached<{ passengers: User[] }>(`/passengers/all`);
    return response.passengers || [];
  }
}
