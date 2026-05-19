import { AvailableRideScreen } from "../screens/AvailableRideScreens";
import { useNavBarControls } from "../contexts/NavBarContext";

export default function AvailableRidesScreenRoute() {
  return <AvailableRideScreen {...useNavBarControls()} />;
}
