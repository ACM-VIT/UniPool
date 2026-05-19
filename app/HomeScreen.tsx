import HomeScreen from "../screens/HomeScreen";
import { useNavBarControls } from "../contexts/NavBarContext";

export default function HomeScreenRoute() {
  return <HomeScreen {...useNavBarControls()} />;
}
