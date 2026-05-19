import { NativeStackScreenProps } from "../../navigation/router-compat";
import { RootStackParamList } from "../../navigation/RootStackParamList";


export type RideCreateScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "RideRequestedScreen"
> & {
  setNavBarVariant?: (v: 0 | 1 | 2) => void;
};
