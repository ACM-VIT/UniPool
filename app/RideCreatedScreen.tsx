import RideCreatedScreen from "../screens/RideCreatedScreen/RideCreatedScreen";
import { useNavBarControls } from "../contexts/NavBarContext";

export default function RideCreatedScreenRoute() {
  const { setNavBarVariant } = useNavBarControls();
  return <RideCreatedScreen setNavBarVariant={setNavBarVariant} />;
}
