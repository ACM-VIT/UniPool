import { PassengerInfoScreen } from "../screens/ChatScreens";
import { useNavBarControls } from "../contexts/NavBarContext";

export default function PassengerInfoScreenRoute() {
  const { setNavBarVariant } = useNavBarControls();
  return <PassengerInfoScreen setNavBarVariant={setNavBarVariant} />;
}
