import AvailableRideScreen from "../screens/AvailableRideScreens/AvailableRideScreen";
import { useNavBarControls } from "../contexts/NavBarContext";

export default function AvailableRidesScreenRoute() {
  return <AvailableRideScreen {...useNavBarControls()} />;
}
