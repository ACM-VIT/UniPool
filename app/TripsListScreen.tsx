import { TripsListScreen } from "../screens/ChatScreens";
import { useNavBarControls } from "../contexts/NavBarContext";

export default function TripsListScreenRoute() {
  const { setNavBarVariant } = useNavBarControls();
  return <TripsListScreen setNavBarVariant={setNavBarVariant} />;
}
