import RideRequestedScreen from "../screens/RideRequestedScreen";
import { useNavBarControls } from "../contexts/NavBarContext";

export default function RideRequestedScreenRoute() {
  const { setNavBarVariant } = useNavBarControls();
  return <RideRequestedScreen setNavBarVariant={setNavBarVariant} />;
}
